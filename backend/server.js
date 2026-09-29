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

const app = express();
const PORT = process.env.PORT || 8040;

// Photo/document attachments (v1.6) — stored on disk under the same
// mounted-volume DATA_DIR the SQLite file lives in, so they survive
// container restarts/rebuilds the same way the database does. Only the
// attachment's id (not the file itself) is ever stored in the household
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
  db.prepare("INSERT OR REPLACE INTO household (id, data) VALUES (1, ?)").run(JSON.stringify(SEED));
  const user = { id, username: username.trim(), role: "Owner" };
  res.cookie("homekeep_token", signToken(user), COOKIE_OPTS);
  res.json(user);
});

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body || {};
  const row = db.prepare("SELECT * FROM users WHERE username = ?").get((username || "").trim());
  if (!row || !verifyPassword(password || "", row.password_hash)) {
    return res.status(401).json({ error: "Invalid username or password" });
  }
  const user = { id: row.id, username: row.username, role: row.role };
  res.cookie("homekeep_token", signToken(user), COOKIE_OPTS);
  res.json(user);
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("homekeep_token");
  res.json({ ok: true });
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json(req.user);
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
    console.error("[homekeep] Failed to create user:", e.message);
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
  const row = db.prepare("SELECT data FROM household WHERE id = 1").get();
  if (!row) {
    db.prepare("INSERT INTO household (id, data) VALUES (1, ?)").run(JSON.stringify(SEED));
    return res.json(SEED);
  }
  res.json(JSON.parse(row.data));
});

app.put("/api/data", requireAuth, (req, res) => {
  const payload = req.body;
  if (!payload || typeof payload !== "object") return res.status(400).json({ error: "Invalid payload" });
  db.prepare(
    "INSERT INTO household (id, data) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data"
  ).run(JSON.stringify(payload));
  res.json({ ok: true });
});

/* -------------------------------------------------------------
   Photo attachments (v1.6). A work request (or, once synced, a work
   order carried over from one) references attachments only by id —
   the JSON household blob never holds raw image data. Upload is
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
   Serve the built frontend (single-container deployment)
------------------------------------------------------------- */
const staticDir = path.join(__dirname, "public");
app.use(express.static(staticDir));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(staticDir, "index.html"));
});

app.listen(PORT, () => {
  console.log(`HomeKeep server listening on port ${PORT}`);
  startNotificationScheduler(db);
});
