// v2.2 one-time data migration of the app_data JSON document:
//   * Work order statuses renamed: Open -> Active (or Scheduled when the
//     order already has a scheduled date), In Progress -> Scheduled,
//     Completed unchanged, Verified -> Closed.
//   * Required-by date backfilled to today on every work order (other than
//     PM Bases, which are templates and carry no due date of their own)
//     that has none.
// Guarded by an app_settings flag so it only ever runs once per database.
const db = require("./db");

const STATUS_MAP = { Open: null, "In Progress": "Scheduled", Verified: "Closed" };

function migrateWorkOrders(data, today) {
  let changed = 0;
  for (const w of data.workOrders || []) {
    if (w.type === "PM Base") continue;
    if (w.status === "Open") { w.status = w.scheduledDate ? "Scheduled" : "Active"; changed++; }
    else if (STATUS_MAP[w.status]) { w.status = STATUS_MAP[w.status]; changed++; }
    if (!w.requiredByDate) { w.requiredByDate = today; changed++; }
  }
  return changed;
}

function runMigrations() {
  try {
    const done = db.prepare("SELECT value FROM app_settings WHERE key = 'migration_v22_wo'").get();
    if (done) return;
    const row = db.prepare("SELECT data FROM app_data WHERE id = 1").get();
    if (row) {
      const data = JSON.parse(row.data);
      const today = new Date().toISOString().slice(0, 10);
      const n = migrateWorkOrders(data, today);
      if (n) {
        db.prepare("UPDATE app_data SET data = ? WHERE id = 1").run(JSON.stringify(data));
        console.log(`[maintenhance] v2.2 migration: updated ${n} work order field(s) (statuses renamed, required dates backfilled).`);
      }
    }
    db.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('migration_v22_wo', ?)").run(new Date().toISOString());
  } catch (e) {
    console.error("[maintenhance] v2.2 work order migration failed (will retry next start):", e.message);
  }
}

module.exports = { runMigrations, migrateWorkOrders };
