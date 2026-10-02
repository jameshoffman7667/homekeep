const express = require("express");
const cookieParser = require("cookie-parser");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { randomUUID } = require("crypto");
const db = require("./db");
const SEED = require("./seed");
const { hashPassword, verifyPassword, signToken, requireAuth, requireOwner } = require("./auth");
const { startNotificationScheduler } = require("./notify");
const { FEATURES } = require("./features");
const { EDITION, publicConfig } = require("./edition");

const app = express();
const PORT = process.env.PORT || 8040;

// v2.1: first-run seed = the empty base shape, plus (optionally) an
// edition's starter PM Wizard catalogue loaded as data — from the file
// named by SEED_CATALOG_FILE, or DATA_DIR/pm-wizard-catalog.json if that
// exists. Only ever applied when a deployment is first set up; after
// that the catalogue is edited in-app or replaced via the Excel import.
function buildSeed() {
  const seed = JSON.parse(JSON.stringify(SEED));
  const configured = process.env.SEED_CATALOG_FILE && process.env.SEED_CATALOG_FILE.trim();
  const file = configured
    ? path.resolve(db.DATA_DIR, configured)
    : path.join(db.DATA_DIR, "pm-wizard-catalog.json");
  if (!fs.existsSync(file)) {
    if (configured) console.error("[maintenhance] SEED_CATALOG_FILE not found:", file);
    return seed;
  }
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    const list = Array.isArray(raw) ? raw : raw.entries;
    const clean = (list || [])
      .filter((i) => i && String(i.title || "").trim())
      .map((i, n) => ({
        id: i.id ? String(i.id) : `wc_seed${n + 1}`,
        title: String(i.title).trim(),
        description: String(i.description || ""),
        frequencyValue: Number(i.frequencyValue) || 12,
        frequencyUnit: ["days", "weeks", "months", "years"].includes(i.frequencyUnit) ? i.frequencyUnit : "months",
        zones: i.zones === "all" || !Array.isArray(i.zones) ? "all" : i.zones.map(String),
      }));
    seed.pmWizardCatalog = clean;
    console.log(`[maintenhance] Seeded ${clean.length} PM Wizard catalogue entries from ${file}`);
  } catch (e) {
    console.error("[maintenhance] Couldn't read the seed catalogue file:", e.message);
  }
  return seed;
}

// Photo/document attachments (v1.6) — stored on disk under the same
// mounted-volume DATA_DIR the SQLite file lives in, so they survive
// container restarts/rebuilds the same way the database does. Only the
// attachment's id (not the file itself) is ever stored in the app_data
// JSON blob — see PUT /api/data's 2mb body limit above, which a photo
// would blow past in no time if it were embedded inline.
const ATTACH_DIR = path.join(db.DATA_DIR, "attachments");
if (!fs.existsSync(ATTACH_DIR)) fs.mkdirSync(ATTACH_DIR, { recursive: true });
const attachmentUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, ATTACH_DIR),
    filename: (req, file, cb) => cb(null, randomUUID() + path.extname(file.originalname || "").slice(0, 10)),
  }),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!/^image\//.test(file.mimetype)) return cb(new Error("Only image attachments are supported"));
    cb(null, true);
  },
});

app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax",
  // Set COOKIE_SECURE=true once the app is served over HTTPS (e.g. behind
  // a reverse proxy you run in front of it) — browsers refuse "secure"
  // cookies over plain HTTP, which would otherwise break login on LAN/HTTP.
  secure: process.env.COOKIE_SECURE === "true",
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

/* -------------------------------------------------------------
   Auth & first-run setup
------------------------------------------------------------- */
// v2.1: public (pre-login) edition config — brand, colours, terminology,
// feature flags. The login screen, page title, and theme need this before
// anyone is signed in; nothing in it is sensitive.
app.get("/api/config", (req, res) => {
  res.json(publicConfig(FEATURES));
});

