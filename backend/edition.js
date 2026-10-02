// v2.1: edition config — branding, terminology, and default feature flags
// for this deployment. Resolved once at startup.
//
// Layers (later wins): branding.config.js (shipped presets) <
// DATA_DIR/branding.config.js (optional per-deployment override, lives in
// the mounted volume so a pure-image deploy can customize without a
// rebuild) < env vars. See branding.config.js for the shapes.
const fs = require("fs");
const path = require("path");
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");

const LEVEL_KEYS = ["Property", "Structure", "Floor", "Room", "Area", "Sub-area"];

function isObj(v) { return v && typeof v === "object" && !Array.isArray(v); }
function deepMerge(base, over) {
  const out = { ...base };
  for (const k of Object.keys(over || {})) {
    out[k] = isObj(over[k]) && isObj(base[k]) ? deepMerge(base[k], over[k]) : over[k];
  }
  return out;
}
function env(name) {
  const v = process.env[name];
  return v == null || v.trim() === "" ? undefined : v.trim();
}

function load() {
  const shipped = require("./branding.config.js");
  let presets = shipped.editions || {};
  const overridePath = path.join(DATA_DIR, "branding.config.js");
  if (fs.existsSync(overridePath)) {
    try {
      const o = require(overridePath);
      presets = deepMerge(presets, (o && o.editions) || {});
      console.log("[maintenhance] Loaded branding override from", overridePath);
    } catch (e) {
      console.error("[maintenhance] Ignoring unreadable branding override:", e.message);
    }
  }

  const editionKey = env("EDITION") || "home";
  if (!presets[editionKey]) {
    console.error(`[maintenhance] Unknown EDITION "${editionKey}" — falling back to "home".`);
  }
  let cfg = presets[editionKey] || presets.home;

  // Env var overrides, each optional.
  const e = {
    brand: {
      name: env("BRAND_NAME"), shortName: env("BRAND_SHORT_NAME"),
      tagline: env("BRAND_TAGLINE"), logoUrl: env("BRAND_LOGO_URL"),
      colors: {
        primary: env("BRAND_COLOR_PRIMARY"), primaryDark: env("BRAND_COLOR_PRIMARY_DARK"),
        accent: env("BRAND_COLOR_ACCENT"), accentDark: env("BRAND_COLOR_ACCENT_DARK"),
      },
    },
    terms: { orgNoun: env("ORG_NOUN") },
  };
  const labels = env("LOCATION_LEVEL_LABELS");
  if (labels) {
    const parts = labels.split(",").map((s) => s.trim());
    if (parts.length === LEVEL_KEYS.length && parts.every(Boolean)) e.terms.locationLevels = parts;
    else console.error(`[maintenhance] LOCATION_LEVEL_LABELS needs exactly ${LEVEL_KEYS.length} comma-separated labels — ignoring.`);
  }
  const siteIdx = env("SITE_LEVEL_INDEX");
  if (siteIdx !== undefined && Number.isInteger(Number(siteIdx)) && Number(siteIdx) >= 0 && Number(siteIdx) < LEVEL_KEYS.length) {
    e.terms.siteLevelIndex = Number(siteIdx);
  }
  const strip = (o) => {
    const r = {};
    for (const k of Object.keys(o)) {
      const v = isObj(o[k]) ? strip(o[k]) : o[k];
      if (v !== undefined && !(isObj(v) && Object.keys(v).length === 0)) r[k] = v;
    }
    return r;
  };
  cfg = deepMerge(cfg, strip(e));

  // Guard against a malformed override file.
  if (!Array.isArray(cfg.terms.locationLevels) || cfg.terms.locationLevels.length !== LEVEL_KEYS.length) {
    console.error("[maintenhance] terms.locationLevels must have 6 entries — using the defaults.");
    cfg.terms.locationLevels = presets.home.terms.locationLevels;
  }
  return { key: editionKey, ...cfg };
}

const EDITION = load();

// The subset safe to expose publicly (pre-login): the login screen and
// PWA manifest need it.
function publicConfig(features) {
  return {
    edition: EDITION.key,
    brand: EDITION.brand,
    terms: EDITION.terms,
    features,
  };
}

module.exports = { EDITION, publicConfig, LEVEL_KEYS };
