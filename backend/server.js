const express = require("express");
const cookieParser = require("cookie-parser");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { randomUUID } = require("crypto");
const db = require("./db");
const SEED = require("./seed");
const { hashPassword, verifyPassword, signToken, requireAuth, requireOwner, makeLimiter, MIN_PASSWORD_LENGTH } = require("./auth");
const { startNotificationScheduler, mailEnabled, sendMail } = require("./notify");
const { FEATURES } = require("./features");
const settings = require("./settings");
const prefill = require("./prefill");
const { runMigrations } = require("./migrate");
const backup = require("./backup");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 8040;

// First-run seed = the empty base shape (see seed.js).
function buildSeed() {
  return JSON.parse(JSON.stringify(SEED));
}

// Photo/document attachments (v1.6) — stored on disk under the same
// mounted-volume DATA_DIR the SQLite file lives in, so they survive
// container restarts/rebuilds the same way the database does. Only the
// attachment's id (not the file itself) is ever stored in the app_data
// JSON blob — see PUT /api/data's 2mb body limit above, which a photo
// would blow past in no time if it were embedded inline.
const ATTACH_DIR = db.ATTACH_DIR; // see FILES_DIR in db.js
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

// 25 MB: a restored workbook or a long work-order history can exceed the old 2 MB cap.
app.use(express.json({ limit: "25mb" }));
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
// Public (pre-login) config: Owner-managed brand, colours, terminology and
// feature toggles (v2.2), plus whether the emailed password reset is available.
const passwordResetAvailable = () => mailEnabled() && !!(process.env.APP_URL || "").trim();
// Extra public flags: password reset availability and whether a Gemini key is
// configured (only yes/no, never the key itself).
const configExtra = () => ({ passwordResetEmail: passwordResetAvailable(), geminiKeyDetected: prefill.geminiAvailable(), mailConfigured: mailEnabled(), version: require("./changelog").version });
app.get("/api/changelog", requireAuth, (req, res) => {
  const cl = require("./changelog");
  res.json({ version: cl.version, entries: cl.entries() });
});
app.get("/api/config", (req, res) => {
  res.json(settings.publicConfig(configExtra()));
});

app.get("/api/auth/setup-status", (req, res) => {
  const count = db.prepare("SELECT COUNT(*) AS n FROM users").get().n;
  res.json({ needsSetup: count === 0 });
});