app.get("/api/auth/setup-status", (req, res) => {
  const count = db.prepare("SELECT COUNT(*) AS n FROM users").get().n;
  res.json({ needsSetup: count === 0 });
});

app.post("/api/auth/setup", (req, res) => {
  const count = db.prepare("SELECT COUNT(*) AS n FROM users").get().n;
  if (count > 0) return res.status(400).json({ error: "Setup has already been completed" });
  const { username, password } = req.body || {};
  if (!username || !password || password.length < 6) {
    return res.status(400).json({ error: "Username and a password of at least 6 characters are required" });
  }
  const id = randomUUID();
  db.prepare("INSERT INTO users (id, username, password_hash, role) VALUES (?,?,?,?)").run(
    id,
    username.trim(),
    hashPassword(password),
    "Owner"
  );
  db.prepare("INSERT OR REPLACE INTO app_data (id, data) VALUES (1, ?)").run(JSON.stringify(buildSeed()));
  const user = { id, username: username.trim(), role: "Owner" };
  res.cookie("maintenhance_token", signToken(user), COOKIE_OPTS);
  res.json(user);
});

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body || {};
  const row = db.prepare("SELECT * FROM users WHERE username = ?").get((username || "").trim());
  if (!row || !verifyPassword(password || "", row.password_hash)) {
    return res.status(401).json({ error: "Invalid username or password" });
  }
  const user = { id: row.id, username: row.username, role: row.role };
  res.cookie("maintenhance_token", signToken(user), COOKIE_OPTS);
  res.json(user);
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("maintenhance_token");
  res.json({ ok: true });
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  // v2: which componentized features this deployment has turned on
  // (see features.js) rides along with the session response, so the
  // frontend never needs a separate round trip to find out.
  res.json({ ...req.user, features: FEATURES });
});

/* -------------------------------------------------------------
   Household member management. Listing is open to any
   authenticated user (work orders need to offer an Executor
   picker built from this list); creating/removing accounts stays
   Owner-only — that UI only lives on the Owner Tools page anyway.
------------------------------------------------------------- */
function rowToUser(row) {
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    email: row.email || "",
    notifyPmOverdue: !!row.notify_pm_overdue,
    notifyWarrantyExpiring: !!row.notify_warranty_expiring,
    notifyWorkRequestUnreviewed: !!row.notify_work_request_unreviewed,
  };
}

app.get("/api/users", requireAuth, (req, res) => {
  const rows = db.prepare(
    "SELECT id, username, role, email, notify_pm_overdue, notify_warranty_expiring, notify_work_request_unreviewed FROM users ORDER BY created_at"
  ).all();
  res.json(rows.map(rowToUser));
});

app.post("/api/users", requireAuth, requireOwner, (req, res) => {
  const { username, password, role, email } = req.body || {};
  if (!username || !password || password.length < 6) {
    return res.status(400).json({ error: "Username and a password of at least 6 characters are required" });
  }
  if (!["Owner", "Manager", "Executor", "Guest"].includes(role)) {
    return res.status(400).json({ error: "Role must be Owner, Manager, Executor, or Guest" });
  }
  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username.trim());
  if (existing) return res.status(400).json({ error: "That username is already taken" });
  const id = randomUUID();
  try {
    db.prepare("INSERT INTO users (id, username, password_hash, role, email) VALUES (?,?,?,?,?)").run(
      id,
      username.trim(),
      hashPassword(password),
      role,
      (email || "").trim() || null
    );
  } catch (e) {
    console.error("[maintenhance] Failed to create user:", e.message);
    return res.status(400).json({ error: "Couldn't create that account. Check the server logs for details." });
  }
  res.json(rowToUser(db.prepare("SELECT id, username, role, email, notify_pm_overdue, notify_warranty_expiring, notify_work_request_unreviewed FROM users WHERE id = ?").get(id)));
});

