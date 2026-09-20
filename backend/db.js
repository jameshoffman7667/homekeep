const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

// DATA_DIR should point at a mounted volume so the database survives
// container restarts/rebuilds. See docker-compose.yml.
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, "homekeep.db"));
db.pragma("journal_mode = WAL");

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

// Migration: the "Household Member" role was renamed to "Executor".
// SQLite CHECK constraints only apply to new writes, so existing rows
// with the old role name would otherwise sit there un-selectable by any
// UI that only offers the new role names.
try {
  db.prepare("UPDATE users SET role = 'Executor' WHERE role = 'Household Member'").run();
} catch (e) {
  // ignore — harmless if the column/table doesn't have any such rows yet
}

module.exports = db;
