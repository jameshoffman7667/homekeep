// v2.2: backup & restore support routes.
//  * server-data export/import: the pieces of state that live outside the
//    app_data JSON document (users, alarms, alarm mappings, alarm settings,
//    Owner settings + logo, attachment index) so the Excel backup can carry them.
//  * Full backup (.zip): the Excel workbook the browser builds + every attachment
//    file + a manifest. Restore stages the zip, the browser runs the normal Excel
//    pre-check/import on the workbook, then applies the attachments.
//  * Nightly consistent database snapshots into DATA_DIR/backups/.
//  * Attachment index/replace endpoints used by the one-time photo shrink.
const path = require("path");
const fs = require("fs");
const { randomUUID, randomBytes } = require("crypto");
const multer = require("multer");
const db = require("./db");
const settings = require("./settings");
const { hashPassword } = require("./auth");
const { writeZip, openZip, readEntry } = require("./zip");

const ROLES = ["Owner", "Manager", "Executor", "Guest"];
const BCRYPT_RE = /^\$2[aby]\$\d\d\$[./A-Za-z0-9]{53}$/;
const MAX_STAGE_BYTES = 4 * 1024 * 1024 * 1024; // 4 GB, matches the zip reader's limit
const MAX_WORKBOOK_BYTES = 60 * 1024 * 1024;

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let n = 0;
    req.on("data", (c) => {
      n += c.length;
      if (n > limit) { reject(new Error("That file is too large")); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}
function saveStream(req, dest, limit) {
  return new Promise((resolve, reject) => {
    const ws = fs.createWriteStream(dest);
    let n = 0, failed = false;
    req.on("data", (c) => {
      n += c.length;
      if (n > limit && !failed) { failed = true; ws.destroy(); req.destroy(); fs.unlink(dest, () => {}); reject(new Error("That file is too large")); }
    });
    req.on("error", (e) => { if (!failed) { failed = true; ws.destroy(); reject(e); } });
    ws.on("error", (e) => { if (!failed) { failed = true; reject(e); } });
    ws.on("finish", () => { if (!failed) resolve(n); });
    req.pipe(ws);
  });
}

function stamp(d = new Date()) {
  const p = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function register(app, { requireAuth, requireOwner, ATTACH_DIR }) {
  const TMP_DIR = path.join(db.DATA_DIR, "tmp");
  const SNAP_DIR = path.join(db.DATA_DIR, "backups");
  for (const d of [TMP_DIR, SNAP_DIR]) if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  // Leftover staged restores from a previous run are stale.
  for (const f of fs.readdirSync(TMP_DIR)) if (f.startsWith("stage-")) fs.unlink(path.join(TMP_DIR, f), () => {});

  /* ---------------- server-side data for the Excel backup ---------------- */
  app.get("/api/backup/server-data", requireAuth, requireOwner, (req, res) => {
    const credentials = req.query.credentials === "1";
    const users = db.prepare("SELECT * FROM users ORDER BY created_at").all().map((u) => ({
      username: u.username, role: u.role, email: u.email || "",
      notifyPmOverdue: !!u.notify_pm_overdue, notifyWarrantyExpiring: !!u.notify_warranty_expiring,
      notifyWorkRequestUnreviewed: !!u.notify_work_request_unreviewed,
      mustChangePassword: !!u.must_change_password,
      ...(credentials ? { passwordHash: u.password_hash } : {}),
    }));
    const alarms = db.prepare("SELECT * FROM alarms ORDER BY triggered_at").all();
    const alarmMappings = db.prepare("SELECT * FROM alarm_entity_map ORDER BY entity_id").all();
    const attachments = db.prepare("SELECT id, filename, mime_type, size, uploaded_by, created_at FROM attachments ORDER BY created_at").all();
    const cur = settings.current();
    const logo = settings.getLogo();
    const webhookKey = credentials ? settings.getRaw("alarm_webhook_key") : null;
    res.json({
      users, alarms, alarmMappings, attachments,
      settings: cur, logoDataUrl: logo ? logo.dataUrl : "",
      alarmSettings: credentials && webhookKey ? { webhookKey } : null,
    });
  });

  // body: { tabs: { users?, alarms?, alarmMappings?, alarmSettings?, settings? } }
  // each tab: { mode: "merge" | "replace", rows|values }
  app.post("/api/backup/server-import", requireAuth, requireOwner, (req, res) => {
    const tabs = (req.body && req.body.tabs) || {};
    const errors = [];
    const report = {};

    // ---- validate everything first; apply nothing if anything is wrong ----
    if (tabs.users) {
      const seen = new Set(), seenEmail = new Set();
      (tabs.users.rows || []).forEach((r, i) => {
        const where = `Users row ${i + 2}`;
        const name = String(r.username || "").trim();
        if (!name) errors.push(`${where}: username is required`);
        else if (seen.has(name.toLowerCase())) errors.push(`${where}: duplicate username "${name}"`);
        seen.add(name.toLowerCase());
        if (!ROLES.includes(r.role)) errors.push(`${where}: role must be Owner, Manager, Executor or Guest`);
        const em = String(r.email || "").trim().toLowerCase();
        if (em) {
          if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) errors.push(`${where}: "${r.email}" isn't a valid email address`);
          if (seenEmail.has(em)) errors.push(`${where}: email "${r.email}" is used by more than one user`);
          seenEmail.add(em);
        }
        if (r.passwordHash && !BCRYPT_RE.test(String(r.passwordHash))) errors.push(`${where}: password hash isn't valid`);
      });
    }
    if (tabs.alarms) (tabs.alarms.rows || []).forEach((r, i) => { if (!r.id || !r.triggeredAt) errors.push(`Alarms row ${i + 2}: id and triggered-at are required`); });
    if (tabs.alarmMappings) (tabs.alarmMappings.rows || []).forEach((r, i) => { if (!r.entityId) errors.push(`Alarm Mappings row ${i + 2}: entity id is required`); });
    let cleanSettings = null, logoDataUrl;
    if (tabs.settings) {
      const v = settings.validate(tabs.settings.values || {});
      if (!v.ok) v.errors.forEach((e) => errors.push(`Settings: ${e}`));
      else cleanSettings = v.settings;
      logoDataUrl = tabs.settings.logoDataUrl;
      if (logoDataUrl) {
        const lv = settings.validateLogo(logoDataUrl);
        if (!lv.ok) errors.push(`Settings: ${lv.error}`);
      }
    }
    if (errors.length) return res.status(400).json({ error: "Nothing was changed. The file has problems.", errors });

    const acting = req.user;
    const tx = db.transaction(() => {
      if (tabs.users) {
        const rows = tabs.users.rows || [];
        let created = 0, updated = 0, skipped = 0, noPassword = 0;
        const keep = new Set(rows.map((r) => String(r.username).trim().toLowerCase()));
        keep.add(acting.username.toLowerCase());
        if (tabs.users.mode === "replace") {
          for (const u of db.prepare("SELECT id, username FROM users").all()) {
            if (!keep.has(u.username.toLowerCase())) db.prepare("DELETE FROM users WHERE id = ?").run(u.id);
          }
        }
        for (const r of rows) {
          const username = String(r.username).trim();
          if (username.toLowerCase() === acting.username.toLowerCase()) { skipped++; continue; } // the importing Owner is never overwritten
          let email = String(r.email || "").trim() || null;
          const existing = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
          if (email) {
            const clash = db.prepare("SELECT id FROM users WHERE lower(email) = lower(?) AND username != ?").get(email, username);
            if (clash) email = null; // keep the account, drop a clashing email rather than failing
          }
          const flags = [r.notifyPmOverdue === false ? 0 : 1, r.notifyWarrantyExpiring === false ? 0 : 1, r.notifyWorkRequestUnreviewed === false ? 0 : 1];
          if (existing) {
            db.prepare("UPDATE users SET role = ?, email = ?, notify_pm_overdue = ?, notify_warranty_expiring = ?, notify_work_request_unreviewed = ? WHERE id = ?")
              .run(r.role, email, flags[0], flags[1], flags[2], existing.id);
            if (r.passwordHash) {
              db.prepare("UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?").run(r.passwordHash, existing.id);
              db.prepare("UPDATE users SET must_change_password = ? WHERE id = ?").run(r.mustChangePassword ? 1 : 0, existing.id);
            }
            updated++;
          } else {
            // No password supplied: the account gets an unusable random password and
            // is flagged for a forced change. The Owner sets a temporary password
            // (Owner Tools → Reset password) or the user uses the emailed reset link.
            const hash = r.passwordHash || hashPassword(randomBytes(24).toString("hex"));
            if (!r.passwordHash) noPassword++;
            db.prepare("INSERT INTO users (id, username, password_hash, role, email, notify_pm_overdue, notify_warranty_expiring, notify_work_request_unreviewed, must_change_password) VALUES (?,?,?,?,?,?,?,?,?)")
              .run(randomUUID(), username, hash, r.role, email, flags[0], flags[1], flags[2], !r.passwordHash || r.mustChangePassword ? 1 : 0);
            created++;
          }
        }
        report.users = { created, updated, skipped, noPassword };
      }
      if (tabs.alarms) {
        if (tabs.alarms.mode === "replace") db.prepare("DELETE FROM alarms").run();
        const ins = db.prepare(
          "INSERT OR REPLACE INTO alarms (id, source, source_entity_id, friendly_name, asset_id, location_id, message, severity, status, resolution_type, resolution_ref, resolution_reason, raw_payload, triggered_at, resolved_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
        );
        for (const r of tabs.alarms.rows || []) {
          ins.run(String(r.id), r.source || "manual", r.sourceEntityId || null, r.friendlyName || null, r.assetId || null, r.locationId || null,
            r.message || "", ["info", "warning", "critical"].includes(r.severity) ? r.severity : "warning", r.status || "open",
            r.resolutionType || null, r.resolutionRef || null, r.resolutionReason || null, r.rawPayload || null, r.triggeredAt, r.resolvedAt || null);
        }
        report.alarms = { count: (tabs.alarms.rows || []).length };
      }
      if (tabs.alarmMappings) {
        if (tabs.alarmMappings.mode === "replace") db.prepare("DELETE FROM alarm_entity_map").run();
        const ins = db.prepare("INSERT OR REPLACE INTO alarm_entity_map (entity_id, asset_id, location_id, label) VALUES (?,?,?,?)");
        for (const r of tabs.alarmMappings.rows || []) ins.run(String(r.entityId).trim(), r.assetId || null, r.locationId || null, r.label || null);
        report.alarmMappings = { count: (tabs.alarmMappings.rows || []).length };
      }
      if (tabs.alarmSettings && tabs.alarmSettings.webhookKey) {
        settings.setRaw("alarm_webhook_key", String(tabs.alarmSettings.webhookKey));
        report.alarmSettings = { webhookKey: true };
      }
      if (cleanSettings) {
        settings.save(cleanSettings);
        if (logoDataUrl) settings.setLogo(logoDataUrl);
        else if (logoDataUrl === "") settings.clearLogo();
        report.settings = { applied: true };
      }
    });
    try {
      tx();
    } catch (e) {
      console.error("[maintenhance] server-import failed:", e.message);
      return res.status(500).json({ error: "Nothing was changed. The import failed: " + e.message, errors: [e.message] });
    }
    res.json({ ok: true, report });
  });

  /* ---------------- Full backup (.zip) ---------------- */
  app.post("/api/backup/full", requireAuth, requireOwner, async (req, res) => {
    try {
      const workbook = await readBody(req, MAX_WORKBOOK_BYTES);
      if (!workbook.length) return res.status(400).json({ error: "No workbook received" });
      const rows = db.prepare("SELECT * FROM attachments ORDER BY created_at").all();
      const present = rows.filter((r) => fs.existsSync(path.join(ATTACH_DIR, r.stored_name)));
      const manifest = {
        app: "MaintEnhance", format: 1, version: "2.2", createdAt: new Date().toISOString(),
        workbook: "maintenhance-data.xlsx",
        attachments: present.map((r) => ({
          id: r.id, filename: r.filename, storedName: r.stored_name, mimeType: r.mime_type, size: r.size,
          uploadedBy: r.uploaded_by, createdAt: r.created_at,
        })),
        missingAttachments: rows.length - present.length,
      };
      const entries = [
        { name: "manifest.json", buffer: Buffer.from(JSON.stringify(manifest, null, 2)) },
        { name: manifest.workbook, buffer: workbook },
        ...present.map((r) => ({ name: `attachments/${r.stored_name}`, filePath: path.join(ATTACH_DIR, r.stored_name) })),
      ];
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="maintenhance-full-backup-${stamp()}.zip"`);
      await writeZip(res, entries);
    } catch (e) {
      console.error("[maintenhance] full backup failed:", e.message);
      if (!res.headersSent) res.status(500).json({ error: "Couldn't build the backup: " + e.message });
      else res.destroy();
    }
  });

  // Step 1 of a restore: upload the zip, get back the workbook for the normal pre-check.
  app.post("/api/backup/stage", requireAuth, requireOwner, async (req, res) => {
    const id = randomUUID();
    const file = path.join(TMP_DIR, `stage-${id}.zip`);
    try {
      await saveStream(req, file, MAX_STAGE_BYTES);
      const { entries } = openZip(file);
      const mEntry = entries.find((e) => e.name === "manifest.json");
      if (!mEntry) throw new Error("This zip has no manifest.json — it isn't a MaintEnhance full backup");
      const manifest = JSON.parse(readEntry(file, mEntry, 16 * 1024 * 1024).toString("utf8"));
      if (manifest.app !== "MaintEnhance") throw new Error("This zip isn't a MaintEnhance full backup");
      const wEntry = entries.find((e) => e.name === manifest.workbook);
      if (!wEntry) throw new Error("The backup's workbook is missing from the zip");
      const workbook = readEntry(file, wEntry, MAX_WORKBOOK_BYTES);
      const files = new Set(entries.map((e) => e.name));
      const missing = (manifest.attachments || []).filter((a) => !files.has(`attachments/${a.storedName}`)).length;
      res.json({
        stageId: id, createdAt: manifest.createdAt, version: manifest.version,
        attachmentCount: (manifest.attachments || []).length, attachmentsMissingFromZip: missing,
        workbookBase64: workbook.toString("base64"),
      });
    } catch (e) {
      fs.unlink(file, () => {});
      res.status(400).json({ error: e.message || "Couldn't read that backup" });
    }
  });
  // Step 2: after the workbook import succeeded, restore the attachment files.
  app.post("/api/backup/stage/:id/apply-attachments", requireAuth, requireOwner, (req, res) => {
    const file = path.join(TMP_DIR, `stage-${path.basename(req.params.id)}.zip`);
    if (!fs.existsSync(file)) return res.status(404).json({ error: "That staged backup has expired — upload it again" });
    try {
      const { entries } = openZip(file);
      const manifest = JSON.parse(readEntry(file, entries.find((e) => e.name === "manifest.json"), 16 * 1024 * 1024).toString("utf8"));
      let restored = 0, skipped = 0, failed = 0;
      for (const a of manifest.attachments || []) {
        const entry = entries.find((e) => e.name === `attachments/${a.storedName}`);
        if (!entry) { failed++; continue; }
        const safeName = path.basename(String(a.storedName));
        const dest = path.join(ATTACH_DIR, safeName);
        const exists = db.prepare("SELECT 1 FROM attachments WHERE id = ?").get(a.id);
        if (exists && fs.existsSync(dest)) { skipped++; continue; }
        try {
          fs.writeFileSync(dest, readEntry(file, entry, 64 * 1024 * 1024));
          db.prepare("INSERT OR REPLACE INTO attachments (id, filename, stored_name, mime_type, size, uploaded_by, created_at) VALUES (?,?,?,?,?,?,?)")
            .run(a.id, a.filename, safeName, a.mimeType || null, a.size || null, a.uploadedBy || null, a.createdAt || new Date().toISOString());
          restored++;
        } catch (e) { failed++; }
      }
      fs.unlink(file, () => {});
      res.json({ ok: true, restored, skipped, failed });
    } catch (e) {
      res.status(500).json({ error: "Couldn't restore the attachments: " + e.message });
    }
  });
  app.delete("/api/backup/stage/:id", requireAuth, requireOwner, (req, res) => {
    fs.unlink(path.join(TMP_DIR, `stage-${path.basename(req.params.id)}.zip`), () => {});
    res.json({ ok: true });
  });

  /* ---------------- Nightly database snapshots ---------------- */
  const KEEP = Math.max(1, Number(process.env.BACKUP_KEEP) || 7);
  function listSnapshots() {
    return fs.readdirSync(SNAP_DIR)
      .filter((f) => /^maintenhance-\d{8}-\d{6}\.db$/.test(f))
      .map((f) => { const st = fs.statSync(path.join(SNAP_DIR, f)); return { name: f, size: st.size, createdAt: st.mtime.toISOString() }; })
      .sort((a, b) => (a.name < b.name ? 1 : -1));
  }
  async function runSnapshot() {
    const name = `maintenhance-${stamp()}.db`;
    await db.backup(path.join(SNAP_DIR, name));
    for (const old of listSnapshots().slice(KEEP)) fs.unlink(path.join(SNAP_DIR, old.name), () => {});
    return name;
  }
  app.get("/api/backup/snapshots", requireAuth, requireOwner, (req, res) => {
    res.json({ keep: KEEP, enabled: process.env.BACKUP_SNAPSHOTS !== "false", snapshots: listSnapshots() });
  });
  app.post("/api/backup/snapshots/run", requireAuth, requireOwner, async (req, res) => {
    try { res.json({ ok: true, name: await runSnapshot() }); }
    catch (e) { res.status(500).json({ error: "Snapshot failed: " + e.message }); }
  });
  app.get("/api/backup/snapshots/:name", requireAuth, requireOwner, (req, res) => {
    const name = path.basename(req.params.name);
    const file = path.join(SNAP_DIR, name);
    if (!/^maintenhance-\d{8}-\d{6}\.db$/.test(name) || !fs.existsSync(file)) return res.status(404).json({ error: "Snapshot not found" });
    res.download(file, name);
  });
  if (process.env.BACKUP_SNAPSHOTS !== "false") {
    const DAY = 24 * 60 * 60 * 1000;
    const tick = () => runSnapshot().then((n) => console.log("[maintenhance] Database snapshot written:", n)).catch((e) => console.error("[maintenhance] Snapshot failed:", e.message));
    setTimeout(() => {
      const latest = listSnapshots()[0];
      if (!latest || Date.now() - new Date(latest.createdAt).getTime() > DAY - 60 * 60 * 1000) tick();
    }, 2 * 60 * 1000);
    setInterval(tick, DAY);
  } else {
    console.log("[maintenhance] Nightly database snapshots are disabled (BACKUP_SNAPSHOTS=false).");
  }

  /* ---------------- Attachment index + in-place replace (photo shrink) ---------------- */
  app.get("/api/attachments", requireAuth, requireOwner, (req, res) => {
    res.json(db.prepare("SELECT id, filename, mime_type, size, uploaded_by, created_at FROM attachments ORDER BY created_at").all()
      .map((r) => ({ id: r.id, filename: r.filename, mimeType: r.mime_type, size: r.size, uploadedBy: r.uploaded_by, createdAt: r.created_at })));
  });
  const replaceUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024, files: 1 } });
  app.put("/api/attachments/:id/file", requireAuth, requireOwner, (req, res) => {
    replaceUpload.single("file")(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message || "Upload failed" });
      const row = db.prepare("SELECT * FROM attachments WHERE id = ?").get(req.params.id);
      if (!row) return res.status(404).json({ error: "Attachment not found" });
      if (!req.file || !/^image\//.test(req.file.mimetype)) return res.status(400).json({ error: "An image file is required" });
      // Only ever replace with something smaller — this endpoint exists for the one-time shrink.
      if (row.size && req.file.size >= row.size) return res.json({ ok: true, replaced: false, size: row.size });
      const base = path.basename(row.stored_name, path.extname(row.stored_name));
      const ext = req.file.mimetype === "image/png" ? ".png" : ".jpg";
      const newName = base + ext;
      fs.writeFileSync(path.join(ATTACH_DIR, newName), req.file.buffer);
      if (newName !== row.stored_name) { try { fs.unlinkSync(path.join(ATTACH_DIR, row.stored_name)); } catch (e) { /* already gone */ } }
      db.prepare("UPDATE attachments SET stored_name = ?, mime_type = ?, size = ? WHERE id = ?").run(newName, req.file.mimetype, req.file.size, row.id);
      res.json({ ok: true, replaced: true, size: req.file.size });
    });
  });
}

module.exports = { register };