// Update a user's notification email/preferences. Owner-only, same as
// add/remove — the only place this is edited from is Owner Tools.
app.patch("/api/users/:id", requireAuth, requireOwner, (req, res) => {
  const row = db.prepare("SELECT id FROM users WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "No such user" });
  const { email, notifyPmOverdue, notifyWarrantyExpiring, notifyWorkRequestUnreviewed } = req.body || {};
  db.prepare(
    "UPDATE users SET email = ?, notify_pm_overdue = ?, notify_warranty_expiring = ?, notify_work_request_unreviewed = ? WHERE id = ?"
  ).run(
    (email || "").trim() || null,
    notifyPmOverdue ? 1 : 0,
    notifyWarrantyExpiring ? 1 : 0,
    notifyWorkRequestUnreviewed ? 1 : 0,
    req.params.id
  );
  res.json(rowToUser(db.prepare("SELECT id, username, role, email, notify_pm_overdue, notify_warranty_expiring, notify_work_request_unreviewed FROM users WHERE id = ?").get(req.params.id)));
});

app.delete("/api/users/:id", requireAuth, requireOwner, (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: "You can't remove your own account" });
  db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

/* -------------------------------------------------------------
   Household data — a single shared JSON document per the
   functional spec's single-household scope, mirroring the
   in-memory shape the frontend already works with.
------------------------------------------------------------- */
app.get("/api/data", requireAuth, (req, res) => {
  const row = db.prepare("SELECT data FROM app_data WHERE id = 1").get();
  if (!row) {
    const seed = buildSeed();
    db.prepare("INSERT INTO app_data (id, data) VALUES (1, ?)").run(JSON.stringify(seed));
    return res.json(seed);
  }
  res.json(JSON.parse(row.data));
});

app.put("/api/data", requireAuth, (req, res) => {
  const payload = req.body;
  if (!payload || typeof payload !== "object") return res.status(400).json({ error: "Invalid payload" });
  db.prepare(
    "INSERT INTO app_data (id, data) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data"
  ).run(JSON.stringify(payload));
  res.json({ ok: true });
});

/* -------------------------------------------------------------
   Photo attachments (v1.6). A work request (or, once synced, a work
   order carried over from one) references attachments only by id —
   the JSON app_data blob never holds raw image data. Upload is
   multipart/form-data with a single "file" field; everything else
   here is plain JSON like the rest of the API.
------------------------------------------------------------- */
app.post("/api/attachments", requireAuth, (req, res) => {
  attachmentUpload.single("file")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || "Upload failed" });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const id = randomUUID();
    const uploadedAt = new Date().toISOString();
    db.prepare(
      "INSERT INTO attachments (id, filename, stored_name, mime_type, size, uploaded_by, created_at) VALUES (?,?,?,?,?,?,?)"
    ).run(id, req.file.originalname || req.file.filename, req.file.filename, req.file.mimetype, req.file.size, req.user.username, uploadedAt);
    res.json({ id, filename: req.file.originalname || req.file.filename, mimeType: req.file.mimetype, size: req.file.size, uploadedBy: req.user.username, uploadedAt });
  });
});

app.get("/api/attachments/:id/file", requireAuth, (req, res) => {
  const row = db.prepare("SELECT * FROM attachments WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Attachment not found" });
  const filePath = path.join(ATTACH_DIR, row.stored_name);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Attachment file missing on disk" });
  res.setHeader("Content-Type", row.mime_type || "application/octet-stream");
  res.setHeader("Cache-Control", "private, max-age=86400");
  res.sendFile(filePath);
});

