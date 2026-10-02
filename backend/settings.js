// v2.2: Owner-managed settings (branding, terminology, features).
//
// Replaces the v2.1 env/"edition" approach: the app always ships in one
// original (Home) configuration, and the Owner edits it after deployment
// in Owner Tools. Everything is stored in the app_settings key/value
// table, so it is enforced per request (no restart) and backed up by the
// Excel export's Settings sheet. Secrets (JWT_SECRET, SMTP, ...) stay in
// Docker env and are never stored here.
const crypto = require("crypto");
const db = require("./db");

const LEVEL_KEYS = ["Property", "Structure", "Floor", "Room", "Area", "Sub-area"];

const DEFAULTS = {
  brand: {
    name: "MaintEnhance",
    shortName: "ME",
    tagline: "Maintenance Management",
    topBarTitle: "",
    colors: { primary: "#28415F", primaryDark: "#7FA3CC", accent: "#C85410", accentDark: "#E38C4E" },
  },
  terms: {
    orgNoun: "household",
    locationLevels: LEVEL_KEYS.slice(),
    siteLevelIndex: 0,
  },
  features: { homeAssistantAlarms: true },
};

const LOGO_MAX_BYTES = 512 * 1024;
const LOGO_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
const COLOR_RE = /^#[0-9a-fA-F]{6}$/;