function sessionUser(row) {
  return rowToUser(row);
}
function issueSession(res, row) {
  res.cookie("maintenhance_token", signToken({ id: row.id, username: row.username, role: row.role, tokenVersion: row.token_version || 0 }), COOKIE_OPTS);
}
function validNewPassword(pw) {
  if (typeof pw !== "string" || pw.length < MIN_PASSWORD_LENGTH) return `The password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  if (pw.length > 200) return "That password is too long";
  return null;
}
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
// Returns an error string, or null when the email is blank or valid and not used by another user.
function emailProblem(email, exceptUserId) {
  const e = (email || "").trim();
  if (!e) return null;
  if (!EMAIL_RE.test(e) || e.length > 200) return "That doesn't look like a valid email address";
  const clash = db.prepare("SELECT id FROM users WHERE lower(email) = lower(?) AND id != ?").get(e, exceptUserId || "");
  return clash ? "That email address is already used by another user" : null;
}

app.post("/api/auth/setup", (req, res) => {
  const count = db.prepare("SELECT COUNT(*) AS n FROM users").get().n;
  if (count > 0) return res.status(400).json({ error: "Setup has already been completed" });
  const { username, password } = req.body || {};
  const pwProblem = validNewPassword(password);
  if (!username || !username.trim() || pwProblem) {
    return res.status(400).json({ error: !username || !username.trim() ? "A username is required" : pwProblem });
  }
  const id = randomUUID();
  db.prepare("INSERT INTO users (id, username, password_hash, role, notify_pm_overdue, notify_warranty_expiring, notify_work_request_unreviewed) VALUES (?,?,?,?,0,0,0)").run(
    id,
    username.trim(),
    hashPassword(password),
    "Owner"
  );
  db.prepare("INSERT OR REPLACE INTO app_data (id, data) VALUES (1, ?)").run(JSON.stringify(buildSeed()));
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  issueSession(res, row);
  res.json(sessionUser(row));
});

// Failed-login throttle: 8 failures per username+IP in 15 minutes.
const loginLimiter = makeLimiter({ max: 8, windowMs: 15 * 60 * 1000 });
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body || {};
  const uname = (username || "").trim();
  const key = `${req.ip}|${uname.toLowerCase()}`;
  const wait = loginLimiter.check(key);
  if (wait) {
    return res.status(429).json({ error: `Too many failed sign-in attempts. Try again in ${Math.ceil(wait / 60)} minute(s).` });
  }
  const row = db.prepare("SELECT * FROM users WHERE username = ?").get(uname);
  if (!row || !verifyPassword(password || "", row.password_hash)) {
    loginLimiter.fail(key);
    return res.status(401).json({ error: "Invalid username or password" });
  }
  loginLimiter.clear(key);
  issueSession(res, row);
  res.json(sessionUser(row));
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("maintenhance_token");
  res.json({ ok: true });
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  const row = db.prepare("SELECT " + USER_COLS + " FROM users WHERE id = ?").get(req.user.id);
  res.json({ ...rowToUser(row), mustChangePassword: req.user.mustChangePassword, features: FEATURES });
});

// Any signed-in user can change their own password — including one who is
// being forced to. Ends every other session for this user and re-issues
// this one.
app.post("/api/auth/change-password", requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  // v2.6: someone signed in with a temporary password may choose their own without re-typing it.
  const forced = !!(row && row.must_change_password);
  if (!row || (!forced && !verifyPassword(currentPassword || "", row.password_hash))) {
    return res.status(400).json({ error: "Your current password isn't correct" });
  }
  const problem = validNewPassword(newPassword);
  if (problem) return res.status(400).json({ error: problem });
  if (verifyPassword(newPassword, row.password_hash)) {
    return res.status(400).json({ error: "The new password must be different from the current one" });
  }
  db.prepare("UPDATE users SET password_hash = ?, must_change_password = 0, token_version = token_version + 1 WHERE id = ?")
    .run(hashPassword(newPassword), row.id);
  const fresh = db.prepare("SELECT * FROM users WHERE id = ?").get(row.id);
  issueSession(res, fresh);
  res.json({ ok: true, user: sessionUser(fresh) });
});

// A user's own email, profile photo and digest subscriptions.
app.patch("/api/auth/profile", requireAuth, (req, res) => {
  const body = req.body || {};
  const sets = []; const vals = [];
  if (body.email !== undefined) {
    const email = (body.email || "").trim();
    const problem = emailProblem(email, req.user.id);
    if (problem) return res.status(400).json({ error: problem });
    sets.push("email = ?"); vals.push(email || null);
  }
  if (body.avatar !== undefined) {
    const a = body.avatar || "";
    if (a && (!/^data:image\/(jpeg|png|webp);base64,/.test(a) || a.length > 200000)) return res.status(400).json({ error: "That photo is not usable" });
    sets.push("avatar = ?"); vals.push(a || null);
  }
  for (const [k, col] of NOTIFY_FIELDS) if (body[k] !== undefined) { sets.push(col + " = ?"); vals.push(body[k] ? 1 : 0); }
  { const e = applyNotifySchedule(body, sets, vals); if (e) return res.status(400).json({ error: e }); }
  if (sets.length) db.prepare("UPDATE users SET " + sets.join(", ") + " WHERE id = ?").run(...vals, req.user.id);
  res.json({ ok: true, user: rowToUser(db.prepare("SELECT " + USER_COLS + " FROM users WHERE id = ?").get(req.user.id)) });
});

// ---- Emailed password reset (needs SMTP_HOST and APP_URL) ----
const forgotLimiter = makeLimiter({ max: 5, windowMs: 60 * 60 * 1000 });
const sha256 = (v) => crypto.createHash("sha256").update(v).digest("hex");
app.post("/api/auth/forgot", async (req, res) => {
  // Same answer whether or not an account exists, so this can't be used to find accounts.
  const generic = { ok: true, message: "If an account matches, a reset link has been emailed." };
  if (!passwordResetAvailable()) return res.status(404).json({ error: "Emailed password reset isn't set up on this server" });
  const ident = String((req.body || {}).identifier || "").trim();
  if (!ident) return res.json(generic);
  const key = req.ip;
  if (forgotLimiter.check(key)) return res.status(429).json({ error: "Too many requests. Please try again later." });
  forgotLimiter.fail(key);
  try {
    const row = db.prepare("SELECT * FROM users WHERE (username = ? OR lower(email) = lower(?)) AND email IS NOT NULL AND email != ''").get(ident, ident);
    if (row) {
      const token = crypto.randomBytes(32).toString("hex");
      db.prepare("DELETE FROM password_resets WHERE user_id = ?").run(row.id);
      db.prepare("INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?,?,?)")
        .run(sha256(token), row.id, new Date(Date.now() + 60 * 60 * 1000).toISOString());
      const base = process.env.APP_URL.trim().replace(/\/+$/, "");
      const brand = settings.current().brand.name;
      await sendMail({
        to: row.email,
        subject: `${brand} — reset your password`,
        text: `Hi ${row.username},\n\nSomeone asked to reset the password for your ${brand} account. Use this link within one hour:\n\n${base}/?reset=${token}\n\nIf you didn't ask for this, you can ignore this email — your password hasn't changed.\n\n— ${brand}`,
      });
    }
  } catch (e) {
    console.error("[maintenhance] Password reset email failed:", e.message);
  }
  res.json(generic);
});
app.post("/api/auth/reset", (req, res) => {
  const { token, newPassword } = req.body || {};
  const problem = validNewPassword(newPassword);
  if (problem) return res.status(400).json({ error: problem });
  const bad = { error: "This reset link is invalid or has expired. Request a new one." };
  if (!token || typeof token !== "string") return res.status(400).json(bad);
  const rec = db.prepare("SELECT * FROM password_resets WHERE token_hash = ?").get(sha256(token));
  if (!rec || rec.expires_at < new Date().toISOString()) return res.status(400).json(bad);
  db.prepare("UPDATE users SET password_hash = ?, must_change_password = 0, token_version = token_version + 1 WHERE id = ?")
    .run(hashPassword(newPassword), rec.user_id);
  db.prepare("DELETE FROM password_resets WHERE user_id = ?").run(rec.user_id);
  res.json({ ok: true });
});

/* -------------------------------------------------------------
   Owner-managed settings (v2.2): branding, terminology, features.
------------------------------------------------------------- */
app.put("/api/settings", requireAuth, requireOwner, (req, res) => {
  const v = settings.validate(req.body || {});
  if (!v.ok) return res.status(400).json({ error: v.errors.join(". "), errors: v.errors });
  settings.save(v.settings);
  res.json(settings.publicConfig(configExtra()));
});
app.post("/api/settings/reset", requireAuth, requireOwner, (req, res) => {
  settings.resetToDefaults();
  res.json(settings.publicConfig(configExtra()));
});
app.put("/api/settings/logo", requireAuth, requireOwner, (req, res) => {
  const dataUrl = (req.body || {}).dataUrl;
  const v = settings.validateLogo(dataUrl);
  if (!v.ok) return res.status(400).json({ error: v.error });
  settings.setLogo(dataUrl);
  res.json(settings.publicConfig(configExtra()));
});
app.delete("/api/settings/logo", requireAuth, requireOwner, (req, res) => {
  settings.clearLogo();
  res.json(settings.publicConfig(configExtra()));
});
// Public: the logo is shown on the login screen. Served as an image only
// (nosniff + a sandboxing CSP so an SVG can never run script).
app.get("/api/logo", (req, res) => {
  const logo = settings.getLogo();
  if (!logo) return res.status(404).end();
  res.setHeader("Content-Type", logo.mime);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; sandbox");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.send(logo.buf);
});

/* -------------------------------------------------------------
   Link pre-fill (v2.3): suggest asset / vendor / part fields from a web
   page. Guests can't create records so they can't use it either.
------------------------------------------------------------- */
const prefillLimiter = makeLimiter({ max: 30, windowMs: 10 * 60 * 1000 });
app.post("/api/prefill", requireAuth, async (req, res) => {
  const cfg = settings.current();
  if (!cfg.features.linkPrefill) return res.status(404).json({ error: "Link pre-fill is turned off" });
  if (req.user.role === "Guest") return res.status(403).json({ error: "Guests can't use link pre-fill" });
  const key = String(req.user.id);
  const wait = prefillLimiter.check(key);
  if (wait) return res.status(429).json({ error: `Too many link look-ups. Try again in ${Math.ceil(wait / 60)} minute(s).` });
  prefillLimiter.fail(key);
  const { url, kind } = req.body || {};
  try {
    const r = await prefill.prefill(url, kind, { useAi: !!cfg.features.linkPrefillAi });
    res.json(r);
  } catch (e) {
    if (e && e.userFacing) return res.status(400).json({ error: e.message });
    console.error("prefill failed:", e && e.message);
    res.status(502).json({ error: "Couldn't read that page." });
  }
});

/* -------------------------------------------------------------
   Household member management. Listing is open to any
   authenticated user (work orders need to offer an Executor
   picker built from this list); creating/removing accounts stays
   Owner-only — that UI only lives on the Owner Tools page anyway.
------------------------------------------------------------- */
const DESIGNATIONS = ["planner", "scheduler", "specialist", "executor"];
function parseDesignations(v) {
  try { const a = JSON.parse(v || "[]"); return Array.isArray(a) ? a.filter((x) => DESIGNATIONS.includes(x)) : []; } catch (e) { return []; }
}
const NOTIFY_FIELDS = [
  ["notifyPmOverdue", "notify_pm_overdue"], ["notifyWarrantyExpiring", "notify_warranty_expiring"],
  ["notifyWorkRequestUnreviewed", "notify_work_request_unreviewed"], ["notifyAlarms", "notify_alarms"],
  ["notifyLowStock", "notify_low_stock"], ["notifyMySchedule", "notify_my_schedule"], ["notifyTeamSchedule", "notify_team_schedule"], ["notifyAppUpdates", "notify_app_updates"],
];
// v2.6.1: delivery schedule fields (validated).
function applyNotifySchedule(body, sets, vals) {
  if (body.notifyFreq !== undefined) { if (!["daily", "weekdays", "weekly"].includes(body.notifyFreq)) return "Frequency must be daily, weekdays or weekly"; sets.push("notify_freq = ?"); vals.push(body.notifyFreq); }
  if (body.notifyTime !== undefined) { if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(body.notifyTime)) return "Time must look like 07:30"; sets.push("notify_time = ?"); vals.push(body.notifyTime); }
  if (body.notifyWeekday !== undefined) { const n = Number(body.notifyWeekday); if (!Number.isInteger(n) || n < 0 || n > 6) return "Weekday must be 0–6"; sets.push("notify_weekday = ?"); vals.push(n); }
  return null;
}
const USER_COLS = "id, username, role, email, must_change_password, notify_pm_overdue, notify_warranty_expiring, notify_work_request_unreviewed, designations, avatar, notify_alarms, notify_low_stock, notify_my_schedule, notify_team_schedule, notify_app_updates, notify_freq, notify_time, notify_weekday";
function rowToUser(row) {
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    email: row.email || "",
    mustChangePassword: !!row.must_change_password,
    notifyPmOverdue: !!row.notify_pm_overdue,
    notifyWarrantyExpiring: !!row.notify_warranty_expiring,
    notifyWorkRequestUnreviewed: !!row.notify_work_request_unreviewed,
    notifyAlarms: !!row.notify_alarms,
    notifyLowStock: !!row.notify_low_stock,
    notifyMySchedule: !!row.notify_my_schedule,
    notifyTeamSchedule: !!row.notify_team_schedule,
    notifyAppUpdates: !!row.notify_app_updates,
    notifyFreq: row.notify_freq || "daily",
    notifyTime: row.notify_time || "07:00",
    notifyWeekday: row.notify_weekday == null ? 1 : row.notify_weekday,
    designations: parseDesignations(row.designations),
    avatar: row.avatar || "",
  };
}

app.get("/api/users", requireAuth, (req, res) => {
  const rows = db.prepare(
    "SELECT id, username, role, email, must_change_password, notify_pm_overdue, notify_warranty_expiring, notify_work_request_unreviewed, designations, avatar, notify_alarms, notify_low_stock, notify_my_schedule, notify_team_schedule, notify_app_updates, notify_freq, notify_time, notify_weekday FROM users ORDER BY created_at"
  ).all();
  res.json(rows.map(rowToUser));
});

app.post("/api/users", requireAuth, requireOwner, (req, res) => {
  const { username, password, role, email } = req.body || {};
  if (!username || !username.trim()) return res.status(400).json({ error: "A username is required" });
  const pwProblem = validNewPassword(password);
  if (pwProblem) return res.status(400).json({ error: pwProblem });
  const emailErr = emailProblem(email);
  if (emailErr) return res.status(400).json({ error: emailErr });
  if (!["Owner", "Manager", "Executor", "Guest"].includes(role)) {
    return res.status(400).json({ error: "Role must be Owner, Manager, Executor, or Guest" });
  }
  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username.trim());
  if (existing) return res.status(400).json({ error: "That username is already taken" });
  const id = randomUUID();
  try {
    db.prepare("INSERT INTO users (id, username, password_hash, role, email, must_change_password, notify_pm_overdue, notify_warranty_expiring, notify_work_request_unreviewed) VALUES (?,?,?,?,?,1,0,0,0)").run(
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
  res.json(rowToUser(db.prepare("SELECT id, username, role, email, must_change_password, notify_pm_overdue, notify_warranty_expiring, notify_work_request_unreviewed, designations, avatar, notify_alarms, notify_low_stock, notify_my_schedule, notify_team_schedule, notify_app_updates, notify_freq, notify_time, notify_weekday FROM users WHERE id = ?").get(id)));
});

// Update a user's notification email/preferences. Owner-only, same as
// add/remove — the only place this is edited from is Owner Tools.
app.patch("/api/users/:id", requireAuth, requireOwner, (req, res) => {
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "No such user" });
  const body = req.body || {};
  const email = body.email !== undefined ? body.email : row.email;
  const emailErr = emailProblem(email, req.params.id);
  if (emailErr) return res.status(400).json({ error: emailErr });
  const sets = ["email = ?"]; const vals = [(email || "").trim() || null];
  for (const [k, col] of NOTIFY_FIELDS) if (body[k] !== undefined) { sets.push(col + " = ?"); vals.push(body[k] ? 1 : 0); }
  { const e = applyNotifySchedule(body, sets, vals); if (e) return res.status(400).json({ error: e }); }
  if (body.designations !== undefined) {
    sets.push("designations = ?");
    vals.push(JSON.stringify(parseDesignations(JSON.stringify(Array.isArray(body.designations) ? body.designations : []))));
  }
  db.prepare("UPDATE users SET " + sets.join(", ") + " WHERE id = ?").run(...vals, req.params.id);
  res.json(rowToUser(db.prepare("SELECT " + USER_COLS + " FROM users WHERE id = ?").get(req.params.id)));
});

// Emails a member their username, temporary password and sign-in link (Owner only; needs SMTP).
app.post("/api/users/:id/email-credentials", requireAuth, requireOwner, async (req, res) => {
  if (!mailEnabled()) return res.status(400).json({ error: "Email isn't set up on this server (SMTP_HOST is not configured)." });
  const row = db.prepare("SELECT username, email FROM users WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "No such user" });
  if (!row.email) return res.status(400).json({ error: "That member has no email address" });
  const pw = ((req.body || {}).password || "").toString();
  if (!pw) return res.status(400).json({ error: "No temporary password supplied" });
  const link = (process.env.APP_URL || "").trim().replace(/\/$/, "") || `${req.protocol}://${req.get("host")}`;
  const name = settings.current().brand.name;
  try {
    await sendMail({
      to: row.email,
      subject: `Your ${name} sign-in details`,
      text: `Hi ${row.username},\n\nYour account is ready.\n\nSign in: ${link}\nUsername: ${row.username}\nTemporary password: ${pw}\n\nYou'll be asked to choose your own password the first time you sign in.\n\n— ${name}`,
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Couldn't send the email: " + e.message });
  }
});

// Owner sets a temporary password (typed, or generated and shown once). The
// user must replace it at their next sign-in, and any open sessions end.
app.post("/api/users/:id/reset-password", requireAuth, requireOwner, (req, res) => {
  const row = db.prepare("SELECT id FROM users WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "No such user" });
  if (req.params.id === req.user.id) return res.status(400).json({ error: "Use Change password for your own account" });
  let pw = ((req.body || {}).password || "").toString();
  if (pw) {
    const problem = validNewPassword(pw);
    if (problem) return res.status(400).json({ error: problem });
  } else {
    // 12 characters from an alphabet without look-alikes (no 0/O, 1/l/I).
    const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    pw = Array.from(crypto.randomBytes(12), (b) => alphabet[b % alphabet.length]).join("");
  }
  db.prepare("UPDATE users SET password_hash = ?, must_change_password = 1, token_version = token_version + 1 WHERE id = ?")
    .run(hashPassword(pw), req.params.id);
  res.json({ ok: true, temporaryPassword: pw });
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
function requireAlarmAck(req, res, next) {
  if (req.user && (req.user.role === "Owner" || req.user.role === "Manager")) return next();
  const r = db.prepare("SELECT designations FROM users WHERE id = ?").get(req.user && req.user.id);
  if (req.user && req.user.role === "Executor" && r && parseDesignations(r.designations).includes("specialist")) return next();
  return res.status(403).json({ error: "Owners, Managers and Specialists only" });
}
app.patch("/api/alarms/:id", requireAuth, requireAlarmAck, (req, res) => {
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

// The PWA manifest is generated from the Owner's saved branding so the
// installed app's name and theme colour match. Registered ahead of
// express.static so it wins over the built file.
app.get("/manifest.json", (req, res) => {
  let base = {};
  try { base = JSON.parse(fs.readFileSync(path.join(staticDir, "manifest.json"), "utf8")); } catch (e) { /* dev/no build */ }
  const b = settings.current().brand;
  res.type("application/manifest+json").json({
    ...base,
    name: b.name,
    short_name: b.shortName && b.name.length > 12 ? b.shortName : b.name,
    description: `${b.name} — ${b.tagline || "maintenance management"}`,
    theme_color: b.colors.primary,
  });
});
app.use(express.static(staticDir));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(staticDir, "index.html"));
});

runMigrations();
backup.register(app, { requireAuth, requireOwner, ATTACH_DIR });

app.listen(PORT, () => {
  console.log(`MaintEnhance server listening on port ${PORT}`);
  startNotificationScheduler(db);
});