app.delete("/api/attachments/:id", requireAuth, (req, res) => {
  const row = db.prepare("SELECT * FROM attachments WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Attachment not found" });
  try { fs.unlinkSync(path.join(ATTACH_DIR, row.stored_name)); } catch (e) { /* already gone — fine */ }
  db.prepare("DELETE FROM attachments WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

/* -------------------------------------------------------------
   Home Assistant sensor alarms (v1.7). Push, not poll — HA already has
   a mature automation engine for thresholds/debouncing/duration
   conditions, so it does that work and fires a rest_command at our
   webhook when a condition is actually met. That webhook is API-key
   authenticated (not the cookie session auth used everywhere else —
   HA has no browser to log in with), everything else here is normal
   cookie-authed JSON like the rest of the API.
------------------------------------------------------------- */
function getSetting(key) {
  const row = db.prepare("SELECT value FROM app_settings WHERE key = ?").get(key);
  return row ? row.value : null;
}
function setSetting(key, value) {
  db.prepare(
    "INSERT INTO app_settings (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(key, value);
}
function getOrCreateWebhookKey() {
  let key = getSetting("alarm_webhook_key");
  if (!key) {
    key = randomUUID().replace(/-/g, "");
    setSetting("alarm_webhook_key", key);
  }
  return key;
}
function requireAdminRole(req, res, next) {
  if (!req.user || (req.user.role !== "Owner" && req.user.role !== "Manager")) {
    return res.status(403).json({ error: "Owners and Managers only" });
  }
  next();
}
// v2: componentization gate for the Home Assistant-specific alarm
// routes (webhook, webhook key, entity mappings) — see features.js.
// Responds 404, not 403: when this component is off, these routes
// don't exist for this deployment, full stop (also matters for the
// unauthenticated webhook route below, which shouldn't hint at a key
// being checkable when the feature itself is disabled).
function requireHaAlarmsFeature(req, res, next) {
  if (!FEATURES.homeAssistantAlarms) {
    return res.status(404).json({ error: "Not found" });
  }
  next();
}
function rowToMapping(r) {
  return { entityId: r.entity_id, assetId: r.asset_id || null, locationId: r.location_id || null, label: r.label || "" };
}
function rowToAlarm(r) {
  let rawPayload = null;
  try { rawPayload = r.raw_payload ? JSON.parse(r.raw_payload) : null; } catch (e) { /* leave null */ }
  return {
    id: r.id, source: r.source, sourceEntityId: r.source_entity_id, friendlyName: r.friendly_name,
    assetId: r.asset_id || null, locationId: r.location_id || null, message: r.message,
    severity: r.severity, status: r.status,
    resolutionType: r.resolution_type || null, resolutionRef: r.resolution_ref || null, resolutionReason: r.resolution_reason || null,
    rawPayload, triggeredAt: r.triggered_at, createdAt: r.created_at, resolvedAt: r.resolved_at || null,
  };
}

// Owner-only: the webhook URL's API key. Generated on first request.
// Gated on the homeAssistantAlarms component (v2) — see requireHaAlarmsFeature.
app.get("/api/alarms/webhook-key", requireAuth, requireOwner, requireHaAlarmsFeature, (req, res) => {
  res.json({ key: getOrCreateWebhookKey() });
});
app.post("/api/alarms/webhook-key/regenerate", requireAuth, requireOwner, requireHaAlarmsFeature, (req, res) => {
  const key = randomUUID().replace(/-/g, "");
  setSetting("alarm_webhook_key", key);
  res.json({ key });
});

// Entity-id → asset/location mapping, so repeat alerts from the same
// sensor auto-resolve their asset/location without re-entering it.
// Home-Assistant-specific, so also gated on the component (v2).
app.get("/api/alarm-mappings", requireAuth, requireHaAlarmsFeature, (req, res) => {
  res.json(db.prepare("SELECT * FROM alarm_entity_map ORDER BY entity_id").all().map(rowToMapping));
});
app.post("/api/alarm-mappings", requireAuth, requireAdminRole, requireHaAlarmsFeature, (req, res) => {
  const { entityId, assetId, locationId, label } = req.body || {};
  if (!entityId || !entityId.trim()) return res.status(400).json({ error: "An entity id is required" });
  db.prepare(
    "INSERT INTO alarm_entity_map (entity_id, asset_id, location_id, label) VALUES (?,?,?,?) " +
      "ON CONFLICT(entity_id) DO UPDATE SET asset_id = excluded.asset_id, location_id = excluded.location_id, label = excluded.label"
  ).run(entityId.trim(), assetId || null, locationId || null, (label || "").trim() || null);
  res.json(rowToMapping(db.prepare("SELECT * FROM alarm_entity_map WHERE entity_id = ?").get(entityId.trim())));
});
app.delete("/api/alarm-mappings/:entityId", requireAuth, requireAdminRole, requireHaAlarmsFeature, (req, res) => {
  db.prepare("DELETE FROM alarm_entity_map WHERE entity_id = ?").run(req.params.entityId);
  res.json({ ok: true });
});

// The inbound webhook itself. Home Assistant's rest_command POSTs here —
// see the Alarm Dashboard for the exact payload shape/example. No
// requireAuth (HA has no browser session), but still gated on the
// component (v2) — a disabled deployment 404s a POST here exactly like
// any other route that doesn't exist for it.
app.post("/api/alarms", requireHaAlarmsFeature, (req, res) => {
  const provided = req.header("X-Api-Key") || (req.header("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!provided || provided !== getOrCreateWebhookKey()) {
    return res.status(401).json({ error: "Invalid or missing API key" });
  }
  const { entity_id, friendly_name, state, attributes, message, severity, timestamp } = req.body || {};
  if (!entity_id && !message) return res.status(400).json({ error: "entity_id or message is required" });
  const mapping = entity_id ? db.prepare("SELECT * FROM alarm_entity_map WHERE entity_id = ?").get(entity_id) : null;
  const id = randomUUID();
  const triggeredAt = timestamp || new Date().toISOString();
  const resolvedMessage = message || `${friendly_name || entity_id || "Sensor"}${state ? ` — ${state}` : ""}`;
  db.prepare(
    "INSERT INTO alarms (id, source, source_entity_id, friendly_name, asset_id, location_id, message, severity, status, raw_payload, triggered_at) " +
      "VALUES (?,?,?,?,?,?,?,?,?,?,?)"
  ).run(
    id, "home_assistant", entity_id || null, friendly_name || (mapping && mapping.label) || entity_id || null,
    mapping ? mapping.asset_id : null, mapping ? mapping.location_id : null,
    resolvedMessage, ["info", "warning", "critical"].includes(severity) ? severity : "warning", "open",
    JSON.stringify({ state: state || null, attributes: attributes || null }), triggeredAt
  );
  res.json({ ok: true, id });
});

// Manual/internal alarm creation (v1.8) — used by the "Create alarm" button
// on the Alarm Dashboard, and by the PM checklist out-of-range check in
// WorkOrdersView. Cookie-authed (unlike the HA webhook above). Any signed-in
// user can raise one (an Executor filling out a checklist needs to be able
// to trigger this, same as they can fill in the checklist itself) — viewing
// and managing alarms stays Owner/Manager-only via the existing GET/PATCH
// routes and the Alarm Dashboard's own nav gating. Dedupes: when a
// sourceEntityId is given, an OPEN alarm already carrying that same
// source + sourceEntityId is updated in place (message, severity,
// timestamp) instead of opening a duplicate.
app.post("/api/alarms/manual", requireAuth, (req, res) => {
  const { source, sourceEntityId, friendlyName, assetId, locationId, message, severity } = req.body || {};
  if (!message || !message.trim()) return res.status(400).json({ error: "A message is required" });
  const alarmSource = ["manual", "pm_checklist"].includes(source) ? source : "manual";
  const triggeredAt = new Date().toISOString();

  if (sourceEntityId) {
    const existing = db
      .prepare("SELECT * FROM alarms WHERE source = ? AND source_entity_id = ? AND status = 'open'")
      .get(alarmSource, sourceEntityId);
    if (existing) {
      db.prepare("UPDATE alarms SET message = ?, severity = ?, triggered_at = ? WHERE id = ?").run(
        message.trim(),
        ["info", "warning", "critical"].includes(severity) ? severity : existing.severity,
        triggeredAt,
        existing.id
      );
      return res.json(rowToAlarm(db.prepare("SELECT * FROM alarms WHERE id = ?").get(existing.id)));
    }
  }

  const id = randomUUID();
  db.prepare(
    "INSERT INTO alarms (id, source, source_entity_id, friendly_name, asset_id, location_id, message, severity, status, raw_payload, triggered_at) " +
      "VALUES (?,?,?,?,?,?,?,?,?,?,?)"
  ).run(
    id,
    alarmSource,
    sourceEntityId || null,
    friendlyName || null,
    assetId || null,
    locationId || null,
    message.trim(),
    ["info", "warning", "critical"].includes(severity) ? severity : "warning",
    "open",
    null,
    triggeredAt
  );
  res.json(rowToAlarm(db.prepare("SELECT * FROM alarms WHERE id = ?").get(id)));
});

// The alarm queue itself, for the dashboard tab.
app.get("/api/alarms", requireAuth, (req, res) => {
  const status = req.query.status;
  const rows = status
    ? db.prepare("SELECT * FROM alarms WHERE status = ? ORDER BY triggered_at DESC").all(status)
    : db.prepare("SELECT * FROM alarms ORDER BY triggered_at DESC").all();
  res.json(rows.map(rowToAlarm));
});
app.patch("/api/alarms/:id", requireAuth, requireAdminRole, (req, res) => {
  const row = db.prepare("SELECT * FROM alarms WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Alarm not found" });
  const { status, resolutionType, resolutionRef, resolutionReason } = req.body || {};
  const nextStatus = status || row.status;
  const resolvedAt = nextStatus !== "open" ? (row.resolved_at || new Date().toISOString()) : null;
  db.prepare(
    "UPDATE alarms SET status = ?, resolution_type = ?, resolution_ref = ?, resolution_reason = ?, resolved_at = ? WHERE id = ?"
  ).run(nextStatus, resolutionType || null, resolutionRef || null, resolutionReason || null, resolvedAt, req.params.id);
  res.json(rowToAlarm(db.prepare("SELECT * FROM alarms WHERE id = ?").get(req.params.id)));
});

/* -------------------------------------------------------------
   Serve the built frontend (single-container deployment)
------------------------------------------------------------- */
const staticDir = path.join(__dirname, "public");

// v2.1: the PWA manifest is generated from the edition config so the
// installed app's name and theme colour match the deployment's branding.
// Registered ahead of express.static so it wins over the built file.
app.get("/manifest.json", (req, res) => {
  let base = {};
  try { base = JSON.parse(fs.readFileSync(path.join(staticDir, "manifest.json"), "utf8")); } catch (e) { /* dev/no build */ }
  res.type("application/manifest+json").json({
    ...base,
    name: EDITION.brand.name,
    short_name: EDITION.brand.shortName && EDITION.brand.name.length > 12 ? EDITION.brand.shortName : EDITION.brand.name,
    description: `${EDITION.brand.name} — ${EDITION.brand.tagline || "maintenance management"}`,
    theme_color: EDITION.brand.colors.primary,
  });
});
// Logos and other per-deployment brand assets: drop files in
// DATA_DIR/branding/ and reference them as /branding/<file> in
// BRAND_LOGO_URL.
const brandingDir = path.join(db.DATA_DIR, "branding");
if (!fs.existsSync(brandingDir)) fs.mkdirSync(brandingDir, { recursive: true });
app.use("/branding", express.static(brandingDir, { maxAge: "1h" }));
app.use(express.static(staticDir));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(staticDir, "index.html"));
});

app.listen(PORT, () => {
  console.log(`MaintEnhance server listening on port ${PORT}`);
  startNotificationScheduler(db);
});
