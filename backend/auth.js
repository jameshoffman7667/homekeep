const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const db = require("./db");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn(
    "[maintenhance] WARNING: JWT_SECRET is not set. Using an insecure default — " +
      "set JWT_SECRET to a long random string in your environment before exposing this beyond localhost."
  );
}
const SECRET = JWT_SECRET || "dev-insecure-secret-change-me";

const MIN_PASSWORD_LENGTH = 8;

function hashPassword(pw) {
  return bcrypt.hashSync(pw, 10);
}
function verifyPassword(pw, hash) {
  return bcrypt.compareSync(pw, hash);
}
// v2.2: `tv` is the user's token_version. Changing or resetting a password
// bumps it, which invalidates every other session for that user. Tokens
// issued before v2.2 carry no `tv`, which is treated as 0 (the column's
// default) so existing sessions keep working across the upgrade.
function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, tv: user.tokenVersion || 0 },
    SECRET,
    { expiresIn: "30d" }
  );
}

// Paths a user who must change their password is still allowed to reach.
const FORCED_CHANGE_ALLOWED = ["/api/auth/change-password", "/api/auth/logout", "/api/auth/me"];

function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies.maintenhance_token;
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  let payload;
  try {
    payload = jwt.verify(token, SECRET);
  } catch (e) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
  // v2.2: look the user up on every request so a deleted account, a
  // changed role, a password change (token_version) or a pending forced
  // change all take effect immediately rather than at token expiry.
  const row = db
    .prepare("SELECT id, username, role, token_version, must_change_password FROM users WHERE id = ?")
    .get(payload.id);
  if (!row) return res.status(401).json({ error: "Invalid or expired session" });
  if ((payload.tv || 0) !== (row.token_version || 0)) {
    return res.status(401).json({ error: "Your session has ended — please sign in again" });
  }
  req.user = {
    id: row.id,
    username: row.username,
    role: row.role,
    tokenVersion: row.token_version || 0,
    mustChangePassword: !!row.must_change_password,
  };
  if (req.user.mustChangePassword) {
    const p = (req.originalUrl || req.url || "").split("?")[0];
    if (!FORCED_CHANGE_ALLOWED.includes(p)) {
      return res.status(403).json({ error: "You must change your password before continuing", code: "PASSWORD_CHANGE_REQUIRED" });
    }
  }
  next();
}
function requireOwner(req, res, next) {
  if (!req.user || req.user.role !== "Owner") return res.status(403).json({ error: "Owners only" });
  next();
}

// Simple in-memory attempt limiter (per process; resets on restart, which
// is fine for a single-container deployment). `check` returns the number of
// seconds to wait if the key is currently blocked, else 0.
function makeLimiter({ max, windowMs }) {
  const hits = new Map();
  return {
    check(key) {
      const now = Date.now();
      const rec = hits.get(key);
      if (!rec || now - rec.start > windowMs) return 0;
      return rec.count >= max ? Math.ceil((rec.start + windowMs - now) / 1000) : 0;
    },
    fail(key) {
      const now = Date.now();
      const rec = hits.get(key);
      if (!rec || now - rec.start > windowMs) hits.set(key, { start: now, count: 1 });
      else rec.count++;
      if (hits.size > 5000) for (const [k, v] of hits) if (now - v.start > windowMs) hits.delete(k);
    },
    clear(key) { hits.delete(key); },
  };
}

module.exports = { hashPassword, verifyPassword, signToken, requireAuth, requireOwner, makeLimiter, MIN_PASSWORD_LENGTH };
