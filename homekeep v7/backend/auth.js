const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn(
    "[homekeep] WARNING: JWT_SECRET is not set. Using an insecure default — " +
      "set JWT_SECRET to a long random string in your environment before exposing this beyond localhost."
  );
}
const SECRET = JWT_SECRET || "dev-insecure-secret-change-me";

function hashPassword(pw) {
  return bcrypt.hashSync(pw, 10);
}
function verifyPassword(pw, hash) {
  return bcrypt.compareSync(pw, hash);
}
function signToken(user) {
  return jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET, { expiresIn: "30d" });
}
function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies.homekeep_token;
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch (e) {
    res.status(401).json({ error: "Invalid or expired session" });
  }
}
function requireOwner(req, res, next) {
  if (!req.user || req.user.role !== "Owner") return res.status(403).json({ error: "Owners only" });
  next();
}

module.exports = { hashPassword, verifyPassword, signToken, requireAuth, requireOwner };
