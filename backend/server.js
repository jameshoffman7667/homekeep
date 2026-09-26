const express = require("express");
const cookieParser = require("cookie-parser");
const path = require("path");
const { randomUUID } = require("crypto");
const db = require("./db");
const SEED = require("./seed");
const { hashPassword, verifyPassword, signToken, requireAuth, requireOwner } = require("./auth");

const app = express();
const PORT = process.env.PORT || 8040;

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
app.get("/api/users", requireAuth, (req, res) => {
  res.json(db.prepare("SELECT id, username, role, created_at FROM users ORDER BY created_at").all());
});

app.post("/api/users", requireAuth, requireOwner, (req, res) => {
  const { username, password, role } = req.body || {};
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
    db.prepare("INSERT INTO users (id, username, password_hash, role) VALUES (?,?,?,?)").run(
      id,
      username.trim(),
      hashPassword(password),
      role
    );
  } catch (e) {
    console.error("[homekeep] Failed to create user:", e.message);
    return res.status(400).json({ error: "Couldn't create that account. Check the server logs for details." });
  }
  res.json({ id, username: username.trim(), role });
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
});
