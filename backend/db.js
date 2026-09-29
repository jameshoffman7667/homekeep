const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

// DATA_DIR should point at a mounted volume so the database survives
// container restarts/rebuilds. See docker-compose.yml.
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, "homekeep.db"));
db.pragma("journal_mode = WAL");

// Migration: earlier releases created the `users` table with
// CHECK(role IN ('Owner','Household Member')). `CREATE TABLE IF NOT
// EXISTS` below is a no-op against a database that already has this
// table, so that stale constraint would otherwise stick around
// forever — inserting any of the newer roles (Manager, Executor,
// Guest) would violate it and throw, which is exactly what surfaced
// as a 500 error when adding a non-Owner user. Detect the old schema
// via sqlite_master and rebuild the table with the current
// constraint, preserving every existing row (renaming the old
// Household Member role to Executor along the way).
try {
  const existing = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'").get();
  if (existing && existing.sql && existing.sql.includes("Household Member")) {
    db.exec(`
      ALTER TABLE users RENAME TO users_legacy;
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('Owner','Manager','Executor','Guest')),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO users (id, username, password_hash, role, created_at)
        SELECT id, username, password_hash,
          CASE WHEN role = 'Household Member' THEN 'Executor' ELSE role END,
          created_at
        FROM users_legacy;
      DROP TABLE users_legacy;
    `);
    console.log("[homekeep] Migrated users table off the legacy Household Member role constraint.");
  }
} catch (e) {
  console.error("[homekeep] users table migration check failed:", e.message);
}

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('Owner','Manager','Executor','Guest')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS household (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    data TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS attachments (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    stored_name TEXT NOT NULL,
    mime_type TEXT,
    size INTEGER,
    uploaded_by TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- v1.7: small key/value store for things that aren't per-household
  -- application data (the JSON blob) or a user account — currently just
  -- the Home Assistant webhook's API key.
  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  -- v1.7: which HA entity id maps to which asset/location, so a repeat
  -- alert from the same sensor auto-links without re-entering it. Kept
  -- relational (not in the household JSON blob) since it's looked up on
  -- every inbound webhook hit, independent of the app's own save cycle.
  CREATE TABLE IF NOT EXISTS alarm_entity_map (
    entity_id TEXT PRIMARY KEY,
    asset_id TEXT,
    location_id TEXT,
    label TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- v1.7: the alarm queue itself, upstream of the Work Request queue —
  -- not every sensor trip should become a work item. Relational for the
  -- same reason as attachments/alarm_entity_map: written by an inbound
  -- webhook that has no business going through the app's household-blob
  -- save cycle.
  CREATE TABLE IF NOT EXISTS alarms (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL DEFAULT 'home_assistant',
    source_entity_id TEXT,
    friendly_name TEXT,
    asset_id TEXT,
    location_id TEXT,
    message TEXT,
    severity TEXT NOT NULL DEFAULT 'warning',
    status TEXT NOT NULL DEFAULT 'open',
    resolution_type TEXT,
    resolution_ref TEXT,
    resolution_reason TEXT,
    raw_payload TEXT,
    triggered_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    resolved_at TEXT
  );
`);

// Safety net: covers a table that already had the new constraint but
// still somehow contains a legacy role value.
try {
  db.prepare("UPDATE users SET role = 'Executor' WHERE role = 'Household Member'").run();
} catch (e) {
  // ignore — harmless if there are no such rows
}

// Migration: v1.2 added an optional notification email and three
// per-user notification toggles to the users table. ADD COLUMN is
// safe here (unlike the role CHECK constraint above) since these are
// plain nullable/defaulted columns, not a constraint that would
// reject existing rows.
try {
  const cols = db.prepare("PRAGMA table_info(users)").all().map((c) => c.name);
  if (!cols.includes("email")) db.exec("ALTER TABLE users ADD COLUMN email TEXT");
  if (!cols.includes("notify_pm_overdue")) db.exec("ALTER TABLE users ADD COLUMN notify_pm_overdue INTEGER NOT NULL DEFAULT 1");
  if (!cols.includes("notify_warranty_expiring")) db.exec("ALTER TABLE users ADD COLUMN notify_warranty_expiring INTEGER NOT NULL DEFAULT 1");
  if (!cols.includes("notify_work_request_unreviewed")) db.exec("ALTER TABLE users ADD COLUMN notify_work_request_unreviewed INTEGER NOT NULL DEFAULT 1");
} catch (e) {
  console.error("[homekeep] notification-columns migration failed:", e.message);
}

// Exposed so server.js can put uploaded attachment files under the same
// mounted-volume root the database itself lives in (DATA_DIR), without
// duplicating the env-var-vs-default logic above.
module.exports = db;
module.exports.DATA_DIR = DATA_DIR;