function getRaw(key) {
  const row = db.prepare("SELECT value FROM app_settings WHERE key = ?").get(key);
  return row ? row.value : null;
}
function setRaw(key, value) {
  if (value == null) db.prepare("DELETE FROM app_settings WHERE key = ?").run(key);
  else
    db.prepare("INSERT INTO app_settings (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, value);
}

function clone(o) { return JSON.parse(JSON.stringify(o)); }

// Current effective settings = defaults overlaid with whatever the Owner saved.
function current() {
  const out = clone(DEFAULTS);
  let saved = null;
  try { saved = JSON.parse(getRaw("owner_settings") || "null"); } catch (e) { saved = null; }
  if (saved && typeof saved === "object") {
    const b = saved.brand || {}, t = saved.terms || {}, f = saved.features || {};
    for (const k of ["name", "shortName", "tagline", "topBarTitle"]) if (typeof b[k] === "string") out.brand[k] = b[k];
    if (b.colors) for (const k of Object.keys(out.brand.colors)) if (COLOR_RE.test(b.colors[k] || "")) out.brand.colors[k] = b.colors[k];
    if (typeof t.orgNoun === "string" && t.orgNoun.trim()) out.terms.orgNoun = t.orgNoun;
    if (Array.isArray(t.locationLevels) && t.locationLevels.length === 6 && t.locationLevels.every((x) => typeof x === "string" && x.trim()))
      out.terms.locationLevels = t.locationLevels.slice();
    if (Number.isInteger(t.siteLevelIndex) && t.siteLevelIndex >= 0 && t.siteLevelIndex < 6) out.terms.siteLevelIndex = t.siteLevelIndex;
    if (typeof f.homeAssistantAlarms === "boolean") out.features.homeAssistantAlarms = f.homeAssistantAlarms;
  }
  return out;
}

// Validates a settings object (the shape of DEFAULTS). Returns
// { ok, settings, errors[] }; `settings` is the cleaned object.
function validate(input) {
  const errors = [];
  const base = current();
  const inp = input && typeof input === "object" ? input : {};
  const b = inp.brand || {}, t = inp.terms || {}, f = inp.features || {};
  const out = clone(base);

  const str = (v, label, min, max, target, key) => {
    if (v === undefined) return;
    const s = String(v).trim();
    if (s.length < min) errors.push(`${label} is required`);
    else if (s.length > max) errors.push(`${label} must be ${max} characters or fewer`);
    else target[key] = s;
  };
  str(b.name, "Name", 1, 40, out.brand, "name");
  str(b.shortName, "Short name", 0, 12, out.brand, "shortName");
  str(b.tagline, "Tagline", 0, 60, out.brand, "tagline");
  str(b.topBarTitle, "Top-bar title", 0, 40, out.brand, "topBarTitle");
  if (b.colors) {
    for (const k of Object.keys(out.brand.colors)) {
      if (b.colors[k] === undefined) continue;
      if (COLOR_RE.test(String(b.colors[k]))) out.brand.colors[k] = String(b.colors[k]);
      else errors.push(`Colour "${k}" must be a hex value like #28415F`);
    }
  }
  str(t.orgNoun, "Household/organization word", 1, 20, out.terms, "orgNoun");
  if (t.locationLevels !== undefined) {
    if (!Array.isArray(t.locationLevels) || t.locationLevels.length !== 6) errors.push("Exactly six location level labels are required");
    else {
      const labels = t.locationLevels.map((x) => String(x == null ? "" : x).trim());
      labels.forEach((l, i) => {
        if (!l) errors.push(`Location level ${i + 1} label is required`);
        else if (l.length > 15) errors.push(`Location level ${i + 1} label must be 15 characters or fewer`);
      });
      const seen = new Set();
      labels.forEach((l) => {
        const k = l.toLowerCase();
        if (l && seen.has(k)) errors.push(`Location level labels must be different from each other ("${l}" is used twice)`);
        seen.add(k);
      });
      if (!errors.length) out.terms.locationLevels = labels;
    }
  }
  if (t.siteLevelIndex !== undefined) {
    const n = Number(t.siteLevelIndex);
    if (Number.isInteger(n) && n >= 0 && n < 6) out.terms.siteLevelIndex = n;
    else errors.push("Site level must be one of the six levels");
  }
  if (f.homeAssistantAlarms !== undefined) out.features.homeAssistantAlarms = !!f.homeAssistantAlarms;
  return { ok: errors.length === 0, settings: out, errors };
}

function save(settings) {
  setRaw("owner_settings", JSON.stringify({ brand: settings.brand, terms: settings.terms, features: settings.features }));
}
function resetToDefaults() {
  setRaw("owner_settings", null);
  setRaw("brand_logo", null);
}

/* ---- Logo (stored as a data URL in app_settings so it travels with backups) ---- */
function parseDataUrl(dataUrl) {
  const m = /^data:([a-z0-9.+\/-]+);base64,([A-Za-z0-9+\/=\s]+)$/i.exec(String(dataUrl || ""));
  if (!m) return null;
  return { mime: m[1].toLowerCase(), buf: Buffer.from(m[2].replace(/\s+/g, ""), "base64") };
}
function validateLogo(dataUrl) {
  const p = parseDataUrl(dataUrl);
  if (!p) return { ok: false, error: "That doesn't look like an image file" };
  if (!LOGO_TYPES.includes(p.mime)) return { ok: false, error: "The logo must be a PNG, JPG, SVG or WebP image" };
  if (p.buf.length > LOGO_MAX_BYTES) return { ok: false, error: `The logo must be ${Math.round(LOGO_MAX_BYTES / 1024)} KB or smaller` };
  if (p.buf.length === 0) return { ok: false, error: "The logo file is empty" };
  return { ok: true, mime: p.mime, buf: p.buf };
}
function getLogo() {
  const raw = getRaw("brand_logo");
  const p = raw ? parseDataUrl(raw) : null;
  return p ? { ...p, dataUrl: raw } : null;
}
function setLogo(dataUrl) { setRaw("brand_logo", dataUrl); }
function clearLogo() { setRaw("brand_logo", null); }
function logoVersion() {
  const raw = getRaw("brand_logo");
  return raw ? crypto.createHash("sha1").update(raw).digest("hex").slice(0, 10) : "";
}

// Public (pre-login) config: the login screen, page title, theme and PWA
// manifest need this before anyone is signed in. Nothing in it is sensitive.
function publicConfig(extra) {
  const s = current();
  const v = logoVersion();
  return {
    brand: { ...s.brand, logoUrl: v ? `/api/logo?v=${v}` : "" },
    terms: s.terms,
    features: { homeAssistantAlarms: s.features.homeAssistantAlarms },
    ...(extra || {}),
  };
}

module.exports = {
  DEFAULTS, LEVEL_KEYS, LOGO_MAX_BYTES, current, validate, save, resetToDefaults,
  validateLogo, getLogo, setLogo, clearLogo, publicConfig, getRaw, setRaw,
};
