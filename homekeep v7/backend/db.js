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
`);

// Safety net: covers a table that already had the new constraint but
// still somehow contains a legacy role value.
try {
  db.prepare("UPDATE users SET role = 'Executor' WHERE role = 'Household Member'").run();
} catch (e) {
  // ignore — harmless if there are no such rows
}

module.exports = db;
