import React, { useState, useEffect, useRef, useContext, createContext, useMemo } from "react";
import {
  LayoutDashboard, MapPin, Wrench, ClipboardList, Package,
  Users, DollarSign, Plus, ChevronRight, ChevronDown, ChevronUp, X,
  Check, AlertTriangle, Bell, Menu, Trash2, Pencil, ArrowRight,
  Layers, Search, Boxes, ChevronLeft, Loader2, LogOut, UserPlus, Shield,
  Calendar, FileDown, FileUp, Info, Archive, Download, ExternalLink, ShoppingCart,
  Building2, DoorOpen, Square, Box, Sun, Moon, MonitorSmartphone, QrCode,
  Gauge, Snowflake, Wand2, Camera, WifiOff, RefreshCw,
  Siren, Key, Copy, Eye, EyeOff, Link2, Clock, User, Printer, Settings, ArrowUp, Upload,
} from "lucide-react";
import { createPortal } from "react-dom";
import * as XLSX from "xlsx";
import QRCode from "qrcode";
import { api } from "./api.js";
import { shrinkImage } from "./imageShrink.js";
import { PM_CATALOG_DEFAULT } from "./pmCatalog.js";
import { queueItem, getQueuedItems, removeQueuedItem, updateQueuedItem } from "./offlineQueue.js";

/* ============================================================
   DESIGN TOKENS
============================================================ */
// Every token below resolves to a CSS custom property (defined in GlobalStyle
// for both light and dark palettes), so any inline style that reads from C
// automatically follows the active theme — no per-component dark-mode logic.
const C = {
  bg: "var(--hk-bg)",
  panel: "var(--hk-panel)",
  panelAlt: "var(--hk-panel-alt)",
  ink: "var(--hk-ink)",
  inkSoft: "var(--hk-ink-soft)",
  inkFaint: "var(--hk-ink-faint)",
  line: "var(--hk-line)",
  lineSoft: "var(--hk-line-soft)",
  navy: "var(--hk-navy)",
  navySoft: "var(--hk-navy-soft)",
  orange: "var(--hk-orange)",
  orangeSoft: "var(--hk-orange-soft)",
  olive: "var(--hk-olive)",
  oliveSoft: "var(--hk-olive-soft)",
  rust: "var(--hk-rust)",
  rustSoft: "var(--hk-rust-soft)",
  gold: "var(--hk-gold)",
  goldSoft: "var(--hk-gold-soft)",
  teal: "var(--hk-teal)",
  tealSoft: "var(--hk-teal-soft)",
};

const FONT_HEAD = '"Space Grotesk", sans-serif';
const FONT_BODY = '"Inter", sans-serif';

const inputStyle = {
  boxSizing: "border-box", // v2.5.1: padding no longer pushes fields wider than their box
  width: "100%",
  padding: "8px 10px",
  border: `1px solid ${C.line}`,
  borderRadius: 3,
  fontFamily: FONT_BODY,
  fontSize: 13.5,
  color: C.ink,
  background: C.panel,
  outline: "none",
};
function fieldLabelStyle(required) {
  return {
    display: "block",
    fontFamily: FONT_BODY,
    fontSize: 11.5,
    fontWeight: required ? 700 : 400,
    color: required ? C.rust : C.ink,
    marginBottom: 4,
    letterSpacing: "0.01em",
  };
}

const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');

    /* ---- Theme tokens: light (default) ---- */
    :root {
      --hk-bg: #E5E8E2;
      --hk-panel: #FBFAF7;
      --hk-panel-alt: #F1F0EA;
      --hk-ink: #1C2420;
      --hk-ink-soft: #5B655F;
      --hk-ink-faint: #8C948D;
      --hk-line: #C8CCC1;
      --hk-line-soft: #DBDED4;
      --hk-navy: #28415F;
      --hk-navy-soft: #DCE3EA;
      --hk-orange: #C85410;
      --hk-orange-soft: #F4DBC4;
      --hk-olive: #5C6B3B;
      --hk-olive-soft: #DEE4CB;
      --hk-rust: #A03B2A;
      --hk-rust-soft: #F1D9D2;
      --hk-gold: #A97D22;
      --hk-gold-soft: #EFE1BE;
      --hk-teal: #2F6E62;
      --hk-teal-soft: #D9E7E3;
      color-scheme: light;
    }
    /* ---- Theme tokens: dark, applied automatically when the OS/browser
       prefers dark and the user hasn't explicitly picked "light" ---- */
    @media (prefers-color-scheme: dark) {
      :root:not([data-theme="light"]) {
        --hk-bg: #171D19;
        --hk-panel: #1E2521;
        --hk-panel-alt: #242C27;
        --hk-ink: #E7EAE3;
        --hk-ink-soft: #A8B0A7;
        --hk-ink-faint: #74807A;
        --hk-line: #33403A;
        --hk-line-soft: #2A3530;
        --hk-navy: #7FA3CC;
        --hk-navy-soft: #253244;
        --hk-orange: #E38C4E;
        --hk-orange-soft: #3A2A1C;
        --hk-olive: #9AAE6E;
        --hk-olive-soft: #2B331F;
        --hk-rust: #DE8873;
        --hk-rust-soft: #3A231E;
        --hk-gold: #D2A94E;
        --hk-gold-soft: #3A2F18;
        --hk-teal: #6BBDAC;
        --hk-teal-soft: #1D3430;
        color-scheme: dark;
      }
    }
    /* ---- Explicit user override, regardless of OS preference ---- */
    :root[data-theme="dark"] {
      --hk-bg: #171D19;
      --hk-panel: #1E2521;
      --hk-panel-alt: #242C27;
      --hk-ink: #E7EAE3;
      --hk-ink-soft: #A8B0A7;
      --hk-ink-faint: #74807A;
      --hk-line: #33403A;
      --hk-line-soft: #2A3530;
      --hk-navy: #7FA3CC;
      --hk-navy-soft: #253244;
      --hk-orange: #E38C4E;
      --hk-orange-soft: #3A2A1C;
      --hk-olive: #9AAE6E;
      --hk-olive-soft: #2B331F;
      --hk-rust: #DE8873;
      --hk-rust-soft: #3A231E;
      --hk-gold: #D2A94E;
      --hk-gold-soft: #3A2F18;
      --hk-teal: #6BBDAC;
      --hk-teal-soft: #1D3430;
      color-scheme: dark;
    }
    :root[data-theme="light"] { color-scheme: light; }
    body { background: ${C.bg}; transition: background-color .15s ease; }

    .hk-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
    .hk-scroll::-webkit-scrollbar-thumb { background: ${C.line}; border-radius: 4px; }
    .hk-fade { animation: hkfade .14s ease-out; }
    @keyframes hkbeacon { 0%,100% { opacity:1; box-shadow: 0 0 0 0 rgba(214,40,40,.65);} 50% { opacity:.35; box-shadow: 0 0 0 5px rgba(214,40,40,0);} }
    .hk-beacon { display:inline-block; width:9px; height:9px; border-radius:50%; background:#D62828; flex-shrink:0; animation: hkbeacon 1.1s ease-in-out infinite; }
    @media (prefers-reduced-motion: reduce) { .hk-beacon { animation:none; } }
    @keyframes hkfade { from { opacity:0; transform: translateY(3px);} to {opacity:1; transform:none;} }
    .hk-btn { cursor: pointer; transition: filter .1s ease; }
    .hk-btn:hover { filter: brightness(0.94); }
    .hk-row:hover { background: ${C.panelAlt}; }
    .hk-nav-item:hover { background: rgba(255,255,255,0.08); }
    .hk-link:hover { text-decoration: underline; }

    /* ---- Mobile / touch responsiveness ---- */
    .hk-sidebar { transition: transform .18s ease; }
    .hk-hscroll { overflow-x: auto; -webkit-overflow-scrolling: touch; max-width: 100%; }
    .hk-hscroll-in { min-width: 780px; }
    .hk-sidebar-backdrop { display: none; }

    @media (max-width: 860px) {
      .hk-main-shell { margin-left: 0 !important; }
      .hk-sidebar { box-shadow: 3px 0 16px rgba(0,0,0,0.28); }
      .hk-sidebar-backdrop {
        display: block; position: fixed; inset: 0; background: rgba(20,26,22,0.45); z-index: 39;
      }
      .hk-topbar { padding: 10px 14px !important; }
      .hk-page-pad { padding: 14px !important; }
      .hk-user-meta { display: none; }

      /* stacking grids down to a single column on narrow screens */
      .hk-grid-2, .hk-grid-3, .hk-grid-4, .hk-grid-fixed2, .hk-grid-fixed3, .hk-kanban {
        grid-template-columns: 1fr !important;
      }
      /* v2.6: schedules keep exactly 7 days across and scroll sideways inside their card (see .hk-hscroll) */

      /* comfortable tap targets and readable controls on touch screens */
      button, select, input, .hk-tap { min-height: 40px; }
      .hk-btn { min-height: 38px; }
      input, select, textarea { font-size: 15px !important; }
    }

    @media (max-width: 480px) {
      .hk-page-pad { padding: 10px !important; }
    }

    @media (max-width: 600px) {
      .hk-modal-overlay { padding: 0 !important; align-items: flex-end !important; }
      .hk-modal-card { width: 100% !important; max-width: 100% !important; max-height: 92vh !important; border-radius: 10px 10px 0 0 !important; }
    }
  `}</style>
);

/* ============================================================
   HELPERS & CONSTANTS
============================================================ */
const LOCATION_LEVELS = ["Property", "Structure", "Floor", "Room", "Area", "Sub-area"];
const LEVEL_ICONS = {
  Property: MapPin,
  Structure: Building2,
  Floor: Layers,
  Room: DoorOpen,
  Area: Square,
  "Sub-area": Box,
};

/* ---- Owner-managed settings (v2.2) ----
   Branding, terminology and feature toggles come from the server's public
   /api/config (see backend/settings.js) and are applied before the first
   render (see the MaintEnhanceApp wrapper at the bottom); the Owner edits
   them in Owner Tools and the app re-renders. Location levels are STORED
   under the stable keys in LOCATION_LEVELS above and only DISPLAYED via
   SETTINGS.terms.locationLevels, so relabeling never touches saved data. */
const DEFAULT_SETTINGS = {
  brand: {
    name: "MaintEnhance", shortName: "ME", tagline: "Maintenance Management", topBarTitle: "", logoUrl: "", logoWrench: false,
    colors: { primary: "#28415F", primaryDark: "#7FA3CC", accent: "#C85410", accentDark: "#E38C4E" },
  },
  terms: { orgNoun: "Organization", locationLevels: ["Property", "Structure", "Floor", "Room", "Area", "Sub-area"], siteLevelIndex: 0 },
  features: { homeAssistantAlarms: true, linkPrefill: true, linkPrefillAi: false, executionScheduling: false, workforceScheduling: false, hourlyAssignment: false },
};
let SETTINGS = DEFAULT_SETTINGS;
function applySettings(cfg) {
  if (!cfg) { SETTINGS = DEFAULT_SETTINGS; return; }
  const levels = cfg.terms && Array.isArray(cfg.terms.locationLevels) && cfg.terms.locationLevels.length === LOCATION_LEVELS.length
    ? cfg.terms.locationLevels : DEFAULT_SETTINGS.terms.locationLevels;
  SETTINGS = {
    ...DEFAULT_SETTINGS, ...cfg,
    brand: { ...DEFAULT_SETTINGS.brand, ...(cfg.brand || {}), colors: { ...DEFAULT_SETTINGS.brand.colors, ...((cfg.brand || {}).colors || {}) } },
    terms: { ...DEFAULT_SETTINGS.terms, ...(cfg.terms || {}), locationLevels: levels },
    features: { ...DEFAULT_SETTINGS.features, ...(cfg.features || {}) },
  };
}
function levelLabel(key) {
  const i = LOCATION_LEVELS.indexOf(key);
  return (i >= 0 && SETTINGS.terms.locationLevels[i]) || key;
}
// Accepts either a stored key or any current/previous label (Excel imports may
// carry either), returning the stored key.
function levelKeyFromLabel(v) {
  const t = String(v || "").trim().toLowerCase();
  if (!t) return "";
  const byKey = LOCATION_LEVELS.find((k) => k.toLowerCase() === t);
  if (byKey) return byKey;
  const i = SETTINGS.terms.locationLevels.findIndex((l) => l.toLowerCase() === t);
  return i >= 0 ? LOCATION_LEVELS[i] : String(v).trim();
}
// The level that carries address / year built / climate zone and offers
// the PM setup wizard — by default the Property; the Owner can pick another level.
function isSiteLevel(key) { return key === LOCATION_LEVELS[SETTINGS.terms.siteLevelIndex]; }
// Swaps the word "household" for the Owner's chosen word (e.g. "organization").
function term(str) {
  if (typeof str !== "string") return str;
  const n = SETTINGS.terms.orgNoun || "Organization";
  const lower = n.charAt(0).toLowerCase() + n.slice(1);
  const upper = n.charAt(0).toUpperCase() + n.slice(1);
  return str.replace(/household/g, lower).replace(/Household/g, upper);
}
function brandSlug() { return SETTINGS.brand.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "maintenhance"; }
const SAFE_COLOR = /^[#a-zA-Z0-9(),.%\s-]+$/;
function BrandStyle() {
  const c = SETTINGS.brand.colors, d = DEFAULT_SETTINGS.brand.colors;
  const ok = (v) => typeof v === "string" && SAFE_COLOR.test(v);
  const light = [], dark = [];
  if (ok(c.primary) && c.primary !== d.primary) light.push(`--hk-navy:${c.primary}`, `--hk-navy-soft:color-mix(in srgb, ${c.primary} 14%, var(--hk-panel))`);
  if (ok(c.accent) && c.accent !== d.accent) light.push(`--hk-orange:${c.accent}`, `--hk-orange-soft:color-mix(in srgb, ${c.accent} 20%, var(--hk-panel))`);
  if (ok(c.primaryDark) && c.primaryDark !== d.primaryDark) dark.push(`--hk-navy:${c.primaryDark}`, `--hk-navy-soft:color-mix(in srgb, ${c.primaryDark} 22%, var(--hk-panel))`);
  if (ok(c.accentDark) && c.accentDark !== d.accentDark) dark.push(`--hk-orange:${c.accentDark}`, `--hk-orange-soft:color-mix(in srgb, ${c.accentDark} 22%, var(--hk-panel))`);
  if (!light.length && !dark.length) return null;
  // html:root outranks GlobalStyle's :root rules regardless of DOM order.
  return (
    <style>{`
      ${light.length ? `html:root { ${light.join(";")} }` : ""}
      ${dark.length ? `@media (prefers-color-scheme: dark) { html:root:not([data-theme="light"]) { ${dark.join(";")} } }
      html:root[data-theme="dark"] { ${dark.join(";")} }` : ""}
    `}</style>
  );
}
function BrandMark({ size = 26, radius = 3 }) {
  const url = SETTINGS.brand.logoUrl;
  if (url) {
    const img = <img src={api.brandUrl(url)} alt={SETTINGS.brand.name} style={{ height: size, width: "auto", maxWidth: size * 4, objectFit: "contain", flexShrink: 0, display: "block" }} />;
    if (!SETTINGS.brand.logoWrench) return img;
    const w = Math.round(size * 0.5);
    return (
      <span style={{ position: "relative", display: "inline-flex", flexShrink: 0 }}>
        {img}
        <Wrench size={w} color="#E8650F" strokeWidth={2.6} aria-hidden="true" data-logo-wrench="1"
          style={{ position: "absolute", right: -Math.round(w * 0.25), bottom: -Math.round(w * 0.2), filter: "drop-shadow(0 0 1.5px #fff) drop-shadow(0 0 1px #fff)" }} />
      </span>
    );
  }
  return (
    <div style={{ width: size, height: size, background: C.orange, borderRadius: radius, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Wrench size={Math.round(size * 0.58)} color="#fff" />
    </div>
  );
}
const BOM_LEVELS = ["Component", "Sub-component", "Part"];
const WO_TYPES = ["PM", "PM Base", "Benchmark", "Corrective", "Unplanned"];
const WO_STATUSES = ["Active", "Scheduled", "Completed", "Closed"];
// Statuses used before v2.2, still accepted when reading older data or Excel files.
const LEGACY_STATUS_MAP = { Open: "Active", "In Progress": "Scheduled", Verified: "Closed" };
const isOpenStatus = (st) => st === "Active" || st === "Scheduled";
const isDoneStatus = (st) => st === "Completed" || st === "Closed";
const PRIORITIES = ["High", "Medium", "Low"];
const FAILURE_CODES = ["Wear", "Leak", "Electrical", "Mechanical", "User Error", "Install Defect", "Unknown", "Other"];
const CLIMATE_ZONES = ["Very Cold", "Cold", "Mixed-Humid", "Hot-Humid", "Hot-Dry", "Marine", "Unknown"];
// A deliberately simple state/province → climate-zone lookup for the PM
// setup wizard — not a real climate API, just enough to seed a sensible
// starter maintenance list. Always shown to the household to review and
// override before anything is created (see the functional spec / README
// for the full caveat, same spirit as the seasonal-PM simplification).
const REGION_CLIMATE_ZONE = {
  "alaska": "Very Cold", "ak": "Very Cold",
  "montana": "Cold", "mt": "Cold", "north dakota": "Cold", "nd": "Cold", "minnesota": "Cold", "mn": "Cold",
  "wisconsin": "Cold", "wi": "Cold", "michigan": "Cold", "mi": "Cold", "maine": "Cold", "me": "Cold",
  "vermont": "Cold", "vt": "Cold", "new hampshire": "Cold", "nh": "Cold", "new york": "Cold", "ny": "Cold",
  "wyoming": "Cold", "wy": "Cold", "south dakota": "Cold", "sd": "Cold", "idaho": "Cold", "id": "Cold",
  "iowa": "Cold", "ia": "Cold", "nebraska": "Cold", "ne": "Cold", "pennsylvania": "Cold", "pa": "Cold",
  "massachusetts": "Cold", "ma": "Cold", "connecticut": "Cold", "ct": "Cold", "rhode island": "Cold", "ri": "Cold",
  "ohio": "Cold", "oh": "Cold", "illinois": "Cold", "il": "Cold", "indiana": "Cold", "in": "Cold",
  "colorado": "Cold", "co": "Cold", "utah": "Cold", "ut": "Cold", "washington": "Cold", "wa": "Cold",
  "oregon": "Cold", "or": "Cold", "new jersey": "Cold", "nj": "Cold",
  "virginia": "Mixed-Humid", "va": "Mixed-Humid", "maryland": "Mixed-Humid", "md": "Mixed-Humid",
  "delaware": "Mixed-Humid", "de": "Mixed-Humid", "west virginia": "Mixed-Humid", "wv": "Mixed-Humid",
  "kentucky": "Mixed-Humid", "ky": "Mixed-Humid", "missouri": "Mixed-Humid", "mo": "Mixed-Humid",
  "kansas": "Mixed-Humid", "ks": "Mixed-Humid", "north carolina": "Mixed-Humid", "nc": "Mixed-Humid",
  "tennessee": "Mixed-Humid", "tn": "Mixed-Humid", "arkansas": "Mixed-Humid", "ar": "Mixed-Humid",
  "oklahoma": "Mixed-Humid", "ok": "Mixed-Humid",
  "florida": "Hot-Humid", "fl": "Hot-Humid", "georgia": "Hot-Humid", "ga": "Hot-Humid",
  "south carolina": "Hot-Humid", "sc": "Hot-Humid", "alabama": "Hot-Humid", "al": "Hot-Humid",
  "mississippi": "Hot-Humid", "ms": "Hot-Humid", "louisiana": "Hot-Humid", "la": "Hot-Humid",
  "texas": "Hot-Humid", "tx": "Hot-Humid",
  "arizona": "Hot-Dry", "az": "Hot-Dry", "new mexico": "Hot-Dry", "nm": "Hot-Dry", "nevada": "Hot-Dry", "nv": "Hot-Dry",
  "california": "Marine", "ca": "Marine",
  "yukon": "Very Cold", "yt": "Very Cold", "northwest territories": "Very Cold", "nt": "Very Cold",
  "nunavut": "Very Cold", "nu": "Very Cold",
  "british columbia": "Marine", "bc": "Marine",
  "ontario": "Cold", "quebec": "Cold", "qc": "Cold", "manitoba": "Cold", "mb": "Cold",
  "saskatchewan": "Cold", "sk": "Cold", "alberta": "Cold", "ab": "Cold", "newfoundland": "Cold", "nl": "Cold",
  "new brunswick": "Cold", "nb": "Cold", "nova scotia": "Cold", "ns": "Cold", "prince edward island": "Cold", "pe": "Cold",
};
// Guesses a climate zone from a free-text address. Prefers the tail of the
// address (typically "City, ST ZIP" or "City, Province") over the street
// line, so a street-type abbreviation like "Ct" (Court) doesn't get
// mistaken for a state code (CT, Connecticut). Always just a starting
// point — the wizard shows it for the household to confirm or change.
function guessClimateZone(address) {
  const raw = String(address || "").trim();
  if (!raw) return "Unknown";
  const segments = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const tail = (segments.length > 1 ? segments.slice(1) : segments).join(" ").toLowerCase();
  const full = raw.toLowerCase();
  const names = Object.keys(REGION_CLIMATE_ZONE).filter((k) => k.length > 2).sort((a, b) => b.length - a.length);
  for (const name of names) {
    if (tail.includes(name)) return REGION_CLIMATE_ZONE[name];
  }
  const tailTokens = tail.split(/[^a-z]+/).filter(Boolean);
  for (const tok of tailTokens) {
    if (tok.length === 2 && REGION_CLIMATE_ZONE[tok]) return REGION_CLIMATE_ZONE[tok];
  }
  for (const name of names) {
    if (full.includes(name)) return REGION_CLIMATE_ZONE[name];
  }
  return "Unknown";
}
// Starter PM catalogue offered by the wizard, pre-checked by climate zone
// relevance ("all" = every zone). Frequencies are reasonable defaults —
// every generated PM Base is fully editable afterward like any other.
const PM_WIZARD_CATALOG = PM_CATALOG_DEFAULT;
// v2.3: every entry has a Type (Home, Facilities, ...) and a sub type
// ("category", e.g. HVAC & Heating). Entries saved before v2.3 have neither:
// they count as Home / General.
const catType = (i) => (i && i.type) || "Home";
const catCategory = (i) => (i && i.category) || "General";
const uniqSorted = (arr) => [...new Set(arr)].sort((a, b) => a.localeCompare(b));
// v1.8: the starter catalogue above is now just the *default* — an Owner
// can edit/add/remove entries from Owner Tools, which are saved into
// data.pmWizardCatalog. Absent (undefined) falls back to this hardcoded
// default; an intentionally emptied list ([]) stays empty rather than
// resurrecting the default, so clearing the catalogue actually sticks.
function effectiveWizardCatalog(data) {
  return data && data.pmWizardCatalog != null ? data.pmWizardCatalog : PM_WIZARD_CATALOG;
}
const FREQUENCY_UNITS = ["days", "weeks", "months", "years"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ROLES = ["Owner", "Manager", "Executor", "Guest"];
const VERIFIED_ARCHIVE_DAYS = 30;

const WR_STATUS_COLORS = {
  Submitted: C.navy, "Under Review": C.gold, Approved: C.olive,
  Declined: C.inkFaint, Merged: C.inkFaint,
};
const WO_TYPE_COLORS = { PM: C.navy, "PM Base": C.teal, Benchmark: C.gold, Corrective: C.orange, Unplanned: C.rust };
const WO_STATUS_COLORS = { Active: C.orange, Scheduled: C.gold, Completed: C.olive, Closed: C.navy };
const PRIORITY_COLORS = { High: C.rust, Medium: C.gold, Low: C.inkSoft };
const PRIORITY_SOFT = { High: C.rustSoft, Medium: C.goldSoft, Low: C.panelAlt };

function isAdmin(role) {
  return role === "Owner" || role === "Manager";
}
// v2.6: Owners/Managers, or an Executor holding the Planner / Scheduler designation (see DESIGNATIONS).
const planRole = (role) => isAdmin(role) || canPlan();
const scheduleRole = (role) => isAdmin(role) || canSchedule();
/* v2.6 — designations. Owners and Managers can do everything a designation allows.
   Executors get the extra rights only from the designations an Owner gives them.
   For Owners/Managers the "executor" designation (default off) only decides whether
   they appear as available people on work orders, labour assignment and the workforce schedule. */
const DESIGNATIONS = [
  { key: "planner", label: "Planner", help: "Edits other people's work requests, turns requests into work orders, creates and edits work orders, vendors and parts." },
  { key: "scheduler", label: "Scheduler", help: "Full access to the workforce schedule, labour assignment and shift templates, like a Manager." },
  { key: "specialist", label: "Specialist", help: "Can acknowledge and resolve alarms." },
];
let ME = { id: "", role: "Guest", designations: [] };
function canDes(u, k) {
  if (!u) return false;
  if (u.role === "Owner" || u.role === "Manager") return true;
  return u.role === "Executor" && (u.designations || []).includes(k);
}
const canPlan = () => canDes(ME, "planner");
const canSchedule = () => canDes(ME, "scheduler");
const canAck = () => canDes(ME, "specialist");
// A person who can be given work: Executors always; Owners/Managers only when flagged.
function isExecPerson(u) {
  if (!u) return false;
  if (u.role === "Executor") return true;
  return (u.role === "Owner" || u.role === "Manager") && (u.designations || []).includes("executor");
}
const DIGEST_OPTIONS = [
  { key: "notifyPmOverdue", label: "Overdue work orders", des: "scheduler" },
  { key: "notifyWorkRequestUnreviewed", label: "Work requests sitting unreviewed", des: "planner" },
  { key: "notifyWarrantyExpiring", label: "Warranties expiring soon", des: "specialist" },
  { key: "notifyAlarms", label: "Open alarms", des: "specialist" },
  { key: "notifyLowStock", label: "Low stock parts — at or below the reorder quantity, or below what open work orders need (lists those work orders)", des: "planner" },
  { key: "notifyMySchedule", label: "My schedule — my assigned work days and work orders for the next 7 days", des: "me" },
  { key: "notifyTeamSchedule", label: "Team schedule — everyone's work days and work orders for the next 7 days", des: "scheduler" },
  { key: "notifyAppUpdates", label: "App updates — what changed in new versions of the app since your last email", des: "all" },
];
const digestAllowed = (u, o) => (o.des === "all" ? true : o.des === "me" ? isExecPerson(u) : canDes(u, o.des));
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
// v2.6.1: how often and when a person's digest email is sent (one email covering everything ticked).
function DigestSchedule({ value, onChange }) {
  const freq = value.notifyFreq || "daily";
  return (
    <div data-digest-schedule style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", margin: "10px 0 4px" }}>
      <Field label="How often">
        <select aria-label="Digest frequency" style={{ ...inputStyle, width: 150 }} value={freq} onChange={(e) => onChange({ notifyFreq: e.target.value })}>
          <option value="daily">Every day</option>
          <option value="weekdays">Weekdays (Mon–Fri)</option>
          <option value="weekly">Once a week</option>
        </select>
      </Field>
      {freq === "weekly" && (
        <Field label="On">
          <select aria-label="Digest weekday" style={{ ...inputStyle, width: 130 }} value={value.notifyWeekday == null ? 1 : value.notifyWeekday} onChange={(e) => onChange({ notifyWeekday: Number(e.target.value) })}>
            {WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
          </select>
        </Field>
      )}
      <Field label="Time of day">
        <input type="time" aria-label="Digest time of day" style={{ ...inputStyle, width: 120 }} value={value.notifyTime || "07:00"} onChange={(e) => e.target.value && onChange({ notifyTime: e.target.value })} />
      </Field>
    </div>
  );
}
function genTempPassword() {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(12);
  (typeof crypto !== "undefined" && crypto.getRandomValues) ? crypto.getRandomValues(bytes) : bytes.forEach((_, i) => { bytes[i] = Math.floor(Math.random() * 256); });
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}
function canWrite(role) {
  return role !== "Guest";
}
function canDelete(role, item, currentUser) {
  if (role === "Owner") return true;
  if (role === "Manager") return !!item && item.createdBy === currentUser;
  return false;
}

function uid(prefix) {
  return prefix + "_" + Math.random().toString(36).slice(2, 9);
}
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d + "T00:00:00");
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
function daysUntil(d) {
  if (!d) return null;
  const dt = new Date(d + "T00:00:00");
  const now = new Date(todayISO() + "T00:00:00");
  return Math.round((dt - now) / 86400000);
}
function locationPath(locations, id) {
  const map = Object.fromEntries(locations.map((l) => [l.id, l]));
  const parts = [];
  let cur = id ? map[id] : null;
  let guard = 0;
  while (cur && guard < 20) {
    parts.unshift(cur.name);
    cur = cur.parentId ? map[cur.parentId] : null;
    guard++;
  }
  return parts.join(" › ") || "—";
}
function flattenTree(items, parentField, parentId, depth) {
  depth = depth || 0;
  const out = [];
  items
    .filter((i) => (i[parentField] || null) === parentId)
    .forEach((i) => {
      out.push({ item: i, depth });
      out.push(...flattenTree(items, parentField, i.id, depth + 1));
    });
  return out;
}
function nameOf(list, id) {
  const f = list.find((x) => x.id === id);
  return f ? f.name : null;
}
function depthOf(locations, id) {
  if (!id) return -1;
  const map = Object.fromEntries(locations.map((l) => [l.id, l]));
  let depth = 0;
  let cur = map[id];
  let guard = 0;
  while (cur && cur.parentId && guard < 30) {
    depth++;
    cur = map[cur.parentId];
    guard++;
  }
  return depth;
}
function defaultLevelForParent(locations, parentId) {
  const childDepth = depthOf(locations, parentId) + 1;
  return LOCATION_LEVELS[Math.min(childDepth, LOCATION_LEVELS.length - 1)];
}
function descendantIds(locations, rootId) {
  const result = new Set([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    locations.forEach((l) => {
      if (l.parentId && result.has(l.parentId) && !result.has(l.id)) {
        result.add(l.id);
        changed = true;
      }
    });
  }
  return result;
}

function formatWoNum(n) { return "WO-" + String(n || 0).padStart(4, "0"); }
function formatWrNum(n) { return "WR-" + String(n || 0).padStart(4, "0"); }
function formatPartNum(n) { return "PT-" + String(n || 0).padStart(4, "0"); }
function serializePartsList(parts) {
  return (parts || []).map((p) => `${p.partId}:${p.qty || 1}`).join(",");
}
function deserializePartsList(str) {
  return String(str || "").split(",").map((s) => s.trim()).filter(Boolean).map((tok) => {
    const [partId, qty] = tok.split(":");
    return { partId, qty: Number(qty) || 1 };
  });
}

function addInterval(dateISO, value, unit) {
  const d = new Date((dateISO || todayISO()) + "T00:00:00");
  const n = Number(value) || 0;
  if (unit === "days") d.setDate(d.getDate() + n);
  else if (unit === "weeks") d.setDate(d.getDate() + n * 7);
  else if (unit === "months") d.setMonth(d.getMonth() + n);
  else if (unit === "years") d.setFullYear(d.getFullYear() + n);
  return d.toISOString().slice(0, 10);
}
function nextFixedOccurrence(month, day, fromISO) {
  const from = new Date((fromISO || todayISO()) + "T00:00:00");
  let year = from.getFullYear();
  let candidate = new Date(year, month - 1, day);
  if (candidate < from) {
    year += 1;
    candidate = new Date(year, month - 1, day);
  }
  return candidate.toISOString().slice(0, 10);
}
const SEASONS = ["Spring", "Summer", "Fall", "Winter"];
// Northern Hemisphere meteorological season boundaries — a documented
// simplification (see the functional spec / README) rather than a true
// climate-derived date; the offset field lets a household nudge it.
const SEASON_START_MONTH_DAY = { Spring: [3, 1], Summer: [6, 1], Fall: [9, 1], Winter: [12, 1] };
function seasonAnchorDate(season, offsetDays, fromISO) {
  const [month, day] = SEASON_START_MONTH_DAY[season] || SEASON_START_MONTH_DAY.Spring;
  const from = new Date((fromISO || todayISO()) + "T00:00:00");
  let year = from.getFullYear();
  const build = () => {
    const dd = new Date(year, month - 1, day);
    dd.setDate(dd.getDate() + (Number(offsetDays) || 0));
    return dd;
  };
  let candidate = build();
  if (candidate < from) {
    year += 1;
    candidate = build();
  }
  return candidate.toISOString().slice(0, 10);
}
function sameDateNextYear(dateISO) {
  const d = new Date((dateISO || todayISO()) + "T00:00:00");
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}
// A PM Base is only allowed one Active/Scheduled child at a time —
// this guards every place a new occurrence could be generated.
function pmBaseHasActiveChild(d, baseId) {
  return d.workOrders.some((w) => w.sourcePmBaseId === baseId && isOpenStatus(w.status));
}
// ---- Scheduling by scheduled date (v2.2) ----
// A work order is Scheduled exactly when it has a scheduled date: assigning
// one moves an Active order to Scheduled, clearing it moves it back. Never
// touches Completed/Closed orders or PM Base templates. The trigger is the
// scheduled date only — never the required-by date.
function applyScheduleStatus(w) {
  if (w.type === "PM Base") return;
  if (w.status === "Active" && w.scheduledDate) w.status = "Scheduled";
  else if (w.status === "Scheduled" && !w.scheduledDate) w.status = "Active";
}

// ---- PM Base standby (v2.2) ----
// A PM Base on standby generates no new occurrences. Standby is either
// manual (base.standby) or a yearly window (base.standbyWindow): the base is
// active from start (month/day) up to, not including, end (month/day) every
// year and on standby the rest of the year — e.g. weekly lawn mowing active
// May 1, standby Nov 1. A window may wrap the new year.
const DEFAULT_STANDBY_WINDOW = { enabled: false, startMonth: 5, startDay: 1, endMonth: 11, endDay: 1 };
function pmBaseOnStandby(base, dateISO) {
  if (base.standby) return true;
  const w = base.standbyWindow;
  if (w && w.enabled) {
    const ref = new Date((dateISO || todayISO()) + "T00:00:00");
    const md = (ref.getMonth() + 1) * 100 + ref.getDate();
    const start = (Number(w.startMonth) || 1) * 100 + (Number(w.startDay) || 1);
    const end = (Number(w.endMonth) || 12) * 100 + (Number(w.endDay) || 31);
    const active = start <= end ? md >= start && md < end : md >= start || md < end;
    return !active;
  }
  return false;
}
function pmBaseStandbyLabel(base) {
  const w = base.standbyWindow;
  const md = (m, d) => `${MONTH_NAMES[(Number(m) || 1) - 1].slice(0, 3)} ${Number(d) || 1}`;
  if (base.standby) return "Standby (manual)";
  if (w && w.enabled) return pmBaseOnStandby(base) ? `Standby · resumes ${md(w.startMonth, w.startDay)}` : `Active ${md(w.startMonth, w.startDay)} – ${md(w.endMonth, w.endDay)}`;
  return null;
}
// First occurrence(s) for a freshly created or just-resumed PM Base.
function spawnFirstPmInstance(d, base) {
  const tt = base.triggerType || "calendar";
  if (tt === "meter") return; // generated once the meter crosses the interval
  if (tt === "calendar" && base.pmMode === "Fixed") {
    const sorted = [...(base.fixedDates || [])].sort((a, b) => nextFixedOccurrence(a.month, a.day, todayISO()).localeCompare(nextFixedOccurrence(b.month, b.day, todayISO())));
    sorted.forEach((fd) => spawnPmInstance(d, base, { afterDateISO: todayISO(), fixedDate: fd }));
  } else {
    spawnPmInstance(d, base, { afterDateISO: todayISO(), fixedDate: null });
  }
}
function pmStandbyNeedsSync(d) {
  return (d.workOrders || []).some((w) => w.type === "PM Base" && pmBaseOnStandby(w) !== !!w.standbyNow);
}
// Run after every data change (and once on load, so a calendar window that
// opened or closed while nobody was using the app is picked up). On
// reactivation the next occurrence is generated from today — missed
// occurrences are NOT backfilled; a meter-based base restarts counting from
// the asset's current reading.
function syncPmStandby(d) {
  (d.workOrders || []).filter((w) => w.type === "PM Base").forEach((base) => {
    const on = pmBaseOnStandby(base);
    if (on && !base.standbyNow) base.standbyNow = true;
    else if (!on && base.standbyNow) {
      base.standbyNow = false;
      if (pmBaseHasActiveChild(d, base.id)) return;
      if ((base.triggerType || "calendar") === "meter") {
        const asset = (d.assets || []).find((a) => a.id === base.assetId);
        base.meterBaselineValue = asset ? Number(asset.currentMeterValue) || 0 : base.meterBaselineValue || 0;
      } else {
        spawnFirstPmInstance(d, base);
      }
    }
  });
  return d;
}
// Fresh, unfilled copy of a PM Base's checklist template — stamped onto
// each new PM occurrence at generation time. Occurrences don't share
// checklist objects with each other or with the template.
function freshChecklist(base) {
  return (base.checklistTemplate || []).map((t) => ({
    id: t.id, title: t.title, stepType: t.stepType,
    expectedMin: t.expectedMin, expectedMax: t.expectedMax, unit: t.unit,
    done: false, value: "", passFail: "", note: "",
  }));
}
function spawnPmInstance(d, base, opts) {
  if (pmBaseHasActiveChild(d, base.id)) return;
  if (pmBaseOnStandby(base)) return;
  const afterDateISO = opts.afterDateISO;
  const fixedDate = opts.fixedDate;
  const triggerType = base.triggerType || "calendar";
  let requiredByDate;
  if (triggerType === "meter") {
    // Meter triggers aren't scheduled ahead — they're due the moment the
    // reading crosses the interval, so "required by" is just today.
    requiredByDate = opts.requiredByDate || todayISO();
  } else if (triggerType === "seasonal") {
    requiredByDate = seasonAnchorDate(base.seasonalAnchor, base.seasonalOffsetDays, afterDateISO);
  } else if (fixedDate) {
    requiredByDate = nextFixedOccurrence(fixedDate.month, fixedDate.day, afterDateISO);
  } else {
    requiredByDate = addInterval(afterDateISO, base.frequencyValue, base.frequencyUnit);
  }
  d.counters = d.counters || { wo: 0, wr: 0, part: 0 };
  d.counters.wo += 1;
  d.workOrders.push({
    id: uid("wo"), number: d.counters.wo, title: base.title, type: "PM", status: "Active",
    assetId: base.assetId, bomNodeId: base.bomNodeId, locationId: base.locationId,
    description: base.description, sourceRequestId: null, sourceBenchmarkId: null,
    sourcePmBaseId: base.id, sourceFixedDate: fixedDate || null,
    priority: base.priority || "Medium", executorId: base.executorId || "", ...planFieldsFrom(base),
    scheduledDate: "", requiredByDate, completedDate: null, verifiedDate: null,
    cost: "", vendorId: base.vendorId || null, notes: "", parts: [], comments: [], partsDeducted: false, createdBy: base.createdBy || null,
    meterValueAtGeneration: triggerType === "meter" && opts.meterValueAtGeneration != null ? opts.meterValueAtGeneration : null,
    checklist: freshChecklist(base),
  });
}
function regeneratePmAfterCompletion(d, completedWO) {
  const base = d.workOrders.find((w) => w.id === completedWO.sourcePmBaseId && w.type === "PM Base");
  if (!base) return;
  if (pmBaseHasActiveChild(d, base.id)) return;
  if (pmBaseOnStandby(base)) return; // resumes via syncPmStandby when reactivated
  const triggerType = base.triggerType || "calendar";
  if (triggerType === "meter") {
    // Roll the baseline forward to the reading this occurrence was actually
    // triggered at — mirrors non-fixed calendar mode rolling forward from
    // the completion date, but keyed to the meter instead of the calendar.
    // The next occurrence isn't spawned here; checkMeterPmTriggers generates
    // it once the asset's reading crosses the new threshold.
    base.meterBaselineValue = completedWO.meterValueAtGeneration != null ? completedWO.meterValueAtGeneration : (base.meterBaselineValue || 0);
    return;
  }
  if (triggerType === "seasonal") {
    const requiredByDate = sameDateNextYear(completedWO.requiredByDate || todayISO());
    d.counters = d.counters || { wo: 0, wr: 0, part: 0 };
    d.counters.wo += 1;
    d.workOrders.push({
      id: uid("wo"), number: d.counters.wo, title: base.title, type: "PM", status: "Active",
      assetId: base.assetId, bomNodeId: base.bomNodeId, locationId: base.locationId,
      description: base.description, sourceRequestId: null, sourceBenchmarkId: null,
      sourcePmBaseId: base.id, sourceFixedDate: null,
      priority: base.priority || "Medium", executorId: base.executorId || "", ...planFieldsFrom(base),
      scheduledDate: "", requiredByDate, completedDate: null, verifiedDate: null,
      cost: "", vendorId: base.vendorId || null, notes: "", parts: [], comments: [], partsDeducted: false, createdBy: base.createdBy || null,
      meterValueAtGeneration: null, checklist: freshChecklist(base),
    });
    return;
  }
  if (base.pmMode === "Fixed" && completedWO.sourceFixedDate) {
    const requiredByDate = sameDateNextYear(completedWO.requiredByDate || todayISO());
    d.counters = d.counters || { wo: 0, wr: 0, part: 0 };
    d.counters.wo += 1;
    d.workOrders.push({
      id: uid("wo"), number: d.counters.wo, title: base.title, type: "PM", status: "Active",
      assetId: base.assetId, bomNodeId: base.bomNodeId, locationId: base.locationId,
      description: base.description, sourceRequestId: null, sourceBenchmarkId: null,
      sourcePmBaseId: base.id, sourceFixedDate: completedWO.sourceFixedDate,
      priority: base.priority || "Medium", executorId: base.executorId || "", ...planFieldsFrom(base),
      scheduledDate: "", requiredByDate, completedDate: null, verifiedDate: null,
      cost: "", vendorId: base.vendorId || null, notes: "", parts: [], comments: [], partsDeducted: false, createdBy: base.createdBy || null,
      meterValueAtGeneration: null, checklist: freshChecklist(base),
    });
  } else {
    spawnPmInstance(d, base, { afterDateISO: completedWO.completedDate || todayISO(), fixedDate: null });
  }
}
// Sweeps every meter-triggered PM Base and generates the next occurrence
// once its linked asset's current reading has crossed the configured
// interval past the base's baseline. Called after every data mutation (see
// MaintEnhanceApp's `update`) so logging a new meter reading — or anything else
// — immediately picks up any PM that just became due.
function checkMeterPmTriggers(d) {
  (d.workOrders || [])
    .filter((w) => w.type === "PM Base" && (w.triggerType || "calendar") === "meter")
    .forEach((base) => {
      if (pmBaseHasActiveChild(d, base.id)) return;
      if (pmBaseOnStandby(base)) return;
      const asset = d.assets.find((a) => a.id === base.assetId);
      if (!asset) return;
      const current = Number(asset.currentMeterValue) || 0;
      const baseline = Number(base.meterBaselineValue) || 0;
      const interval = Number(base.meterIntervalValue) || 0;
      if (interval > 0 && current >= baseline + interval) {
        spawnPmInstance(d, base, { afterDateISO: todayISO(), fixedDate: null, meterValueAtGeneration: current });
      }
    });
  return d;
}
// Short label for a PM Base's schedule, used on its card and detail view.
function pmBaseScheduleLabel(base, data) {
  const triggerType = base.triggerType || "calendar";
  if (triggerType === "meter") {
    const asset = data.assets.find((a) => a.id === base.assetId);
    return `Meter · every ${base.meterIntervalValue || "?"}${asset?.meterUnit ? " " + asset.meterUnit : ""}`;
  }
  if (triggerType === "seasonal") {
    const off = Number(base.seasonalOffsetDays) || 0;
    return `Seasonal · ${base.seasonalAnchor || "Spring"}${off ? ` (${off > 0 ? "+" : ""}${off}d)` : ""}`;
  }
  return base.pmMode || "Non-fixed";
}

/* ============================================================
   SMALL UI PRIMITIVES
============================================================ */
/* v2.5.1 — password box with a show/hide (eye) button. Accepts the usual input props. */
function PasswordInput({ style, ...rest }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input {...rest} type={show ? "text" : "password"} style={{ ...style, boxSizing: "border-box", paddingRight: 38 }} />
      <button
        type="button" onClick={() => setShow((v) => !v)} tabIndex={-1} data-pwtoggle
        title={show ? "Hide password" : "Show password"} aria-label={show ? "Hide password" : "Show password"} aria-pressed={show}
        style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.inkSoft, padding: 6, display: "flex", alignItems: "center" }}
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={fieldLabelStyle(required)}>{label}{required ? " *" : ""}</label>
      {children}
    </div>
  );
}

function Tag({ text, color, soft }) {
  return (
    <span
      style={{
        display: "inline-block", fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700,
        padding: "3px 8px", borderRadius: 3, color, background: soft,
        whiteSpace: "nowrap", letterSpacing: "0.01em",
      }}
    >
      {text}
    </span>
  );
}

function Btn({ children, onClick, variant, small, type, disabled, title }) {
  const base = {
    fontFamily: FONT_BODY, fontWeight: 600, fontSize: small ? 12.5 : 13.5,
    padding: small ? "6px 10px" : "9px 14px", borderRadius: 3, border: "1px solid transparent",
    display: "inline-flex", alignItems: "center", gap: 6, opacity: disabled ? 0.5 : 1,
  };
  let style;
  if (variant === "primary") style = { ...base, background: C.orange, color: "#fff" };
  else if (variant === "ghost") style = { ...base, background: "transparent", color: C.ink, border: `1px solid ${C.line}` };
  else if (variant === "danger") style = { ...base, background: "transparent", color: C.rust, border: `1px solid ${C.rustSoft}` };
  else style = { ...base, background: C.navy, color: "#fff" };
  return (
    <button
      title={title} type={type || "button"} disabled={disabled}
      onClick={disabled ? undefined : onClick} className="hk-btn"
      style={{ ...style, cursor: disabled ? "not-allowed" : "pointer" }}
    >
      {children}
    </button>
  );
}

function Modal({ title, onClose, children, wide, info }) {
  return (
    <div
      className="hk-modal-overlay"
      style={{ position: "fixed", inset: 0, background: "rgba(28,36,32,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 16 }}
      onClick={onClose}
    >
      <div
        className="hk-fade hk-scroll hk-modal-card"
        style={{ background: C.panel, width: wide ? 640 : 460, maxWidth: "100%", maxHeight: "88vh", overflowY: "auto", border: `1px solid ${C.line}`, borderRadius: 5 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${C.line}`, position: "sticky", top: 0, background: C.panel }}>
          <h3 style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: C.ink, margin: 0 }}>{title}{info && <InfoTip k={info} />}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkSoft }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: 18 }}>{children}</div>
      </div>
    </div>
  );
}

/* ============================================================
   DIALOG SYSTEM
============================================================ */
const DialogContext = createContext(null);
function useDialog() {
  return useContext(DialogContext);
}

function DialogHost({ dialog, onResult }) {
  const [text, setText] = useState(dialog.defaultValue || "");
  if (dialog.type === "alert") {
    return (
      <Modal title="Notice" onClose={() => onResult(undefined)}>
        <div style={{ fontFamily: FONT_BODY, fontSize: 13.5, color: C.ink, marginBottom: 16 }}>{dialog.message}</div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Btn variant="primary" onClick={() => onResult(undefined)}>OK</Btn>
        </div>
      </Modal>
    );
  }
  if (dialog.type === "confirm") {
    return (
      <Modal title="Please confirm" onClose={() => onResult(false)}>
        <div style={{ fontFamily: FONT_BODY, fontSize: 13.5, color: C.ink, marginBottom: 16 }}>{dialog.message}</div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Btn variant="ghost" onClick={() => onResult(false)}>Cancel</Btn>
          <Btn variant="danger" onClick={() => onResult(true)}>Confirm</Btn>
        </div>
      </Modal>
    );
  }
  if (dialog.type === "saveExit") {
    return (
      <Modal title="Unsaved changes" onClose={() => onResult("cancel")}>
        <div style={{ fontFamily: FONT_BODY, fontSize: 13.5, color: C.ink, marginBottom: 16 }}>{dialog.message}</div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
          <Btn variant="ghost" onClick={() => onResult("cancel")}>Cancel</Btn>
          <Btn variant="danger" onClick={() => onResult("discard")}>Discard changes</Btn>
          <Btn variant="primary" onClick={() => onResult("save")}>Save</Btn>
        </div>
      </Modal>
    );
  }
  return (
    <Modal title={(dialog.opts && dialog.opts.title) || "Name it"} onClose={() => onResult(null)}>
      <div style={{ fontFamily: FONT_BODY, fontSize: 13.5, color: C.ink, marginBottom: 10 }}>{dialog.message}</div>
      {dialog.opts && dialog.opts.multiline ? (
        <textarea style={{ ...inputStyle, minHeight: 90 }} autoFocus value={text} onChange={(e) => setText(e.target.value)} />
      ) : (
        <input
          style={inputStyle} autoFocus value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !(dialog.opts && dialog.opts.required && !text.trim())) onResult(text); }}
        />
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
        <Btn variant="ghost" onClick={() => onResult(null)}>Cancel</Btn>
        <Btn variant="primary" disabled={!!(dialog.opts && dialog.opts.required && !text.trim())} onClick={() => onResult(text)}>{(dialog.opts && dialog.opts.okLabel) || "Save"}</Btn>
      </div>
    </Modal>
  );
}

function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolver = useRef(null);

  const open = (type, message, defaultValue, opts) =>
    new Promise((resolve) => {
      resolver.current = resolve;
      setDialog({ type, message, defaultValue, opts });
    });

  const handleResult = (result) => {
    if (resolver.current) resolver.current(result);
    resolver.current = null;
    setDialog(null);
  };

  const dialogApi = {
    confirm: (message) => open("confirm", message),
    alertMsg: (message) => open("alert", message),
    promptMsg: (message, def, opts) => open("prompt", message, def, opts),
    saveExit: (message) => open("saveExit", message),
  };

  return (
    <DialogContext.Provider value={dialogApi}>
      {children}
      {dialog && <DialogHost dialog={dialog} onResult={handleResult} />}
    </DialogContext.Provider>
  );
}

// Shared helper for "close a dirty form" behavior: pass the modal's close
// handler through this instead of calling it directly.
function useCloseGuard(dialog) {
  return async (isDirty, onSave, onDiscard) => {
    if (!isDirty) { onDiscard(); return; }
    const choice = await dialog.saveExit("You have unsaved changes. Save them before closing?");
    if (choice === "save") await onSave();
    else if (choice === "discard") onDiscard();
  };
}

function Panel({ children, style, className, ...rest }) {
  return (
    <div className={className} {...rest} style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 4, ...style }}>
      {children}
    </div>
  );
}

function InfoBlock({ label, text, items }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 12, fontWeight: 700, color: C.navy, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>{label}</div>
      {text && <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.ink, lineHeight: 1.5 }}>{text}</div>}
      {items && (
        <ul style={{ margin: 0, paddingLeft: 18, fontFamily: FONT_BODY, fontSize: 13, color: C.ink, lineHeight: 1.6 }}>
          {items.map((it, i) => <li key={i}>{it}</li>)}
        </ul>
      )}
    </div>
  );
}

function SectionHeader({ title, subtitle, action, info }) {
  const [showInfo, setShowInfo] = useState(false);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <h2 style={{ fontFamily: FONT_HEAD, fontSize: 22, fontWeight: 700, color: C.ink, margin: 0 }}>{title}</h2>
          {info && (
            <button onClick={() => setShowInfo(true)} title={`About ${title}`} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkFaint, display: "flex", padding: 2 }}>
              <Info size={16} />
            </button>
          )}
        </div>
        {subtitle && <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.inkSoft, margin: "4px 0 0" }}>{term(subtitle)}</p>}
      </div>
      {action}
      {showInfo && info && (
        <Modal title={`About ${title}`} onClose={() => setShowInfo(false)}>
          <InfoBlock label="Purpose" text={term(info.purpose)} />
          <InfoBlock label="Workflow" text={term(info.workflow)} />
          <InfoBlock label="Permissions" text={term(info.permissions)} />
          <InfoBlock label="Features" items={info.features && info.features.map(term)} />
        </Modal>
      )}
    </div>
  );
}


/* ---- Link pre-fill (v2.3) ----
   Paste a product or company link and the form fields fill in from it (the
   server fetches the page; an optional Owner-enabled AI step refines it).
   Only empty fields are filled, and each filled field shows a faint "x" at its
   right edge to clear just that value. `map` says which form field receives
   each suggestion: { name, manufacturer, model, description, price, link }. */
function usePrefill(kind, setForm, map) {
  const [pf, setPf] = useState(() => new Set());
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState({ text: "", error: false });
  const reset = () => { setPf(new Set()); setUrl(""); setStatus({ text: "", error: false }); };
  const clear = (key) => {
    setForm((f) => ({ ...f, [key]: "" }));
    setPf((prev) => { const n = new Set(prev); n.delete(key); return n; });
  };
  const run = async (currentForm) => {
    const u = url.trim();
    if (!u) { setStatus({ text: "Paste a link first.", error: true }); return; }
    setBusy(true); setStatus({ text: "", error: false });
    try {
      const r = await api.prefillFromLink(u, kind);
      const filled = new Set(pf);
      let count = 0;
      const patch = {};
      for (const src of ["name", "manufacturer", "model", "description", "price"]) {
        const key = map[src], val = r.fields && r.fields[src];
        if (!key || !val) continue;
        if (String(currentForm[key] || "").trim()) continue; // never overwrite what's typed
        patch[key] = val; filled.add(key); count++;
      }
      if (map.link && !String(currentForm[map.link] || "").trim()) { patch[map.link] = r.finalUrl || u; filled.add(map.link); count++; }
      setForm((f) => ({ ...f, ...patch }));
      setPf(filled);
      setStatus({
        text: count ? `Filled ${count} field${count === 1 ? "" : "s"}${r.usedAi ? " (AI-assisted)" : ""} — check them, and click the x on any you don't want.${r.aiNote ? " " + r.aiNote : ""}` : "Nothing new to fill in from that page (fields that already have a value are left alone).",
        error: false,
      });
    } catch (e) { setStatus({ text: e.message || "Couldn't read that page.", error: true }); }
    finally { setBusy(false); }
  };
  return { pf, url, setUrl, busy, status, run, clear, reset };
}

function PrefillBar({ p, form }) {
  if (!SETTINGS.features.linkPrefill) return null;
  return (
    <div style={{ marginBottom: 12, padding: 10, border: `1px dashed ${C.line}`, borderRadius: 4, background: C.panelAlt }}>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          style={inputStyle} value={p.url} placeholder="Paste a link to fill this in automatically…"
          onChange={(e) => p.setUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); p.run(form); } }}
        />
        <Btn small variant="ghost" onClick={() => p.run(form)} disabled={p.busy}>{p.busy ? "Reading…" : "Fill from link"}</Btn>
      </div>
      {p.status.text && <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, marginTop: 6, color: p.status.error ? C.rust : C.inkSoft }}>{p.status.text}</div>}
    </div>
  );
}

// An input/textarea that shows a faint "x" while its value came from a link.
function PrefillInput({ p, field, value, onChange, multiline, ...rest }) {
  const flagged = p.pf.has(field) && !!value;
  const Tag = multiline ? "textarea" : "input";
  return (
    <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
      <Tag {...rest} style={{ ...inputStyle, ...(rest.style || {}), paddingRight: flagged ? 28 : undefined }} value={value} onChange={onChange} />
      {flagged && (
        <button
          type="button" title="Clear this value" aria-label="Clear this value" onClick={() => p.clear(field)}
          style={{ position: "absolute", right: 6, top: multiline ? 6 : "50%", transform: multiline ? "none" : "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.inkSoft, opacity: 0.45, padding: 2, display: "flex" }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = 1; }} onMouseLeave={(e) => { e.currentTarget.style.opacity = 0.45; }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

function LinkButton({ url, small }) {
  if (!url) return null;
  return (
    <a
      href={url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} title="Open link in a new window"
      style={{
        display: "inline-flex", alignItems: "center", gap: 4, fontFamily: FONT_BODY,
        fontSize: small ? 11 : 12, fontWeight: 600, color: C.navy, textDecoration: "none",
        border: `1px solid ${C.line}`, borderRadius: 3, padding: small ? "2px 6px" : "4px 8px", background: C.panel,
      }}
    >
      <ExternalLink size={small ? 10 : 11} /> Open link
    </a>
  );
}

// Builds the deep-link URL a QR code should encode: the app's own base
// URL plus a #asset/<id> hash, consumed on load by MaintEnhanceApp to jump
// straight to that asset's record (see parseAssetDeepLink()).
function assetDeepLink(assetId) {
  return window.location.origin + import.meta.env.BASE_URL + "#asset/" + assetId;
}

function QrLabelModal({ asset, onClose }) {
  const [dataUrl, setDataUrl] = useState(null);
  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(assetDeepLink(asset.id), { width: 320, margin: 1 })
      .then((url) => { if (!cancelled) setDataUrl(url); })
      .catch(() => { if (!cancelled) setDataUrl(""); });
    return () => { cancelled = true; };
  }, [asset.id]);

  const print = () => {
    const w = window.open("", "_blank", "width=420,height=520");
    if (!w) return;
    w.document.write(`
      <!doctype html><html><head><title>${asset.name} — QR label</title>
      <style>
        body { font-family: sans-serif; text-align: center; padding: 24px; }
        img { width: 260px; height: 260px; }
        h1 { font-size: 16px; margin: 14px 0 2px; }
        p { font-size: 11px; color: #666; margin: 0; }
      </style></head>
      <body>
        <img src="${dataUrl}" />
        <h1>${asset.name}</h1>
        <p>Scan to open this asset's record in {SETTINGS.brand.name}</p>
        <script>window.onload = () => { window.print(); };</script>
      </body></html>
    `);
    w.document.close();
  };

  return (
    <Modal title={`QR label — ${asset.name}`} info="qr" onClose={onClose}>
      <div style={{ textAlign: "center" }}>
        {dataUrl === null && <div style={{ padding: 30 }}><Loader2 className="animate-spin" size={20} color={C.inkSoft} /></div>}
        {dataUrl === "" && <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.rust, padding: 20 }}>Couldn't generate the QR code.</div>}
        {dataUrl && (
          <>
            <img src={dataUrl} alt={`QR code linking to ${asset.name}`} style={{ width: 220, height: 220 }} />
            <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.inkFaint, marginTop: 8 }}>
              Scanning this opens {asset.name}'s record directly — history, open work orders, and a quick "New work order" action.
            </div>
          </>
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
        <Btn variant="ghost" onClick={onClose}>Close</Btn>
        <Btn variant="primary" onClick={print} disabled={!dataUrl}><Download size={13} /> Print label</Btn>
      </div>
    </Modal>
  );
}

function LogMeterModal({ asset, update, onClose }) {
  const [value, setValue] = useState(asset.currentMeterValue || "");
  const [date, setDate] = useState(todayISO());
  const save = () => {
    update((d) => {
      const a = d.assets.find((x) => x.id === asset.id);
      a.currentMeterValue = Number(value) || 0;
      a.meterUpdatedDate = date;
      return d;
    });
    onClose();
  };
  return (
    <Modal title={`Log meter reading — ${asset.name}`} info="meter" onClose={onClose}>
      <Field label={`Current reading (${asset.meterUnit})`}><input type="number" style={inputStyle} value={value} onChange={(e) => setValue(e.target.value)} autoFocus /></Field>
      <Field label="As of"><input type="date" style={inputStyle} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint, marginBottom: 10 }}>
        Saving this checks every meter-based PM linked to this asset and generates the next work order automatically if the reading has crossed its interval.
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" onClick={save}>Save reading</Btn>
      </div>
    </Modal>
  );
}

// Parses "#asset/<id>" out of the current URL once, and clears the hash
// so re-visiting the Assets tab later doesn't keep jumping back to it.
function parseAssetDeepLink() {
  const m = /#asset\/([^/?#]+)/.exec(window.location.hash);
  return m ? decodeURIComponent(m[1]) : null;
}

function Empty({ text }) {
  return (
    <div style={{ padding: "28px 16px", textAlign: "center", color: C.inkFaint, fontFamily: FONT_BODY, fontSize: 13 }}>
      {text}
    </div>
  );
}

/* ============================================================
   PAGE INFO CONTENT
============================================================ */
const PAGE_INFO = {
  dashboard: {
    purpose: "A single, at-a-glance summary of what needs attention across the household — open work, pending requests, and what's coming up.",
    workflow: "Numbers and lists update live as work requests and orders change status. Click a stat card or list item to jump straight to the matching filtered view.",
    permissions: "Everyone sees the same dashboard — nothing here is hidden by role.",
    features: ["Stat cards for open work, pending requests, overdue work, and work due in 30 days", "Upcoming Work Orders list", "Work requests awaiting review", "7-day look-ahead strip", "Warranty-expiration warnings"],
  },
  locations: {
    purpose: "The physical map of the household — every building, floor, room, and area — that everything else in this system is organized around.",
    get workflow() { const L = SETTINGS.terms.locationLevels; return `Build the tree top-down: a ${L[0]} contains ${L[1]}s, which contain ${L[2]}s, ${L[3]}s, ${L[4]}s, and ${L[5]}s. A new node defaults to the next level down from wherever you clicked +, though you can change it.`; },
    permissions: "Owners and Managers can add, rename, and remove locations. Everyone can view and use the tree to filter other pages.",
    get features() { const site = SETTINGS.terms.locationLevels[SETTINGS.terms.siteLevelIndex]; return ["Expandable/collapsible hierarchy tree with expand-all/collapse-all", "Depth-aware default level when adding a node", "Asset counts per location", "Guards against deleting a location that still has children or assets", `PM setup wizard on a ${site} node — address/year-built/climate zone plus a starter set of recurring PM Bases scaled to that zone`]; },
  },
  assets: {
    purpose: "A registry of everything in the home worth maintaining, and — for the ones worth tracking in detail — the components and parts that make them up.",
    workflow: "Add an asset and assign it a location, then optionally build out its Bill of Materials: components, sub-components, and parts, each with its own manufacturer, model, and install date.",
    permissions: "Owners and Managers can add, edit, and archive assets. Owners, Managers, and Executors can edit BOM details. Everyone can browse.",
    features: ["Location hierarchy filter with expand/collapse", "Full Bill of Materials tree per asset", "Linked PM tasks and work order history", "Warranty and purchase tracking"],
  },
  requests: {
    purpose: "The inbox for anything in the household that needs attention, before it becomes scheduled work.",
    workflow: "Anyone submits a request describing the issue and when it's needed by; an Owner or Manager reviews it and converts it into a work order, merges it into an existing one, asks for more detail, or declines it.",
    permissions: "Everyone can submit a request and edit their own while it's awaiting review. Owners and Managers can edit or delete any request and can review, convert, merge, or decline.",
    features: ["Required-by date and priority", "Suggested work order type and suggested parts", "Location hierarchy, priority, and status filters", "Search by title or number", "Attach up to 5 photos when submitting, carried onto the work order once converted", "Works offline — a request submitted with no connection is saved on the device and syncs automatically once you're back online"],
  },
  orders: {
    purpose: "The record of all maintenance work in the household — planned, recurring, and reactive — from the moment it's raised to the moment it's closed.",
    workflow: "Work orders move through Active, Scheduled, Completed, and Closed. A work order becomes Scheduled automatically as soon as it has a scheduled date. They're created directly, converted from an approved request, or generated automatically from a PM Base template.",
    permissions: "Owners, Managers, and Executors can create and update work orders. Only Owners and Managers can move a work order to Closed. Moving a work order from Scheduled to Completed requires a comment. Owners can delete any; Managers can delete ones they created.",
    features: ["Kanban board by status, with a 30-day closed archive", "PM Base templates for recurring maintenance", "Parts attachment with location/component-scoped search", "Executor assignment and filter (defaults to yourself if you're an Executor)", "Completion comments for feedback on how the work went", "Location, priority, due-date, and executor filters"],
  },
  schedule: {
    purpose: "A calendar view of when maintenance work is planned to happen, so you can see what's coming up at a glance.",
    workflow: "Work orders with a scheduled date appear on that date. Click one to jump to its details.",
    permissions: "Everyone can view the schedule.",
    features: ["Month navigation", "Location and executor filters (executor defaults to yourself if you're an Executor)", "Color-coded by work order type", "Click-through to work order detail"],
  },
  vendors: {
    purpose: "The contractors and service providers you actually call on, kept in one place instead of scattered across texts and receipts.",
    workflow: "Add a vendor once; reference them from any work order or benchmark from then on.",
    permissions: "Owners and Managers can add, edit, and remove vendors. Everyone can view and select them.",
    features: ["Contact info and specialty", "Optional website link", "Referenced directly from work orders and benchmarks"],
  },
  parts: {
    purpose: "Every spare part and consumable you keep on hand, and what asset or component it belongs to.",
    workflow: "Add a part with its own part number, then track quantity on hand and a reorder threshold. Parts can be attached to work orders and suggested on work requests.",
    permissions: "Owners and Managers can add, edit, and remove parts. Everyone can view and adjust quantity on hand.",
    features: ["Unique part numbers", "Manufacturer and manufacturer part number", "Cost and purchase link", "Low-stock flagging", "Search by number, name, or manufacturer when attaching to work"],
  },
  budget: {
    purpose: "What the household's upkeep is actually costing, broken down by category, drawn straight from logged work order costs.",
    workflow: "Costs logged on work orders roll up automatically — there's nothing separate to maintain here.",
    permissions: "Everyone can view the budget.",
    features: ["Total logged spend", "Spend by asset category", "Always current, no manual entry"],
  },
  labour: {
    purpose: "Plan who does which work and when: assign executors to scheduled work orders, see each person's hours, and spot work that doesn't have enough people.",
    workflow: "Switch between Month, Week and Day. Managers drag work orders from the side list onto a person's column (week or day view) or onto a calendar day. Click a day header to open that day, or a week number to open that week. With hourly assignments on, drag cards to a 30-minute start time inside the person's shift.",
    permissions: "Everyone can view. Owners and Managers assign work. Executors enter hours worked when they complete a work order.",
    features: ["Month, week and day views with back/forward, up-a-level and view selector", "Multi-select executor filter and location filter", "Crew size and estimated hours on every card; total hours per person per day", "Dashed red outline and “Short” flag when fewer executors are assigned than required", "People only appear on days they are on shift when Workforce scheduling is on"],
  },
  workforce: {
    purpose: "Who is working when. Everyone can see the team's shifts; managers set them.",
    workflow: "Managers drag a person's name card onto a day or onto a week's number box, then pick a saved template or set a one-time schedule. Shifts that end before they start run overnight and are shown on the day they start.",
    permissions: "Everyone can view and export to PDF. Owners and Managers set shifts and templates.",
    features: ["Month, week and day views", "Daily and weekly shift templates (Tools tab) or one-time schedules", "Each day shows its first start and last end; red with a tooltip when part of that span has nobody working", "Export the visible period to PDF"],
  },
  help: {
    purpose: "The training guide, inside the app, so the answer to “how do I…?” is one click away.",
    workflow: "Pick the guide for your role (you can read the other one too). The contents list at the top links to every subject; select one to jump straight to it. The Download button gives you the Word version to print or share. Small (i) buttons throughout the app open a short note about the feature next to them.",
    permissions: "Everyone, including guests.",
    features: ["Linked table of contents", "Screen-by-screen pages with numbered pictures", "Download the Word document", "Executor guide and Manager & Owner guide"],
  },
  owner: {
    purpose: "Your account and hours, plus the setup tools for your role: managers get executor colours, shift templates and the team hours report; the Owner also gets accounts, branding, features, backups and record clean-up.",
    workflow: "Manage who has access and what role they hold (including temporary passwords), customise the name, logo, colours and location labels, back up or restore the full household record, and remove a work order or request that was created in error.",
    permissions: "Executors see their own tools; Managers add the manager tools; Owners see everything.",
    features: ["Add/remove household member accounts, set roles, set temporary passwords and notification emails", "Branding & terminology: name, logo, colours, location labels, top-bar title", "Features: Home Assistant alarms, link fill-in, execution-based scheduling, workforce scheduling and hourly assignments on/off", "Export to Excel or a Full backup (.zip with photos); import selected tabs with a pre-check", "Automatic nightly database snapshots; shrink existing photos", "Delete a work order or work request by number"],
  },
  purchasing: {
    purpose: "A running shopping list built automatically from what open work actually needs, so nothing gets started without the parts on hand.",
    workflow: "Any part attached to an Active or Scheduled work order in a quantity greater than what's currently in stock shows up here, grouped by the work order that needs it.",
    permissions: "Owners and Managers only.",
    features: ["Grouped by work order", "Manually add a part (from the catalogue or free-typed) to the list", "Shows quantity needed, on hand, and the shortfall to buy", "Click through to the work order"],
  },
  alarms: {
    purpose: "One dashboard for everything that needs attention right now, from any source: sensor-triggered alerts pushed in from Home Assistant, where that component is enabled for this deployment (a leak, a smoke/CO alarm, a freezer running warm), a numeric PM checklist reading that came back outside its expected range, or an alarm raised by hand — upstream of Work Requests, since not every alert should become a work item.",
    workflow: "Where enabled, Home Assistant does its own threshold/debounce/duration logic and POSTs to MaintEnhance's webhook only when it decides something's actually wrong; a numeric checklist step raises one automatically the moment a reading falls outside its configured min/max; anyone can also raise one by hand with \"Create alarm.\" Each open alarm can be acknowledged as a false alarm (with a reason, to help tune noisy sensors), turned into a new Work Request, or linked onto an existing Work Order as evidence.",
    permissions: "Owners and Managers only. Where the Home Assistant component is enabled, the webhook API key and sensor-to-asset mappings are also configured here, Owner-only for the key. (Raising an alarm itself — automatically from a checklist, or manually — isn't role-gated, since anyone filling in a checklist needs to be able to trigger one.)",
    features: ["Open queue sorted by severity and age, plus a resolved/false-alarm history", "\"Create alarm\" for a manual entry, independent of any sensor or checklist", "A numeric PM checklist step outside its expected range raises one automatically (deduped per work order/step)", "Acknowledge as false alarm, create Work Request, or link to an existing Work Order", "Home Assistant webhook, API key, and entity-to-asset/location mapping — an Owner-controlled feature (Owner Tools → Features)", "Source-agnostic design — 'home_assistant', 'pm_checklist', and 'manual' today, room for more push sources later"],
  },
};

/* ============================================================
   LOCATION HIERARCHY NAV
============================================================ */
function LocationNavTree({ data, selectedId, onSelect, beaconIds }) {
  const allIds = useMemo(() => new Set(data.locations.map((l) => l.id)), [data.locations]);
  const [expanded, setExpanded] = useState(() => new Set(allIds));
  const toggle = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const renderChildren = (parentId, depth) =>
    data.locations
      .filter((l) => (l.parentId || null) === parentId)
      .map((item) => {
        const hasKids = data.locations.some((l) => l.parentId === item.id);
        const isOpen = expanded.has(item.id);
        return (
          <div key={item.id}>
            <div
              className="hk-row"
              style={{
                display: "flex", alignItems: "center", gap: 4,
                padding: "6px 6px", paddingLeft: 6 + depth * 15,
                borderRadius: 3, cursor: "pointer",
                background: selectedId === item.id ? C.navySoft : "transparent",
              }}
            >
              {hasKids ? (
                <span onClick={(e) => { e.stopPropagation(); toggle(item.id); }} style={{ display: "flex", cursor: "pointer", color: C.inkFaint, flexShrink: 0 }}>
                  {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </span>
              ) : (
                <span style={{ width: 12, flexShrink: 0 }} />
              )}
              <span
                onClick={() => onSelect(item.id)}
                style={{ flex: 1, fontFamily: FONT_BODY, fontSize: 12.5, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              >
                {item.name}
              </span>
              {beaconIds && beaconIds.has(item.id) && <span className="hk-beacon" title="Active alarm here or below" aria-label="Active alarm" />}
            </div>
            {hasKids && isOpen && renderChildren(item.id, depth + 1)}
          </div>
        );
      });

  return (
    <Panel style={{ padding: 6, alignSelf: "start" }}>
      <div style={{ display: "flex", gap: 10, padding: "4px 6px 6px", borderBottom: `1px solid ${C.lineSoft}`, marginBottom: 4 }}>
        <span className="hk-link" onClick={() => setExpanded(new Set(allIds))} style={{ fontFamily: FONT_BODY, fontSize: 10.5, fontWeight: 700, color: C.navy, cursor: "pointer" }}>Expand all</span>
        <span className="hk-link" onClick={() => setExpanded(new Set())} style={{ fontFamily: FONT_BODY, fontSize: 10.5, fontWeight: 700, color: C.navy, cursor: "pointer" }}>Collapse all</span>
      </div>
      <div
        onClick={() => onSelect(null)}
        className="hk-row"
        style={{ padding: "7px 8px", borderRadius: 3, cursor: "pointer", fontFamily: FONT_BODY, fontSize: 12.5, fontWeight: 700, color: C.ink, background: !selectedId ? C.navySoft : "transparent", marginBottom: 4 }}
      >
        All locations
      </div>
      {renderChildren(null, 0)}
    </Panel>
  );
}

/* ============================================================
   NAV
============================================================ */
const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "locations", label: "Locations", icon: MapPin },
  { id: "assets", label: "Assets & BOM", icon: Boxes },
  { id: "requests", label: "Work Requests", icon: ClipboardList },
  { id: "orders", label: "Work Orders", icon: Wrench },
  { id: "schedule", label: "Schedule", icon: Calendar },
  { id: "workforce", label: "Workforce schedule", icon: Clock, featureKey: "workforceScheduling" },
  { id: "vendors", label: "Vendors", icon: Users },
  { id: "parts", label: "Parts Catalogue", icon: Package },
  { id: "budget", label: "Budget", icon: DollarSign },
  { id: "purchasing", label: "Purchasing", icon: ShoppingCart, adminOnly: true },
  { id: "alarms", label: "Alarms", icon: Siren, adminOnly: true },
  { id: "owner", label: "Tools and settings", icon: Shield },
  { id: "help", label: "Help", icon: Info },
];

// v2.6.1: the full change log, newest version first.
function ChangelogModal({ onClose }) {
  const [log, setLog] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => { api.getChangelog().then(setLog).catch((e) => setErr(e.message || "Couldn't load the change log")); }, []);
  return (
    <Modal title="Change log" info="changelog" onClose={onClose} wide>
      {err && <div style={{ color: C.rust, fontFamily: FONT_BODY, fontSize: 13 }}>{err}</div>}
      {!log && !err && <Empty text="Loading…" />}
      {log && (
        <div data-changelog style={{ maxHeight: "65vh", overflowY: "auto" }}>
          {log.entries.map((e, i) => (
            <div key={e.version} style={{ padding: "10px 0", borderTop: i ? `1px solid ${C.line}` : "none" }}>
              <div style={{ fontFamily: FONT_HEAD, fontSize: 14, fontWeight: 700, color: C.ink }}>
                v{e.version}{e.version === log.version ? <span style={{ marginLeft: 8, fontSize: 10.5, fontWeight: 700, color: "#fff", background: C.orange, borderRadius: 8, padding: "1px 7px" }}>Installed</span> : null}
              </div>
              {e.title && <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.inkFaint, margin: "1px 0 4px" }}>{e.title}</div>}
              <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.inkSoft, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{e.text}</div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
function Sidebar({ tab, setTab, open, role, counts, onNavigate }) {
  const [showLog, setShowLog] = useState(false);
  const items = NAV.filter((n) => (!n.ownerOnly || role === "Owner") && (!n.adminOnly || isAdmin(role) || (n.id === "alarms" && canAck())) && (!n.notGuest || role !== "Guest") && (!n.featureKey || SETTINGS.features[n.featureKey])).map((n) => (n.id === "schedule" && execOn() ? { ...n, label: "Labour assignment" } : n));
  return (
    <div
      style={{ width: 216, flexShrink: 0, background: SAFE_COLOR.test(SETTINGS.brand.colors.primary || "") ? SETTINGS.brand.colors.primary : DEFAULT_SETTINGS.brand.colors.primary, color: "#fff", display: open ? "flex" : "none", flexDirection: "column", position: "fixed", top: 0, bottom: 0, left: 0, zIndex: 40 }}
      className="hk-scroll hk-sidebar"
    >
      <div style={{ padding: "20px 18px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <BrandMark size={26} />
          <span style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: SETTINGS.brand.name.length > 14 ? 14.5 : 17, letterSpacing: "0.01em", lineHeight: 1.15, minWidth: 0 }}>{SETTINGS.brand.name}</span>
        </div>
        <button data-version onClick={() => setShowLog(true)} title="See what changed in each version"
          style={{ background: "none", border: "none", padding: 0, margin: "4px 0 0 34px", cursor: "pointer", fontFamily: FONT_BODY, fontSize: 11, color: "#8FA0AF", textDecoration: "underline", textUnderlineOffset: 2 }}>
          v{SETTINGS.version || "2.6.1"}
        </button>
        {showLog && <ChangelogModal onClose={() => setShowLog(false)} />}
      </div>
      <div style={{ flex: 1, padding: "6px 10px", overflowY: "auto" }}>
        {items.map((n) => {
          const Icon = n.icon;
          const active = tab === n.id;
          const badge = counts[n.id];
          return (
            <div
              key={n.id} onClick={() => { setTab(n.id); onNavigate && onNavigate(); }} className="hk-nav-item"
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 3, cursor: "pointer", marginBottom: 2,
                background: active ? "rgba(255,255,255,0.14)" : "transparent",
                borderLeft: active ? `3px solid ${C.orange}` : "3px solid transparent",
              }}
            >
              <Icon size={16} color={active ? "#fff" : "#B7C3CF"} />
              <span style={{ fontFamily: FONT_BODY, fontSize: 13.5, fontWeight: active ? 600 : 500, color: active ? "#fff" : "#D3DBE2", flex: 1 }}>{n.label}</span>
              {!!badge && <span style={{ background: C.orange, color: "#fff", fontSize: 10.5, fontWeight: 700, borderRadius: 10, padding: "1px 6px" }}>{badge}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   DASHBOARD
============================================================ */
function WeekLookahead({ data, goToOrder }) {
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
  const byDay = {};
  data.workOrders.forEach((w) => {
    if (w.type === "PM Base" || !w.scheduledDate) return;
    if (days.includes(w.scheduledDate)) (byDay[w.scheduledDate] = byDay[w.scheduledDate] || []).push(w);
  });
  return (
    <Panel style={{ padding: 16, marginTop: 16 }}>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 15, fontWeight: 600, color: C.ink, marginBottom: 10 }}>Next 7 days<InfoTip k="nextDays" /></div>
      <div className="hk-hscroll" data-hscroll="week-lookahead"><div className="hk-hscroll-in" style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 6 }}>
        {days.map((d) => {
          const dt = new Date(d + "T00:00:00");
          const items = byDay[d] || [];
          const isToday = d === todayISO();
          return (
            <div key={d} style={{ border: `1px solid ${C.lineSoft}`, borderRadius: 3, padding: 6, minHeight: 78, background: isToday ? C.orangeSoft : C.panel }}>
              <div style={{ fontFamily: FONT_BODY, fontSize: 10.5, fontWeight: 700, color: isToday ? C.orange : C.inkFaint }}>
                {dt.toLocaleDateString(undefined, { weekday: "short", day: "numeric" })}
              </div>
              {items.slice(0, 2).map((w) => (
                <div
                  key={w.id} onClick={() => goToOrder(w.id)} title={`${formatWoNum(w.number)} ${w.title}`}
                  style={{ fontFamily: FONT_BODY, fontSize: 10, fontWeight: 600, color: "#fff", background: WO_TYPE_COLORS[w.type], borderRadius: 2, padding: "2px 4px", marginTop: 4, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                >
                  {formatWoNum(w.number)}
                </div>
              ))}
              {items.length > 2 && <div style={{ fontFamily: FONT_BODY, fontSize: 9.5, color: C.inkFaint, marginTop: 2 }}>+{items.length - 2} more</div>}
            </div>
          );
        })}
      </div></div>
    </Panel>
  );
}

/* v2.6 — Owner metrics. Day-level dates only (the app records dates, not times). */
const dayDiff = (a, b) => Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000);
function OwnerMetrics({ data }) {
  const [users, setUsers] = useState([]);
  const [period, setPeriod] = useState("90");
  useEffect(() => { api.listUsers().then(setUsers).catch(() => setUsers([])); }, []);
  const name = (id) => (users.find((u) => u.id === id) || {}).username || "Former member";
  const since = period === "all" ? null : (() => { const d = new Date(); d.setDate(d.getDate() - Number(period)); return d.toISOString().slice(0, 10); })();
  const inPeriod = (iso) => !since || (iso && iso >= since);
  const real = (data.workOrders || []).filter((w) => w.type !== "PM Base");
  const done = real.filter((w) => w.status === "Completed" || w.status === "Closed");

  // 1. Work requests entered, per person.
  const wrCounts = {};
  (data.workRequests || []).filter((r) => inPeriod(r.dateSubmitted)).forEach((r) => { wrCounts[r.requestedBy || "?"] = (wrCounts[r.requestedBy || "?"] || 0) + 1; });
  const wrRows = Object.entries(wrCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: k, value: v, text: String(v) }));

  // 2. Hours efficiency: actual hours booked / estimated hours (per executor, so crew size is already accounted for).
  const eff = {};
  done.filter((w) => inPeriod(w.completedDate)).forEach((w) => {
    const est = Number(w.estHours) || 0;
    const booked = (w.timeEntries || []);
    if (!est || !booked.length) return;
    execIdsOf(w).forEach((id) => {
      const mine = booked.filter((t) => t.executorId === id).reduce((n, t) => n + (Number(t.hours) || 0), 0);
      if (!mine) return;
      const e = eff[id] || (eff[id] = { actual: 0, est: 0, n: 0 });
      e.actual += mine; e.est += est; e.n += 1;
    });
  });
  const effRows = Object.entries(eff).map(([id, e]) => ({ label: name(id), value: e.actual / e.est, text: `${Math.round((e.actual / e.est) * 100)}%`, sub: `${fmtH(e.actual)} h booked of ${fmtH(e.est)} h estimated · ${e.n} work order${e.n === 1 ? "" : "s"}` })).sort((a, b) => b.value - a.value);

  // 3. Schedule compliance: completed on the day it was scheduled.
  const comp = {};
  done.filter((w) => w.scheduledDate && w.completedDate && inPeriod(w.completedDate)).forEach((w) => {
    execIdsOf(w).forEach((id) => { const c = comp[id] || (comp[id] = { ok: 0, n: 0 }); c.n += 1; if (w.completedDate === w.scheduledDate) c.ok += 1; });
  });
  const compRows = Object.entries(comp).map(([id, c]) => ({ label: name(id), value: c.ok / c.n, text: `${Math.round((c.ok / c.n) * 100)}%`, sub: `${c.ok} of ${c.n} on the scheduled day` })).sort((a, b) => b.value - a.value);

  // 4. Work request lead time: request entered -> work order created.
  const reqById = Object.fromEntries((data.workRequests || []).map((r) => [r.id, r]));
  const leads = real.filter((w) => w.sourceRequestId && w.createdDate && reqById[w.sourceRequestId] && reqById[w.sourceRequestId].dateSubmitted && inPeriod(w.createdDate))
    .map((w) => dayDiff(reqById[w.sourceRequestId].dateSubmitted, w.createdDate));
  const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
  // 5. Verification time: Completed -> Closed.
  const verifs = done.filter((w) => w.completedDate && w.verifiedDate && inPeriod(w.verifiedDate)).map((w) => dayDiff(w.completedDate, w.verifiedDate));
  // 6. Reactive work %: unplanned / all work orders.
  const inScope = real.filter((w) => inPeriod(w.createdDate || w.completedDate || w.scheduledDate || w.requiredByDate));
  const reactive = inScope.filter((w) => w.type === "Unplanned").length;
  const days = (v) => (v == null ? "—" : `${(Math.round(v * 10) / 10)} days`);

  const Bars = ({ rows, pct, empty }) => (
    <div>
      {rows.length === 0 && <Empty text={empty} />}
      {rows.map((r) => (
        <div key={r.label} style={{ padding: "6px 0", borderTop: `1px solid ${C.lineSoft}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: FONT_BODY, fontSize: 12.5, color: C.ink }}>
            <span>{r.label}</span><span style={{ fontWeight: 700 }}>{r.text}</span>
          </div>
          {pct && <div style={{ background: C.panelAlt, height: 6, borderRadius: 3, marginTop: 4 }}><div style={{ width: `${Math.min(100, r.value * 100)}%`, background: C.navy, height: 6, borderRadius: 3 }} /></div>}
          {r.sub && <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: C.inkFaint, marginTop: 2 }}>{r.sub}</div>}
        </div>
      ))}
    </div>
  );
  const Card = ({ title, info, children }) => (
    <Panel style={{ padding: 14 }}>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 13.5, fontWeight: 600, color: C.ink, marginBottom: 6 }}>{title}{info && <InfoTip k={info} />}</div>
      {children}
    </Panel>
  );
  const Tile = ({ title, value, sub, info }) => (
    <Panel style={{ padding: "14px 16px" }}>
      <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, fontWeight: 600, color: C.inkSoft }}>{title}{info && <InfoTip k={info} />}</div>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 28, fontWeight: 700, color: C.ink, marginTop: 4 }}>{value}</div>
      <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: C.inkFaint, marginTop: 2 }}>{sub}</div>
    </Panel>
  );
  return (
    <div data-owner-metrics style={{ marginTop: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        <h3 style={{ fontFamily: FONT_HEAD, fontSize: 16, margin: 0, color: C.ink }}>Metrics<InfoTip k="metrics" /></h3>
        <select style={{ ...inputStyle, width: "auto" }} value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Metrics period">
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="365">Last 12 months</option>
          <option value="all">All time</option>
        </select>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12, marginBottom: 12 }}>
        <Tile title="Work request lead time" info="mLead" value={days(avg(leads))} sub={leads.length ? `average, request entered → work order created (${leads.length})` : "no converted requests with a creation date yet"} />
        <Tile title="Work order verification time" info="mVerify" value={days(avg(verifs))} sub={verifs.length ? `average, Completed → Closed (${verifs.length})` : "no closed work orders yet"} />
        <Tile title="Reactive work" info="mReactive" value={inScope.length ? `${Math.round((reactive / inScope.length) * 100)}%` : "—"} sub={`${reactive} unplanned of ${inScope.length} work orders`} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
        <Card title="Work requests entered" info="mWr"><Bars rows={wrRows} empty="No requests in this period." /></Card>
        <Card title="Work order hour efficiency" info="mEff"><Bars rows={effRows} pct empty="No completed work orders with hours booked and an estimate." /></Card>
        <Card title="Schedule compliance" info="mComp"><Bars rows={compRows} pct empty="No completed scheduled work orders in this period." /></Card>
      </div>
    </div>
  );
}

function Dashboard({ data, setTab, role, applyFilter, goToOrder, goToRequest }) {
  const openWO = data.workOrders.filter((w) => isOpenStatus(w.status));
  const pendingWR = data.workRequests.filter((w) => w.status === "Submitted" || w.status === "Under Review");
  const nonBaseOpenWO = data.workOrders.filter((w) => w.type !== "PM Base" && !isDoneStatus(w.status));
  const overdueWO = nonBaseOpenWO.filter((w) => w.requiredByDate && daysUntil(w.requiredByDate) < 0);
  const dueSoonWO = nonBaseOpenWO.filter((w) => {
    const rd = w.requiredByDate ? daysUntil(w.requiredByDate) : null;
    const sd = w.scheduledDate ? daysUntil(w.scheduledDate) : null;
    const inRange = (v) => v !== null && v >= 0 && v <= 30;
    return inRange(rd) || inRange(sd);
  });
  const warrantySoon = data.assets.filter((a) => !a.archived).filter((a) => {
    const d = daysUntil(a.warrantyEnd);
    return d !== null && d >= 0 && d <= 90;
  });

  const stat = (label, value, color, onClick) => (
    <Panel style={{ padding: "16px 18px", flex: "1 1 150px", cursor: onClick ? "pointer" : "default" }} >
      <div onClick={onClick} style={{}}>
        <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, fontWeight: 600, color: C.inkSoft, letterSpacing: "0.02em" }}>{label}</div>
        <div style={{ fontFamily: FONT_HEAD, fontSize: 30, fontWeight: 700, color: color || C.ink, marginTop: 4 }}>{value}</div>
      </div>
    </Panel>
  );

  return (
    <div>
      <SectionHeader title="Dashboard" subtitle={term("Your household's maintenance activity at a glance.")} info={PAGE_INFO.dashboard} />
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 22 }}>
        {stat("Open work orders", openWO.length, C.orange, () => applyFilter("orders", {}))}
        {stat("Pending requests", pendingWR.length, C.gold, () => applyFilter("requests", { status: "pending" }))}
        {stat("Overdue work orders", overdueWO.length, overdueWO.length ? C.rust : C.ink, () => applyFilter("orders", { due: "overdue" }))}
        {stat("Due within 30 days", dueSoonWO.length, undefined, () => applyFilter("orders", { due: "30" }))}
      </div>

      <div className="hk-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Panel style={{ padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h3 style={{ fontFamily: FONT_HEAD, fontSize: 15, margin: 0, color: C.ink }}>Work requests awaiting review<InfoTip k="wrAwaiting" /></h3>
            <span onClick={() => setTab("requests")} style={{ cursor: "pointer", color: C.navy, fontSize: 12.5, fontFamily: FONT_BODY, fontWeight: 600 }}>View all →</span>
          </div>
          {pendingWR.length === 0 && <Empty text="Nothing waiting on review." />}
          {pendingWR.map((wr) => (
            <div key={wr.id} onClick={() => goToRequest(wr.id)} className="hk-row" style={{ padding: "9px 4px", borderTop: `1px solid ${C.lineSoft}`, cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, color: C.ink }}>{formatWrNum(wr.number)} · {wr.title}</span>
                <Tag text={wr.priority} color={PRIORITY_COLORS[wr.priority]} soft={PRIORITY_SOFT[wr.priority]} />
              </div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.inkFaint, marginTop: 2 }}>{locationPath(data.locations, wr.locationId)}</div>
            </div>
          ))}
        </Panel>

        <Panel style={{ padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h3 style={{ fontFamily: FONT_HEAD, fontSize: 15, margin: 0, color: C.ink }}>Upcoming Work Orders<InfoTip k="upcomingWo" /></h3>
            <span onClick={() => setTab("orders")} style={{ cursor: "pointer", color: C.navy, fontSize: 12.5, fontFamily: FONT_BODY, fontWeight: 600 }}>View all →</span>
          </div>
          {dueSoonWO.length === 0 && <Empty text="Nothing scheduled or due in the next 30 days." />}
          {dueSoonWO.map((w) => {
            const rd = w.requiredByDate ? daysUntil(w.requiredByDate) : null;
            const overdue = rd !== null && rd < 0;
            return (
              <div key={w.id} onClick={() => goToOrder(w.id)} className="hk-row" style={{ padding: "9px 4px", borderTop: `1px solid ${C.lineSoft}`, cursor: "pointer", display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, color: C.ink }}>{formatWoNum(w.number)} · {w.title}</div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.inkFaint }}>
                    {w.scheduledDate ? `Scheduled ${fmtDate(w.scheduledDate)}` : w.requiredByDate ? `Required by ${fmtDate(w.requiredByDate)}` : ""}
                  </div>
                </div>
                <Tag text={overdue ? "Overdue" : w.type} color={overdue ? C.rust : WO_TYPE_COLORS[w.type]} soft={overdue ? C.rustSoft : C.panelAlt} />
              </div>
            );
          })}
        </Panel>
      </div>

      <WeekLookahead data={data} goToOrder={goToOrder} />

      {role === "Owner" && <OwnerMetrics data={data} />}

      {warrantySoon.length > 0 && (
        <Panel style={{ padding: 16, marginTop: 16 }}>
          <h3 style={{ fontFamily: FONT_HEAD, fontSize: 15, margin: "0 0 10px", color: C.ink }}>Warranty expiring soon<InfoTip k="warranty" /></h3>
          {warrantySoon.map((a) => (
            <div key={a.id} style={{ padding: "7px 0", borderTop: `1px solid ${C.lineSoft}`, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.ink }}>{a.name}</span>
              <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.inkFaint }}>Expires {fmtDate(a.warrantyEnd)}</span>
            </div>
          ))}
        </Panel>
      )}
    </div>
  );
}

// One-time (but re-runnable) setup wizard offered on a Property-level
// location: takes an address/year-built, guesses a climate zone, and lets
// the household pick from a starter set of recurring PM Bases scaled to
// that zone. Every PM Base it creates is a normal, fully editable PM Base
// afterward (trigger type, checklist, etc.) — the wizard just seeds them.
function PmWizardModal({ property, data, update, onClose }) {
  const [step, setStep] = useState(1);
  const [address, setAddress] = useState(property.address || "");
  const [yearBuilt, setYearBuilt] = useState(property.yearBuilt || "");
  const [climateZone, setClimateZone] = useState(property.climateZone || guessClimateZone(property.address || ""));
  const [selected, setSelected] = useState(new Set());
  const [reqError, setReqError] = useState("");
  const [reqs, setReqs] = useState({}); // id -> { crew, hours } (needed when labour scheduling is on)
  const [typeFilter, setTypeFilter] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [q, setQ] = useState("");
  const catalog = effectiveWizardCatalog(data);
  const reqOf = (item) => reqs[item.id] || { crew: String(item.crewRequired || 1), hours: String(item.estHours || 1) };
  const setReq = (item, patch) => setReqs((r) => ({ ...r, [item.id]: { ...reqOf(item), ...patch } }));
  const types = uniqSorted(catalog.map(catType));
  const fitsZone = (i) => i.zones === "all" || (i.zones || []).includes(climateZone);
  const cats = uniqSorted(catalog.filter((i) => !typeFilter || catType(i) === typeFilter).map(catCategory));
  const shown = catalog.filter((i) => (!typeFilter || catType(i) === typeFilter) && (!catFilter || catCategory(i) === catFilter)
    && (!q.trim() || (i.title + " " + (i.description || "")).toLowerCase().includes(q.trim().toLowerCase())));

  const onAddressBlur = () => {
    const guess = guessClimateZone(address);
    if (guess !== "Unknown") setClimateZone(guess);
  };
  const goToStep2 = () => {
    // A small (custom) catalogue is pre-checked by climate zone as before; the big
    // combined catalogue starts empty so nobody gets hundreds of templates by accident.
    setSelected(new Set(catalog.length <= 30 ? catalog.filter(fitsZone).map((i) => i.id) : []));
    setTypeFilter(types.includes("Home") ? "Home" : "");
    setCatFilter(""); setQ("");
    setStep(2);
  };
  const toggle = (id) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const selectShown = () => setSelected((prev) => { const n = new Set(prev); shown.filter(fitsZone).forEach((i) => n.add(i.id)); return n; });
  const clearShown = () => setSelected((prev) => { const n = new Set(prev); shown.forEach((i) => n.delete(i.id)); return n; });

  const finish = () => {
    if (execOn()) {
      const bad = catalog.filter((i) => selected.has(i.id)).filter((i) => !(Number(reqOf(i).crew) >= 1) || !(Number(reqOf(i).hours) > 0));
      if (bad.length) { setReqError(`Set executors required and hours per executor for: ${bad.slice(0, 3).map((i) => i.title).join(", ")}${bad.length > 3 ? "…" : ""}`); return; }
    }
    update((d) => {
      const prop = d.locations.find((l) => l.id === property.id);
      prop.address = address.trim();
      prop.yearBuilt = yearBuilt;
      prop.climateZone = climateZone;
      prop.pmWizardRunAt = todayISO();
      d.counters = d.counters || { wo: 0, wr: 0, part: 0 };
      catalog.filter((item) => selected.has(item.id)).forEach((item) => {
        d.counters.wo += 1;
        const base = {
          id: uid("wo"), number: d.counters.wo, title: item.title, type: "PM Base", status: "Active",
          assetId: null, bomNodeId: null, locationId: property.id,
          description: item.description || "", sourceRequestId: null, sourceBenchmarkId: null,
          sourcePmBaseId: null, sourceFixedDate: null, priority: "Medium", executorId: "", executorIds: [],
          estHours: execOn() ? String(reqOf(item).hours) : "", crewRequired: execOn() ? String(reqOf(item).crew) : "",
          scheduledDate: "", requiredByDate: "", completedDate: null, verifiedDate: null,
          cost: "", vendorId: null, notes: "", parts: [], comments: [], partsDeducted: false, createdBy: null,
          pmMode: "Non-fixed", triggerType: "calendar",
          frequencyValue: item.frequencyValue, frequencyUnit: item.frequencyUnit,
          checklistTemplate: [],
        };
        d.workOrders.push(base);
        spawnPmInstance(d, base, { afterDateISO: todayISO(), fixedDate: null });
      });
      return d;
    });
    onClose();
  };

  return (
    <Modal title={`PM setup wizard — ${property.name}`} info="pmWizard" onClose={onClose} wide>
      {step === 1 && (
        <>
          <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.inkFaint, marginBottom: 12 }}>
            Tell us a bit about {property.name} and we'll suggest a starter set of recurring maintenance, scaled to your climate. You can add, remove, or edit anything afterward — this just saves starting from a blank list.
          </div>
          <Field label="Address"><input style={inputStyle} value={address} onChange={(e) => setAddress(e.target.value)} onBlur={onAddressBlur} placeholder="123 Main St, Anytown, ST" autoFocus /></Field>
          <Field label="Year built (optional)"><input style={inputStyle} value={yearBuilt} onChange={(e) => setYearBuilt(e.target.value)} placeholder="e.g. 1998" /></Field>
          <Field label="Climate zone">
            <select style={inputStyle} value={climateZone} onChange={(e) => setClimateZone(e.target.value)}>
              {CLIMATE_ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
            </select>
          </Field>
          <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint, marginTop: -6, marginBottom: 12 }}>
            Guessed from the address using a simple state/province lookup — not a real climate service — so double-check it and change it if it's wrong.
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
            <Btn variant="primary" onClick={goToStep2}>Next: pick maintenance <ArrowRight size={13} /></Btn>
          </div>
        </>
      )}
      {step === 2 && (
        <>
          <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.inkFaint, marginBottom: 10 }}>
            Filter by type and sub type, then tick what applies. Entries not typical for the <strong>{climateZone}</strong> climate zone are greyed (you can still tick them). Each becomes its own PM Base template, fully editable afterward from Work Orders.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, marginBottom: 8 }}>
            <select style={inputStyle} value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setCatFilter(""); }}>
              <option value="">All types</option>
              {types.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select style={inputStyle} value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
              <option value="">All sub types</option>
              {cats.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input style={inputStyle} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" />
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
            <Btn small variant="ghost" onClick={selectShown}>Tick all shown</Btn>
            <Btn small variant="ghost" onClick={clearShown}>Untick all shown</Btn>
            <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.inkFaint }}>{shown.length} shown · {selected.size} selected in total</span>
          </div>
          <div className="hk-scroll" style={{ maxHeight: 340, overflowY: "auto" }}>
            {catalog.length === 0 && <Empty text="The starter catalogue is empty — add entries from Owner Tools, or skip this and build PM Bases from scratch." />}
            {catalog.length > 0 && shown.length === 0 && <Empty text="Nothing matches these filters." />}
            {shown.map((item) => (
              <label key={item.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "7px 0", borderTop: `1px solid ${C.lineSoft}`, cursor: "pointer", opacity: fitsZone(item) ? 1 : 0.55 }}>
                <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggle(item.id)} style={{ marginTop: 3 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, color: C.ink }}>{item.title}</div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint }}>{catType(item)} · {catCategory(item)} · Every {item.frequencyValue} {item.frequencyUnit}{item.description ? ` · ${item.description}` : ""}</div>
                  {execOn() && selected.has(item.id) && (
                    <div onClick={(e) => e.preventDefault()} style={{ display: "flex", gap: 10, marginTop: 5, alignItems: "center", flexWrap: "wrap", fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkSoft }}>
                      <label>Executors required <input type="number" min="1" step="1" data-wiz-crew style={{ ...inputStyle, width: 64, padding: "3px 6px", display: "inline-block" }} value={reqOf(item).crew} onChange={(e) => setReq(item, { crew: e.target.value })} /></label>
                      <label>Hours per executor <input type="number" min="0" step="0.25" data-wiz-hours style={{ ...inputStyle, width: 72, padding: "3px 6px", display: "inline-block" }} value={reqOf(item).hours} onChange={(e) => setReq(item, { hours: e.target.value })} /></label>
                    </div>
                  )}
                </div>
              </label>
            ))}
          </div>
          {reqError && <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.rust, marginTop: 8 }}>{reqError}</div>}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14 }}>
            <Btn variant="ghost" onClick={() => setStep(1)}>Back</Btn>
            <Btn variant="primary" onClick={finish}>Create {selected.size} PM template{selected.size === 1 ? "" : "s"}</Btn>
          </div>
        </>
      )}
    </Modal>
  );
}

/* ============================================================
   LOCATIONS
============================================================ */
function LocationsView({ data, update, role }) {
  const dialog = useDialog();
  const closeGuard = useCloseGuard(dialog);
  const [modal, setModal] = useState(null);
  const [wizardProperty, setWizardProperty] = useState(null);
  const [form, setForm] = useState({ name: "", level: "Property", address: "", yearBuilt: "", climateZone: "Unknown" });
  const initial = useRef(null);
  const isDirty = modal && JSON.stringify(form) !== initial.current;

  // v2.6: adding a location is inline — a new row appears one level below the one clicked.
  const [draft, setDraft] = useState(null); // { parentId, name }
  const draftDone = useRef(false);
  const openAdd = (parentId) => {
    draftDone.current = false;
    setDraft({ parentId: parentId || null, name: "" });
    if (parentId) setExpanded((prev) => new Set(prev).add(parentId));
  };
  const commitDraft = () => {
    if (draftDone.current || !draft) return;
    draftDone.current = true;
    const name = draft.name.trim();
    const pid = draft.parentId;
    setDraft(null);
    if (!name) return;
    update((d) => {
      d.locations.push({ id: uid("loc"), name, level: defaultLevelForParent(d.locations, pid), parentId: pid, createdBy: null });
      return d;
    });
  };
  const cancelDraft = () => { draftDone.current = true; setDraft(null); };
  const renderDraft = (parentId, depth) => {
    if (!draft || draft.parentId !== parentId) return null;
    const lvl = defaultLevelForParent(data.locations, parentId);
    return (
      <div key="draft" data-loc-draft className="hk-row" style={{ display: "flex", alignItems: "center", padding: "8px 16px", borderTop: `1px solid ${C.lineSoft}`, gap: 10, background: C.panelAlt }}>
        <div style={{ width: depth * 20, flexShrink: 0 }} />
        <span style={{ width: 14, flexShrink: 0 }} />
        <Plus size={14} color={C.inkFaint} />
        <input autoFocus value={draft.name} placeholder={`New ${levelLabel(lvl).toLowerCase()} name`} aria-label="New location name"
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          onBlur={commitDraft}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitDraft(); } else if (e.key === "Escape") { e.preventDefault(); cancelDraft(); } }}
          style={{ ...inputStyle, flex: 1, padding: "5px 8px" }} />
        <Tag text={levelLabel(lvl)} color={C.navy} soft={C.navySoft} />
        <button title="Save" aria-label="Save location" onMouseDown={(e) => { e.preventDefault(); commitDraft(); }} style={{ background: "none", border: "none", cursor: "pointer", color: C.olive, padding: 4 }}><Check size={16} /></button>
      </div>
    );
  };
  const openEdit = (node) => {
    const f = { name: node.name, level: node.level, address: node.address || "", yearBuilt: node.yearBuilt || "", climateZone: node.climateZone || "Unknown" };
    setForm(f); initial.current = JSON.stringify(f);
    setModal({ mode: "edit", node });
  };
  const save = () => {
    if (!form.name.trim()) return;
    update((d) => {
      const propFields = isSiteLevel(form.level) ? { address: form.address.trim(), yearBuilt: form.yearBuilt, climateZone: form.climateZone } : {};
      const n = d.locations.find((l) => l.id === modal.node.id);
      n.name = form.name.trim();
      n.level = form.level;
      Object.assign(n, propFields);
      return d;
    });
    setModal(null);
  };
  const remove = async (node) => {
    const hasChildren = data.locations.some((l) => l.parentId === node.id);
    const hasAssets = data.assets.some((a) => a.locationId === node.id);
    if (hasChildren || hasAssets) { await dialog.alertMsg("Move or remove child locations and linked assets first."); return; }
    const ok = await dialog.confirm(`Delete "${node.name}"?`);
    if (!ok) return;
    update((d) => { d.locations = d.locations.filter((l) => l.id !== node.id); return d; });
  };

  const allIds = useMemo(() => new Set(data.locations.map((l) => l.id)), [data.locations]);
  const [expanded, setExpanded] = useState(() => new Set(allIds));
  const toggle = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const renderChildren = (parentId, depth) =>
    data.locations
      .filter((l) => (l.parentId || null) === parentId)
      .map((item) => {
        const hasKids = data.locations.some((l) => l.parentId === item.id);
        const isOpen = expanded.has(item.id);
        const assetCount = data.assets.filter((a) => a.locationId === item.id).length;
        const Icon = LEVEL_ICONS[item.level] || MapPin;
        return (
          <div key={item.id}>
            <div className="hk-row" style={{ display: "flex", alignItems: "center", padding: "10px 16px", borderTop: `1px solid ${C.lineSoft}`, gap: 10 }}>
              <div style={{ width: depth * 20, flexShrink: 0 }} />
              {hasKids ? (
                <span onClick={() => toggle(item.id)} style={{ display: "flex", cursor: "pointer", color: C.inkFaint, flexShrink: 0 }}>
                  {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </span>
              ) : (
                <span style={{ width: 14, flexShrink: 0 }} />
              )}
              <Icon size={14} color={C.inkFaint} />
              <span style={{ fontFamily: FONT_BODY, fontSize: 13.5, fontWeight: 600, color: C.ink, flex: 1 }}>{item.name}</span>
              <Tag text={levelLabel(item.level)} color={C.navy} soft={C.navySoft} />
              {assetCount > 0 && <span style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint }}>{assetCount} asset{assetCount > 1 ? "s" : ""}</span>}
              {isAdmin(role) && (
                <div style={{ display: "flex", gap: 6 }}>
                  {isSiteLevel(item.level) && (
                    <button title="PM setup wizard" onClick={() => setWizardProperty(item)} style={{ background: "none", border: "none", cursor: "pointer", color: C.gold }}><Wand2 size={14} /></button>
                  )}
                  <button title="Add child" onClick={() => openAdd(item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.navy }}><Plus size={15} /></button>
                  <button title="Edit" onClick={() => openEdit(item)} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkSoft }}><Pencil size={14} /></button>
                  <button title="Delete" onClick={() => remove(item)} style={{ background: "none", border: "none", cursor: "pointer", color: C.rust }}><Trash2 size={14} /></button>
                </div>
              )}
            </div>
            {isOpen && renderDraft(item.id, depth + 1)}
            {hasKids && isOpen && renderChildren(item.id, depth + 1)}
          </div>
        );
      });

  return (
    <div>
      <SectionHeader
        title="Location Hierarchy"
        subtitle={term("The physical map of the household that everything else is organized around.")}
        info={PAGE_INFO.locations}
        action={isAdmin(role) && <Btn variant="primary" onClick={() => openAdd(null)}><Plus size={15} /> Add top-level location</Btn>}
      />
      <div style={{ display: "flex", gap: 14, marginBottom: 8 }}>
        <span className="hk-link" onClick={() => setExpanded(new Set(allIds))} style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, color: C.navy, cursor: "pointer" }}>Expand all</span>
        <span className="hk-link" onClick={() => setExpanded(new Set())} style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, color: C.navy, cursor: "pointer" }}>Collapse all</span>
      </div>
      <Panel>
        {data.locations.length === 0 && <Empty text="No locations yet." />}
        {renderDraft(null, 0)}
        {renderChildren(null, 0)}
      </Panel>

      {modal && (
        <Modal title="Edit location" info="location" onClose={() => closeGuard(isDirty, save, () => setModal(null))}>
          <Field label="Name" required>
            <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Primary Bathroom" autoFocus />
          </Field>
          <Field label="Level">
            <select style={inputStyle} value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
              {LOCATION_LEVELS.map((l) => <option key={l} value={l}>{levelLabel(l)}</option>)}
            </select>
          </Field>
          {isSiteLevel(form.level) && (
            <>
              <Field label="Address (optional)"><input style={inputStyle} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="123 Main St, Anytown, ST" /></Field>
              <div className="hk-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="Year built (optional)"><input style={inputStyle} value={form.yearBuilt} onChange={(e) => setForm({ ...form, yearBuilt: e.target.value })} /></Field>
                <Field label="Climate zone">
                  <select style={inputStyle} value={form.climateZone} onChange={(e) => setForm({ ...form, climateZone: e.target.value })}>
                    {CLIMATE_ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
                  </select>
                </Field>
              </div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint, marginTop: -6, marginBottom: 12 }}>
                Used by the PM setup wizard (the wand icon next to a {levelLabel(LOCATION_LEVELS[SETTINGS.terms.siteLevelIndex])}) to suggest a starter set of recurring maintenance.
              </div>
            </>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
            <Btn variant="ghost" onClick={() => closeGuard(isDirty, save, () => setModal(null))}>Cancel</Btn>
            <Btn variant="primary" onClick={save}>Save</Btn>
          </div>
        </Modal>
      )}

      {wizardProperty && <PmWizardModal property={wizardProperty} data={data} update={update} onClose={() => setWizardProperty(null)} />}
    </div>
  );
}

/* ============================================================
   ASSETS + BOM
============================================================ */
function BomTree({ data, update, assetId, role }) {
  const dialog = useDialog();
  const nodes = data.bomNodes.filter((n) => n.assetId === assetId);
  const rows = flattenTree(nodes, "parentId", null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  const blankForm = { name: "", level: "Component", manufacturer: "", model: "", installDate: "", cost: "", notes: "" };
  const [copyOpen, setCopyOpen] = useState(false);
  const [copySrc, setCopySrc] = useState("");
  const sources = data.assets.filter((a) => a.id !== assetId && data.bomNodes.some((n) => n.assetId === a.id));
  const doCopy = () => {
    if (!copySrc) return;
    update((d) => {
      const src = d.bomNodes.filter((n) => n.assetId === copySrc);
      const idMap = {};
      src.forEach((n) => { idMap[n.id] = uid("bom"); });
      src.forEach((n) => { d.bomNodes.push({ ...n, id: idMap[n.id], assetId, parentId: n.parentId && idMap[n.parentId] ? idMap[n.parentId] : null }); });
      return d;
    });
    setCopyOpen(false); setCopySrc("");
  };
  const openAdd = (parentId) => {
    setForm({ ...blankForm, level: parentId ? "Sub-component" : "Component" });
    setModal({ mode: "add", parentId });
  };
  const openEdit = (node) => {
    setForm({ ...node });
    setModal({ mode: "edit", node });
  };
  const save = () => {
    if (!form.name.trim()) return;
    update((d) => {
      if (modal.mode === "add") {
        d.bomNodes.push({ id: uid("bom"), assetId, parentId: modal.parentId || null, ...form, name: form.name.trim() });
      } else {
        const n = d.bomNodes.find((x) => x.id === modal.node.id);
        Object.assign(n, form, { name: form.name.trim() });
      }
      return d;
    });
    setModal(null);
  };
  const remove = async (node) => {
    const hasChildren = data.bomNodes.some((n) => n.parentId === node.id);
    if (hasChildren) { await dialog.alertMsg("Remove or move its child nodes first."); return; }
    const ok = await dialog.confirm(`Remove "${node.name}" from the BOM?`);
    if (!ok) return;
    update((d) => { d.bomNodes = d.bomNodes.filter((n) => n.id !== node.id); return d; });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontFamily: FONT_HEAD, fontSize: 14, fontWeight: 600, color: C.ink }}>Bill of Materials<InfoTip k="bom" /></div>
        {canWrite(role) && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Btn small variant="ghost" onClick={() => setCopyOpen(true)}><Copy size={13} /> Copy BOM from another asset</Btn>
            <Btn small variant="ghost" onClick={() => openAdd(null)}><Plus size={13} /> Add component</Btn>
          </div>
        )}
      </div>
      {rows.length === 0 && <Empty text="No components recorded yet — break this asset down into components, sub-components, and parts." />}
      {rows.map(({ item, depth }) => (
        <div key={item.id} className="hk-row" style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderTop: `1px solid ${C.lineSoft}` }}>
          <div style={{ width: depth * 18 }} />
          <Layers size={12} color={C.inkFaint} />
          <span style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, color: C.ink }}>{item.name}</span>
          <Tag text={item.level} color={C.olive} soft={C.oliveSoft} />
          {item.model && <span style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint }}>#{item.model}</span>}
          <div style={{ flex: 1 }} />
          {canWrite(role) && (
            <>
              <button title="Add child" onClick={() => openAdd(item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.navy }}><Plus size={13} /></button>
              <button title="Edit" onClick={() => openEdit(item)} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkSoft }}><Pencil size={12} /></button>
              <button title="Remove" onClick={() => remove(item)} style={{ background: "none", border: "none", cursor: "pointer", color: C.rust }}><Trash2 size={12} /></button>
            </>
          )}
        </div>
      ))}

      {copyOpen && (
        <Modal title="Copy a bill of materials" info="bomCopy" onClose={() => setCopyOpen(false)}>
          <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.inkSoft, marginBottom: 10 }}>
            Copies every component, sub-component and part from another asset's BOM into this one{nodes.length ? ", added after what is already here" : ""}. Links to catalogue parts and work orders are not copied.
          </div>
          <Field label="Copy from">
            <select style={inputStyle} value={copySrc} onChange={(e) => setCopySrc(e.target.value)}>
              <option value="">— choose an asset —</option>
              {sources.map((a) => <option key={a.id} value={a.id}>{a.name} ({data.bomNodes.filter((n) => n.assetId === a.id).length} items)</option>)}
            </select>
          </Field>
          {sources.length === 0 && <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.inkFaint }}>No other asset has a BOM yet.</div>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
            <Btn variant="ghost" onClick={() => setCopyOpen(false)}>Cancel</Btn>
            <Btn variant="primary" onClick={doCopy} disabled={!copySrc}>Copy BOM</Btn>
          </div>
        </Modal>
      )}
      {modal && (
        <Modal title={modal.mode === "add" ? "Add BOM node" : "Edit BOM node"} info="bomNode" onClose={() => setModal(null)}>
          <Field label="Name" required>
            <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Ignitor" autoFocus />
          </Field>
          <Field label="Level">
            <select style={inputStyle} value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
              {BOM_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </Field>
          <div className="hk-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Manufacturer"><input style={inputStyle} value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} /></Field>
            <Field label="Model / part #"><input style={inputStyle} value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></Field>
            <Field label="Install date"><input type="date" style={inputStyle} value={form.installDate} onChange={(e) => setForm({ ...form, installDate: e.target.value })} /></Field>
            <Field label="Cost ($)"><input style={inputStyle} value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} /></Field>
          </div>
          <Field label="Notes"><textarea style={{ ...inputStyle, minHeight: 60 }} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          {modal.mode === "add" && (
            <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.inkFaint, marginBottom: 8 }}>
              Parent: {modal.parentId ? nodes.find((n) => n.id === modal.parentId)?.name : "— (root of this asset's BOM)"}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
            <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn variant="primary" onClick={save}>Save</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// v2.6: what an asset is linked to. Deleting is only allowed when nothing links to it.
function assetLinks(data, assetId, extra) {
  const out = [];
  const n = (arr, f) => (arr || []).filter(f).length;
  const wo = n(data.workOrders, (w) => w.assetId === assetId && w.type !== "PM Base");
  const pmBase = n(data.workOrders, (w) => w.assetId === assetId && w.type === "PM Base");
  const wr = n(data.workRequests, (r) => r.assetId === assetId);
  const parts = n(data.inventory, (p) => p.assetId === assetId);
  const pm = n(data.pmTemplates, (p) => p.assetId === assetId);
  if (wo) out.push(`${wo} work order${wo > 1 ? "s" : ""}`);
  if (pmBase) out.push(`${pmBase} PM base${pmBase > 1 ? "s" : ""}`);
  if (pm) out.push(`${pm} PM task${pm > 1 ? "s" : ""}`);
  if (wr) out.push(`${wr} work request${wr > 1 ? "s" : ""}`);
  if (parts) out.push(`${parts} part${parts > 1 ? "s" : ""}`);
  if (extra && extra.alarms) out.push(`${extra.alarms} alarm${extra.alarms > 1 ? "s" : ""}`);
  if (extra && extra.mappings) out.push(`${extra.mappings} sensor mapping${extra.mappings > 1 ? "s" : ""}`);
  return out;
}
const liveAssets = (data, keepId) => (data.assets || []).filter((a) => !a.archived || a.id === keepId);

function RemoveAssetModal({ data, asset, onArchive, onDelete, onClose }) {
  const [extra, setExtra] = useState(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      let alarms = 0, mappings = 0;
      try { alarms = (await api.listAlarms()).filter((a) => a.assetId === asset.id).length; } catch (e) { /* no alarms access */ }
      try { mappings = (await api.listAlarmMappings()).filter((m) => m.assetId === asset.id).length; } catch (e) { /* feature off */ }
      if (alive) setExtra({ alarms, mappings });
    })();
    return () => { alive = false; };
  }, [asset.id]);
  const links = extra ? assetLinks(data, asset.id, extra) : [];
  const p = { fontFamily: FONT_BODY, fontSize: 13, color: C.ink, margin: "0 0 10px" };
  return (
    <Modal title={`Remove “${asset.name}”`} info="removeAsset" onClose={onClose}>
      <div data-remove-asset>
        <p style={p}><b>Archive</b> hides the asset from lists and pickers but keeps it, its bill of materials and all of its history. You can restore it later with “Show archived”. This is the safe choice.</p>
        <p style={p}><b>Delete</b> permanently erases the asset and its bill of materials. It cannot be undone, and it is only allowed when nothing is linked to the asset.</p>
        {!extra && <div style={{ ...p, color: C.inkFaint }}>Checking what is linked to it…</div>}
        {extra && links.length > 0 && (
          <div style={{ ...p, color: C.rust, background: C.rustSoft, borderRadius: 4, padding: "8px 10px" }}>
            Delete is not available: this asset is linked to {links.join(", ")}. Archive it instead.
          </div>
        )}
        {extra && links.length === 0 && <div style={{ ...p, color: C.olive }}>Nothing is linked to this asset, so it can be deleted.</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={onArchive}><Archive size={13} /> Archive</Btn>
          <Btn variant="danger" onClick={onDelete} disabled={!extra || links.length > 0}><Trash2 size={13} /> Delete permanently</Btn>
        </div>
      </div>
    </Modal>
  );
}

function AssetsView({ data, update, role, goToOrder, deepLinkAssetId, onConsumeDeepLink, onNewOrderForAsset }) {
  const dialog = useDialog();
  const closeGuard = useCloseGuard(dialog);
  const [locFilter, setLocFilter] = useState(null);
  const [selected, setSelected] = useState(deepLinkAssetId || data.assets[0]?.id || null);
  const [modal, setModal] = useState(null);
  const [showQr, setShowQr] = useState(false);
  const [showMeterLog, setShowMeterLog] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [removing, setRemoving] = useState(false);
  const blank = { name: "", category: "", locationId: data.locations[0]?.id || "", manufacturer: "", model: "", serial: "", purchaseDate: "", warrantyEnd: "", manualUrl: "", isMajor: false, notes: "", meterUnit: "", currentMeterValue: "", meterUpdatedDate: "" };
  const [form, setForm] = useState(blank);
  const initial = useRef(null);
  const isDirty = modal && JSON.stringify(form) !== initial.current;
  const pre = usePrefill("asset", setForm, { name: "name", manufacturer: "manufacturer", model: "model", description: "notes", link: "manualUrl" });

  useEffect(() => { if (deepLinkAssetId) onConsumeDeepLink(); }, []); // eslint-disable-line

  const allowedLocs = locFilter ? descendantIds(data.locations, locFilter) : null;
  const filteredAssets = data.assets.filter((a) => (showArchived || !a.archived || a.id === selected) && (!allowedLocs || allowedLocs.has(a.locationId)));
  const categoryOptions = [...new Set(data.assets.map((a) => (a.category || "").trim()).filter(Boolean))].sort((x, y) => x.localeCompare(y));
  const archivedCount = data.assets.filter((a) => a.archived).length;

  const asset = data.assets.find((a) => a.id === selected);

  const openAdd = () => { pre.reset(); setForm(blank); initial.current = JSON.stringify(blank); setModal("add"); };
  const openEdit = () => { pre.reset(); const f = { ...asset }; setForm(f); initial.current = JSON.stringify(f); setModal("edit"); };
  const save = () => {
    if (!form.name.trim()) return;
    update((d) => {
      if (modal === "add") {
        const id = uid("a");
        d.assets.push({ id, ...form, name: form.name.trim(), createdBy: null });
        setSelected(id);
      } else {
        Object.assign(d.assets.find((a) => a.id === asset.id), form, { name: form.name.trim() });
      }
      return d;
    });
    setModal(null);
  };
  const archiveAsset = () => {
    update((d) => { const x = d.assets.find((q) => q.id === asset.id); if (x) x.archived = true; return d; });
    setRemoving(false);
    if (!showArchived) setSelected(data.assets.find((a) => a.id !== asset.id && !a.archived)?.id || null);
  };
  const restoreAsset = () => update((d) => { const x = d.assets.find((q) => q.id === asset.id); if (x) delete x.archived; return d; });
  const deleteAsset = async () => {
    // Re-check against the live data; never delete anything that is still linked.
    if (assetLinks(data, asset.id).length) { setRemoving(false); await dialog.alertMsg("That asset is still linked to other records, so it can only be archived."); return; }
    const ok = await dialog.confirm(`Permanently delete "${asset.name}" and its bill of materials? This cannot be undone.`);
    if (!ok) return;
    const remaining = data.assets.filter((a) => a.id !== asset.id && !a.archived);
    update((d) => {
      d.assets = d.assets.filter((a) => a.id !== asset.id);
      d.bomNodes = d.bomNodes.filter((n) => n.assetId !== asset.id);
      return d;
    });
    setRemoving(false);
    setSelected(remaining[0]?.id || null);
  };

  const relatedWO = data.workOrders.filter((w) => w.assetId === asset?.id && w.type !== "PM Base");
  const relatedPM = data.pmTemplates.filter((p) => p.assetId === asset?.id);

  return (
    <div>
      <SectionHeader
        title="Assets & Bill of Materials"
        subtitle="A registry of everything worth maintaining, broken into the parts that make it up."
        info={PAGE_INFO.assets}
        action={isAdmin(role) && <Btn variant="primary" onClick={openAdd}><Plus size={15} /> Add asset</Btn>}
      />
      <div className="hk-grid-fixed3" style={{ display: "grid", gridTemplateColumns: "200px 240px 1fr", gap: 16 }}>
        <LocationNavTree data={data} selectedId={locFilter} onSelect={setLocFilter} />

        <Panel style={{ padding: 6, alignSelf: "start" }}>
          {filteredAssets.map((a) => (
            <div key={a.id} onClick={() => setSelected(a.id)} className="hk-row" style={{ padding: "9px 10px", borderRadius: 3, cursor: "pointer", background: selected === a.id ? C.navySoft : "transparent" }}>
              <div style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, color: a.archived ? C.inkFaint : C.ink }}>{a.name}{a.archived ? " (archived)" : ""}</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint }}>{locationPath(data.locations, a.locationId)}</div>
            </div>
          ))}
          {filteredAssets.length === 0 && <Empty text="No assets at this location." />}
          {archivedCount > 0 && (
            <label style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", borderTop: `1px solid ${C.lineSoft}`, fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkSoft, cursor: "pointer" }}>
              <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Show archived ({archivedCount})
            </label>
          )}
        </Panel>

        {asset ? (
          <div>
            <Panel style={{ padding: 18, marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontFamily: FONT_HEAD, fontSize: 20, fontWeight: 700, color: C.ink }}>{asset.name}{asset.archived && <span style={{ marginLeft: 8, verticalAlign: "middle" }}><Tag text="Archived" color={C.inkFaint} soft={C.panelAlt} /></span>}</div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.inkFaint, marginTop: 2 }}>{locationPath(data.locations, asset.locationId)}</div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {canWrite(role) && (
                    <Btn small variant="ghost" onClick={() => onNewOrderForAsset(asset)}><Plus size={12} /> New work order</Btn>
                  )}
                  {asset.isMajor && (
                    <Btn small variant="ghost" onClick={() => setShowQr(true)}><QrCode size={12} /> QR label</Btn>
                  )}
                  {asset.meterUnit && (
                    <Btn small variant="ghost" onClick={() => setShowMeterLog(true)}><Gauge size={12} /> Log reading</Btn>
                  )}
                  {isAdmin(role) && (
                    <>
                      <Btn small variant="ghost" onClick={openEdit}><Pencil size={12} /> Edit</Btn>
                      {asset.archived
                        ? <Btn small variant="ghost" onClick={restoreAsset}><Archive size={12} /> Restore</Btn>
                        : null}
                      <Btn small variant="danger" onClick={() => setRemoving(true)}><Trash2 size={12} /> Remove</Btn>
                    </>
                  )}
                </div>
              </div>
              <div className="hk-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 16 }}>
                {[
                  ["Category", asset.category || "—"], ["Manufacturer", asset.manufacturer || "—"],
                  ["Model", asset.model || "—"], ["Serial", asset.serial || "—"],
                  ["Purchased", fmtDate(asset.purchaseDate)], ["Warranty ends", fmtDate(asset.warrantyEnd)],
                  ...(asset.meterUnit ? [["Meter reading", `${asset.currentMeterValue || 0} ${asset.meterUnit}${asset.meterUpdatedDate ? " (as of " + fmtDate(asset.meterUpdatedDate) + ")" : ""}`]] : []),
                ].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontFamily: FONT_BODY, fontSize: 10.5, fontWeight: 700, color: C.inkFaint, textTransform: "uppercase", letterSpacing: "0.03em" }}>{k}</div>
                    <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.ink }}>{v}</div>
                  </div>
                ))}
              </div>
              {asset.manualUrl && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 10.5, fontWeight: 700, color: C.inkFaint, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 4 }}>Manual</div>
                  <LinkButton url={asset.manualUrl} small />
                </div>
              )}
              {asset.notes && <div style={{ marginTop: 12, fontFamily: FONT_BODY, fontSize: 12.5, color: C.inkSoft, fontStyle: "italic" }}>{asset.notes}</div>}
            </Panel>
            {showQr && <QrLabelModal asset={asset} onClose={() => setShowQr(false)} />}
            {showMeterLog && <LogMeterModal asset={asset} update={update} onClose={() => setShowMeterLog(false)} />}

            <Panel style={{ padding: 16, marginBottom: 14 }}>
              <BomTree data={data} update={update} assetId={asset.id} role={role} />
            </Panel>

            <div className="hk-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Panel style={{ padding: 16 }}>
                <div style={{ fontFamily: FONT_HEAD, fontSize: 14, fontWeight: 600, color: C.ink, marginBottom: 8 }}>PM tasks<InfoTip k="pmTasks" /></div>
                {relatedPM.length === 0 && <Empty text="No recurring tasks defined." />}
                {relatedPM.map((p) => (
                  <div key={p.id} style={{ padding: "7px 0", borderTop: `1px solid ${C.lineSoft}` }}>
                    <div style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, color: C.ink }}>{p.title}</div>
                    <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint }}>
                      Every {p.interval} {p.unit} · next due {fmtDate(p.nextDue)}
                      {p.bomNodeId && ` · scoped to ${nameOf(data.bomNodes, p.bomNodeId)}`}
                    </div>
                  </div>
                ))}
              </Panel>
              <Panel style={{ padding: 16 }}>
                <div style={{ fontFamily: FONT_HEAD, fontSize: 14, fontWeight: 600, color: C.ink, marginBottom: 8 }}>Work order history<InfoTip k="woHistory" /></div>
                {relatedWO.length === 0 && <Empty text="No work orders logged yet." />}
                {relatedWO.map((w) => (
                  <div key={w.id} onClick={() => goToOrder(w.id)} className="hk-row" style={{ padding: "7px 4px", borderTop: `1px solid ${C.lineSoft}`, cursor: "pointer", display: "flex", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, color: C.ink }}>{formatWoNum(w.number)} · {w.title}</div>
                      <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint }}>{fmtDate(w.completedDate || w.scheduledDate)}</div>
                    </div>
                    <Tag text={w.type} color={WO_TYPE_COLORS[w.type]} soft={C.panelAlt} />
                  </div>
                ))}
              </Panel>
            </div>
          </div>
        ) : (
          <Panel style={{ padding: 30 }}><Empty text="Select or add an asset." /></Panel>
        )}
      </div>

      {removing && asset && <RemoveAssetModal data={data} asset={asset} onArchive={archiveAsset} onDelete={deleteAsset} onClose={() => setRemoving(false)} />}
      {modal && (
        <Modal title={modal === "add" ? "Add asset" : "Edit asset"} info="asset" onClose={() => closeGuard(isDirty, save, () => setModal(null))} wide>
          {canWrite(role) && <PrefillBar p={pre} form={form} />}
          <div className="hk-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Name" required><PrefillInput p={pre} field="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Category">
              <input style={inputStyle} list="asset-category-options" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Pick one used before, or type a new one" autoComplete="off" />
              <datalist id="asset-category-options">{categoryOptions.map((c) => <option key={c} value={c} />)}</datalist>
            </Field>
            <Field label="Location" required>
              <select style={inputStyle} value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })}>
                {flattenTree(data.locations, "parentId", null).map(({ item, depth }) => (
                  <option key={item.id} value={item.id}>{"—".repeat(depth) + " " + item.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Manufacturer"><PrefillInput p={pre} field="manufacturer" value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} /></Field>
            <Field label="Model"><PrefillInput p={pre} field="model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></Field>
            <Field label="Serial"><input style={inputStyle} value={form.serial} onChange={(e) => setForm({ ...form, serial: e.target.value })} /></Field>
            <Field label="Purchase date"><input type="date" style={inputStyle} value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} /></Field>
            <Field label="Warranty ends"><input type="date" style={inputStyle} value={form.warrantyEnd} onChange={(e) => setForm({ ...form, warrantyEnd: e.target.value })} /></Field>
          </div>
          <Field label="Manual (link to PDF or manufacturer page)"><PrefillInput p={pre} field="manualUrl" value={form.manualUrl} onChange={(e) => setForm({ ...form, manualUrl: e.target.value })} placeholder="https://…" /></Field>
          <label style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12, fontFamily: FONT_BODY, fontSize: 12.5, color: C.ink, cursor: "pointer" }}>
            <input type="checkbox" checked={!!form.isMajor} onChange={(e) => setForm({ ...form, isMajor: e.target.checked })} />
            Major asset — show a printable QR label for it
          </label>
          <div className="hk-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Meter unit (optional)"><input style={inputStyle} value={form.meterUnit} onChange={(e) => setForm({ ...form, meterUnit: e.target.value })} placeholder="e.g. hours, miles, cycles" /></Field>
            <Field label="Current reading"><input type="number" style={inputStyle} value={form.currentMeterValue} onChange={(e) => setForm({ ...form, currentMeterValue: e.target.value })} /></Field>
          </div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint, marginTop: -6, marginBottom: 12 }}>
            Set a meter unit to enable meter-based PM triggers ("service every 250 hours") for this asset — readings can then be logged from its detail page without reopening this form.
          </div>
          <Field label="Notes"><PrefillInput p={pre} field="notes" multiline style={{ minHeight: 60 }} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Btn variant="ghost" onClick={() => closeGuard(isDirty, save, () => setModal(null))}>Cancel</Btn>
            <Btn variant="primary" onClick={save}>Save</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ============================================================
   PICKERS: asset/BOM link, and parts attachment
============================================================ */
function AssetBomPicker({ data, assetId, bomNodeId, onChange, locationId }) {
  const locSet = locationId ? descendantIds(data.locations, locationId) : null;
  const assetOptions = liveAssets(data, assetId).filter((a) => !locSet || locSet.has(a.locationId) || a.id === assetId);
  const bomOptions = assetId ? flattenTree(data.bomNodes.filter((n) => n.assetId === assetId), "parentId", null) : [];
  return (
    <div className="hk-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      <Field label="Asset">
        <select style={inputStyle} value={assetId || ""} onChange={(e) => onChange({ assetId: e.target.value || null, bomNodeId: null })}>
          <option value="">— none —</option>
          {assetOptions.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </Field>
      <Field label="BOM component">
        <select style={inputStyle} value={bomNodeId || ""} disabled={!assetId} onChange={(e) => onChange({ assetId, bomNodeId: e.target.value || null })}>
          <option value="">— whole asset —</option>
          {bomOptions.map(({ item, depth }) => <option key={item.id} value={item.id}>{"—".repeat(depth) + " " + item.name}</option>)}
        </select>
      </Field>
    </div>
  );
}

// Vendors are linked through parts: the vendors of the catalogue parts a work order uses.
function woPartVendors(data, wo) {
  const names = [];
  (wo.parts || []).forEach(({ partId }) => {
    const p = (data.inventory || []).find((x) => x.id === partId);
    const v = p && p.vendorId ? (data.vendors || []).find((x) => x.id === p.vendorId) : null;
    if (v && !names.includes(v.name)) names.push(v.name);
  });
  return names;
}
function PartEditModal({ data, update, part, currentUser, role, onClose, onSaved, onDeleted }) {
  const dialog = useDialog();
  const closeGuard = useCloseGuard(dialog);
  const blank = { name: "", description: "", manufacturer: "", manufacturerPartNumber: "", cost: "", link: "", vendorId: "", assetId: null, bomNodeId: null, qty: 1, reorderAt: 1 };
  const [form, setForm] = useState(part ? { ...part } : blank);
  const initial = useRef(JSON.stringify(part ? { ...part } : blank));
  const isDirty = JSON.stringify(form) !== initial.current;
  const pre = usePrefill("part", setForm, { name: "name", manufacturer: "manufacturer", model: "manufacturerPartNumber", description: "description", price: "cost", link: "link" });

  const save = () => {
    if (!form.name.trim()) return;
    if (part) {
      update((d) => { Object.assign(d.inventory.find((i) => i.id === part.id), form, { name: form.name.trim() }); return d; });
      onClose();
    } else {
      const id = uid("inv");
      update((d) => {
        d.counters = d.counters || { wo: 0, wr: 0, part: 0 };
        d.counters.part = (d.counters.part || 0) + 1;
        d.inventory.push({ id, partNumber: d.counters.part, ...form, name: form.name.trim(), qty: Number(form.qty) || 0, reorderAt: Number(form.reorderAt) || 0, createdBy: currentUser });
        return d;
      });
      onSaved && onSaved(id);
      onClose();
    }
  };
  const remove = async () => {
    const ok = await dialog.confirm(`Permanently delete ${formatPartNum(part.partNumber)} — "${part.name}"? This cannot be undone.`);
    if (!ok) return;
    update((d) => { d.inventory = d.inventory.filter((i) => i.id !== part.id); return d; });
    onDeleted && onDeleted();
    onClose();
  };

  return (
    <Modal title={part ? `Edit ${formatPartNum(part.partNumber)}` : "New part"} info="part" onClose={() => closeGuard(isDirty, save, onClose)} wide>
      <PrefillBar p={pre} form={form} />
      <Field label="Name" required><PrefillInput p={pre} field="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. 16x25x1 Furnace Filter" /></Field>
      <Field label="Description"><PrefillInput p={pre} field="description" multiline style={{ minHeight: 50 }} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
      <AssetBomPicker data={data} assetId={form.assetId} bomNodeId={form.bomNodeId} onChange={({ assetId, bomNodeId }) => setForm({ ...form, assetId, bomNodeId })} />
      <div className="hk-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label="Manufacturer"><PrefillInput p={pre} field="manufacturer" value={form.manufacturer || ""} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} /></Field>
        <Field label="Manufacturer part #"><PrefillInput p={pre} field="manufacturerPartNumber" value={form.manufacturerPartNumber || ""} onChange={(e) => setForm({ ...form, manufacturerPartNumber: e.target.value })} /></Field>
        <Field label="Cost ($)"><PrefillInput p={pre} field="cost" value={form.cost || ""} onChange={(e) => setForm({ ...form, cost: e.target.value })} /></Field>
        <Field label="Web link">
          <div style={{ display: "flex", gap: 6 }}>
            <PrefillInput p={pre} field="link" value={form.link || ""} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://…" />
            <LinkButton url={form.link} small />
          </div>
        </Field>
        <Field label="Vendor">
          <select style={inputStyle} value={form.vendorId || ""} onChange={(e) => setForm({ ...form, vendorId: e.target.value })}>
            <option value="">— none —</option>
            {data.vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </Field>
        <Field label="Quantity on hand"><input type="number" style={inputStyle} value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} /></Field>
        <Field label="Reorder at"><input type="number" style={inputStyle} value={form.reorderAt} onChange={(e) => setForm({ ...form, reorderAt: e.target.value })} /></Field>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        {part && canDelete(role, part, currentUser) ? (
          <Btn variant="danger" onClick={remove}><Trash2 size={13} /> Delete</Btn>
        ) : <span />}
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="ghost" onClick={() => closeGuard(isDirty, save, onClose)}>Cancel</Btn>
          <Btn variant="primary" onClick={save}>Save</Btn>
        </div>
      </div>
    </Modal>
  );
}

// Photo attachments (v1.6). PhotoPicker collects not-yet-uploaded File
// objects (used while composing a new work request, online or off —
// upload/queueing happens on submit, not per-photo). AttachmentThumbs
// renders already-uploaded photos by attachment id, once they exist on
// the server.
function PhotoPicker({ files, onChange, maxFiles = 5 }) {
  const inputRef = useRef(null);
  const urlsRef = useRef(new Map());
  useEffect(() => () => { urlsRef.current.forEach((u) => URL.revokeObjectURL(u)); }, []);
  const urlFor = (file) => {
    if (!urlsRef.current.has(file)) urlsRef.current.set(file, URL.createObjectURL(file));
    return urlsRef.current.get(file);
  };
  const addFiles = async (fileList) => {
    const picked = Array.from(fileList || []).filter((f) => f.type.startsWith("image/"));
    // v2.2: shrink in the browser (long edge ~1600 px, JPEG ~80%) before the
    // photo is uploaded or queued for offline sync.
    const incoming = await Promise.all(picked.map(shrinkImage));
    if (incoming.length) onChange([...files, ...incoming].slice(0, maxFiles));
  };
  return (
    <div>
      {files.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          {files.map((f, i) => (
            <div key={i} style={{ position: "relative", width: 60, height: 60 }}>
              <img src={urlFor(f)} alt="" style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 4, border: `1px solid ${C.line}` }} />
              <button type="button" onClick={() => onChange(files.filter((_, j) => j !== i))} title="Remove photo"
                style={{ position: "absolute", top: -6, right: -6, background: C.ink, color: "#fff", border: "none", borderRadius: "50%", width: 18, height: 18, fontSize: 11, lineHeight: "16px", cursor: "pointer" }}>×</button>
            </div>
          ))}
        </div>
      )}
      {files.length < maxFiles && (
        <Btn small variant="ghost" type="button" onClick={() => inputRef.current && inputRef.current.click()}>
          <Camera size={13} /> Add photo
        </Btn>
      )}
      <input ref={inputRef} type="file" accept="image/*" capture="environment" multiple hidden
        onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
    </div>
  );
}

function AttachmentThumbs({ ids, size = 56 }) {
  if (!ids || ids.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
      {ids.map((id) => (
        <a key={id} href={api.attachmentUrl(id)} target="_blank" rel="noreferrer" title="Open full size">
          <img src={api.attachmentUrl(id)} alt="Attached photo" style={{ width: size, height: size, objectFit: "cover", borderRadius: 4, border: `1px solid ${C.line}`, display: "block" }} />
        </a>
      ))}
    </div>
  );
}

function PartsPicker({ data, update, value, onChange, defaultLocationId, currentUser, role }) {
  const [locFilter, setLocFilter] = useState(defaultLocationId || null);
  const [bomFilter, setBomFilter] = useState(null);
  const [search, setSearch] = useState("");
  const [newPartOpen, setNewPartOpen] = useState(false);

  const allowedLocs = locFilter ? descendantIds(data.locations, locFilter) : null;
  const scopedAssetIds = new Set(data.assets.filter((a) => !allowedLocs || allowedLocs.has(a.locationId)).map((a) => a.id));
  const bomOptions = data.bomNodes.filter((n) => scopedAssetIds.has(n.assetId));

  const attachedIds = new Set(value.map((v) => v.partId));
  const searchLower = search.trim().toLowerCase();
  const candidates = data.inventory
    .filter((p) => !attachedIds.has(p.id))
    .filter((p) => !allowedLocs || !p.assetId || scopedAssetIds.has(p.assetId))
    .filter((p) => !bomFilter || p.bomNodeId === bomFilter)
    .filter((p) => {
      if (!searchLower) return true;
      const hay = [formatPartNum(p.partNumber), p.name, p.manufacturer, p.manufacturerPartNumber].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(searchLower);
    })
    .slice(0, 12);

  const attached = value.map((v) => ({ ...v, part: data.inventory.find((p) => p.id === v.partId) })).filter((v) => v.part);

  const addPart = (id) => onChange([...value, { partId: id, qty: 1 }]);
  const removePart = (id) => onChange(value.filter((v) => v.partId !== id));
  const setQty = (id, qty) => onChange(value.map((v) => (v.partId === id ? { ...v, qty: Math.max(1, Number(qty) || 1) } : v)));

  return (
    <div style={{ marginBottom: 12 }}>
      <label style={fieldLabelStyle(false)}>Parts</label>
      {attached.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
          {attached.map(({ partId, qty, part }) => (
            <div key={partId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 8px", background: C.panelAlt, borderRadius: 3, gap: 8 }}>
              <span style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.ink, flex: 1 }}>{formatPartNum(part.partNumber)} · {part.name}</span>
              <input
                type="number" min="1" value={qty} onChange={(e) => setQty(partId, e.target.value)}
                style={{ width: 50, padding: "3px 5px", border: `1px solid ${C.line}`, borderRadius: 3, fontFamily: FONT_BODY, fontSize: 12 }}
              />
              <button onClick={() => removePart(partId)} style={{ background: "none", border: "none", cursor: "pointer", color: C.rust }}><X size={13} /></button>
            </div>
          ))}
        </div>
      )}
      <div className="hk-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <select style={inputStyle} value={locFilter || ""} onChange={(e) => { setLocFilter(e.target.value || null); setBomFilter(null); }}>
          <option value="">All locations</option>
          {flattenTree(data.locations, "parentId", null).map(({ item, depth }) => (
            <option key={item.id} value={item.id}>{"—".repeat(depth) + " " + item.name}</option>
          ))}
        </select>
        <select style={inputStyle} value={bomFilter || ""} onChange={(e) => setBomFilter(e.target.value || null)}>
          <option value="">All components</option>
          {bomOptions.map((n) => <option key={n.id} value={n.id}>{nameOf(data.assets, n.assetId)} — {n.name}</option>)}
        </select>
      </div>
      <input style={{ ...inputStyle, marginBottom: 8 }} placeholder="Search by part #, name, or manufacturer…" value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="hk-scroll" style={{ maxHeight: 160, overflowY: "auto", border: `1px solid ${C.lineSoft}`, borderRadius: 3 }}>
        {candidates.length === 0 && <div style={{ padding: 10, fontFamily: FONT_BODY, fontSize: 12, color: C.inkFaint }}>No matching parts.</div>}
        {candidates.map((p) => (
          <div key={p.id} className="hk-row" onClick={() => addPart(p.id)} style={{ display: "flex", justifyContent: "space-between", padding: "7px 8px", borderTop: `1px solid ${C.lineSoft}`, cursor: "pointer" }}>
            <span style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.ink }}>{formatPartNum(p.partNumber)} · {p.name}{p.manufacturer ? ` (${p.manufacturer})` : ""}</span>
            <Plus size={13} color={C.navy} />
          </div>
        ))}
      </div>
      <div style={{ marginTop: 8 }}>
        <Btn small variant="ghost" onClick={() => setNewPartOpen(true)}><Plus size={12} /> New part</Btn>
      </div>
      {newPartOpen && (
        <PartEditModal
          data={data} update={update} part={null} currentUser={currentUser} role={role}
          onClose={() => setNewPartOpen(false)}
          onSaved={(id) => onChange([...value, id])}
        />
      )}
    </div>
  );
}

// Editor for a PM Base's checklist template — the ordered steps copied
// onto every PM occurrence it generates. Structure (titles, step types,
// expected ranges) is only ever edited here, at the template; individual
// occurrences just fill the values in (see ChecklistRunner).
function ChecklistTemplateEditor({ steps, setSteps }) {
  const list = steps || [];
  const add = () => setSteps([...list, { id: uid("cl"), title: "", stepType: "task", expectedMin: "", expectedMax: "", unit: "" }]);
  const remove = (i) => setSteps(list.filter((_, idx) => idx !== i));
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const arr = [...list];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setSteps(arr);
  };
  const updateStep = (i, patch) => setSteps(list.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  return (
    <div style={{ marginBottom: 12 }}>
      <label style={fieldLabelStyle(false)}>Checklist template (optional)</label>
      {list.map((s, i) => (
        <div key={s.id} style={{ border: `1px solid ${C.lineSoft}`, borderRadius: 4, padding: 8, marginBottom: 6 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: s.stepType === "numeric" ? 6 : 0, alignItems: "center" }}>
            <input style={{ ...inputStyle, flex: 1 }} placeholder="Step description" value={s.title} onChange={(e) => updateStep(i, { title: e.target.value })} />
            <select style={{ ...inputStyle, width: 150 }} value={s.stepType} onChange={(e) => updateStep(i, { stepType: e.target.value })}>
              <option value="task">Task (check off)</option>
              <option value="numeric">Numeric reading</option>
              <option value="photo">Photo required</option>
              <option value="pass-fail">Pass / fail</option>
            </select>
            <button onClick={() => move(i, -1)} disabled={i === 0} title="Move up" style={{ background: "none", border: "none", cursor: i === 0 ? "default" : "pointer", color: i === 0 ? C.inkFaint : C.inkSoft }}><ChevronUp size={14} /></button>
            <button onClick={() => move(i, 1)} disabled={i === list.length - 1} title="Move down" style={{ background: "none", border: "none", cursor: i === list.length - 1 ? "default" : "pointer", color: i === list.length - 1 ? C.inkFaint : C.inkSoft }}><ChevronDown size={14} /></button>
            <button onClick={() => remove(i)} style={{ background: "none", border: "none", color: C.rust, cursor: "pointer" }}><X size={16} /></button>
          </div>
          {s.stepType === "numeric" && (
            <div style={{ display: "flex", gap: 6 }}>
              <input type="number" style={{ ...inputStyle, width: 100 }} placeholder="Min (optional)" value={s.expectedMin} onChange={(e) => updateStep(i, { expectedMin: e.target.value })} />
              <input type="number" style={{ ...inputStyle, width: 100 }} placeholder="Max (optional)" value={s.expectedMax} onChange={(e) => updateStep(i, { expectedMax: e.target.value })} />
              <input style={{ ...inputStyle, width: 100 }} placeholder="Unit" value={s.unit} onChange={(e) => updateStep(i, { unit: e.target.value })} />
            </div>
          )}
        </div>
      ))}
      <Btn small variant="ghost" onClick={add}><Plus size={12} /> Add step</Btn>
      <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint, marginTop: 6 }}>
        Copied onto every PM occurrence this base generates — editing it here only affects occurrences generated afterward. A "Photo required" step is tracked as an acknowledgment checkbox for now; attaching the actual photo is planned for a later release.
      </div>
    </div>
  );
}
// Fills in a PM occurrence's checklist — copied from its PM Base's
// template at generation time. Any user with write access can fill this
// in (including an Executor, who otherwise gets a read-only work order),
// since it's meant to be completed while doing the work; it live-saves
// per step rather than going through the buffered edit/Save flow.
function ChecklistRunner({ steps, onUpdateStep, readOnly }) {
  return (
    <div style={{ marginTop: 4, marginBottom: 14, paddingTop: 12, borderTop: `1px solid ${C.lineSoft}` }}>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 8 }}>Checklist<InfoTip k="checklist" /></div>
      {steps.map((s, i) => {
        const hasRange = s.expectedMin !== "" && s.expectedMin != null && s.expectedMax !== "" && s.expectedMax != null;
        const hasValue = s.value !== "" && s.value != null;
        const inSpec = hasRange && hasValue ? (Number(s.value) >= Number(s.expectedMin) && Number(s.value) <= Number(s.expectedMax)) : null;
        return (
          <div key={s.id} style={{ padding: "7px 0", borderTop: i === 0 ? "none" : `1px solid ${C.lineSoft}` }}>
            {(s.stepType === "task" || s.stepType === "photo") && (
              <label style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: FONT_BODY, fontSize: 13, color: C.ink, cursor: readOnly ? "default" : "pointer" }}>
                <input type="checkbox" disabled={readOnly} checked={!!s.done} onChange={(e) => onUpdateStep(s.id, { done: e.target.checked })} />
                {s.title || "(untitled step)"}{s.stepType === "photo" ? " — photo taken" : ""}
              </label>
            )}
            {s.stepType === "pass-fail" && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.ink }}>{s.title || "(untitled step)"}</span>
                <label style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: FONT_BODY, fontSize: 12, color: C.ink, cursor: readOnly ? "default" : "pointer" }}>
                  <input type="radio" disabled={readOnly} name={`pf-${s.id}`} checked={s.passFail === "pass"} onChange={() => onUpdateStep(s.id, { passFail: "pass" })} /> Pass
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: FONT_BODY, fontSize: 12, color: C.ink, cursor: readOnly ? "default" : "pointer" }}>
                  <input type="radio" disabled={readOnly} name={`pf-${s.id}`} checked={s.passFail === "fail"} onChange={() => onUpdateStep(s.id, { passFail: "fail" })} /> Fail
                </label>
                {s.passFail === "fail" && <Tag text="Fail" color={C.rust} soft={C.rustSoft} />}
              </div>
            )}
            {s.stepType === "numeric" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.ink }}>{s.title || "(untitled step)"}</span>
                <input type="number" disabled={readOnly} style={{ ...inputStyle, width: 90 }} value={s.value ?? ""} onChange={(e) => onUpdateStep(s.id, { value: e.target.value })} />
                {s.unit && <span style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint }}>{s.unit}</span>}
                {hasRange && <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: C.inkFaint }}>(expect {s.expectedMin}–{s.expectedMax}{s.unit ? " " + s.unit : ""})</span>}
                {inSpec === true && <Tag text="In spec" color={C.teal} soft={C.tealSoft} />}
                {inSpec === false && <Tag text="Out of spec" color={C.rust} soft={C.rustSoft} />}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   WORK REQUESTS
============================================================ */
function PmBaseFields({ form, setForm, data }) {
  const addFixedDate = () => setForm((f) => ({ ...f, fixedDates: [...(f.fixedDates || []), { month: 1, day: 1 }] }));
  const removeFixedDate = (i) => setForm((f) => ({ ...f, fixedDates: f.fixedDates.filter((_, idx) => idx !== i) }));
  const updateFixedDate = (i, patch) => setForm((f) => ({ ...f, fixedDates: f.fixedDates.map((fd, idx) => (idx === i ? { ...fd, ...patch } : fd)) }));
  const triggerType = form.triggerType || "calendar";
  const linkedAsset = form.assetId ? data.assets.find((a) => a.id === form.assetId) : null;

  return (
    <>
      <Field label="Trigger type">
        <select style={inputStyle} value={triggerType} onChange={(e) => setForm({ ...form, triggerType: e.target.value })}>
          <option value="calendar">Calendar (date-based)</option>
          <option value="meter">Meter (usage-based)</option>
          <option value="seasonal">Seasonal (tied to a season)</option>
        </select>
      </Field>

      {triggerType === "calendar" && (
        <>
          <Field label="PM mode">
            <select style={inputStyle} value={form.pmMode} onChange={(e) => setForm({ ...form, pmMode: e.target.value })}>
              <option value="Non-fixed">Non-fixed (repeats on a frequency)</option>
              <option value="Fixed">Fixed (same date(s) every year)</option>
            </select>
          </Field>
          {form.pmMode === "Non-fixed" ? (
            <div className="hk-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="Every"><input type="number" min="1" style={inputStyle} value={form.frequencyValue} onChange={(e) => setForm({ ...form, frequencyValue: e.target.value })} /></Field>
              <Field label="Unit">
                <select style={inputStyle} value={form.frequencyUnit} onChange={(e) => setForm({ ...form, frequencyUnit: e.target.value })}>
                  {FREQUENCY_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </Field>
            </div>
          ) : (
            <div style={{ marginBottom: 12 }}>
              <label style={fieldLabelStyle(false)}>Fixed date(s) of year</label>
              {(form.fixedDates || []).map((fd, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "center" }}>
                  <select style={{ ...inputStyle, width: 150 }} value={fd.month} onChange={(e) => updateFixedDate(i, { month: Number(e.target.value) })}>
                    {MONTH_NAMES.map((m, idx) => <option key={m} value={idx + 1}>{m}</option>)}
                  </select>
                  <input type="number" min="1" max="31" style={{ ...inputStyle, width: 80 }} value={fd.day} onChange={(e) => updateFixedDate(i, { day: Number(e.target.value) })} />
                  <button onClick={() => removeFixedDate(i)} style={{ background: "none", border: "none", color: C.rust, cursor: "pointer" }}><X size={16} /></button>
                </div>
              ))}
              <Btn small variant="ghost" onClick={addFixedDate}><Plus size={12} /> Add date</Btn>
            </div>
          )}
        </>
      )}

      {triggerType === "meter" && (
        <>
          <Field label={`Every${linkedAsset?.meterUnit ? ` (${linkedAsset.meterUnit})` : ""}`}>
            <input type="number" min="1" style={inputStyle} value={form.meterIntervalValue} onChange={(e) => setForm({ ...form, meterIntervalValue: e.target.value })} placeholder="e.g. 250" />
          </Field>
          <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint, marginTop: -6, marginBottom: 12 }}>
            {linkedAsset
              ? `Tracks ${linkedAsset.name}'s meter — currently at ${linkedAsset.currentMeterValue || 0}${linkedAsset.meterUnit ? " " + linkedAsset.meterUnit : ""}. Log new readings from the asset's detail page; this PM is generated automatically once the reading crosses the interval.`
              : "Pick the asset this meter belongs to below — meter-based PM needs a linked asset with a meter unit set."}
          </div>
        </>
      )}

      {triggerType === "seasonal" && (
        <>
          <div className="hk-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Season">
              <select style={inputStyle} value={form.seasonalAnchor || "Spring"} onChange={(e) => setForm({ ...form, seasonalAnchor: e.target.value })}>
                {SEASONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Offset (days)"><input type="number" style={inputStyle} value={form.seasonalOffsetDays ?? 0} onChange={(e) => setForm({ ...form, seasonalOffsetDays: e.target.value })} /></Field>
          </div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint, marginTop: -6, marginBottom: 12 }}>
            Runs every year around the start of {form.seasonalAnchor || "Spring"} (Northern Hemisphere meteorological seasons: Mar 1 / Jun 1 / Sep 1 / Dec 1), shifted by the offset — negative runs before the season starts, positive after. Nudge the offset if actual conditions (first frost, heating season, etc.) tend to run early or late where you live.
          </div>
        </>
      )}

      <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint, marginTop: -6, marginBottom: 12 }}>
        A PM Base is never scheduled or completed itself — it's a template. Creating it generates the first PM work order copied from it (meter-based PM instead waits until the linked asset's reading crosses the interval). Only one occurrence can be Active or Scheduled per PM Base at a time — if multiple fixed dates are configured, only the earliest upcoming one is generated now; the rest follow once the active occurrence is completed.
      </div>

      <StandbyFields form={form} setForm={setForm} />

      <ChecklistTemplateEditor steps={form.checklistTemplate || []} setSteps={(steps) => setForm({ ...form, checklistTemplate: steps })} />
    </>
  );
}

// PM Base standby controls (v2.2): a manual switch and an optional yearly
// active window. See pmBaseOnStandby for the exact rules.
function StandbyFields({ form, setForm }) {
  const w = { ...DEFAULT_STANDBY_WINDOW, ...(form.standbyWindow || {}) };
  const setW = (patch) => setForm({ ...form, standbyWindow: { ...w, ...patch } });
  const monthSelect = (value, onChange) => (
    <select style={{ ...inputStyle, width: 130 }} value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {MONTH_NAMES.map((m, idx) => <option key={m} value={idx + 1}>{m}</option>)}
    </select>
  );
  return (
    <div style={{ border: `1px solid ${C.lineSoft}`, borderRadius: 4, padding: "10px 12px", marginBottom: 12 }}>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 6 }}>Standby<InfoTip k="standby" /></div>
      <label style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: FONT_BODY, fontSize: 12.5, color: C.ink, cursor: "pointer", marginBottom: 8 }}>
        <input type="checkbox" checked={!!form.standby} onChange={(e) => setForm({ ...form, standby: e.target.checked })} />
        Put this PM Base on standby (no new occurrences are generated)
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: FONT_BODY, fontSize: 12.5, color: C.ink, cursor: "pointer", marginBottom: w.enabled ? 8 : 0 }}>
        <input type="checkbox" checked={!!w.enabled} onChange={(e) => setW({ enabled: e.target.checked })} />
        Only active during a yearly window (standby the rest of the year)
      </label>
      {w.enabled && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontFamily: FONT_BODY, fontSize: 12.5, color: C.inkSoft }}>
          Active from {monthSelect(w.startMonth, (v) => setW({ startMonth: v }))}
          <input type="number" min="1" max="31" style={{ ...inputStyle, width: 64 }} value={w.startDay} onChange={(e) => setW({ startDay: Number(e.target.value) })} />
          until {monthSelect(w.endMonth, (v) => setW({ endMonth: v }))}
          <input type="number" min="1" max="31" style={{ ...inputStyle, width: 64 }} value={w.endDay} onChange={(e) => setW({ endDay: Number(e.target.value) })} />
        </div>
      )}
      <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint, marginTop: 8 }}>
        Occurrences that are already open are left alone. When standby ends, generation resumes from the next due date — missed occurrences are not backfilled. The yearly window is checked whenever the app is opened or data changes.
      </div>
    </div>
  );
}

function WorkRequestsView({ data, update, role, currentUser, goToOrder, pendingFilter, consumeFilter, isOnline, queueWorkRequest }) {
  const dialog = useDialog();
  const closeGuard = useCloseGuard(dialog);
  const [modal, setModal] = useState(null);
  const [locFilter, setLocFilter] = useState(null);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState(pendingFilter?.status || "all");
  const blank = { title: "", description: "", assetId: null, bomNodeId: null, locationId: "", priority: "", requiredByDate: "", suggestedType: "Corrective", suggestedParts: [], photos: [] };
  const [form, setForm] = useState(blank);
  const initial = useRef(null);
  const [reviewForm, setReviewForm] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (pendingFilter) consumeFilter(); }, []); // eslint-disable-line

  const isFormOpen = modal === "new" || (modal && modal.action === "editRequest");
  const isDirty = isFormOpen && JSON.stringify(form) !== initial.current;

  const openNew = () => {
    const f = { ...blank, locationId: data.locations[0]?.id || "" };
    setForm(f); initial.current = JSON.stringify(f);
    setModal("new");
  };
  const openEditRequest = (wr) => {
    const f = { title: wr.title, description: wr.description, assetId: wr.assetId, bomNodeId: wr.bomNodeId, locationId: wr.locationId, priority: wr.priority, requiredByDate: wr.requiredByDate || "", suggestedType: wr.suggestedType || "Corrective", suggestedParts: wr.suggestedParts || [] };
    setForm(f); initial.current = JSON.stringify(f);
    setModal({ action: "editRequest", wr });
  };
  const wrProblem = () => {
    const missing = [];
    if (!form.title.trim()) missing.push("title");
    if (!form.description.trim()) missing.push("description");
    if (!form.priority) missing.push("priority");
    if (!form.requiredByDate) missing.push("required-by date");
    if (!form.locationId) missing.push("location");
    return missing.length ? `Please fill in: ${missing.join(", ")}.` : "";
  };
  const submitRequest = async () => {
    if (wrProblem()) { await dialog.alertMsg(wrProblem()); return; }
    const { photos: photoFiles, ...fields } = form;
    // Offline (or a flaky connection that drops the upload mid-flight):
    // queue it locally instead of failing the submission outright. The
    // photos stay as File objects in IndexedDB until sync uploads them —
    // see offlineQueue.js and MaintEnhanceApp's syncNow.
    if (!isOnline) {
      await queueWorkRequest({ fields, photoFiles, requestedBy: currentUser });
      setModal(null);
      await dialog.alertMsg("You're offline — this request is saved on your device and will be submitted automatically once you're back online.");
      return;
    }
    setSubmitting(true);
    try {
      const photoIds = [];
      for (const file of photoFiles) photoIds.push((await api.uploadAttachment(file)).id);
      update((d) => {
        d.counters = d.counters || { wo: 0, wr: 0, part: 0 };
        d.counters.wr += 1;
        d.workRequests.push({
          id: uid("wr"), number: d.counters.wr, ...fields, title: fields.title.trim(), photos: photoIds,
          requestedBy: currentUser, dateSubmitted: todayISO(),
          status: "Submitted", reviewNote: "", workOrderId: null, createdBy: currentUser,
        });
        return d;
      });
      setModal(null);
    } catch (e) {
      // Network blip that navigator.onLine didn't catch — fall back to the
      // offline queue rather than losing the report and its photos.
      await queueWorkRequest({ fields, photoFiles, requestedBy: currentUser });
      setModal(null);
      await dialog.alertMsg("Couldn't reach the server — this request is saved on your device and will be submitted automatically once you're back online.");
    } finally {
      setSubmitting(false);
    }
  };
  const saveEditRequest = async () => {
    if (wrProblem()) { await dialog.alertMsg(wrProblem()); return; }
    update((d) => {
      const req = d.workRequests.find((r) => r.id === modal.wr.id);
      Object.assign(req, form, { title: form.title.trim() });
      return d;
    });
    setModal(null);
  };

  const openReview = (wr, action) => {
    setReviewForm({
      type: wr.suggestedType && wr.suggestedType !== "Unplanned" ? wr.suggestedType : "Corrective",
      scheduledDate: "", requiredByDate: wr.requiredByDate || "", reason: "", mergeInto: "",
      pmMode: "Non-fixed", frequencyValue: "3", frequencyUnit: "months", fixedDates: [],
      standby: false, standbyWindow: { ...DEFAULT_STANDBY_WINDOW },
      triggerType: "calendar", meterIntervalValue: "", seasonalAnchor: "Spring", seasonalOffsetDays: "0",
      assetId: wr.assetId, checklistTemplate: [],
    });
    setModal({ action, wr });
  };

  const doConvert = async () => {
    const wr = modal.wr;
    if (reviewForm.type !== "PM Base" && !(reviewForm.requiredByDate || wr.requiredByDate)) {
      await dialog.alertMsg("A required-by date is required for every work order.");
      return;
    }
    if (execOn() && (!(Number(reviewForm.crewRequired) >= 1) || !(Number(reviewForm.estHours) > 0))) {
      await dialog.alertMsg("Please fill in the executors required and the hours per executor.");
      return;
    }
    update((d) => {
      d.counters = d.counters || { wo: 0, wr: 0, part: 0 };
      if (reviewForm.type === "PM Base") {
        d.counters.wo += 1;
        const baseId = uid("wo");
        const base = {
          id: baseId, number: d.counters.wo, title: wr.title, type: "PM Base", status: "Active",
          assetId: wr.assetId, bomNodeId: wr.bomNodeId, locationId: wr.locationId,
          description: wr.description, sourceRequestId: wr.id, sourceBenchmarkId: null,
          sourcePmBaseId: null, sourceFixedDate: null, priority: wr.priority || "Medium", executorId: "", executorIds: [], estHours: reviewForm.estHours || "", crewRequired: reviewForm.crewRequired || "",
          scheduledDate: "", requiredByDate: "", completedDate: null, verifiedDate: null, createdDate: todayISO(),
          cost: "", vendorId: null, notes: "", parts: wr.suggestedParts || [], comments: [], photos: wr.photos || [], partsDeducted: false, createdBy: currentUser,
          pmMode: reviewForm.pmMode, triggerType: reviewForm.triggerType || "calendar",
          checklistTemplate: (reviewForm.checklistTemplate || []).map((s) => ({ ...s })),
          standby: !!reviewForm.standby,
          standbyWindow: reviewForm.standbyWindow && reviewForm.standbyWindow.enabled ? { ...DEFAULT_STANDBY_WINDOW, ...reviewForm.standbyWindow, enabled: true } : null,
        };
        if (base.triggerType === "meter") {
          base.meterIntervalValue = Number(reviewForm.meterIntervalValue);
          const linkedAsset = d.assets.find((a) => a.id === wr.assetId);
          base.meterBaselineValue = linkedAsset ? (Number(linkedAsset.currentMeterValue) || 0) : 0;
        } else if (base.triggerType === "seasonal") {
          base.seasonalAnchor = reviewForm.seasonalAnchor || "Spring";
          base.seasonalOffsetDays = Number(reviewForm.seasonalOffsetDays) || 0;
        } else if (reviewForm.pmMode === "Non-fixed") {
          base.frequencyValue = Number(reviewForm.frequencyValue);
          base.frequencyUnit = reviewForm.frequencyUnit;
        } else {
          base.fixedDates = (reviewForm.fixedDates || []).map((f) => ({ month: Number(f.month), day: Number(f.day) }));
        }
        d.workOrders.push(base);
        // Meter-based: no immediate spawn (see checkMeterPmTriggers).
        spawnFirstPmInstance(d, base);
        const req = d.workRequests.find((r) => r.id === wr.id);
        req.status = "Approved"; req.workOrderId = baseId;
      } else {
        d.counters.wo += 1;
        const woId = uid("wo");
        d.workOrders.push({
          id: woId, number: d.counters.wo, title: wr.title, type: reviewForm.type, status: reviewForm.scheduledDate ? "Scheduled" : "Active",
          assetId: wr.assetId, bomNodeId: wr.bomNodeId, locationId: wr.locationId,
          description: wr.description, sourceRequestId: wr.id, sourceBenchmarkId: null,
          sourcePmBaseId: null, sourceFixedDate: null, priority: wr.priority || "Medium", executorId: "", executorIds: [], estHours: reviewForm.estHours || "", crewRequired: reviewForm.crewRequired || "",
          scheduledDate: reviewForm.scheduledDate, requiredByDate: reviewForm.requiredByDate || wr.requiredByDate || "",
          completedDate: null, verifiedDate: null, createdDate: todayISO(), cost: "", vendorId: null,
          notes: "", parts: wr.suggestedParts || [], comments: [], photos: wr.photos || [], partsDeducted: false, createdBy: currentUser,
        });
        const req = d.workRequests.find((r) => r.id === wr.id);
        req.status = "Approved"; req.workOrderId = woId;
      }
      return d;
    });
    setModal(null);
  };
  const doDecline = async () => {
    if (!reviewForm.reason.trim()) { await dialog.alertMsg("A reason is required."); return; }
    update((d) => {
      const req = d.workRequests.find((r) => r.id === modal.wr.id);
      req.status = "Declined"; req.reviewNote = reviewForm.reason.trim();
      return d;
    });
    setModal(null);
  };
  const doMerge = async () => {
    if (!reviewForm.mergeInto) { await dialog.alertMsg("Choose a work order to merge into."); return; }
    update((d) => {
      const req = d.workRequests.find((r) => r.id === modal.wr.id);
      req.status = "Merged"; req.workOrderId = reviewForm.mergeInto;
      return d;
    });
    setModal(null);
  };
  const doRequestInfo = () => {
    update((d) => {
      const req = d.workRequests.find((r) => r.id === modal.wr.id);
      req.reviewNote = "Info requested: " + reviewForm.reason.trim();
      return d;
    });
    setModal(null);
  };
  const deleteRequest = async (wr) => {
    const ok = await dialog.confirm(`Permanently delete ${formatWrNum(wr.number)} — "${wr.title}"? This cannot be undone.`);
    if (!ok) return;
    update((d) => { d.workRequests = d.workRequests.filter((r) => r.id !== wr.id); return d; });
  };

  const allowedLocs = locFilter ? descendantIds(data.locations, locFilter) : null;
  const searchLower = search.trim().toLowerCase();
  const visible = (planRole(role) ? data.workRequests : data.workRequests.filter((w) => w.requestedBy === currentUser))
    .filter((wr) => !allowedLocs || allowedLocs.has(wr.locationId))
    .filter((wr) => priorityFilter === "all" || wr.priority === priorityFilter)
    .filter((wr) => statusFilter !== "pending" || wr.status === "Submitted" || wr.status === "Under Review")
    .filter((wr) => !searchLower || wr.title.toLowerCase().includes(searchLower) || formatWrNum(wr.number).toLowerCase().includes(searchLower));
  const openWOOptions = data.workOrders.filter((w) => !isDoneStatus(w.status) && w.type !== "PM Base");

  return (
    <div>
      <SectionHeader
        title="Work Requests"
        subtitle="The inbox for anything that needs attention, before it becomes scheduled work."
        info={PAGE_INFO.requests}
        action={canWrite(role) && <Btn variant="primary" onClick={openNew}><Plus size={15} /> Submit request</Btn>}
      />
      <div className="hk-grid-fixed2" style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 16 }}>
        <LocationNavTree data={data} selectedId={locFilter} onSelect={setLocFilter} />
        <div>
          <div style={{ position: "relative", maxWidth: 340, marginBottom: 10 }}>
            <Search size={14} color={C.inkFaint} style={{ position: "absolute", left: 10, top: 10, pointerEvents: "none" }} />
            <input style={{ ...inputStyle, paddingLeft: 30 }} placeholder="Search by title or number…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <select style={{ ...inputStyle, width: "auto" }} value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
              <option value="all">All priorities</option>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select style={{ ...inputStyle, width: "auto" }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All statuses</option>
              <option value="pending">Awaiting review</option>
            </select>
          </div>
          <Panel>
            {visible.length === 0 && <Empty text="No matching work requests." />}
            {visible.map((wr) => (
              <div key={wr.id} style={{ padding: "14px 18px", borderTop: `1px solid ${C.lineSoft}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, color: C.ink }}>{formatWrNum(wr.number)} · {wr.title}</div>
                    <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.inkFaint, marginTop: 2 }}>
                      {locationPath(data.locations, wr.locationId)}{wr.bomNodeId && ` · ${nameOf(data.bomNodes, wr.bomNodeId)}`}
                      {" · by "}{wr.requestedBy}{" · "}{fmtDate(wr.dateSubmitted)}{wr.requiredByDate && ` · required by ${fmtDate(wr.requiredByDate)}`}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                    <Tag text={wr.priority} color={PRIORITY_COLORS[wr.priority]} soft={PRIORITY_SOFT[wr.priority]} />
                    <Tag text={wr.status} color={WR_STATUS_COLORS[wr.status]} soft={C.panelAlt} />
                  </div>
                </div>
                {wr.description && <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.inkSoft, marginTop: 8 }}>{wr.description}</div>}
                <AttachmentThumbs ids={wr.photos} />
                {wr.reviewNote && <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.gold, marginTop: 6, fontStyle: "italic" }}>{wr.reviewNote}</div>}
                {wr.workOrderId && (
                  <div onClick={() => goToOrder(wr.workOrderId)} style={{ marginTop: 8, cursor: "pointer", fontFamily: FONT_BODY, fontSize: 12.5, color: C.navy, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                    View linked work order <ArrowRight size={12} />
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  {canWrite(role) && (wr.status === "Submitted" || wr.status === "Under Review") && (planRole(role) || wr.requestedBy === currentUser) && (
                    <Btn small variant="ghost" onClick={() => openEditRequest(wr)}><Pencil size={12} /> Edit</Btn>
                  )}
                  {(wr.status === "Submitted" || wr.status === "Under Review") && planRole(role) && (
                    <>
                      <Btn small variant="primary" onClick={() => openReview(wr, "convert")}><Check size={12} /> Convert to work order</Btn>
                      <Btn small variant="ghost" onClick={() => openReview(wr, "merge")}>Merge into existing</Btn>
                      <Btn small variant="ghost" onClick={() => openReview(wr, "info")}>Request more info</Btn>
                      <Btn small variant="danger" onClick={() => openReview(wr, "decline")}>Decline</Btn>
                    </>
                  )}
                  {canDelete(role, wr, currentUser) && (
                    <Btn small variant="danger" onClick={() => deleteRequest(wr)}><Trash2 size={12} /> Delete</Btn>
                  )}
                </div>
              </div>
            ))}
          </Panel>
        </div>
      </div>

      {isFormOpen && (
        <Modal title={modal === "new" ? "Submit a work request" : "Edit work request"} info="wrForm" onClose={() => closeGuard(isDirty, modal === "new" ? submitRequest : saveEditRequest, () => setModal(null))} wide>
          <Field label="Title" required><input style={inputStyle} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="What needs attention?" autoFocus /></Field>
          <Field label="Description" required><textarea style={{ ...inputStyle, minHeight: 70 }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <div className="hk-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Priority" required>
              <select style={inputStyle} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="">— select a priority —</option>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Required by" required><input type="date" style={inputStyle} value={form.requiredByDate} onChange={(e) => setForm({ ...form, requiredByDate: e.target.value })} /></Field>
          </div>
          <Field label="Location" required>
            <select style={inputStyle} value={form.locationId} onChange={(e) => {
              const loc = e.target.value, set = descendantIds(data.locations, loc);
              const keep = form.assetId && set.has((data.assets.find((a) => a.id === form.assetId) || {}).locationId);
              setForm({ ...form, locationId: loc, ...(keep ? {} : { assetId: null, bomNodeId: null }) });
            }}>
              {flattenTree(data.locations, "parentId", null).map(({ item, depth }) => (
                <option key={item.id} value={item.id}>{"—".repeat(depth) + " " + item.name}</option>
              ))}
            </select>
          </Field>
          <AssetBomPicker data={data} locationId={form.locationId} assetId={form.assetId} bomNodeId={form.bomNodeId} onChange={({ assetId, bomNodeId }) => setForm({ ...form, assetId, bomNodeId, locationId: assetId ? data.assets.find((a) => a.id === assetId).locationId : form.locationId })} />
          <Field label="Suggested work order type">
            <select style={inputStyle} value={form.suggestedType} onChange={(e) => setForm({ ...form, suggestedType: e.target.value })}>
              <option value="PM">PM</option>
              <option value="PM Base">PM Base</option>
              <option value="Benchmark">Benchmark</option>
              <option value="Corrective">Corrective</option>
            </select>
          </Field>
          <PartsPicker data={data} update={update} value={form.suggestedParts} onChange={(v) => setForm({ ...form, suggestedParts: v })} defaultLocationId={form.locationId} currentUser={currentUser} role={role} />
          {modal === "new" && (
            <Field label="Photos">
              <PhotoPicker files={form.photos} onChange={(v) => setForm({ ...form, photos: v })} />
              {!isOnline && (
                <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint, marginTop: 6, display: "flex", alignItems: "center", gap: 5 }}>
                  <WifiOff size={12} /> You're offline — this will be saved on your device and submitted automatically once you're back online.
                </div>
              )}
            </Field>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Btn variant="ghost" onClick={() => closeGuard(isDirty, modal === "new" ? submitRequest : saveEditRequest, () => setModal(null))}>Cancel</Btn>
            <Btn variant="primary" disabled={submitting} onClick={modal === "new" ? submitRequest : saveEditRequest}>
              {modal === "new" ? (submitting ? "Submitting…" : isOnline ? "Submit" : "Save offline") : "Save changes"}
            </Btn>
          </div>
        </Modal>
      )}

      {modal && modal.action === "convert" && (
        <Modal title="Convert to work order" info="convert" onClose={() => setModal(null)} wide>
          <Field label="Work order type">
            <select style={inputStyle} value={reviewForm.type} onChange={(e) => setReviewForm({ ...reviewForm, type: e.target.value })}>
              <option value="PM">PM</option>
              <option value="PM Base">PM Base</option>
              <option value="Benchmark">Benchmark</option>
              <option value="Corrective">Corrective</option>
            </select>
          </Field>
          <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint, marginTop: -6, marginBottom: 12 }}>
            A request can never become an Unplanned work order — that type is always created directly.
          </div>
          <ExecutorPicker obj={reviewForm} onChange={(p) => setReviewForm({ ...reviewForm, ...p })} users={[]} part="crew" crewRequiredFields />
          {reviewForm.type === "PM Base" ? (
            <PmBaseFields form={reviewForm} setForm={setReviewForm} data={data} />
          ) : (
            <div className="hk-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="Scheduled date (optional)"><input type="date" style={inputStyle} value={reviewForm.scheduledDate} onChange={(e) => setReviewForm({ ...reviewForm, scheduledDate: e.target.value })} /></Field>
              <Field label="Required by" required><input type="date" style={inputStyle} value={reviewForm.requiredByDate} onChange={(e) => setReviewForm({ ...reviewForm, requiredByDate: e.target.value })} /></Field>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn variant="primary" onClick={doConvert}>Create work order</Btn>
          </div>
        </Modal>
      )}
      {modal && modal.action === "decline" && (
        <Modal title="Decline request" info="decline" onClose={() => setModal(null)}>
          <Field label="Reason (shown to the submitter)" required><textarea style={{ ...inputStyle, minHeight: 70 }} value={reviewForm.reason} onChange={(e) => setReviewForm({ ...reviewForm, reason: e.target.value })} autoFocus /></Field>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn variant="danger" onClick={doDecline}>Decline request</Btn>
          </div>
        </Modal>
      )}
      {modal && modal.action === "info" && (
        <Modal title="Request more info" info="moreInfo" onClose={() => setModal(null)}>
          <Field label="What do you need to know?" required><textarea style={{ ...inputStyle, minHeight: 70 }} value={reviewForm.reason} onChange={(e) => setReviewForm({ ...reviewForm, reason: e.target.value })} autoFocus /></Field>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn variant="primary" onClick={doRequestInfo}>Send</Btn>
          </div>
        </Modal>
      )}
      {modal && modal.action === "merge" && (
        <Modal title="Merge into an existing work order" info="merge" onClose={() => setModal(null)}>
          <Field label="Existing work order" required>
            <select style={inputStyle} value={reviewForm.mergeInto} onChange={(e) => setReviewForm({ ...reviewForm, mergeInto: e.target.value })}>
              <option value="">— choose —</option>
              {openWOOptions.map((w) => <option key={w.id} value={w.id}>{formatWoNum(w.number)} · {w.title} ({w.type})</option>)}
            </select>
          </Field>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn variant="primary" onClick={doMerge}>Merge</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ============================================================
   WORK ORDERS
============================================================ */
function PmBaseDetail({ data, base, onOpenInstance }) {
  const linked = data.workOrders.filter((w) => w.sourcePmBaseId === base.id).sort((a, b) => (a.requiredByDate || "").localeCompare(b.requiredByDate || ""));
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 6 }}>Generated PM instances<InfoTip k="genPm" /></div>
      {linked.length === 0 && <Empty text="None generated yet." />}
      {linked.map((w) => (
        <div key={w.id} onClick={() => onOpenInstance(w.id)} className="hk-row" style={{ display: "flex", justifyContent: "space-between", padding: "8px 6px", borderTop: `1px solid ${C.lineSoft}`, cursor: "pointer" }}>
          <span style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.ink }}>{formatWoNum(w.number)} · required by {fmtDate(w.requiredByDate)}</span>
          <Tag text={w.status} color={WO_STATUS_COLORS[w.status]} soft={C.panelAlt} />
        </div>
      ))}
    </div>
  );
}

function ArchiveModal({ data, onClose, goToOrder }) {
  const [search, setSearch] = useState("");
  const [locFilter, setLocFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const allowedLocs = locFilter ? descendantIds(data.locations, locFilter) : null;
  const searchLower = search.trim().toLowerCase();
  const items = data.workOrders
    .filter((w) => w.status === "Closed")
    .filter((w) => !allowedLocs || allowedLocs.has(w.locationId))
    .filter((w) => typeFilter === "all" || w.type === typeFilter)
    .filter((w) => !searchLower || w.title.toLowerCase().includes(searchLower) || formatWoNum(w.number).toLowerCase().includes(searchLower))
    .sort((a, b) => (b.verifiedDate || "").localeCompare(a.verifiedDate || ""));

  return (
    <Modal title="Closed work order archive" info="archive" onClose={onClose} wide>
      <input style={{ ...inputStyle, marginBottom: 10 }} placeholder="Search by title or number…" value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="hk-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <select style={inputStyle} value={locFilter} onChange={(e) => setLocFilter(e.target.value)}>
          <option value="">All locations</option>
          {flattenTree(data.locations, "parentId", null).map(({ item, depth }) => (
            <option key={item.id} value={item.id}>{"—".repeat(depth) + " " + item.name}</option>
          ))}
        </select>
        <select style={inputStyle} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">All types</option>
          {WO_TYPES.filter((t) => t !== "PM Base").map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="hk-scroll" style={{ maxHeight: 400, overflowY: "auto" }}>
        {items.length === 0 && <Empty text="No closed work orders match." />}
        {items.map((w) => (
          <div key={w.id} onClick={() => { onClose(); goToOrder(w.id); }} className="hk-row" style={{ display: "flex", justifyContent: "space-between", padding: "9px 4px", borderTop: `1px solid ${C.lineSoft}`, cursor: "pointer" }}>
            <span style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.ink }}>{formatWoNum(w.number)} · {w.title}</span>
            <span style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint }}>closed {fmtDate(w.verifiedDate)}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}

function WorkOrdersView({ data, update, role, currentUser, currentUserId, openId, setOpenId, pendingFilter, consumeFilter, prefillOrder, consumePrefill }) {
  const dialog = useDialog();
  const closeGuard = useCloseGuard(dialog);
  const [modal, setModal] = useState(null);
  const [locFilter, setLocFilter] = useState(null);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dueFilter, setDueFilter] = useState(pendingFilter?.due || "all");
  const [executorFilter, setExecutorFilter] = useState(role === "Executor" ? currentUserId : "");
  const [showArchive, setShowArchive] = useState(false);
  const [users, setUsers] = useState([]);
  const blank = {
    title: "", type: "Unplanned", assetId: null, bomNodeId: null, locationId: data.locations[0]?.id || "",
    description: "", scheduledDate: "", requiredByDate: "", vendorId: "", benchmarkId: "", executorId: "", executorIds: [], estHours: "", crewRequired: "",
    priority: "", pmMode: "Non-fixed", frequencyValue: "3", frequencyUnit: "months", fixedDates: [], parts: [],
    failureCode: "", rootCause: "",
    triggerType: "calendar", meterIntervalValue: "", seasonalAnchor: "Spring", seasonalOffsetDays: "0",
    checklistTemplate: [], standby: false, standbyWindow: { ...DEFAULT_STANDBY_WINDOW },
  };
  const [form, setForm] = useState(blank);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const initial = useRef(null);
  const isDirty = modal === "new" && JSON.stringify(form) !== initial.current;
  const [detailEdits, setDetailEdits] = useState({});
  const detailInitial = useRef(null);
  const detailDirty = !!openId && JSON.stringify(detailEdits) !== detailInitial.current;
  const [commentDraft, setCommentDraft] = useState("");
  const [hoursAsk, setHoursAsk] = useState(null);
  const askHours = () => new Promise((resolve) => setHoursAsk({ resolve }));

  useEffect(() => { if (pendingFilter) consumeFilter(); }, []); // eslint-disable-line
  useEffect(() => { api.listUsers().then(setUsers).catch(() => setUsers([])); }, []);
  const assignableUsers = users.filter(isExecPerson);

  const openNew = () => { setForm(blank); initial.current = JSON.stringify(blank); setModal("new"); };

  // Arrived here via the "+ New work order" quick action on an asset's
  // detail page (or a scanned QR label) — open the new-order form
  // pre-filled with that asset and its location.
  useEffect(() => {
    if (!prefillOrder) return;
    const f = { ...blank, assetId: prefillOrder.assetId, locationId: prefillOrder.locationId };
    setForm(f); initial.current = JSON.stringify(f); setModal("new");
    consumePrefill();
  }, []); // eslint-disable-line

  const createWO = async () => {
    {
      const missing = [];
      if (!form.title.trim()) missing.push("title");
      if (!form.description.trim()) missing.push("description");
      if (!form.priority) missing.push("priority");
      if (form.type !== "PM Base" && !form.requiredByDate) missing.push("required-by date");
      if (!form.locationId) missing.push("location");
      if (execOn() && !(Number(form.crewRequired) >= 1)) missing.push("executors required");
      if (execOn() && !(Number(form.estHours) > 0)) missing.push("hours per executor");
      if (missing.length) { await dialog.alertMsg(`Please fill in: ${missing.join(", ")}.`); return; }
    }
    if (form.type === "PM Base") {
      const tt = form.triggerType || "calendar";
      if (tt === "calendar") {
        if (form.pmMode === "Non-fixed" && (!form.frequencyValue || Number(form.frequencyValue) <= 0)) { await dialog.alertMsg("Enter a frequency greater than zero."); return; }
        if (form.pmMode === "Fixed" && form.fixedDates.length === 0) { await dialog.alertMsg("Add at least one fixed date."); return; }
      } else if (tt === "meter") {
        if (!form.assetId) { await dialog.alertMsg("Meter-based PM needs a linked asset — pick one below."); return; }
        if (!form.meterIntervalValue || Number(form.meterIntervalValue) <= 0) { await dialog.alertMsg("Enter a meter interval greater than zero."); return; }
      }
    }
    update((d) => {
      d.counters = d.counters || { wo: 0, wr: 0, part: 0 };
      let checklist = "";
      if (form.type === "Corrective" && form.benchmarkId) {
        const bm = d.benchmarks.find((b) => b.id === form.benchmarkId);
        checklist = bm ? bm.checklist : "";
      }
      d.counters.wo += 1;
      const id = uid("wo");
      const wo = {
        id, number: d.counters.wo, title: form.title.trim(), type: form.type,
        status: form.type === "PM Base" ? "Active" : (form.scheduledDate ? "Scheduled" : "Active"),
        assetId: form.assetId, bomNodeId: form.bomNodeId, locationId: form.locationId,
        description: form.description, sourceRequestId: null,
        sourceBenchmarkId: form.type === "Corrective" ? (form.benchmarkId || null) : null,
        sourcePmBaseId: null, sourceFixedDate: null,
        priority: form.priority, executorId: form.type === "PM Base" ? "" : (form.executorId || ""), executorIds: form.type === "PM Base" ? [] : [...(form.executorIds || [])], estHours: form.estHours || "", crewRequired: form.crewRequired || "",
        scheduledDate: form.type === "PM Base" ? "" : form.scheduledDate,
        requiredByDate: form.type === "PM Base" ? "" : (form.requiredByDate || ""),
        completedDate: null, verifiedDate: null, createdDate: todayISO(),
        cost: "", vendorId: null,
        notes: checklist ? "Checklist: " + checklist : "",
        failureCode: (form.type === "Corrective" || form.type === "Unplanned") ? (form.failureCode || "") : "",
        rootCause: (form.type === "Corrective" || form.type === "Unplanned") ? (form.rootCause || "") : "",
        parts: form.type === "PM Base" ? [] : form.parts, comments: [], partsDeducted: false, createdBy: currentUser,
      };
      if (form.type === "PM Base") {
        wo.triggerType = form.triggerType || "calendar";
        wo.checklistTemplate = (form.checklistTemplate || []).map((s) => ({ ...s }));
        wo.standby = !!form.standby;
        wo.standbyWindow = form.standbyWindow && form.standbyWindow.enabled ? { ...DEFAULT_STANDBY_WINDOW, ...form.standbyWindow, enabled: true } : null;
        if (wo.triggerType === "meter") {
          wo.meterIntervalValue = Number(form.meterIntervalValue);
          const linkedAsset = d.assets.find((a) => a.id === form.assetId);
          wo.meterBaselineValue = linkedAsset ? (Number(linkedAsset.currentMeterValue) || 0) : 0;
        } else if (wo.triggerType === "seasonal") {
          wo.seasonalAnchor = form.seasonalAnchor || "Spring";
          wo.seasonalOffsetDays = Number(form.seasonalOffsetDays) || 0;
        } else {
          wo.pmMode = form.pmMode;
          if (form.pmMode === "Non-fixed") { wo.frequencyValue = Number(form.frequencyValue); wo.frequencyUnit = form.frequencyUnit; }
          else wo.fixedDates = form.fixedDates.map((f) => ({ month: Number(f.month), day: Number(f.day) }));
        }
      }
      d.workOrders.push(wo);
      if (form.type === "PM Base") {
        // Meter-based: no immediate spawn — generated once the linked asset's
        // meter reading crosses the interval (see checkMeterPmTriggers). A base
        // created on standby spawns nothing until standby ends (syncPmStandby).
        spawnFirstPmInstance(d, wo);
      }
      setOpenId(id);
      return d;
    });
    setModal(null);
  };

  const openWO = data.workOrders.find((w) => w.id === openId);
  useEffect(() => {
    if (openWO) { const snap = { ...openWO }; setDetailEdits(snap); detailInitial.current = JSON.stringify(snap); }
    setCommentDraft("");
  }, [openId]); // eslint-disable-line

  // Returns false (after telling the user) when the edits can't be saved.
  const saveDetail = () => {
    if (openWO.type !== "PM Base" && !detailEdits.requiredByDate) {
      dialog.alertMsg("A required-by date is required for every work order.");
      return false;
    }
    // Fields owned by other actions (status buttons, comments, checklist,
    // standby bookkeeping) are never overwritten from the edit buffer, which
    // could otherwise be a stale copy taken when the order was opened.
    const { status, completedDate, verifiedDate, comments, partsDeducted, checklist, standbyNow, ...edits } = detailEdits;
    update((d) => {
      const w = d.workOrders.find((x) => x.id === openWO.id);
      Object.assign(w, edits);
      applyScheduleStatus(w);
      return d;
    });
    detailInitial.current = JSON.stringify(detailEdits);
    return true;
  };
  const setStatus = async (status) => {
    if (status === "Closed" && !isAdmin(role)) return;
    if (status === openWO.status) return;
    let comment = null;
    if (status === "Completed" && openWO.status === "Scheduled") {
      comment = await dialog.promptMsg("Add a comment to complete this work order — how did it go?", "", { title: "Completion comment", multiline: true, required: true, okLabel: "Complete" });
      if (comment == null || !String(comment).trim()) return;
    }
    let hoursWorked = null;
    if (status === "Completed" && execOn() && openWO.type !== "PM Base") {
      hoursWorked = await askHours();
      if (!hoursWorked) return;
    }
    if (status === "Scheduled" && !openWO.scheduledDate) {
      await dialog.alertMsg("Set a scheduled date (and save) to schedule this work order — it moves to Scheduled automatically.");
      return;
    }
    if (status === "Active" && openWO.scheduledDate) {
      const ok = await dialog.confirm("Moving this work order back to Active clears its scheduled date. Continue?");
      if (!ok) return;
    }
    update((d) => {
      const w = d.workOrders.find((x) => x.id === openWO.id);
      const wasTerminal = isDoneStatus(w.status);
      w.status = status;
      if (status === "Active") w.scheduledDate = "";
      if (comment) {
        w.comments = w.comments || [];
        w.comments.push({ id: uid("cm"), author: currentUser, date: todayISO(), text: String(comment).trim() });
      }
      if (status === "Completed" && !w.completedDate) w.completedDate = todayISO();
      if (hoursWorked) w.timeEntries = [...(w.timeEntries || []), ...hoursWorked.map((h) => ({ id: uid("te"), executorId: h.executorId, hours: h.hours, date: todayLocal(), by: currentUser }))];
      if (status === "Closed" && !w.verifiedDate) w.verifiedDate = todayISO();
      if (status === "Completed" && w.type === "PM" && w.sourcePmBaseId && !wasTerminal) regeneratePmAfterCompletion(d, w);
      if (status === "Completed" && !w.partsDeducted) {
        (w.parts || []).forEach(({ partId, qty }) => {
          const item = d.inventory.find((i) => i.id === partId);
          if (item) item.qty = Math.max(0, item.qty - (Number(qty) || 0));
        });
        w.partsDeducted = true;
      }
      return d;
    });
    if (status === "Active") setDetailEdits((e) => ({ ...e, scheduledDate: "" }));
  };
  // Bulk auto-schedule (v2.2): sets each selected Active work order's
  // scheduled date to its required-by date, which moves it to Scheduled.
  const toggleSelected = (id) => setSelectedIds((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleColumn = (items) => setSelectedIds((prev) => {
    const n = new Set(prev);
    const all = items.length > 0 && items.every((w) => n.has(w.id));
    items.forEach((w) => (all ? n.delete(w.id) : n.add(w.id)));
    return n;
  });
  const autoSchedule = async () => {
    const picked = data.workOrders.filter((w) => selectedIds.has(w.id) && w.type !== "PM Base");
    const eligible = picked.filter((w) => w.status === "Active" && w.requiredByDate);
    const noDate = picked.filter((w) => w.status === "Active" && !w.requiredByDate);
    const notActive = picked.filter((w) => w.status !== "Active");
    if (picked.length === 0) { await dialog.alertMsg("Tick the work orders you want to schedule first."); return; }
    if (eligible.length === 0) {
      await dialog.alertMsg("Nothing to schedule: only Active work orders with a required-by date can be auto-scheduled." + (notActive.length ? ` ${notActive.length} selected ${notActive.length === 1 ? "is" : "are"} not Active.` : ""));
      return;
    }
    const extra = [];
    if (noDate.length) extra.push(`${noDate.length} Active without a required-by date will be skipped`);
    if (notActive.length) extra.push(`${notActive.length} not Active will be left alone`);
    const ok = await dialog.confirm(`Schedule ${eligible.length} work order${eligible.length === 1 ? "" : "s"} on their required-by dates?${extra.length ? " (" + extra.join("; ") + ".)" : ""}`);
    if (!ok) return;
    const ids = new Set(eligible.map((w) => w.id));
    update((d) => {
      d.workOrders.forEach((w) => { if (ids.has(w.id)) { w.scheduledDate = w.requiredByDate; applyScheduleStatus(w); } });
      return d;
    });
    setSelectedIds(new Set());
  };
  const addComment = () => {
    if (!commentDraft.trim()) return;
    update((d) => {
      const w = d.workOrders.find((x) => x.id === openWO.id);
      w.comments = w.comments || [];
      w.comments.push({ id: uid("cm"), author: currentUser, date: todayISO(), text: commentDraft.trim() });
      return d;
    });
    setCommentDraft("");
  };
  // Checklist steps live-save (bypassing the buffered detailEdits/Save
  // flow) so an Executor — who otherwise gets a read-only view of a work
  // order — can still fill in the checklist while doing the work.
  const updateChecklistStep = (stepId, patch) => {
    update((d) => {
      const w = d.workOrders.find((x) => x.id === openWO.id);
      w.checklist = (w.checklist || []).map((s) => (s.id === stepId ? { ...s, ...patch } : s));
      return d;
    });
    // v1.8: a numeric checklist reading outside its configured expected
    // range raises an alarm automatically (dedup'd per work order + step,
    // so re-entering the same out-of-spec reading doesn't spam the
    // dashboard with duplicates — see Alarms). Computed from
    // openWO (this component's own prop) + the patch being applied,
    // rather than from inside update()'s producer callback — React may
    // not have applied that state update by the time this line runs, so
    // reading the result back out of it isn't reliable.
    const currentStep = (openWO.checklist || []).find((s) => s.id === stepId);
    const merged = currentStep ? { ...currentStep, ...patch } : null;
    if (merged && merged.stepType === "numeric") {
      const hasRange = merged.expectedMin !== "" && merged.expectedMin != null && merged.expectedMax !== "" && merged.expectedMax != null;
      const hasValue = merged.value !== "" && merged.value != null;
      if (hasRange && hasValue && !(Number(merged.value) >= Number(merged.expectedMin) && Number(merged.value) <= Number(merged.expectedMax))) {
        api
          .createManualAlarm({
            source: "pm_checklist",
            sourceEntityId: `pm_checklist:${openWO.id}:${stepId}`,
            friendlyName: merged.title || openWO.title,
            assetId: openWO.assetId || null,
            locationId: openWO.locationId || null,
            message: `${formatWoNum(openWO.number)} "${merged.title || "Checklist reading"}" is out of spec — read ${merged.value}${merged.unit ? " " + merged.unit : ""} (expected ${merged.expectedMin}–${merged.expectedMax}${merged.unit ? " " + merged.unit : ""})`,
            severity: "warning",
          })
          .catch(() => {}); // best-effort — a failed alarm post shouldn't block saving the checklist
      }
    }
  };
  const updateBenchmarkFromWO = async () => {
    if (!openWO.sourceBenchmarkId) return;
    update((d) => {
      const bm = d.benchmarks.find((b) => b.id === openWO.sourceBenchmarkId);
      bm.checklist = detailEdits.notes || bm.checklist;
      bm.estCost = detailEdits.cost || bm.estCost;
      bm.version = (bm.version || 1) + 1;
      return d;
    });
    await dialog.alertMsg("Benchmark template updated for next time.");
  };
  const saveAsNewBenchmark = async () => {
    const title = await dialog.promptMsg("Name this benchmark:", openWO.title);
    if (!title) return;
    update((d) => {
      const id = uid("bm");
      d.benchmarks.push({ id, title, checklist: detailEdits.notes || "", estCost: detailEdits.cost || "", estTime: "", notes: "", vendorId: openWO.vendorId || null, version: 1, createdBy: currentUser });
      return d;
    });
    await dialog.alertMsg("Saved as a new benchmark.");
  };
  const deleteWO = async () => {
    const ok = await dialog.confirm(`Permanently delete ${formatWoNum(openWO.number)} — "${openWO.title}"? This cannot be undone.`);
    if (!ok) return;
    update((d) => {
      d.workOrders = d.workOrders.filter((x) => x.id !== openWO.id);
      d.workRequests.forEach((r) => { if (r.workOrderId === openWO.id) r.workOrderId = null; });
      d.workOrders.forEach((x) => { if (x.sourcePmBaseId === openWO.id) x.sourcePmBaseId = null; });
      return d;
    });
    setOpenId(null);
  };

  const allowedLocs = locFilter ? descendantIds(data.locations, locFilter) : null;
  const searchLower = search.trim().toLowerCase();
  const matchesFilters = (w) => {
    if (allowedLocs && !allowedLocs.has(w.locationId)) return false;
    if (priorityFilter !== "all" && w.priority !== priorityFilter) return false;
    if (typeFilter !== "all" && w.type !== typeFilter) return false;
    if (executorFilter && !execIdsOf(w).includes(executorFilter)) return false;
    if (dueFilter !== "all") {
      const notDone = !isDoneStatus(w.status);
      if (!notDone) return false;
      const rd = w.requiredByDate ? daysUntil(w.requiredByDate) : null;
      if (dueFilter === "overdue" && !(rd !== null && rd < 0)) return false;
      if (dueFilter === "30") {
        const sd = w.scheduledDate ? daysUntil(w.scheduledDate) : null;
        const inRange = (v) => v !== null && v >= 0 && v <= 30;
        if (!inRange(rd) && !inRange(sd)) return false;
      }
    }
    if (searchLower) {
      const num = formatWoNum(w.number).toLowerCase();
      if (!w.title.toLowerCase().includes(searchLower) && !num.includes(searchLower)) return false;
    }
    return true;
  };

  const boardOrders = data.workOrders.filter((w) => w.type !== "PM Base").filter(matchesFilters);
  const pmBases = data.workOrders.filter((w) => w.type === "PM Base").filter(matchesFilters);
  const columns = WO_STATUSES.map((status) => ({
    status,
    items: boardOrders.filter((w) => {
      if (w.status !== status) return false;
      if (status === "Closed") return w.verifiedDate && daysUntil(w.verifiedDate) >= -VERIFIED_ARCHIVE_DAYS;
      return true;
    }),
  }));

  return (
    <div>
      <SectionHeader
        title="Work Orders"
        subtitle="The record of all maintenance work, from active to closed."
        info={PAGE_INFO.orders}
        action={canWrite(role) && <Btn variant="primary" onClick={openNew}><Plus size={15} /> New work order</Btn>}
      />
      <div className="hk-grid-fixed2" style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 16 }}>
        <LocationNavTree data={data} selectedId={locFilter} onSelect={setLocFilter} />
        <div>
          <div style={{ position: "relative", maxWidth: 340, marginBottom: 10 }}>
            <Search size={14} color={C.inkFaint} style={{ position: "absolute", left: 10, top: 10, pointerEvents: "none" }} />
            <input style={{ ...inputStyle, paddingLeft: 30 }} placeholder="Search by title or number…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            <select style={{ ...inputStyle, width: "auto" }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">All types</option>
              {WO_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select style={{ ...inputStyle, width: "auto" }} value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
              <option value="all">All priorities</option>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select style={{ ...inputStyle, width: "auto" }} value={dueFilter} onChange={(e) => setDueFilter(e.target.value)}>
              <option value="all">All due dates</option>
              <option value="overdue">Overdue</option>
              <option value="30">Due within 30 days</option>
            </select>
            <select style={{ ...inputStyle, width: "auto" }} value={executorFilter} onChange={(e) => setExecutorFilter(e.target.value)}>
              <option value="">All executors</option>
              {assignableUsers.map((u) => <option key={u.id} value={u.id}>{u.username}{u.id === currentUserId ? " (me)" : ""}</option>)}
            </select>
            {planRole(role) && (
              <>
              <Btn small variant={selectedIds.size ? "primary" : "ghost"} onClick={autoSchedule} title="Sets each selected Active work order's scheduled date to its required-by date">
                <Calendar size={13} /> Auto schedule{selectedIds.size ? ` (${selectedIds.size})` : ""}
              </Btn>
              <InfoTip k="autoSchedule" />
              </>
            )}
          </div>

          <div className="hk-grid-4 hk-kanban" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {columns.map((col) => (
              <div key={col.status}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  {planRole(role) && col.items.length > 0 && (
                    <input type="checkbox" title="Select all in this column" checked={col.items.every((w) => selectedIds.has(w.id))} onChange={() => toggleColumn(col.items)} style={{ cursor: "pointer", margin: 0 }} />
                  )}
                  <span style={{ width: 8, height: 8, borderRadius: 8, background: WO_STATUS_COLORS[col.status] }} />
                  <span style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, color: C.ink }}>{col.status}</span>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint }}>({col.items.length})</span>
                  {col.status === "Closed" && (
                    <span onClick={() => setShowArchive(true)} className="hk-link" title="View all closed work orders" style={{ display: "flex", alignItems: "center", gap: 3, marginLeft: "auto", cursor: "pointer", color: C.navy }}>
                      <Archive size={12} />
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {col.items.map((w) => {
                    const du = w.requiredByDate ? daysUntil(w.requiredByDate) : null;
                    const notDone = !isDoneStatus(w.status);
                    return (
                      <Panel key={w.id} style={{ padding: "10px 12px", cursor: "pointer", position: "relative" }}>
                        {planRole(role) && (
                          <input type="checkbox" title="Select for auto schedule" checked={selectedIds.has(w.id)} onChange={() => toggleSelected(w.id)} onClick={(e) => e.stopPropagation()}
                            style={{ position: "absolute", top: 8, right: 8, cursor: "pointer", margin: 0 }} />
                        )}
                        <div onClick={() => setOpenId(w.id)} style={{ paddingRight: planRole(role) ? 20 : 0 }}>
                          <div style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, color: C.ink }}>{formatWoNum(w.number)} · {w.title}</div>
                          <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint, marginTop: 3 }}>{locationPath(data.locations, w.locationId)}</div>
                          <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <Tag text={w.type} color={WO_TYPE_COLORS[w.type]} soft={C.panelAlt} />
                            <Tag text={w.priority || "Medium"} color={PRIORITY_COLORS[w.priority || "Medium"]} soft={PRIORITY_SOFT[w.priority || "Medium"]} />
                            {notDone && du !== null && du < 0 && <Tag text="Overdue" color={C.rust} soft={C.rustSoft} />}
                            {notDone && du !== null && du >= 0 && du <= 7 && <Tag text={`Due ${du}d`} color={C.gold} soft={C.goldSoft} />}
                          </div>
                          {(w.scheduledDate || w.requiredByDate) && (
                            <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: C.inkFaint, marginTop: 5 }}>
                              {w.scheduledDate ? `Scheduled ${fmtDate(w.scheduledDate)}` : ""}{w.scheduledDate && w.requiredByDate ? " · " : ""}{w.requiredByDate ? `Required ${fmtDate(w.requiredByDate)}` : ""}
                            </div>
                          )}
                        </div>
                      </Panel>
                    );
                  })}
                  {col.items.length === 0 && <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint, padding: "6px 2px" }}>—</div>}
                </div>
              </div>
            ))}
          </div>

          {pmBases.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontFamily: FONT_HEAD, fontSize: 15, fontWeight: 600, color: C.ink, marginBottom: 8 }}>PM Base templates<InfoTip k="pmBases" /></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                {pmBases.map((b) => {
                  const linked = data.workOrders.filter((w) => w.sourcePmBaseId === b.id);
                  const openLinked = linked.filter((w) => !isDoneStatus(w.status));
                  return (
                    <Panel key={b.id} style={{ padding: "10px 12px", cursor: "pointer" }}>
                      <div onClick={() => setOpenId(b.id)}>
                        <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, fontWeight: 700, color: C.ink }}>{formatWoNum(b.number)} · {b.title}</div>
                        <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: C.inkFaint, marginTop: 3 }}>{locationPath(data.locations, b.locationId)}</div>
                        <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <Tag text="PM Base" color={WO_TYPE_COLORS["PM Base"]} soft={C.tealSoft} />
                          <Tag text={pmBaseScheduleLabel(b, data)} color={C.inkSoft} soft={C.panelAlt} />
                          <Tag text={`${openLinked.length} open`} color={C.navy} soft={C.navySoft} />
                          {pmBaseStandbyLabel(b) && <Tag text={pmBaseStandbyLabel(b)} color={pmBaseOnStandby(b) ? C.orange : C.olive} soft={pmBaseOnStandby(b) ? C.orangeSoft : C.oliveSoft} />}
                          {(b.checklistTemplate || []).length > 0 && <Tag text={`${b.checklistTemplate.length}-step checklist`} color={C.gold} soft={C.goldSoft} />}
                        </div>
                      </div>
                    </Panel>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {hoursAsk && openWO && (
        <div style={{ position: "relative", zIndex: 70 }}>
          <HoursWorkedModal wo={openWO} staff={assignableUsers} currentUserId={currentUserId}
            onCancel={() => { hoursAsk.resolve(null); setHoursAsk(null); }}
            onSave={(h) => { hoursAsk.resolve(h); setHoursAsk(null); }} />
        </div>
      )}
      {modal === "new" && (
        <Modal title="New work order" info="newWo" onClose={() => closeGuard(isDirty, createWO, () => setModal(null))} wide>
          <Field label="Title" required><input style={inputStyle} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus /></Field>
          <Field label="Type">
            <select style={{ ...inputStyle, maxWidth: 280 }} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {WO_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Description" required><textarea style={{ ...inputStyle, minHeight: 60 }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <div className="hk-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Priority" required>
              <select style={inputStyle} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="">— select a priority —</option>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            {form.type !== "PM Base" && (
              <Field label="Required by" required><input type="date" style={inputStyle} value={form.requiredByDate} onChange={(e) => setForm({ ...form, requiredByDate: e.target.value })} /></Field>
            )}
          </div>
          <Field label="Location" required>
            <select style={inputStyle} value={form.locationId} onChange={(e) => {
              const loc = e.target.value, set = descendantIds(data.locations, loc);
              const keep = form.assetId && set.has((data.assets.find((a) => a.id === form.assetId) || {}).locationId);
              setForm({ ...form, locationId: loc, ...(keep ? {} : { assetId: null, bomNodeId: null }) });
            }}>
              {flattenTree(data.locations, "parentId", null).map(({ item, depth }) => (
                <option key={item.id} value={item.id}>{"—".repeat(depth) + " " + item.name}</option>
              ))}
            </select>
          </Field>
          <AssetBomPicker data={data} locationId={form.locationId} assetId={form.assetId} bomNodeId={form.bomNodeId} onChange={({ assetId, bomNodeId }) => setForm({ ...form, assetId, bomNodeId, locationId: assetId ? data.assets.find((a) => a.id === assetId).locationId : form.locationId })} />

          {form.type === "Corrective" && (
            <Field label="Copy from benchmark">
              <select style={inputStyle} value={form.benchmarkId} onChange={(e) => setForm({ ...form, benchmarkId: e.target.value })}>
                <option value="">— start blank —</option>
                {data.benchmarks.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
              </select>
            </Field>
          )}
          {(form.type === "Corrective" || form.type === "Unplanned") && (
            <div className="hk-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="Failure code">
                <select style={inputStyle} value={form.failureCode} onChange={(e) => setForm({ ...form, failureCode: e.target.value })}>
                  <option value="">— none —</option>
                  {FAILURE_CODES.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </Field>
              <Field label="Root cause"><input style={inputStyle} value={form.rootCause} onChange={(e) => setForm({ ...form, rootCause: e.target.value })} placeholder="Optional detail beyond the code" /></Field>
            </div>
          )}

          <ExecutorPicker obj={form} onChange={(p) => setForm({ ...form, ...p })} users={assignableUsers} part="crew" crewRequiredFields />
          {form.type !== "PM Base" && <ExecutorPicker obj={form} onChange={(p) => setForm({ ...form, ...p })} users={assignableUsers} part="select" />}
          {form.type !== "PM Base" && (
            <Field label="Scheduled date (optional — setting one schedules it)"><input type="date" style={{ ...inputStyle, maxWidth: 280 }} value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} /></Field>
          )}
          {form.type !== "PM Base" && (
            <PartsPicker data={data} update={update} value={form.parts} onChange={(v) => setForm({ ...form, parts: v })} defaultLocationId={form.locationId} currentUser={currentUser} role={role} />
          )}
          {form.type === "PM Base" && <PmBaseFields form={form} setForm={setForm} data={data} />}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Btn variant="ghost" onClick={() => closeGuard(isDirty, createWO, () => setModal(null))}>Cancel</Btn>
            <Btn variant="primary" onClick={createWO}>Create</Btn>
          </div>
        </Modal>
      )}

      {openWO && (
        <Modal title={`${formatWoNum(openWO.number)} · ${openWO.title}`} info="woDetail" onClose={() => closeGuard(detailDirty, saveDetail, () => setOpenId(null))} wide>
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            <Tag text={openWO.type} color={WO_TYPE_COLORS[openWO.type]} soft={C.panelAlt} />
            {openWO.type !== "PM Base" && <Tag text={openWO.status} color={WO_STATUS_COLORS[openWO.status]} soft={C.panelAlt} />}
            {openWO.type !== "PM Base" && <Tag text={openWO.priority || "Medium"} color={PRIORITY_COLORS[openWO.priority || "Medium"]} soft={PRIORITY_SOFT[openWO.priority || "Medium"]} />}
          </div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.inkFaint, marginBottom: 12 }}>
            {locationPath(data.locations, openWO.locationId)}
            {openWO.assetId && ` · ${nameOf(data.assets, openWO.assetId)}`}
            {openWO.bomNodeId && ` · ${nameOf(data.bomNodes, openWO.bomNodeId)}`}
          </div>

          {openWO.type === "PM Base" ? (
            <>
              {planRole(role) ? (
                <>
                  <Field label="Description"><textarea style={{ ...inputStyle, minHeight: 60 }} value={detailEdits.description || ""} onChange={(e) => setDetailEdits({ ...detailEdits, description: e.target.value })} /></Field>
                  <div className="hk-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <Field label="Priority">
                      <select style={inputStyle} value={detailEdits.priority || "Medium"} onChange={(e) => setDetailEdits({ ...detailEdits, priority: e.target.value })}>
                        {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </Field>
                    <div />
                  </div>
                  <ExecutorPicker obj={detailEdits} onChange={(p) => setDetailEdits({ ...detailEdits, ...p })} users={assignableUsers} part="crew" />
                  <PmBaseFields form={detailEdits} setForm={setDetailEdits} data={data} />
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 16 }}>
                    <Btn small onClick={saveDetail}>Save changes</Btn>
                    <Btn small variant="primary" onClick={() => { if (saveDetail()) setOpenId(null); }}>Save & Close</Btn>
                  </div>
                </>
              ) : (
                <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.ink, marginBottom: 10 }}>
                  {openWO.triggerType === "meter"
                    ? (() => {
                        const asset = data.assets.find((a) => a.id === openWO.assetId);
                        return `Meter-based — generates every ${openWO.meterIntervalValue}${asset?.meterUnit ? " " + asset.meterUnit : ""} of use on ${asset ? asset.name : "the linked asset"} (currently at ${asset?.currentMeterValue || 0}${asset?.meterUnit ? " " + asset.meterUnit : ""}).`;
                      })()
                    : openWO.triggerType === "seasonal"
                    ? `Seasonal — runs every year around the start of ${openWO.seasonalAnchor || "Spring"}${Number(openWO.seasonalOffsetDays) ? ` (${Number(openWO.seasonalOffsetDays) > 0 ? "+" : ""}${openWO.seasonalOffsetDays} days)` : ""}.`
                    : openWO.pmMode === "Fixed"
                    ? `Fixed schedule — runs every year on: ${(openWO.fixedDates || []).map((f) => `${MONTH_NAMES[f.month - 1]} ${f.day}`).join(", ")}`
                    : `Repeats every ${openWO.frequencyValue} ${openWO.frequencyUnit}, counted forward from each completion date.`}
                  {pmBaseStandbyLabel(openWO) && <div style={{ marginTop: 8, color: C.inkSoft }}>{pmBaseStandbyLabel(openWO)}</div>}
                  {openWO.description && <div style={{ marginTop: 8, fontStyle: "italic", color: C.inkSoft }}>{openWO.description}</div>}
                </div>
              )}
              <PmBaseDetail data={data} base={openWO} onOpenInstance={setOpenId} />
            </>
          ) : (
            <>
              {planRole(role) ? (
                <>
                  <div className="hk-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <Field label="Scheduled date (setting one schedules it)"><input type="date" style={inputStyle} value={detailEdits.scheduledDate || ""} onChange={(e) => setDetailEdits({ ...detailEdits, scheduledDate: e.target.value })} /></Field>
                    <Field label="Required by" required><input type="date" style={inputStyle} value={detailEdits.requiredByDate || ""} onChange={(e) => setDetailEdits({ ...detailEdits, requiredByDate: e.target.value })} /></Field>
                  </div>
                  <div className="hk-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <Field label="Cost ($)"><input style={inputStyle} value={detailEdits.cost || ""} onChange={(e) => setDetailEdits({ ...detailEdits, cost: e.target.value })} /></Field>
                    <Field label="Vendors (from the parts used)"><div style={{ ...inputStyle, background: C.panelAlt, color: C.inkSoft, minHeight: 20 }}>{woPartVendors(data, openWO).join(", ") || "—"}</div></Field>
                  </div>
                  <div className="hk-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <Field label="Priority">
                      <select style={inputStyle} value={detailEdits.priority || "Medium"} onChange={(e) => setDetailEdits({ ...detailEdits, priority: e.target.value })}>
                        {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </Field>
                    <ExecutorPicker obj={detailEdits} onChange={(p) => setDetailEdits({ ...detailEdits, ...p })} users={assignableUsers} />
                  </div>
                  {(openWO.type === "Corrective" || openWO.type === "Unplanned") && (
                    <div className="hk-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <Field label="Failure code">
                        <select style={inputStyle} value={detailEdits.failureCode || ""} onChange={(e) => setDetailEdits({ ...detailEdits, failureCode: e.target.value })}>
                          <option value="">— none —</option>
                          {FAILURE_CODES.map((f) => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </Field>
                      <Field label="Root cause"><input style={inputStyle} value={detailEdits.rootCause || ""} onChange={(e) => setDetailEdits({ ...detailEdits, rootCause: e.target.value })} placeholder="Optional detail beyond the code" /></Field>
                    </div>
                  )}
                  <PartsPicker data={data} update={update} value={detailEdits.parts || []} onChange={(v) => setDetailEdits({ ...detailEdits, parts: v })} defaultLocationId={openWO.locationId} currentUser={currentUser} role={role} />
                  <Field label="Notes / checklist"><textarea style={{ ...inputStyle, minHeight: 80 }} value={detailEdits.notes || ""} onChange={(e) => setDetailEdits({ ...detailEdits, notes: e.target.value })} /></Field>
                  {(openWO.photos || []).length > 0 && (
                    <Field label="Photos"><AttachmentThumbs ids={openWO.photos} /></Field>
                  )}
                </>
              ) : (
                <div style={{ marginBottom: 12 }}>
                  <div className="hk-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    {[
                      ["Scheduled date", fmtDate(openWO.scheduledDate)],
                      ["Required by", fmtDate(openWO.requiredByDate)],
                      ["Cost", openWO.cost ? `$${openWO.cost}` : "—"],
                      ["Vendors (from parts)", woPartVendors(data, openWO).join(", ") || "—"],
                      ["Priority", openWO.priority || "Medium"],
                      ["Executor", (execIdsOf(openWO).map((id) => (assignableUsers.find((u) => u.id === id) || {}).username).filter(Boolean).join(", ")) || "Unassigned"],
                      ...(execOn() ? [["Estimate", `${openWO.estHours ? fmtH(openWO.estHours) + " h" : "—"} × ${crewOf(openWO)} executor${crewOf(openWO) === 1 ? "" : "s"}`], ["Hours logged", (openWO.timeEntries || []).length ? `${fmtH((openWO.timeEntries || []).reduce((t, e) => t + (Number(e.hours) || 0), 0))} h` : "—"]] : []),
                      ...(openWO.failureCode ? [["Failure code", openWO.failureCode]] : []),
                      ...(openWO.meterValueAtGeneration != null ? [["Triggered at", `${openWO.meterValueAtGeneration}${(data.assets.find((a) => a.id === openWO.assetId) || {}).meterUnit ? " " + data.assets.find((a) => a.id === openWO.assetId).meterUnit : ""}`]] : []),
                    ].map(([k, v]) => (
                      <div key={k}>
                        <div style={{ fontFamily: FONT_BODY, fontSize: 10.5, fontWeight: 700, color: C.inkFaint, textTransform: "uppercase", letterSpacing: "0.03em" }}>{k}</div>
                        <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.ink }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {(openWO.parts || []).length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontFamily: FONT_BODY, fontSize: 10.5, fontWeight: 700, color: C.inkFaint, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 4 }}>Parts</div>
                      {(openWO.parts || []).map(({ partId, qty }) => {
                        const part = data.inventory.find((p) => p.id === partId);
                        return part ? <div key={partId} style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.ink }}>{formatPartNum(part.partNumber)} · {part.name} × {qty}</div> : null;
                      })}
                    </div>
                  )}
                  {openWO.description && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontFamily: FONT_BODY, fontSize: 10.5, fontWeight: 700, color: C.inkFaint, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 4 }}>Description</div>
                      <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.ink }}>{openWO.description}</div>
                    </div>
                  )}
                  {openWO.rootCause && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontFamily: FONT_BODY, fontSize: 10.5, fontWeight: 700, color: C.inkFaint, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 4 }}>Root cause</div>
                      <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.ink }}>{openWO.rootCause}</div>
                    </div>
                  )}
                  {openWO.notes && (
                    <div>
                      <div style={{ fontFamily: FONT_BODY, fontSize: 10.5, fontWeight: 700, color: C.inkFaint, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 4 }}>Notes / checklist</div>
                      <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.ink }}>{openWO.notes}</div>
                    </div>
                  )}
                  {(openWO.photos || []).length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontFamily: FONT_BODY, fontSize: 10.5, fontWeight: 700, color: C.inkFaint, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 4 }}>Photos</div>
                      <AttachmentThumbs ids={openWO.photos} />
                    </div>
                  )}
                </div>
              )}

              {openWO.type === "PM" && (openWO.checklist || []).length > 0 && (
                <ChecklistRunner steps={openWO.checklist} onUpdateStep={updateChecklistStep} readOnly={!canWrite(role)} />
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {WO_STATUSES.map((s) => (
                    <Btn
                      key={s} small variant={openWO.status === s ? "primary" : "ghost"}
                      disabled={s === "Closed" && !isAdmin(role)}
                      title={s === "Closed" && !isAdmin(role) ? "Only Owners and Managers can close a work order" : undefined}
                      onClick={() => setStatus(s)}
                    >
                      {s}
                    </Btn>
                  ))}
                </div>
                {planRole(role) && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <Btn small onClick={saveDetail}>Save changes</Btn>
                    <Btn small variant="primary" onClick={() => { if (saveDetail()) setOpenId(null); }}>Save & Close</Btn>
                  </div>
                )}
              </div>

              {(isDoneStatus(openWO.status) || (openWO.comments || []).length > 0) && (
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.lineSoft}` }}>
                  <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 8 }}>Comments<InfoTip k="comments" /></div>
                  {(openWO.comments || []).length === 0 && <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.inkFaint, marginBottom: 8 }}>No comments yet.</div>}
                  {(openWO.comments || []).map((c) => (
                    <div key={c.id} style={{ padding: "6px 0", borderTop: `1px solid ${C.lineSoft}` }}>
                      <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: C.inkFaint }}>{c.author} · {fmtDate(c.date)}</div>
                      <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.ink }}>{c.text}</div>
                    </div>
                  ))}
                  {canWrite(role) && (
                    <div style={{ marginTop: 8 }}>
                      <textarea style={{ ...inputStyle, minHeight: 50 }} placeholder="How did it go? Anything to improve next time?" value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} />
                      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
                        <Btn small onClick={addComment}>Add comment</Btn>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {planRole(role) && (openWO.type === "Benchmark" || openWO.type === "Corrective") && (
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.lineSoft}`, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {openWO.sourceBenchmarkId ? (
                    <Btn small variant="ghost" onClick={updateBenchmarkFromWO}>Update benchmark with this run</Btn>
                  ) : (
                    <Btn small variant="ghost" onClick={saveAsNewBenchmark}>Save as new benchmark</Btn>
                  )}
                </div>
              )}

              {openWO.sourcePmBaseId && (
                <div style={{ marginTop: 12, fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint }}>
                  Generated from PM Base {formatWoNum((data.workOrders.find((w) => w.id === openWO.sourcePmBaseId) || {}).number)}.{" "}
                  {(data.workOrders.find((w) => w.id === openWO.sourcePmBaseId) || {}).triggerType === "meter"
                    ? "Completing this rolls the meter baseline forward — the next occurrence is generated once the asset's reading crosses the interval again."
                    : "Completing this will automatically generate the next occurrence."}
                </div>
              )}
            </>
          )}

          {canDelete(role, openWO, currentUser) && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.lineSoft}` }}>
              <Btn small variant="danger" onClick={deleteWO}><Trash2 size={12} /> Delete this work order</Btn>
            </div>
          )}
        </Modal>
      )}

      {showArchive && <ArchiveModal data={data} onClose={() => setShowArchive(false)} goToOrder={(id) => { setShowArchive(false); setOpenId(id); }} />}
    </div>
  );
}

/* ============================================================
   VENDORS
============================================================ */
function VendorsView({ data, update, role, currentUser }) {
  const dialog = useDialog();
  const closeGuard = useCloseGuard(dialog);
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");
  const blank = { name: "", specialty: "", contact: "", link: "", notes: "" };
  const [form, setForm] = useState(blank);
  const initial = useRef(null);
  const isDirty = modal && JSON.stringify(form) !== initial.current;
  const pre = usePrefill("vendor", setForm, { name: "name", description: "notes", link: "link" });

  const openAdd = () => { pre.reset(); setForm(blank); initial.current = JSON.stringify(blank); setModal("add"); };
  const openEdit = (v) => { pre.reset(); const f = { ...v }; setForm(f); initial.current = JSON.stringify(f); setModal(v.id); };
  const save = () => {
    if (!form.name.trim()) return;
    if (modal === "add") {
      update((d) => { d.vendors.push({ id: uid("v"), ...form, name: form.name.trim(), createdBy: currentUser }); return d; });
    } else {
      const id = modal;
      update((d) => { Object.assign(d.vendors.find((v) => v.id === id), form, { name: form.name.trim() }); return d; });
    }
    setModal(null);
  };
  const remove = async (v) => {
    const ok = await dialog.confirm(`Remove ${v.name}?`);
    if (!ok) return;
    update((d) => { d.vendors = d.vendors.filter((x) => x.id !== v.id); return d; });
  };

  const searchLower = search.trim().toLowerCase();
  const visible = data.vendors.filter((v) => !searchLower || [v.name, v.specialty, v.contact].filter(Boolean).join(" ").toLowerCase().includes(searchLower));
  const editingVendor = modal && modal !== "add" ? data.vendors.find((v) => v.id === modal) : null;

  return (
    <div>
      <SectionHeader
        title="Vendors & Service Providers"
        subtitle="The contractors and service providers you actually call on."
        info={PAGE_INFO.vendors}
        action={planRole(role) && <Btn variant="primary" onClick={openAdd}><Plus size={15} /> Add vendor</Btn>}
      />
      <div style={{ position: "relative", maxWidth: 340, marginBottom: 12 }}>
        <Search size={14} color={C.inkFaint} style={{ position: "absolute", left: 10, top: 10, pointerEvents: "none" }} />
        <input style={{ ...inputStyle, paddingLeft: 30 }} placeholder="Search by name, specialty, or contact…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <Panel>
        {visible.length === 0 && <Empty text="No matching vendors." />}
        {visible.map((v) => (
          <div key={v.id} className="hk-row" style={{ display: "flex", justifyContent: "space-between", padding: "12px 18px", borderTop: `1px solid ${C.lineSoft}` }}>
            <div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 13.5, fontWeight: 700, color: C.ink }}>{v.name}</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.inkFaint }}>{v.specialty} · {v.contact}</div>
              {v.notes && <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.inkSoft, marginTop: 2 }}>{v.notes}</div>}
              {v.link && <div style={{ marginTop: 6 }}><LinkButton url={v.link} small /></div>}
            </div>
            {planRole(role) && (
              <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                <button onClick={() => openEdit(v)} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkSoft }}><Pencil size={14} /></button>
                {canDelete(role, v, currentUser) && <button onClick={() => remove(v)} style={{ background: "none", border: "none", cursor: "pointer", color: C.rust }}><Trash2 size={14} /></button>}
              </div>
            )}
          </div>
        ))}
      </Panel>
      {modal && (
        <Modal title={modal === "add" ? "Add vendor" : "Edit vendor"} info="vendor" onClose={() => closeGuard(isDirty, save, () => setModal(null))}>
          {canWrite(role) && <PrefillBar p={pre} form={form} />}
          <Field label="Name" required><PrefillInput p={pre} field="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Specialty"><input style={inputStyle} value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} /></Field>
          <Field label="Contact"><input style={inputStyle} value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></Field>
          <Field label="Web link">
            <div style={{ display: "flex", gap: 6 }}>
              <PrefillInput p={pre} field="link" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://…" />
              <LinkButton url={form.link} small />
            </div>
          </Field>
          <Field label="Notes"><PrefillInput p={pre} field="notes" multiline style={{ minHeight: 60 }} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            {editingVendor && canDelete(role, editingVendor, currentUser) ? (
              <Btn variant="danger" onClick={() => { remove(editingVendor); setModal(null); }}><Trash2 size={13} /> Delete</Btn>
            ) : <span />}
            <div style={{ display: "flex", gap: 8 }}>
              <Btn variant="ghost" onClick={() => closeGuard(isDirty, save, () => setModal(null))}>Cancel</Btn>
              <Btn variant="primary" onClick={save}>Save</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ============================================================
   PARTS CATALOGUE
============================================================ */
function PartsView({ data, update, role, currentUser }) {
  const [editing, setEditing] = useState(null); // "new" | part object
  const [search, setSearch] = useState("");

  const adjust = (item, delta, e) => {
    e.stopPropagation();
    update((d) => {
      const it = d.inventory.find((i) => i.id === item.id);
      it.qty = Math.max(0, it.qty + delta);
      return d;
    });
  };

  const searchLower = search.trim().toLowerCase();
  const visible = data.inventory.filter((item) => {
    if (!searchLower) return true;
    const hay = [formatPartNum(item.partNumber), item.name, item.manufacturer, item.manufacturerPartNumber].filter(Boolean).join(" ").toLowerCase();
    return hay.includes(searchLower);
  });

  return (
    <div>
      <SectionHeader
        title="Parts Catalogue"
        subtitle="Every spare part and consumable kept on hand, and what it belongs to."
        info={PAGE_INFO.parts}
        action={planRole(role) && <Btn variant="primary" onClick={() => setEditing("new")}><Plus size={15} /> Add part</Btn>}
      />
      <div style={{ position: "relative", maxWidth: 340, marginBottom: 14 }}>
        <Search size={14} color={C.inkFaint} style={{ position: "absolute", left: 10, top: 10, pointerEvents: "none" }} />
        <input style={{ ...inputStyle, paddingLeft: 30 }} placeholder="Search by part #, name, or manufacturer…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
        {visible.length === 0 && <Empty text="No matching parts." />}
        {visible.map((item) => {
          const low = item.qty <= item.reorderAt;
          return (
            <Panel key={item.id} style={{ padding: 14 }}>
              <div onClick={() => canWrite(role) && setEditing(item)} style={{ cursor: canWrite(role) ? "pointer" : "default" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, color: C.ink }}>{formatPartNum(item.partNumber)} · {item.name}</span>
                  {low && <Tag text="Reorder" color={C.rust} soft={C.rustSoft} />}
                </div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint, marginTop: 3 }}>
                  {item.assetId ? nameOf(data.assets, item.assetId) : "—"}{item.bomNodeId ? ` · ${nameOf(data.bomNodes, item.bomNodeId)}` : ""}
                </div>
                {item.manufacturer && <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint }}>{item.manufacturer}{item.manufacturerPartNumber ? ` · #${item.manufacturerPartNumber}` : ""}</div>}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button onClick={(e) => adjust(item, -1, e)} disabled={!canWrite(role)} style={{ border: `1px solid ${C.line}`, background: C.panel, width: 24, height: 24, borderRadius: 3, cursor: canWrite(role) ? "pointer" : "not-allowed", opacity: canWrite(role) ? 1 : 0.4 }}>−</button>
                  <span style={{ fontFamily: FONT_BODY, fontWeight: 700, fontSize: 13, width: 20, textAlign: "center" }}>{item.qty}</span>
                  <button onClick={(e) => adjust(item, 1, e)} disabled={!canWrite(role)} style={{ border: `1px solid ${C.line}`, background: C.panel, width: 24, height: 24, borderRadius: 3, cursor: canWrite(role) ? "pointer" : "not-allowed", opacity: canWrite(role) ? 1 : 0.4 }}>+</button>
                </div>
                {item.cost && <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.inkFaint }}>${item.cost}</span>}
              </div>
              {item.link && <div style={{ marginTop: 8 }} onClick={(e) => e.stopPropagation()}><LinkButton url={item.link} small /></div>}
            </Panel>
          );
        })}
      </div>
      {editing && (
        <PartEditModal
          data={data} update={update} part={editing === "new" ? null : editing} currentUser={currentUser} role={role}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

/* ============================================================
   BUDGET
============================================================ */
function BudgetView({ data }) {
  const completed = data.workOrders.filter((w) => w.cost && !isNaN(Number(w.cost)));
  const total = completed.reduce((s, w) => s + Number(w.cost), 0);
  const byCategory = {};
  completed.forEach((w) => {
    const cat = (data.assets.find((a) => a.id === w.assetId) || {}).category || "General";
    byCategory[cat] = (byCategory[cat] || 0) + Number(w.cost);
  });
  const max = Math.max(1, ...Object.values(byCategory));

  return (
    <div>
      <SectionHeader title="Budget & Cost Tracking" subtitle="What upkeep is actually costing, broken down by category." info={PAGE_INFO.budget} />
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <Panel style={{ padding: 18, flex: 1 }}>
          <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, fontWeight: 600, color: C.inkSoft }}>TOTAL LOGGED SPEND</div>
          <div style={{ fontFamily: FONT_HEAD, fontSize: 32, fontWeight: 700, color: C.ink }}>${total.toFixed(0)}</div>
        </Panel>
        <Panel style={{ padding: 18, flex: 1 }}>
          <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, fontWeight: 600, color: C.inkSoft }}>WORK ORDERS WITH COST LOGGED</div>
          <div style={{ fontFamily: FONT_HEAD, fontSize: 32, fontWeight: 700, color: C.ink }}>{completed.length}</div>
        </Panel>
      </div>
      <Panel style={{ padding: 18 }}>
        <div style={{ fontFamily: FONT_HEAD, fontSize: 14, fontWeight: 600, marginBottom: 12, color: C.ink }}>Spend by category<InfoTip k="spend" /></div>
        {Object.keys(byCategory).length === 0 && <Empty text="No costs logged yet." />}
        {Object.entries(byCategory).map(([cat, amt]) => (
          <div key={cat} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: FONT_BODY, fontSize: 12.5, color: C.ink, marginBottom: 3 }}>
              <span>{cat}</span><span>${amt.toFixed(0)}</span>
            </div>
            <div style={{ background: C.panelAlt, height: 8, borderRadius: 4 }}>
              <div style={{ width: `${(amt / max) * 100}%`, background: C.orange, height: 8, borderRadius: 4 }} />
            </div>
          </div>
        ))}
      </Panel>
    </div>
  );
}

/* ============================================================
   SCHEDULE
============================================================ */
function ScheduleView({ data, role, currentUserId, goToOrder }) {
  const [locFilter, setLocFilter] = useState(null);
  const [executorFilter, setExecutorFilter] = useState(role === "Executor" ? currentUserId : "");
  const [users, setUsers] = useState([]);
  const [cursor, setCursor] = useState(() => { const t = new Date(); return { year: t.getFullYear(), month: t.getMonth() }; });

  useEffect(() => { api.listUsers().then(setUsers).catch(() => setUsers([])); }, []);
  const assignableUsers = users.filter(isExecPerson);

  const firstOfMonth = new Date(cursor.year, cursor.month, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;

  const allowedLocs = locFilter ? descendantIds(data.locations, locFilter) : null;
  const eventsByDay = {};
  data.workOrders.forEach((w) => {
    if (w.type === "PM Base" || !w.scheduledDate) return;
    if (allowedLocs && !allowedLocs.has(w.locationId)) return;
    if (executorFilter && !execIdsOf(w).includes(executorFilter)) return;
    const d = new Date(w.scheduledDate + "T00:00:00");
    if (d.getFullYear() === cursor.year && d.getMonth() === cursor.month) {
      const day = d.getDate();
      (eventsByDay[day] = eventsByDay[day] || []).push(w);
    }
  });

  const goPrev = () => setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }));
  const goNext = () => setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }));
  const goToday = () => { const t = new Date(); setCursor({ year: t.getFullYear(), month: t.getMonth() }); };
  const todayStr = todayISO();

  return (
    <div>
      <SectionHeader
        title="Schedule"
        subtitle="When maintenance work is planned to happen."
        info={PAGE_INFO.schedule}
        action={
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <select style={{ ...inputStyle, width: "auto" }} value={executorFilter} onChange={(e) => setExecutorFilter(e.target.value)}>
              <option value="">All executors</option>
              {assignableUsers.map((u) => <option key={u.id} value={u.id}>{u.username}{u.id === currentUserId ? " (me)" : ""}</option>)}
            </select>
            <Btn small variant="ghost" onClick={goPrev}><ChevronLeft size={14} /></Btn>
            <span style={{ fontFamily: FONT_HEAD, fontSize: 14, fontWeight: 600, color: C.ink, minWidth: 150, textAlign: "center", display: "inline-block" }}>{MONTH_NAMES[cursor.month]} {cursor.year}</span>
            <Btn small variant="ghost" onClick={goNext}><ChevronRight size={14} /></Btn>
            <Btn small variant="ghost" onClick={goToday}>Today</Btn>
          </div>
        }
      />
      <div className="hk-grid-fixed2" style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 16 }}>
        <LocationNavTree data={data} selectedId={locFilter} onSelect={setLocFilter} />
        <Panel style={{ padding: 10 }}>
          <div className="hk-hscroll" data-hscroll="schedule"><div className="hk-hscroll-in">
          <div className="hk-cal-grid" style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 4, marginBottom: 4 }}>
            {WEEKDAY_LABELS.map((w) => <div key={w} style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: C.inkFaint, textAlign: "center", padding: "4px 0" }}>{w}</div>)}
          </div>
          <div className="hk-cal-grid" style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 4 }}>
            {Array.from({ length: totalCells }).map((_, i) => {
              const dayNum = i - startWeekday + 1;
              const inMonth = dayNum >= 1 && dayNum <= daysInMonth;
              const dateStr = inMonth ? `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}` : null;
              const isToday = dateStr === todayStr;
              const dayEvents = inMonth ? (eventsByDay[dayNum] || []) : [];
              return (
                <div key={i} style={{ minHeight: 92, border: `1px solid ${C.lineSoft}`, borderRadius: 3, padding: 5, background: inMonth ? (isToday ? C.orangeSoft : C.panel) : C.panelAlt, opacity: inMonth ? 1 : 0.5 }}>
                  {inMonth && (
                    <>
                      <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: isToday ? 700 : 600, color: isToday ? C.orange : C.inkFaint, marginBottom: 3 }}>{dayNum}</div>
                      {dayEvents.slice(0, 3).map((w) => (
                        <div key={w.id} onClick={() => goToOrder(w.id)} title={`${formatWoNum(w.number)} ${w.title}`} style={{ fontFamily: FONT_BODY, fontSize: 10.5, fontWeight: 600, color: "#fff", background: WO_TYPE_COLORS[w.type], borderRadius: 2, padding: "2px 4px", marginBottom: 2, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {formatWoNum(w.number)} {w.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && <div style={{ fontFamily: FONT_BODY, fontSize: 10, color: C.inkFaint }}>+{dayEvents.length - 3} more</div>}
                    </>
                  )}
                </div>
              );
            })}
          </div>
          </div></div>
        </Panel>
      </div>
    </div>
  );
}

/* ============================================================
   BACKUP
============================================================ */
const SHEET_SPECS = [
  {
    key: "locations", sheetName: "Locations", idPrefix: "loc",
    toRow: (l) => ({ id: l.id, name: l.name, level: levelLabel(l.level), parentId: l.parentId || "", address: l.address || "", yearBuilt: l.yearBuilt || "", climateZone: l.climateZone || "", pmWizardRunAt: l.pmWizardRunAt || "", createdBy: l.createdBy || "" }),
    fromRow: (r) => ({ id: r.id, name: String(r.name || ""), level: levelKeyFromLabel(r.level) || "Room", parentId: r.parentId ? String(r.parentId) : null, address: String(r.address || ""), yearBuilt: String(r.yearBuilt || ""), climateZone: String(r.climateZone || ""), pmWizardRunAt: String(r.pmWizardRunAt || ""), createdBy: r.createdBy || null }),
  },
  {
    key: "assets", sheetName: "Assets", idPrefix: "a",
    toRow: (a) => ({ id: a.id, name: a.name, category: a.category || "", locationId: a.locationId || "", manufacturer: a.manufacturer || "", model: a.model || "", serial: a.serial || "", purchaseDate: a.purchaseDate || "", warrantyEnd: a.warrantyEnd || "", manualUrl: a.manualUrl || "", isMajor: a.isMajor ? "yes" : "", meterUnit: a.meterUnit || "", currentMeterValue: a.currentMeterValue || "", meterUpdatedDate: a.meterUpdatedDate || "", notes: a.notes || "", archived: a.archived ? "yes" : "", createdBy: a.createdBy || "" }),
    fromRow: (r) => ({ id: r.id, archived: String(r.archived || "").toLowerCase() === "yes" ? true : undefined, name: String(r.name || ""), category: String(r.category || ""), locationId: r.locationId ? String(r.locationId) : "", manufacturer: String(r.manufacturer || ""), model: String(r.model || ""), serial: String(r.serial || ""), purchaseDate: String(r.purchaseDate || ""), warrantyEnd: String(r.warrantyEnd || ""), manualUrl: String(r.manualUrl || ""), isMajor: String(r.isMajor || "").toLowerCase() === "yes", meterUnit: String(r.meterUnit || ""), currentMeterValue: r.currentMeterValue !== "" && r.currentMeterValue != null ? Number(r.currentMeterValue) : "", meterUpdatedDate: String(r.meterUpdatedDate || ""), notes: String(r.notes || ""), createdBy: r.createdBy || null }),
  },
  {
    key: "bomNodes", sheetName: "BOM Nodes", idPrefix: "bom",
    toRow: (n) => ({ id: n.id, assetId: n.assetId || "", parentId: n.parentId || "", name: n.name, level: n.level, manufacturer: n.manufacturer || "", model: n.model || "", installDate: n.installDate || "", cost: n.cost || "", notes: n.notes || "" }),
    fromRow: (r) => ({ id: r.id, assetId: r.assetId ? String(r.assetId) : "", parentId: r.parentId ? String(r.parentId) : null, name: String(r.name || ""), level: String(r.level || "Component"), manufacturer: String(r.manufacturer || ""), model: String(r.model || ""), installDate: String(r.installDate || ""), cost: String(r.cost || ""), notes: String(r.notes || "") }),
  },
  {
    key: "pmTemplates", sheetName: "PM Templates", idPrefix: "pm",
    toRow: (p) => ({ id: p.id, assetId: p.assetId || "", bomNodeId: p.bomNodeId || "", title: p.title, freqType: p.freqType || "", interval: p.interval || "", unit: p.unit || "", nextDue: p.nextDue || "", estCost: p.estCost || "", notes: p.notes || "" }),
    fromRow: (r) => ({ id: r.id, assetId: r.assetId ? String(r.assetId) : "", bomNodeId: r.bomNodeId ? String(r.bomNodeId) : null, title: String(r.title || ""), freqType: String(r.freqType || "Time-based"), interval: String(r.interval || ""), unit: String(r.unit || ""), nextDue: String(r.nextDue || ""), estCost: String(r.estCost || ""), notes: String(r.notes || "") }),
  },
  {
    key: "workRequests", sheetName: "Work Requests", idPrefix: "wr",
    toRow: (w) => ({ id: w.id, number: w.number || "", title: w.title, description: w.description || "", assetId: w.assetId || "", bomNodeId: w.bomNodeId || "", locationId: w.locationId || "", requestedBy: w.requestedBy || "", dateSubmitted: w.dateSubmitted || "", requiredByDate: w.requiredByDate || "", priority: w.priority || "", suggestedType: w.suggestedType || "", suggestedParts: serializePartsList(w.suggestedParts), status: w.status || "", reviewNote: w.reviewNote || "", workOrderId: w.workOrderId || "", photos: (w.photos || []).join(","), createdBy: w.createdBy || "" }),
    fromRow: (r) => ({ id: r.id, number: r.number ? Number(r.number) : undefined, title: String(r.title || ""), description: String(r.description || ""), assetId: r.assetId ? String(r.assetId) : null, bomNodeId: r.bomNodeId ? String(r.bomNodeId) : null, locationId: r.locationId ? String(r.locationId) : "", requestedBy: String(r.requestedBy || ""), dateSubmitted: String(r.dateSubmitted || ""), requiredByDate: String(r.requiredByDate || ""), priority: String(r.priority || "Medium"), suggestedType: String(r.suggestedType || "Corrective"), suggestedParts: deserializePartsList(r.suggestedParts), status: String(r.status || "Submitted"), reviewNote: String(r.reviewNote || ""), workOrderId: r.workOrderId ? String(r.workOrderId) : null, photos: String(r.photos || "").split(",").map((s) => s.trim()).filter(Boolean), createdBy: r.createdBy || null }),
  },
  {
    key: "workOrders", sheetName: "Work Orders", idPrefix: "wo",
    toRow: (w) => ({
      id: w.id, number: w.number || "", title: w.title, type: w.type, status: w.status,
      assetId: w.assetId || "", bomNodeId: w.bomNodeId || "", locationId: w.locationId || "",
      description: w.description || "",
      sourceRequestId: w.sourceRequestId || "", sourceBenchmarkId: w.sourceBenchmarkId || "", sourcePmBaseId: w.sourcePmBaseId || "",
      sourceFixedDateMonth: w.sourceFixedDate ? w.sourceFixedDate.month : "",
      sourceFixedDateDay: w.sourceFixedDate ? w.sourceFixedDate.day : "",
      pmMode: w.pmMode || "", frequencyValue: w.frequencyValue || "", frequencyUnit: w.frequencyUnit || "",
      fixedDates: (w.fixedDates || []).map((f) => `${String(f.month).padStart(2, "0")}-${String(f.day).padStart(2, "0")}`).join(", "),
      priority: w.priority || "", executorId: w.executorId || "", parts: serializePartsList(w.parts),
      scheduledDate: w.scheduledDate || "", requiredByDate: w.requiredByDate || "", completedDate: w.completedDate || "", verifiedDate: w.verifiedDate || "", createdDate: w.createdDate || "",
      cost: w.cost || "", vendorId: w.vendorId || "", notes: w.notes || "", createdBy: w.createdBy || "",
      failureCode: w.failureCode || "", rootCause: w.rootCause || "",
      triggerType: w.triggerType || "", meterIntervalValue: w.meterIntervalValue || "", meterBaselineValue: w.meterBaselineValue || "",
      seasonalAnchor: w.seasonalAnchor || "", seasonalOffsetDays: w.seasonalOffsetDays || "",
      meterValueAtGeneration: w.meterValueAtGeneration != null ? w.meterValueAtGeneration : "",
      checklistTemplate: (w.checklistTemplate && w.checklistTemplate.length) ? JSON.stringify(w.checklistTemplate) : "",
      checklist: (w.checklist && w.checklist.length) ? JSON.stringify(w.checklist) : "",
      photos: (w.photos || []).join(","),
      // v2.2: previously missing from the export, so a restore lost every
      // comment and reset the parts-deducted flag (risking double deduction).
      comments: (w.comments && w.comments.length) ? JSON.stringify(w.comments) : "",
      partsDeducted: w.partsDeducted ? "yes" : "",
      standby: w.standby ? "yes" : "",
      standbyWindow: w.standbyWindow && w.standbyWindow.enabled ? JSON.stringify(w.standbyWindow) : "",
      standbyNow: w.standbyNow ? "yes" : "",
      // v2.4
      estHours: w.estHours || "", crewRequired: w.crewRequired || "", executorIds: (w.executorIds || []).join(","),
      startTimes: w.startTimes && Object.keys(w.startTimes).length ? JSON.stringify(w.startTimes) : "",
      timeEntries: (w.timeEntries && w.timeEntries.length) ? JSON.stringify(w.timeEntries) : "",
    }),
    fromRow: (r) => {
      const fixedDates = String(r.fixedDates || "").split(",").map((s) => s.trim()).filter(Boolean).map((tok) => {
        const parts = tok.split("-").map(Number);
        return { month: parts[0], day: parts[1] };
      });
      const sourceFixedDate = (r.sourceFixedDateMonth && r.sourceFixedDateDay) ? { month: Number(r.sourceFixedDateMonth), day: Number(r.sourceFixedDateDay) } : null;
      return {
        id: r.id, number: r.number ? Number(r.number) : undefined, title: String(r.title || ""), type: String(r.type || "Unplanned"), status: LEGACY_STATUS_MAP[String(r.status || "").trim()] || String(r.status || "").trim() || "Active",
        assetId: r.assetId ? String(r.assetId) : null, bomNodeId: r.bomNodeId ? String(r.bomNodeId) : null, locationId: r.locationId ? String(r.locationId) : "",
        description: String(r.description || ""),
        sourceRequestId: r.sourceRequestId ? String(r.sourceRequestId) : null,
        sourceBenchmarkId: r.sourceBenchmarkId ? String(r.sourceBenchmarkId) : null,
        sourcePmBaseId: r.sourcePmBaseId ? String(r.sourcePmBaseId) : null,
        sourceFixedDate,
        pmMode: r.pmMode || undefined,
        frequencyValue: r.frequencyValue ? Number(r.frequencyValue) : undefined,
        frequencyUnit: r.frequencyUnit || undefined,
        fixedDates: fixedDates.length ? fixedDates : undefined,
        priority: String(r.priority || "Medium"), executorId: r.executorId ? String(r.executorId) : "",
        parts: deserializePartsList(r.parts),
        scheduledDate: String(r.scheduledDate || ""), requiredByDate: String(r.requiredByDate || ""), completedDate: r.completedDate ? String(r.completedDate) : null, verifiedDate: r.verifiedDate ? String(r.verifiedDate) : null, createdDate: r.createdDate ? String(r.createdDate) : undefined,
        cost: r.cost !== "" && r.cost != null ? String(r.cost) : "", vendorId: r.vendorId ? String(r.vendorId) : null, notes: String(r.notes || ""), createdBy: r.createdBy || null,
        failureCode: String(r.failureCode || ""), rootCause: String(r.rootCause || ""),
        triggerType: r.triggerType || undefined,
        meterIntervalValue: r.meterIntervalValue !== "" && r.meterIntervalValue != null ? Number(r.meterIntervalValue) : undefined,
        meterBaselineValue: r.meterBaselineValue !== "" && r.meterBaselineValue != null ? Number(r.meterBaselineValue) : undefined,
        seasonalAnchor: r.seasonalAnchor || undefined,
        seasonalOffsetDays: r.seasonalOffsetDays !== "" && r.seasonalOffsetDays != null ? Number(r.seasonalOffsetDays) : undefined,
        meterValueAtGeneration: r.meterValueAtGeneration !== "" && r.meterValueAtGeneration != null ? Number(r.meterValueAtGeneration) : null,
        checklistTemplate: (() => { try { return r.checklistTemplate ? JSON.parse(r.checklistTemplate) : undefined; } catch { return undefined; } })(),
        checklist: (() => { try { return r.checklist ? JSON.parse(r.checklist) : undefined; } catch { return undefined; } })(),
        photos: String(r.photos || "").split(",").map((s) => s.trim()).filter(Boolean),
        comments: (() => { try { const c = r.comments ? JSON.parse(r.comments) : []; return Array.isArray(c) ? c : []; } catch { return []; } })(),
        partsDeducted: String(r.partsDeducted || "").toLowerCase() === "yes",
        standby: String(r.standby || "").toLowerCase() === "yes",
        standbyWindow: (() => { try { return r.standbyWindow ? JSON.parse(r.standbyWindow) : null; } catch { return null; } })(),
        standbyNow: String(r.standbyNow || "").toLowerCase() === "yes",
        estHours: r.estHours !== "" && r.estHours != null ? String(r.estHours) : "", crewRequired: r.crewRequired !== "" && r.crewRequired != null ? String(r.crewRequired) : "",
        executorIds: String(r.executorIds || "").split(",").map((x) => x.trim()).filter(Boolean),
        startTimes: (() => { try { return r.startTimes ? JSON.parse(r.startTimes) : {}; } catch { return {}; } })(),
        timeEntries: (() => { try { const c = r.timeEntries ? JSON.parse(r.timeEntries) : []; return Array.isArray(c) ? c : []; } catch { return []; } })(),
      };
    },
  },
  {
    key: "benchmarks", sheetName: "Benchmarks", idPrefix: "bm",
    toRow: (b) => ({ id: b.id, title: b.title, checklist: b.checklist || "", estCost: b.estCost || "", estTime: b.estTime || "", notes: b.notes || "", vendorId: b.vendorId || "", version: b.version || 1, createdBy: b.createdBy || "" }),
    fromRow: (r) => ({ id: r.id, title: String(r.title || ""), checklist: String(r.checklist || ""), estCost: String(r.estCost || ""), estTime: String(r.estTime || ""), notes: String(r.notes || ""), vendorId: r.vendorId ? String(r.vendorId) : null, version: r.version ? Number(r.version) : 1, createdBy: r.createdBy || null }),
  },
  {
    key: "vendors", sheetName: "Vendors", idPrefix: "v",
    toRow: (v) => ({ id: v.id, name: v.name, specialty: v.specialty || "", contact: v.contact || "", link: v.link || "", notes: v.notes || "", createdBy: v.createdBy || "" }),
    fromRow: (r) => ({ id: r.id, name: String(r.name || ""), specialty: String(r.specialty || ""), contact: String(r.contact || ""), link: String(r.link || ""), notes: String(r.notes || ""), createdBy: r.createdBy || null }),
  },
  {
    key: "inventory", sheetName: "Parts", idPrefix: "inv",
    toRow: (i) => ({ id: i.id, partNumber: i.partNumber || "", name: i.name, description: i.description || "", manufacturer: i.manufacturer || "", manufacturerPartNumber: i.manufacturerPartNumber || "", cost: i.cost || "", link: i.link || "", vendorId: i.vendorId || "", assetId: i.assetId || "", bomNodeId: i.bomNodeId || "", qty: i.qty, reorderAt: i.reorderAt, createdBy: i.createdBy || "" }),
    fromRow: (r) => ({ id: r.id, partNumber: r.partNumber ? Number(r.partNumber) : undefined, name: String(r.name || ""), description: String(r.description || ""), manufacturer: String(r.manufacturer || ""), manufacturerPartNumber: String(r.manufacturerPartNumber || ""), cost: String(r.cost || ""), link: String(r.link || ""), vendorId: r.vendorId ? String(r.vendorId) : "", assetId: r.assetId ? String(r.assetId) : null, bomNodeId: r.bomNodeId ? String(r.bomNodeId) : null, qty: Number(r.qty) || 0, reorderAt: Number(r.reorderAt) || 0, createdBy: r.createdBy || null }),
  },
  {
    // v1.8: the PM Wizard's starter-catalogue templates, now editable in
    // Owner Tools (see PmWizardCatalogEditor). "zones" is either the literal
    // "all" or a comma-separated list of CLIMATE_ZONES values — an item
    // only shows in the wizard when it applies to the property's climate
    // zone. This sheet round-trips even when data.pmWizardCatalog is
    // absent (an export of a pre-v1.8 or never-customized deployment) —
    // importing that file back in just leaves the field unset, which
    // falls back to the built-in default catalogue (see
    // effectiveWizardCatalog above).
    key: "pmWizardCatalog", sheetName: "PM Wizard Catalog", idPrefix: "wc",
    toRow: (w) => ({ id: w.id, type: w.type || "", category: w.category || "", title: w.title, description: w.description || "", frequencyValue: w.frequencyValue || "", frequencyUnit: w.frequencyUnit || "months", crewRequired: w.crewRequired || "", estHours: w.estHours || "", zones: w.zones === "all" ? "all" : (w.zones || []).join(", ") }),
    fromRow: (r) => {
      const zonesRaw = String(r.zones || "").trim();
      const zones = (!zonesRaw || zonesRaw.toLowerCase() === "all") ? "all" : zonesRaw.split(",").map((s) => s.trim()).filter(Boolean);
      return {
        id: r.id, type: String(r.type || "").trim() || undefined, category: String(r.category || "").trim() || undefined, title: String(r.title || ""), description: String(r.description || ""),
        frequencyValue: r.frequencyValue !== "" && r.frequencyValue != null ? Number(r.frequencyValue) : 3,
        frequencyUnit: String(r.frequencyUnit || "months"), zones,
        crewRequired: r.crewRequired !== "" && r.crewRequired != null ? Number(r.crewRequired) : undefined,
        estHours: r.estHours !== "" && r.estHours != null ? Number(r.estHours) : undefined,
      };
    },
  },
  {
    // v2.2: parts added by hand on the Purchasing screen.
    key: "purchaseList", sheetName: "Purchase List", idPrefix: "pl",
    toRow: (p) => ({ id: p.id, partId: p.partId || "", name: p.name || "", qty: p.qty || "", note: p.note || "", addedBy: p.addedBy || "", date: p.date || "" }),
    fromRow: (r) => ({ id: r.id, partId: r.partId ? String(r.partId) : null, name: String(r.name || ""), qty: Number(r.qty) || 1, note: String(r.note || ""), addedBy: String(r.addedBy || ""), date: String(r.date || "") }),
  },
  {
    // v2.4: scheduled shifts, shift templates and executor colours.
    key: "workShifts", sheetName: "Work Shifts", idPrefix: "sh",
    toRow: (s) => ({ id: s.id, executorId: s.executorId || "", date: s.date || "", start: s.start || "", end: s.end || "" }),
    fromRow: (r) => ({ id: r.id, executorId: String(r.executorId || ""), date: String(r.date || ""), start: String(r.start || ""), end: String(r.end || "") }),
  },
  {
    key: "shiftTemplates", sheetName: "Shift Templates", idPrefix: "tpl",
    toRow: (t) => ({ id: t.id, name: t.name || "", kind: t.kind || "daily", shift: t.shift ? JSON.stringify(t.shift) : "", days: t.days ? JSON.stringify(t.days) : "" }),
    fromRow: (r) => {
      const j = (v, dflt) => { try { return v ? JSON.parse(v) : dflt; } catch { return dflt; } };
      const kind = String(r.kind || "daily") === "weekly" ? "weekly" : "daily";
      return kind === "weekly" ? { id: r.id, name: String(r.name || ""), kind, days: j(r.days, []) } : { id: r.id, name: String(r.name || ""), kind, shift: j(r.shift, {}) };
    },
  },
  {
    key: "executorColors", sheetName: "Executor Colours", idPrefix: "ec",
    fromData: (d) => Object.entries(d.executorColors || {}).map(([id, colour]) => ({ id, colour })),
    toData: (list) => Object.fromEntries(list.filter((x) => /^#[0-9a-fA-F]{6}$/.test(x.colour || "")).map((x) => [x.id, x.colour])),
    toRow: (c) => ({ id: c.id, colour: c.colour || "" }),
    fromRow: (r) => ({ id: String(r.id || ""), colour: String(r.colour || "") }),
  },
];

/* ---- Backup / restore helpers (v2.2) ---- */
const DATA_TAB_KEYS = SHEET_SPECS.map((sp) => sp.key);
// Required columns per sheet: a file missing one of these can't be imported.
const REQUIRED_COLUMNS = {
  locations: ["name"], assets: ["name"], bomNodes: ["name", "assetId"], pmTemplates: ["title"], workRequests: ["title"],
  workOrders: ["title", "type", "status"], benchmarks: ["title"], vendors: ["name"], inventory: ["name"], pmWizardCatalog: ["title"], purchaseList: ["name"],
};
const DATE_COLUMNS = {
  assets: ["purchaseDate", "warrantyEnd", "meterUpdatedDate"], bomNodes: ["installDate"], pmTemplates: ["nextDue"],
  workRequests: ["dateSubmitted", "requiredByDate"], workOrders: ["scheduledDate", "requiredByDate", "completedDate", "verifiedDate"], purchaseList: ["date"],
};
const NUMBER_COLUMNS = {
  assets: ["currentMeterValue"], inventory: ["qty", "reorderAt", "partNumber"], workOrders: ["number", "frequencyValue", "meterIntervalValue", "meterBaselineValue", "seasonalOffsetDays"],
  workRequests: ["number"], pmWizardCatalog: ["frequencyValue"], purchaseList: ["qty"],
};
const WR_STATUSES = ["Submitted", "Under Review", "Approved", "Declined", "Merged"];
const SERVER_TABS = [
  { key: "users", sheetName: "Users", label: "Users" },
  { key: "alarms", sheetName: "Alarms", label: "Alarms" },
  { key: "alarmMappings", sheetName: "Alarm Mappings", label: "Alarm Mappings" },
  { key: "alarmSettings", sheetName: "Alarm Settings", label: "Alarm Settings" },
  { key: "settings", sheetName: "Settings", label: "Settings" },
];
const ALL_TABS = [
  ...SHEET_SPECS.map((sp) => ({ key: sp.key, sheetName: sp.sheetName, label: sp.sheetName, kind: "data" })),
  ...SERVER_TABS.map((t) => ({ ...t, kind: "server" })),
];
const yn = (v) => String(v == null ? "" : v).trim().toLowerCase();
const isYes = (v) => ["yes", "y", "true", "1"].includes(yn(v));

// Excel can turn a typed date into a serial number; accept that and convert back.
function excelSerialToISO(n) {
  const p = XLSX.SSF.parse_date_code(n);
  if (!p) return null;
  return `${String(p.y).padStart(4, "0")}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}
function validISODate(v) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(v + "T00:00:00Z");
  return !isNaN(d) && d.toISOString().slice(0, 10) === v;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function csvCell(v) { const t = String(v == null ? "" : v); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; }

// ---- Settings sheet <-> settings object ----
const SETTINGS_COLOR_KEYS = ["primary", "primaryDark", "accent", "accentDark"];
const LOGO_CHUNK = 30000;
function settingsToRows(cfg, logoDataUrl) {
  const rows = [
    ["brand.name", cfg.brand.name], ["brand.shortName", cfg.brand.shortName], ["brand.tagline", cfg.brand.tagline], ["brand.topBarTitle", cfg.brand.topBarTitle || ""],
    ...SETTINGS_COLOR_KEYS.map((k) => [`color.${k}`, cfg.brand.colors[k]]),
    ["terms.orgNoun", cfg.terms.orgNoun],
    ...cfg.terms.locationLevels.map((l, i) => [`terms.level${i + 1}`, l]),
    ["terms.siteLevel", cfg.terms.siteLevelIndex + 1],
    ["features.homeAssistantAlarms", cfg.features.homeAssistantAlarms ? "yes" : "no"],
    ["features.linkPrefill", cfg.features.linkPrefill === false ? "no" : "yes"],
    ["features.linkPrefillAi", cfg.features.linkPrefillAi ? "yes" : "no"],
  ];
  const m = /^data:([^;]+);base64,(.*)$/s.exec(logoDataUrl || "");
  if (m) {
    rows.push(["logo.mime", m[1]]);
    for (let i = 0, n = 1; i < m[2].length; i += LOGO_CHUNK, n++) rows.push([`logo.chunk${String(n).padStart(3, "0")}`, m[2].slice(i, i + LOGO_CHUNK)]);
  }
  return rows.map(([key, value]) => ({ key, value }));
}
// Returns { values, logoDataUrl, errors[] } — errors are plain strings with the row.
function rowsToSettings(rows) {
  const map = {}; const rowOf = {};
  rows.forEach((r, i) => { const k = String(r.key || "").trim(); if (k) { map[k] = r.value; rowOf[k] = i + 2; } });
  const errors = [];
  const text = (k, label, min, max) => {
    if (!(k in map)) return undefined;
    const v = String(map[k] == null ? "" : map[k]).trim();
    if (v.length < min) errors.push({ row: rowOf[k], column: "value", problem: `${label} is required` });
    else if (v.length > max) errors.push({ row: rowOf[k], column: "value", problem: `${label} must be ${max} characters or fewer` });
    return v;
  };
  const brand = { name: text("brand.name", "Name", 1, 40), shortName: text("brand.shortName", "Short name", 0, 12), tagline: text("brand.tagline", "Tagline", 0, 60), topBarTitle: text("brand.topBarTitle", "Top-bar title", 0, 40), colors: {} };
  SETTINGS_COLOR_KEYS.forEach((c) => {
    const k = `color.${c}`;
    if (!(k in map)) return;
    const v = String(map[k]).trim();
    if (/^#[0-9a-fA-F]{6}$/.test(v)) brand.colors[c] = v;
    else errors.push({ row: rowOf[k], column: "value", problem: `Colour "${c}" must be a hex value like #28415F` });
  });
  const terms = { orgNoun: text("terms.orgNoun", "Word for organization", 1, 20) };
  const levels = [];
  for (let i = 1; i <= 6; i++) {
    const k = `terms.level${i}`;
    if (!(k in map)) { levels.length = 0; break; }
    const v = String(map[k] == null ? "" : map[k]).trim();
    if (!v) errors.push({ row: rowOf[k], column: "value", problem: `Location level ${i} label is required` });
    else if (v.length > 15) errors.push({ row: rowOf[k], column: "value", problem: `Location level ${i} label must be 15 characters or fewer` });
    levels.push(v);
  }
  if (levels.length === 6) {
    const seen = new Set();
    levels.forEach((l, i) => { const t = l.toLowerCase(); if (l && seen.has(t)) errors.push({ row: rowOf[`terms.level${i + 1}`], column: "value", problem: `Location level labels must be different from each other ("${l}" is used twice)` }); seen.add(t); });
    terms.locationLevels = levels;
  }
  if ("terms.siteLevel" in map) {
    const n = Number(map["terms.siteLevel"]);
    if (Number.isInteger(n) && n >= 1 && n <= 6) terms.siteLevelIndex = n - 1;
    else errors.push({ row: rowOf["terms.siteLevel"], column: "value", problem: "Site level must be a number from 1 to 6" });
  }
  const features = {};
  if ("features.homeAssistantAlarms" in map) features.homeAssistantAlarms = isYes(map["features.homeAssistantAlarms"]);
  if ("features.linkPrefill" in map) features.linkPrefill = isYes(map["features.linkPrefill"]);
  if ("features.linkPrefillAi" in map) features.linkPrefillAi = isYes(map["features.linkPrefillAi"]);
  let logoDataUrl;
  const chunkKeys = Object.keys(map).filter((k) => /^logo\.chunk\d+$/.test(k)).sort();
  if (chunkKeys.length && map["logo.mime"]) {
    logoDataUrl = `data:${String(map["logo.mime"]).trim()};base64,${chunkKeys.map((k) => String(map[k])).join("")}`;
    if (!/^data:image\/(png|jpeg|svg\+xml|webp);base64,[A-Za-z0-9+/=]+$/.test(logoDataUrl)) { errors.push({ row: rowOf["logo.mime"], column: "value", problem: "The embedded logo isn't a valid PNG, JPG, SVG or WebP image" }); logoDataUrl = undefined; }
    else if (logoDataUrl.length * 0.75 > 512 * 1024) { errors.push({ row: rowOf["logo.mime"], column: "value", problem: "The embedded logo is larger than 512 KB" }); logoDataUrl = undefined; }
  }
  return { values: { brand, terms, features }, logoDataUrl, errors };
}

// Reads one sheet into { rows, headers }.
function readSheet(wb, sheetName) {
  const ws = wb.Sheets[sheetName];
  if (!ws) return null;
  const headers = ((XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" })[0]) || []).map((h) => String(h).trim());
  const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
  return { rows, headers };
}

// Validates one data sheet. Returns { records, errors[], warnings[] } where each
// issue is { sheet, row, column, problem }.
function checkDataSheet(spec, sheet) {
  const errors = [], warnings = [];
  const E = (row, column, problem) => errors.push({ sheet: spec.sheetName, row, column, problem });
  const W = (row, column, problem) => warnings.push({ sheet: spec.sheetName, row, column, problem });
  let expected = [];
  try { expected = Object.keys(spec.toRow({ id: "x" })); } catch (e) { expected = []; }
  const have = new Set(sheet.headers);
  const required = REQUIRED_COLUMNS[spec.key] || [];
  expected.forEach((col) => {
    if (have.has(col)) return;
    if (required.includes(col)) E(1, col, `Required column "${col}" is missing or was renamed`);
    else if (col !== "id") W(1, col, `Column "${col}" is missing — those values will be blank`);
  });
  if (!have.has("id")) W(1, "id", 'No "id" column — every row will be added as new');
  if (errors.length) return { records: [], errors, warnings };

  const dateCols = DATE_COLUMNS[spec.key] || [], numCols = NUMBER_COLUMNS[spec.key] || [];
  const seenIds = new Map(), seenNums = new Map();
  const records = [];
  sheet.rows.forEach((raw, i) => {
    const row = i + 2;
    const r = { ...raw };
    // normalise dates / numbers
    dateCols.forEach((c) => {
      let v = r[c];
      if (typeof v === "number") { const iso = excelSerialToISO(v); if (iso) v = iso; }
      v = String(v == null ? "" : v).trim();
      if (v && !validISODate(v)) E(row, c, `"${v}" isn't a valid date (use YYYY-MM-DD)`);
      r[c] = v;
    });
    numCols.forEach((c) => {
      const v = r[c];
      if (v !== "" && v != null && !Number.isFinite(Number(v))) E(row, c, `"${v}" isn't a number`);
    });
    const idv = String(r.id == null ? "" : r.id).trim();
    if (idv) {
      if (seenIds.has(idv)) E(row, "id", `Duplicate id "${idv}" (also on row ${seenIds.get(idv)})`);
      else seenIds.set(idv, row);
    } else if (have.has("id")) W(row, "id", "No id — this row will be added as a new record");
    const numCol = spec.key === "inventory" ? "partNumber" : "number";
    if (numCols.includes(numCol) && r[numCol] !== "" && r[numCol] != null) {
      const nk = String(Number(r[numCol]));
      if (seenNums.has(nk)) E(row, numCol, `Duplicate ${numCol} ${nk} (also on row ${seenNums.get(nk)})`);
      else seenNums.set(nk, row);
    }
    required.forEach((c) => { if (!String(r[c] == null ? "" : r[c]).trim() && c !== "type" && c !== "status") E(row, c, `"${c}" is required`); });

    switch (spec.key) {
      case "locations": {
        const lv = String(r.level || "").trim();
        if (!lv) W(row, "level", 'No level — will default to "Room"');
        else if (!LOCATION_LEVELS.includes(levelKeyFromLabel(lv))) E(row, "level", `"${lv}" isn't one of: ${SETTINGS.terms.locationLevels.join(", ")}`);
        break;
      }
      case "bomNodes": {
        if (r.level && !BOM_LEVELS.includes(String(r.level))) E(row, "level", `"${r.level}" isn't one of: ${BOM_LEVELS.join(", ")}`);
        break;
      }
      case "workRequests": {
        if (r.status && !WR_STATUSES.includes(String(r.status))) E(row, "status", `"${r.status}" isn't one of: ${WR_STATUSES.join(", ")}`);
        if (r.priority && !PRIORITIES.includes(String(r.priority))) E(row, "priority", `"${r.priority}" isn't one of: ${PRIORITIES.join(", ")}`);
        if (r.suggestedType && !["PM", "PM Base", "Benchmark", "Corrective", "Unplanned"].includes(String(r.suggestedType))) E(row, "suggestedType", `"${r.suggestedType}" isn't a work order type`);
        break;
      }
      case "workOrders": {
        const type = String(r.type || "").trim();
        if (!WO_TYPES.includes(type)) E(row, "type", `"${type}" isn't one of: ${WO_TYPES.join(", ")}`);
        let st = String(r.status || "").trim();
        if (LEGACY_STATUS_MAP[st] && type !== "PM Base") { W(row, "status", `Old status "${st}" will be imported as "${LEGACY_STATUS_MAP[st]}"`); st = LEGACY_STATUS_MAP[st]; r.status = st; }
        if (type === "PM Base") { if (!st) r.status = "Active"; else if (st !== "Active") E(row, "status", `PM Base status must be Active (got "${st}")`); }
        else if (!WO_STATUSES.includes(st)) E(row, "status", `"${st}" isn't one of: ${WO_STATUSES.join(", ")}`);
        if (r.priority && !PRIORITIES.includes(String(r.priority))) E(row, "priority", `"${r.priority}" isn't one of: ${PRIORITIES.join(", ")}`);
        if (type !== "PM Base" && !String(r.requiredByDate || "").trim()) E(row, "requiredByDate", "A required-by date is required on every work order");
        if (type !== "PM Base" && st === "Scheduled" && !String(r.scheduledDate || "").trim()) W(row, "scheduledDate", "Status is Scheduled but there is no scheduled date");
        if (r.triggerType && !["calendar", "meter", "seasonal"].includes(String(r.triggerType))) E(row, "triggerType", `"${r.triggerType}" isn't calendar, meter or seasonal`);
        if (r.frequencyUnit && !FREQUENCY_UNITS.includes(String(r.frequencyUnit))) E(row, "frequencyUnit", `"${r.frequencyUnit}" isn't one of: ${FREQUENCY_UNITS.join(", ")}`);
        if (r.pmMode && !["Fixed", "Non-fixed"].includes(String(r.pmMode))) E(row, "pmMode", `"${r.pmMode}" isn't Fixed or Non-fixed`);
        ["comments", "standbyWindow", "checklist", "checklistTemplate"].forEach((c) => { if (r[c]) { try { JSON.parse(r[c]); } catch (e) { E(row, c, "Not valid JSON — leave it as exported"); } } });
        break;
      }
      case "pmWizardCatalog": {
        if (r.frequencyUnit && !FREQUENCY_UNITS.includes(String(r.frequencyUnit))) E(row, "frequencyUnit", `"${r.frequencyUnit}" isn't one of: ${FREQUENCY_UNITS.join(", ")}`);
        break;
      }
      default: break;
    }
    if (!errors.some((e) => e.row === row)) {
      const withId = { ...r, id: idv || uid(spec.idPrefix) };
      let rec = null;
      try { rec = spec.fromRow(withId); } catch (e) { E(row, "", "Couldn't read this row: " + e.message); }
      if (rec) {
        if (spec.key === "workOrders" && rec.type !== "PM Base" && LEGACY_STATUS_MAP[rec.status]) rec.status = LEGACY_STATUS_MAP[rec.status];
        rec.__blankId = !idv;
        records.push(rec);
      }
    }
  });
  return { records, errors, warnings };
}

// Reference checks over a whole data object. Returns [{sheet,row,column,problem,key}].
function checkReferences(d) {
  const out = [];
  const ids = (list) => new Set((list || []).map((x) => x.id));
  const locs = ids(d.locations), assets = ids(d.assets), boms = ids(d.bomNodes), vendors = ids(d.vendors), parts = ids(d.inventory), wos = ids(d.workOrders);
  const add = (sheet, i, column, problem) => out.push({ sheet, row: i + 2, column, problem, key: `${sheet}|${i}|${column}|${problem}` });
  const chk = (list, sheet, col, set, label, allowBlank = true) => (list || []).forEach((x, i) => {
    const v = x[col];
    if (v == null || v === "") { if (!allowBlank) add(sheet, i, col, `${label} is required`); return; }
    if (!set.has(v)) add(sheet, i, col, `${label} "${v}" doesn't exist`);
  });
  chk(d.locations, "Locations", "parentId", locs, "Parent location");
  chk(d.assets, "Assets", "locationId", locs, "Location");
  chk(d.bomNodes, "BOM Nodes", "assetId", assets, "Asset", false);
  chk(d.bomNodes, "BOM Nodes", "parentId", boms, "Parent BOM node");
  chk(d.pmTemplates, "PM Templates", "assetId", assets, "Asset");
  chk(d.workRequests, "Work Requests", "locationId", locs, "Location");
  chk(d.workRequests, "Work Requests", "assetId", assets, "Asset");
  chk(d.workOrders, "Work Orders", "locationId", locs, "Location");
  chk(d.workOrders, "Work Orders", "assetId", assets, "Asset");
  chk(d.workOrders, "Work Orders", "bomNodeId", boms, "BOM node");
  chk(d.workOrders, "Work Orders", "vendorId", vendors, "Vendor");
  chk(d.workOrders, "Work Orders", "sourcePmBaseId", wos, "Source PM Base");
  chk(d.benchmarks, "Benchmarks", "vendorId", vendors, "Vendor");
  chk(d.inventory, "Parts", "assetId", assets, "Asset");
  chk(d.inventory, "Parts", "bomNodeId", boms, "BOM node");
  chk(d.purchaseList, "Purchase List", "partId", parts, "Part");
  (d.workOrders || []).forEach((w, i) => (w.parts || []).forEach((p) => { if (!parts.has(p.partId)) add("Work Orders", i, "parts", `Part "${p.partId}" doesn't exist`); }));
  (d.workRequests || []).forEach((w, i) => (w.suggestedParts || []).forEach((p) => { if (!parts.has(p.partId)) add("Work Requests", i, "suggestedParts", `Part "${p.partId}" doesn't exist`); }));
  // cycles in parent chains
  const cycles = (list, sheet, label) => (list || []).forEach((x, i) => {
    const byId = new Map(list.map((y) => [y.id, y]));
    let cur = x, hops = 0;
    while (cur && cur.parentId && hops++ < list.length + 1) cur = byId.get(cur.parentId);
    if (hops > list.length) add(sheet, i, "parentId", `${label} hierarchy loops back on itself`);
  });
  cycles(d.locations, "Locations", "Location");
  cycles(d.bomNodes, "BOM Nodes", "BOM node");
  return out;
}

// Builds the resulting data object from the current data and the selected tabs.
function buildImportResult(current, picks) {
  const next = structuredClone(current);
  const summary = {};
  for (const [key, { mode, records }] of Object.entries(picks)) {
    const spec = SHEET_SPECS.find((sp) => sp.key === key);
    if (!spec) continue;
    const existing = spec.fromData ? spec.fromData(next) : (next[key] || []);
    const clean = records.map((r) => { const { __blankId, ...rec } = r; return rec; });
    if (mode === "replace") {
      summary[key] = { added: clean.length, updated: 0, removed: existing.length };
      next[key] = spec.toData ? spec.toData(clean) : clean;
    } else {
      let added = 0, updated = 0;
      const numField = key === "inventory" ? "partNumber" : "number";
      const list = [...existing];
      records.forEach((r) => {
        const { __blankId, ...rec } = r;
        let idx = __blankId ? -1 : list.findIndex((x) => x.id === rec.id);
        if (idx < 0 && __blankId && rec[numField] != null && rec[numField] !== "") idx = list.findIndex((x) => x[numField] === rec[numField]);
        if (idx >= 0) { rec.id = list[idx].id; list[idx] = rec; updated++; } else { list.push(rec); added++; }
      });
      summary[key] = { added, updated, removed: 0 };
      next[key] = spec.toData ? spec.toData(list) : list;
    }
  }
  // numbers for new rows + counters (never lower than before, so numbers aren't reused)
  let maxWo = 0, maxWr = 0, maxPart = 0;
  (next.workOrders || []).forEach((w) => { if (w.number) maxWo = Math.max(maxWo, w.number); });
  (next.workRequests || []).forEach((w) => { if (w.number) maxWr = Math.max(maxWr, w.number); });
  (next.inventory || []).forEach((p) => { if (p.partNumber) maxPart = Math.max(maxPart, p.partNumber); });
  const c0 = next.counters || {};
  maxWo = Math.max(maxWo, c0.wo || 0); maxWr = Math.max(maxWr, c0.wr || 0); maxPart = Math.max(maxPart, c0.part || 0);
  (next.workOrders || []).forEach((w) => { if (!w.number) w.number = ++maxWo; });
  (next.workRequests || []).forEach((w) => { if (!w.number) w.number = ++maxWr; });
  (next.inventory || []).forEach((p) => { if (!p.partNumber) p.partNumber = ++maxPart; });
  next.counters = { wo: maxWo, wr: maxWr, part: maxPart };
  // duplicate numbers across the merged result
  const dupIssues = [];
  [["workOrders", "Work Orders", "number"], ["workRequests", "Work Requests", "number"], ["inventory", "Parts", "partNumber"]].forEach(([k, sheet, col]) => {
    const seen = new Map();
    (next[k] || []).forEach((x, i) => { if (seen.has(x[col])) dupIssues.push({ sheet, row: i + 2, column: col, problem: `${col} ${x[col]} is already used by another record in the result`, key: `${sheet}|${i}|dup` }); else seen.set(x[col], i); });
  });
  return { next, summary, dupIssues };
}

// Parses + validates a workbook. Returns { tabs: [...], issues } — nothing is applied.
function analyzeWorkbook(wb, current) {
  const tabs = [];
  const errors = [], warnings = [];
  const push = (list, items) => items.forEach((it) => list.push(it));
  for (const t of ALL_TABS) {
    const sheet = readSheet(wb, t.sheetName);
    if (!sheet) continue;
    if (t.kind === "data") {
      const spec = SHEET_SPECS.find((sp) => sp.key === t.key);
      const res = checkDataSheet(spec, sheet);
      tabs.push({ ...t, count: sheet.rows.length, records: res.records, errors: res.errors.length });
      push(errors, res.errors); push(warnings, res.warnings);
    } else if (t.key === "users") {
      const rows = sheet.rows.map((r) => ({
        username: String(r.username || "").trim(), role: String(r.role || "").trim(), email: String(r.email || "").trim(),
        notifyPmOverdue: r.notifyPmOverdue === "" ? true : isYes(r.notifyPmOverdue), notifyWarrantyExpiring: r.notifyWarrantyExpiring === "" ? true : isYes(r.notifyWarrantyExpiring),
        notifyWorkRequestUnreviewed: r.notifyWorkRequestUnreviewed === "" ? true : isYes(r.notifyWorkRequestUnreviewed),
        mustChangePassword: isYes(r.mustChangePassword), passwordHash: String(r.passwordHash || "").trim() || undefined,
      }));
      const errs = [];
      ["username", "role"].forEach((c) => { if (!sheet.headers.includes(c)) errs.push({ sheet: t.sheetName, row: 1, column: c, problem: `Required column "${c}" is missing or was renamed` }); });
      if (!errs.length) {
        const seen = new Set(), seenEmail = new Set();
        rows.forEach((r, i) => {
          const row = i + 2;
          if (!r.username) errs.push({ sheet: t.sheetName, row, column: "username", problem: "Username is required" });
          else if (seen.has(r.username.toLowerCase())) errs.push({ sheet: t.sheetName, row, column: "username", problem: `Duplicate username "${r.username}"` });
          seen.add(r.username.toLowerCase());
          if (!ROLES.includes(r.role)) errs.push({ sheet: t.sheetName, row, column: "role", problem: `"${r.role}" isn't one of: ${ROLES.join(", ")}` });
          if (r.email) {
            if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.email)) errs.push({ sheet: t.sheetName, row, column: "email", problem: `"${r.email}" isn't a valid email address` });
            if (seenEmail.has(r.email.toLowerCase())) errs.push({ sheet: t.sheetName, row, column: "email", problem: `Email "${r.email}" is used by more than one user` });
            seenEmail.add(r.email.toLowerCase());
          }
          if (r.passwordHash && !/^\$2[aby]\$\d\d\$[./A-Za-z0-9]{53}$/.test(r.passwordHash)) errs.push({ sheet: t.sheetName, row, column: "passwordHash", problem: "Password hash isn't valid — leave it as exported" });
          if (!r.passwordHash) warnings.push({ sheet: t.sheetName, row, column: "passwordHash", problem: `${r.username || "User"} has no password in this file: a new account can't sign in until the Owner sets a temporary password (or they use the emailed reset link)` });
        });
      }
      tabs.push({ ...t, count: rows.length, rows, errors: errs.length });
      push(errors, errs);
    } else if (t.key === "alarms") {
      const errs = [];
      ["id", "triggeredAt"].forEach((c) => { if (!sheet.headers.includes(c)) errs.push({ sheet: t.sheetName, row: 1, column: c, problem: `Required column "${c}" is missing or was renamed` }); });
      const rows = sheet.rows.map((r) => ({ id: String(r.id || "").trim(), source: String(r.source || "manual"), sourceEntityId: String(r.sourceEntityId || ""), friendlyName: String(r.friendlyName || ""), assetId: String(r.assetId || ""), locationId: String(r.locationId || ""), message: String(r.message || ""), severity: String(r.severity || "warning"), status: String(r.status || "open"), resolutionType: String(r.resolutionType || ""), resolutionRef: String(r.resolutionRef || ""), resolutionReason: String(r.resolutionReason || ""), rawPayload: String(r.rawPayload || ""), triggeredAt: String(r.triggeredAt || "").trim(), resolvedAt: String(r.resolvedAt || "") }));
      if (!errs.length) rows.forEach((r, i) => { if (!r.id) errs.push({ sheet: t.sheetName, row: i + 2, column: "id", problem: "Alarm id is required" }); if (!r.triggeredAt) errs.push({ sheet: t.sheetName, row: i + 2, column: "triggeredAt", problem: "Triggered-at is required" }); });
      tabs.push({ ...t, count: rows.length, rows, errors: errs.length });
      push(errors, errs);
    } else if (t.key === "alarmMappings") {
      const errs = [];
      if (!sheet.headers.includes("entityId")) errs.push({ sheet: t.sheetName, row: 1, column: "entityId", problem: 'Required column "entityId" is missing or was renamed' });
      const rows = sheet.rows.map((r) => ({ entityId: String(r.entityId || "").trim(), assetId: String(r.assetId || ""), locationId: String(r.locationId || ""), label: String(r.label || "") }));
      if (!errs.length) rows.forEach((r, i) => { if (!r.entityId) errs.push({ sheet: t.sheetName, row: i + 2, column: "entityId", problem: "Entity id is required" }); });
      tabs.push({ ...t, count: rows.length, rows, errors: errs.length });
      push(errors, errs);
    } else if (t.key === "alarmSettings") {
      const hit = sheet.rows.find((r) => String(r.key).trim() === "webhookKey");
      tabs.push({ ...t, count: hit ? 1 : 0, webhookKey: hit ? String(hit.value || "").trim() : "", errors: 0 });
    } else if (t.key === "settings") {
      const res = rowsToSettings(sheet.rows);
      const errs = res.errors.map((e) => ({ sheet: t.sheetName, ...e }));
      tabs.push({ ...t, count: sheet.rows.length, parsed: res, errors: errs.length });
      push(errors, errs);
    }
  }
  return { tabs, errors, warnings };
}

// Applies reference/duplicate checks for the chosen picks. Returns only issues the import would CAUSE.
function checkImportResult(current, picks) {
  const baseline = new Set(checkReferences(current).map((x) => x.key));
  const { next, summary, dupIssues } = buildImportResult(current, picks);
  const issues = [...checkReferences(next).filter((x) => !baseline.has(x.key)), ...dupIssues];
  return { next, summary, issues };
}

function ImportModal({ data, update, onClose, initialFile }) {
  const dialog = useDialog();
  const [step, setStep] = useState("loading"); // loading | review | done
  const [analysis, setAnalysis] = useState(null);
  const [picked, setPicked] = useState({}); // key -> { on, mode }
  const [stageId, setStageId] = useState(null);
  const [attachInfo, setAttachInfo] = useState(null);
  const [fatal, setFatal] = useState("");
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState(null);
  const [applyErrors, setApplyErrors] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        let buf;
        if (/\.zip$/i.test(initialFile.name)) {
          const staged = await api.stageFullBackup(initialFile);
          setStageId(staged.stageId);
          setAttachInfo({ count: staged.attachmentCount, missing: staged.attachmentsMissingFromZip, createdAt: staged.createdAt });
          const bin = atob(staged.workbookBase64);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          buf = bytes.buffer;
        } else {
          buf = await initialFile.arrayBuffer();
        }
        const wb = XLSX.read(buf, { type: "array" });
        const a = analyzeWorkbook(wb, data);
        setAnalysis(a);
        const init = {};
        a.tabs.forEach((t) => { init[t.key] = { on: t.kind === "data" || t.key === "users" ? true : true, mode: "merge" }; });
        setPicked(init);
        setStep("review");
      } catch (err) {
        console.error(err);
        setFatal(err.message && /zip|backup|manifest|workbook/i.test(err.message) ? err.message : "Couldn't read that file. Make sure it's an export from this app (sheet names and headers intact).");
        setStep("review");
      }
    })();
    return () => { /* staged zip is discarded server-side when unused */ };
  }, []); // eslint-disable-line

  const selectedTabs = analysis ? analysis.tabs.filter((t) => picked[t.key] && picked[t.key].on) : [];
  const dataPicks = {};
  selectedTabs.filter((t) => t.kind === "data").forEach((t) => { dataPicks[t.key] = { mode: picked[t.key].mode, records: t.records }; });
  const refCheck = useMemo(() => (analysis ? checkImportResult(data, dataPicks) : null), [analysis, picked]); // eslint-disable-line
  const selectedSheets = new Set(selectedTabs.map((t) => t.sheetName));
  const tabErrors = analysis ? analysis.errors.filter((e) => selectedSheets.has(e.sheet)) : [];
  const allErrors = analysis ? [...tabErrors, ...(refCheck ? refCheck.issues : [])] : [];
  const warnings = analysis ? analysis.warnings.filter((e) => selectedSheets.has(e.sheet)) : [];
  // Replace mode on a server tab (users) deletes other accounts — flag it as a warning too.
  const replaceTabs = selectedTabs.filter((t) => picked[t.key].mode === "replace");
  const hasErrors = allErrors.length > 0;

  const downloadLog = () => {
    const lines = ["type,sheet,row,column,problem", ...allErrors.map((e) => ["error", e.sheet, e.row, e.column, e.problem].map(csvCell).join(",")), ...warnings.map((e) => ["warning", e.sheet, e.row, e.column, e.problem].map(csvCell).join(","))];
    downloadBlob(new Blob([lines.join("\n")], { type: "text/csv" }), `${brandSlug()}-import-log-${todayISO()}.csv`);
  };

  const apply = async () => {
    if (hasErrors || selectedTabs.length === 0) return;
    const names = selectedTabs.map((t) => `${t.label} (${picked[t.key].mode === "replace" ? "replace" : "update and add"})`).join(", ");
    if (replaceTabs.length) {
      const ok = await dialog.confirm(`Replace tab(s): ${replaceTabs.map((t) => t.label).join(", ")}? Existing rows in those tabs that aren't in the file will be DELETED. Everything else stays as it is.`);
      if (!ok) return;
    }
    const ok2 = await dialog.confirm(`Apply the import to: ${names}?${warnings.length ? ` There are ${warnings.length} warning(s) — review them first if you haven't.` : ""}`);
    if (!ok2) return;
    setApplying(true); setApplyErrors([]);
    try {
      const serverTabs = {};
      selectedTabs.filter((t) => t.kind === "server").forEach((t) => {
        const mode = picked[t.key].mode;
        if (t.key === "settings") serverTabs.settings = { values: t.parsed.values, logoDataUrl: t.parsed.logoDataUrl };
        else if (t.key === "alarmSettings") { if (t.webhookKey) serverTabs.alarmSettings = { webhookKey: t.webhookKey }; }
        else serverTabs[t.key] = { mode, rows: t.rows };
      });
      let serverReport = null;
      if (Object.keys(serverTabs).length) {
        const r = await api.importServerData(serverTabs);
        serverReport = r.report;
      }
      let attachReport = null;
      if (Object.keys(dataPicks).length) update(() => refCheck.next);
      if (stageId) attachReport = await api.applyStagedAttachments(stageId);
      setResult({ summary: refCheck ? refCheck.summary : {}, serverReport, attachReport });
      setStageId(null);
      setStep("done");
    } catch (err) {
      setApplyErrors(err.errors && err.errors.length ? err.errors : [err.message || "The import failed"]);
    } finally { setApplying(false); }
  };

  const close = () => { if (stageId) api.discardStagedBackup(stageId).catch(() => {}); onClose(); };
  const bad = { color: C.rust }, small = { fontFamily: FONT_BODY, fontSize: 12 };
  const modeOptions = (t) => (
    <select style={{ ...inputStyle, width: "auto", padding: "4px 6px", fontSize: 12 }} value={picked[t.key].mode} disabled={t.key === "settings" || t.key === "alarmSettings"} onChange={(e) => setPicked({ ...picked, [t.key]: { ...picked[t.key], mode: e.target.value } })}>
      <option value="merge">Update and add</option>
      <option value="replace">Replace tab</option>
    </select>
  );

  return (
    <Modal title="Import from Excel" info="excelImport" onClose={close} wide>
      {step === "loading" && <div style={{ ...small, color: C.inkSoft, display: "flex", alignItems: "center", gap: 8 }}><Loader2 className="animate-spin" size={14} /> Reading and checking the file…</div>}
      {step === "review" && fatal && (
        <>
          <div style={{ ...small, ...bad, marginBottom: 14 }}>{fatal}</div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}><Btn onClick={close}>Close</Btn></div>
        </>
      )}
      {step === "review" && !fatal && analysis && (
        <>
          <div style={{ ...small, color: C.inkSoft, marginBottom: 10 }}>
            Nothing has been changed yet. Tick the tabs to import — tabs you leave unticked (or that aren't in the file) are not touched. "Update and add" matches rows on id (or number) and keeps rows that aren't in the file; "Replace tab" makes the tab match the file exactly.
            {attachInfo && <> This is a full backup from {attachInfo.createdAt ? new Date(attachInfo.createdAt).toLocaleString() : "an earlier date"} with {attachInfo.count} photo(s); photos are restored after the data import{attachInfo.missing ? ` (${attachInfo.missing} listed photo(s) are missing from the zip)` : ""}.</>}
          </div>
          {analysis.tabs.length === 0 && <div style={{ ...small, ...bad, marginBottom: 12 }}>None of this app's sheets were found in the file.</div>}
          <div style={{ border: `1px solid ${C.lineSoft}`, borderRadius: 4, marginBottom: 12 }}>
            {analysis.tabs.map((t) => (
              <div key={t.key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderTop: `1px solid ${C.lineSoft}`, flexWrap: "wrap" }}>
                <input type="checkbox" checked={!!(picked[t.key] && picked[t.key].on)} onChange={(e) => setPicked({ ...picked, [t.key]: { ...picked[t.key], on: e.target.checked } })} />
                <span style={{ ...small, fontWeight: 600, color: C.ink, minWidth: 130 }}>{t.label}</span>
                <span style={{ ...small, color: C.inkFaint, minWidth: 70 }}>{t.count} row{t.count === 1 ? "" : "s"}</span>
                {t.errors > 0 && <span style={{ ...small, ...bad, fontWeight: 600 }}>{t.errors} error{t.errors === 1 ? "" : "s"}</span>}
                <span style={{ marginLeft: "auto" }}>{picked[t.key] && picked[t.key].on && modeOptions(t)}</span>
              </div>
            ))}
          </div>
          {ALL_TABS.filter((t) => !analysis.tabs.find((x) => x.key === t.key)).length > 0 && (
            <div style={{ ...small, color: C.inkFaint, marginBottom: 12 }}>Not in this file (left untouched): {ALL_TABS.filter((t) => !analysis.tabs.find((x) => x.key === t.key)).map((t) => t.label).join(", ")}</div>
          )}

          {hasErrors && (
            <div style={{ border: `1px solid ${C.rust}`, borderRadius: 4, padding: 10, marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                <span style={{ ...small, ...bad, fontWeight: 700 }}>{allErrors.length} error{allErrors.length === 1 ? "" : "s"} — nothing will be imported until these are fixed (or those tabs are unticked)</span>
                <Btn small variant="ghost" onClick={downloadLog}><Download size={12} /> Download log</Btn>
              </div>
              <div className="hk-scroll" style={{ maxHeight: 220, overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", ...small }}>
                  <thead><tr style={{ textAlign: "left", color: C.inkFaint }}><th style={{ padding: "2px 6px" }}>Sheet</th><th style={{ padding: "2px 6px" }}>Row</th><th style={{ padding: "2px 6px" }}>Column</th><th style={{ padding: "2px 6px" }}>Problem</th></tr></thead>
                  <tbody>
                    {allErrors.slice(0, 500).map((e, i) => (
                      <tr key={i} style={{ borderTop: `1px solid ${C.lineSoft}`, color: C.ink }}><td style={{ padding: "3px 6px" }}>{e.sheet}</td><td style={{ padding: "3px 6px" }}>{e.row}</td><td style={{ padding: "3px 6px" }}>{e.column}</td><td style={{ padding: "3px 6px" }}>{e.problem}</td></tr>
                    ))}
                  </tbody>
                </table>
                {allErrors.length > 500 && <div style={{ ...small, color: C.inkFaint, padding: 6 }}>…and {allErrors.length - 500} more — download the log for the full list.</div>}
              </div>
            </div>
          )}
          {!hasErrors && warnings.length > 0 && (
            <div style={{ border: `1px solid ${C.gold}`, borderRadius: 4, padding: 10, marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                <span style={{ ...small, fontWeight: 700, color: C.ink }}>{warnings.length} warning{warnings.length === 1 ? "" : "s"} — the import can go ahead, but please review</span>
                <Btn small variant="ghost" onClick={downloadLog}><Download size={12} /> Download log</Btn>
              </div>
              <div className="hk-scroll" style={{ maxHeight: 140, overflowY: "auto", ...small, color: C.inkSoft }}>
                {warnings.slice(0, 200).map((e, i) => <div key={i}>{e.sheet} · row {e.row}{e.column ? ` · ${e.column}` : ""}: {e.problem}</div>)}
                {warnings.length > 200 && <div>…and {warnings.length - 200} more in the log.</div>}
              </div>
            </div>
          )}
          {!hasErrors && refCheck && selectedTabs.some((t) => t.kind === "data") && (
            <div style={{ ...small, color: C.inkSoft, marginBottom: 12 }}>
              {Object.entries(refCheck.summary).map(([k, v]) => `${SHEET_SPECS.find((sp) => sp.key === k).sheetName}: ${v.added} added, ${v.updated} updated${v.removed ? `, ${v.removed} replaced/removed` : ""}`).join(" · ")}
            </div>
          )}
          {applyErrors.length > 0 && (
            <div style={{ border: `1px solid ${C.rust}`, borderRadius: 4, padding: 10, marginBottom: 12, ...small, ...bad }}>
              Nothing was changed — the server rejected the import:
              {applyErrors.map((e, i) => <div key={i}>• {e}</div>)}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Btn variant="ghost" onClick={close}>Cancel</Btn>
            <Btn variant="primary" onClick={apply} disabled={hasErrors || selectedTabs.length === 0 || applying}>{applying ? "Importing…" : "Import selected tabs"}</Btn>
          </div>
        </>
      )}
      {step === "done" && result && (
        <>
          <div style={{ ...small, color: C.ink, marginBottom: 8, fontWeight: 600 }}>Import complete.</div>
          <div style={{ ...small, color: C.inkSoft, marginBottom: 14 }}>
            {Object.entries(result.summary).map(([k, v]) => <div key={k}>{SHEET_SPECS.find((sp) => sp.key === k).sheetName}: {v.added} added, {v.updated} updated{v.removed ? `, ${v.removed} previous row(s) replaced` : ""}</div>)}
            {result.serverReport && result.serverReport.users && <div>Users: {result.serverReport.users.created} added, {result.serverReport.users.updated} updated{result.serverReport.users.skipped ? `, ${result.serverReport.users.skipped} skipped (your own account is never overwritten)` : ""}{result.serverReport.users.noPassword ? `. ${result.serverReport.users.noPassword} new user(s) have no password yet — set a temporary one with the key icon under Members.` : ""}</div>}
            {result.serverReport && result.serverReport.alarms && <div>Alarms: {result.serverReport.alarms.count} imported</div>}
            {result.serverReport && result.serverReport.alarmMappings && <div>Alarm Mappings: {result.serverReport.alarmMappings.count} imported</div>}
            {result.serverReport && result.serverReport.alarmSettings && <div>Alarm webhook key restored</div>}
            {result.serverReport && result.serverReport.settings && <div>Settings and logo applied — reload the page to see every label update.</div>}
            {result.attachReport && <div>Photos: {result.attachReport.restored} restored, {result.attachReport.skipped} already present{result.attachReport.failed ? `, ${result.attachReport.failed} failed` : ""}</div>}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}><Btn variant="primary" onClick={onClose}>Done</Btn></div>
        </>
      )}
    </Modal>
  );
}

function fmtBytes(n) {
  if (!n && n !== 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function BackupTools({ data, update }) {
  const dialog = useDialog();
  const [busy, setBusy] = useState("");
  const [creds, setCreds] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [snaps, setSnaps] = useState(null);
  const [shrinkMsg, setShrinkMsg] = useState("");
  const fileRef = useRef(null);

  const loadSnaps = () => api.listSnapshots().then(setSnaps).catch(() => setSnaps({ snapshots: [], keep: 0, enabled: false }));
  useEffect(() => { loadSnaps(); }, []); // eslint-disable-line

  // Builds the workbook: every data tab plus the server-held tabs (users, alarms,
  // alarm mappings/settings, Owner settings + logo, attachment index).
  const buildWorkbook = async () => {
    const server = await api.getServerBackupData(creds);
    const wb = XLSX.utils.book_new();
    const readme = XLSX.utils.aoa_to_sheet([
      [`${SETTINGS.brand.name} backup`], ["Exported " + new Date().toLocaleString()], [""],
      ["Each tab is one data type. Edit rows in Excel and re-import this file to apply changes."],
      ["On import you choose which tabs to apply; tabs you don't tick (or that are missing from the file) are never touched."],
      ["To ADD a new row: leave its 'id' column blank — the app assigns one on import."],
      ["To edit an existing row: keep its 'id' (and 'number'/'partNumber', where present) unchanged."],
      ["Don't rename the sheet tabs or column headers — import matches on those."],
      ["Users / Alarms / Alarm Mappings / Settings carry the settings and accounts kept outside the main data."],
      [creds ? "This file INCLUDES login credentials (password hashes and the alarm webhook key). Keep it private." : "Login credentials (password hashes, alarm webhook key) are not included in this file."],
      ["Photos are not in this workbook — use the Full backup (.zip) to include them."],
    ]);
    XLSX.utils.book_append_sheet(wb, readme, "Read me");
    SHEET_SPECS.forEach((spec) => {
      const rows = (spec.fromData ? spec.fromData(data) : (data[spec.key] || [])).map(spec.toRow);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.length ? rows : [], rows.length ? undefined : { header: Object.keys(spec.toRow({ id: "" })) }), spec.sheetName);
    });
    const userRows = server.users.map((u) => ({ username: u.username, role: u.role, email: u.email, notifyPmOverdue: u.notifyPmOverdue ? "yes" : "no", notifyWarrantyExpiring: u.notifyWarrantyExpiring ? "yes" : "no", notifyWorkRequestUnreviewed: u.notifyWorkRequestUnreviewed ? "yes" : "no", mustChangePassword: u.mustChangePassword ? "yes" : "", ...(creds ? { passwordHash: u.passwordHash } : {}) }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(userRows), "Users");
    const alarmRows = server.alarms.map((a) => ({ id: a.id, source: a.source, sourceEntityId: a.source_entity_id || "", friendlyName: a.friendly_name || "", assetId: a.asset_id || "", locationId: a.location_id || "", message: a.message || "", severity: a.severity, status: a.status, resolutionType: a.resolution_type || "", resolutionRef: a.resolution_ref || "", resolutionReason: a.resolution_reason || "", rawPayload: a.raw_payload || "", triggeredAt: a.triggered_at, resolvedAt: a.resolved_at || "" }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(alarmRows.length ? alarmRows : [], alarmRows.length ? undefined : { header: ["id", "source", "triggeredAt"] }), "Alarms");
    const mapRows = server.alarmMappings.map((m) => ({ entityId: m.entity_id, assetId: m.asset_id || "", locationId: m.location_id || "", label: m.label || "" }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mapRows.length ? mapRows : [], mapRows.length ? undefined : { header: ["entityId", "assetId", "locationId", "label"] }), "Alarm Mappings");
    if (server.alarmSettings) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ key: "webhookKey", value: server.alarmSettings.webhookKey }]), "Alarm Settings");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(settingsToRows(server.settings, server.logoDataUrl)), "Settings");
    const attRows = server.attachments.map((a) => ({ id: a.id, filename: a.filename, mimeType: a.mime_type || "", size: a.size || "", uploadedBy: a.uploaded_by || "", createdAt: a.created_at }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(attRows.length ? attRows : [], attRows.length ? undefined : { header: ["id", "filename", "mimeType", "size", "uploadedBy", "createdAt"] }), "Attachments");
    return wb;
  };

  const doExport = async () => {
    setBusy("export");
    try {
      const wb = await buildWorkbook();
      XLSX.writeFile(wb, `${brandSlug()}-backup-${todayISO()}.xlsx`);
    } catch (err) { await dialog.alertMsg("Couldn't build the export: " + err.message); }
    finally { setBusy(""); }
  };
  const doFullBackup = async () => {
    setBusy("full");
    try {
      const wb = await buildWorkbook();
      const bytes = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const blob = await api.buildFullBackup(new Uint8Array(bytes));
      downloadBlob(blob, `${brandSlug()}-full-backup-${todayISO()}.zip`);
    } catch (err) { await dialog.alertMsg("Couldn't build the full backup: " + err.message); }
    finally { setBusy(""); }
  };
  const runSnapshot = async () => {
    setBusy("snap");
    try { await api.runSnapshot(); await loadSnaps(); } catch (err) { await dialog.alertMsg(err.message); }
    finally { setBusy(""); }
  };
  // One-time shrink of photos uploaded before v2.2: download each, shrink in the
  // browser, and replace it in place (same id) only when the result is smaller.
  const shrinkExisting = async () => {
    const ok = await dialog.confirm("Shrink all existing photos to about 1600 px on the long edge (JPEG)? Each photo is only replaced if the result is smaller. This can't be undone, and may take a while.");
    if (!ok) return;
    setBusy("shrink"); setShrinkMsg("Working…");
    try {
      const list = await api.listAttachments();
      let done = 0, saved = 0, skipped = 0;
      for (const att of list) {
        setShrinkMsg(`Checking ${done + 1} of ${list.length}…`);
        try {
          const blob = await (await fetch(api.attachmentUrl(att.id), { credentials: "include" })).blob();
          const file = new File([blob], att.filename || "photo", { type: att.mimeType || blob.type });
          const small = await shrinkImage(file);
          if (small === file || small.size >= att.size) { skipped++; }
          else { const r = await api.replaceAttachment(att.id, small); if (r.replaced) saved += att.size - small.size; else skipped++; }
        } catch (e) { skipped++; }
        done++;
      }
      setShrinkMsg(`Done: ${done} photo(s) checked, ${fmtBytes(saved)} saved, ${skipped} left as they were.`);
    } catch (err) { setShrinkMsg("Couldn't finish: " + err.message); }
    finally { setBusy(""); }
  };

  const sub = { fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, color: C.ink, margin: "16px 0 6px" };
  const note = { fontFamily: FONT_BODY, fontSize: 12, color: C.inkSoft };
  return (
    <Panel style={{ padding: 18 }}>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 15, fontWeight: 600, color: C.ink, marginBottom: 4 }}>Backup & bulk edit<InfoTip k="backup" /></div>
      <div style={{ ...note, marginBottom: 14 }}>
        Export everything to an Excel file — edit it (including bulk changes across many rows) and re-import to apply the changes, or just keep it as a backup. The file also carries members, alarms, alarm mappings, and your branding settings and logo. On import you choose which tabs to apply, and the file is checked first — if anything is wrong you get an error log and nothing changes.
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <Btn onClick={doExport} disabled={!!busy}><FileDown size={14} /> {busy === "export" ? "Building…" : "Export to Excel"}</Btn>
        <Btn onClick={doFullBackup} disabled={!!busy}><Archive size={14} /> {busy === "full" ? "Building…" : "Full backup (.zip, with photos)"}</Btn>
        <Btn variant="ghost" disabled={!!busy} onClick={() => fileRef.current?.click()}><FileUp size={14} /> Import from Excel or backup…</Btn>
        <input ref={fileRef} type="file" accept=".xlsx,.zip" style={{ display: "none" }} onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) setImportFile(f); e.target.value = ""; }} />
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 12, ...note, cursor: "pointer" }}>
        <input type="checkbox" checked={creds} onChange={(e) => setCreds(e.target.checked)} />
        Include login credentials (password hashes and the alarm webhook key) in exports
      </label>
      {creds && <div style={{ ...note, color: C.rust, marginTop: 4 }}>The file will contain password hashes and the webhook key — store it somewhere private. Left off, restored accounts that don't exist yet will need a temporary password from you.</div>}

      <div style={sub}>Automatic database snapshots</div>
      <div style={{ ...note, marginBottom: 8 }}>
        {snaps && snaps.enabled === false ? "Disabled on this server (BACKUP_SNAPSHOTS=false)." : `A consistent copy of the database is saved to the data volume about once a day; the latest ${snaps ? snaps.keep : 7} are kept. This protects against a bad import or edit, but it lives on the same disk — keep your own off-device copy of the Full backup too.`}
      </div>
      {snaps && snaps.snapshots.slice(0, 5).map((sn) => (
        <div key={sn.name} style={{ display: "flex", justifyContent: "space-between", ...note, padding: "3px 0" }}>
          <span>{new Date(sn.createdAt).toLocaleString()} · {fmtBytes(sn.size)}</span>
          <a href={api.snapshotUrl(sn.name)} style={{ color: C.navy }}>Download</a>
        </div>
      ))}
      <div style={{ marginTop: 8 }}><Btn small variant="ghost" onClick={runSnapshot} disabled={!!busy}>{busy === "snap" ? "Saving…" : "Take a snapshot now"}</Btn></div>

      <div style={sub}>Photos</div>
      <div style={{ ...note, marginBottom: 8 }}>New photos are shrunk automatically (about 1600 px, JPEG) before upload. Shrink photos uploaded earlier once:</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <Btn small variant="ghost" onClick={shrinkExisting} disabled={!!busy}>{busy === "shrink" ? "Shrinking…" : "Shrink existing photos"}</Btn>
        {shrinkMsg && <span style={note}>{shrinkMsg}</span>}
      </div>
      {importFile && <ImportModal data={data} update={update} initialFile={importFile} onClose={() => setImportFile(null)} />}
    </Panel>
  );
}

/* ============================================================
   OWNER TOOLS
============================================================ */
// Owner: a member's email, designations and digests.
function MemberNotifyModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState({
    email: user.email || "",
    designations: [...(user.designations || [])],
    ...Object.fromEntries(DIGEST_OPTIONS.map((o) => [o.key, !!user[o.key]])),
    notifyFreq: user.notifyFreq || "daily", notifyTime: user.notifyTime || "07:00", notifyWeekday: user.notifyWeekday == null ? 1 : user.notifyWeekday,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const save = async () => {
    setBusy(true); setError("");
    try { await api.updateUser(user.id, form); onSaved(); onClose(); }
    catch (err) { setError(err.message || "Couldn't save"); }
    finally { setBusy(false); }
  };
  const isAdminRole = user.role === "Owner" || user.role === "Manager";
  const desList = user.role === "Executor" ? DESIGNATIONS : user.role === "Guest" ? [] : [];
  const toggleDes = (k, on) => setForm((f) => ({ ...f, designations: on ? [...new Set([...f.designations, k])] : f.designations.filter((x) => x !== k) }));
  const effective = { ...user, designations: form.designations };
  return (
    <Modal title={`Member settings — ${user.username}`} info="notify" onClose={onClose}>
      <Field label="Email (notifications and password reset)"><input type="email" style={inputStyle} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@example.com" /></Field>
      {(desList.length > 0 || isAdminRole) && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 6 }}>Designations<InfoTip k="designations" /></div>
          {isAdminRole && <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint, marginBottom: 6 }}>{user.role}s already have the Planner, Scheduler and Specialist rights.</div>}
          {desList.map((d) => (
            <label key={d.key} style={{ display: "flex", alignItems: "flex-start", gap: 7, marginBottom: 6, fontFamily: FONT_BODY, fontSize: 12.5, color: C.ink, cursor: "pointer" }}>
              <input type="checkbox" checked={form.designations.includes(d.key)} onChange={(e) => toggleDes(d.key, e.target.checked)} style={{ marginTop: 2 }} />
              <span><b>{d.label}</b> — {d.help}</span>
            </label>
          ))}
          {isAdminRole && (
            <label style={{ display: "flex", alignItems: "flex-start", gap: 7, fontFamily: FONT_BODY, fontSize: 12.5, color: C.ink, cursor: "pointer" }}>
              <input type="checkbox" checked={form.designations.includes("executor")} onChange={(e) => toggleDes("executor", e.target.checked)} style={{ marginTop: 2 }} />
              <span><b>Executor</b> — available to be given work: appears in the work order executor list, labour assignment and the workforce schedule.</span>
            </label>
          )}
        </div>
      )}
      {error && <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.rust, marginBottom: 10 }}>{error}</div>}
      <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 4 }}>Email digests</div>
      <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint, marginBottom: 10 }}>
        Requires SMTP to be configured on the server (see .env.example) — with no email set here, or none of the options below on, this member gets no digest. Only options that fit their role and designations are listed. Members can also change these themselves under Tools and settings.
      </div>
      {DIGEST_OPTIONS.filter((o) => digestAllowed(effective, o)).map((o) => (
        <label key={o.key} style={{ display: "flex", alignItems: "flex-start", gap: 7, marginBottom: 8, fontFamily: FONT_BODY, fontSize: 12.5, color: C.ink, cursor: "pointer" }}>
          <input type="checkbox" checked={!!form[o.key]} onChange={(e) => setForm({ ...form, [o.key]: e.target.checked })} style={{ marginTop: 2 }} />
          <span>{o.label}</span>
        </label>
      ))}
      <DigestSchedule value={form} onChange={(p) => setForm({ ...form, ...p })} />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" onClick={save} disabled={busy}>Save</Btn>
      </div>
    </Modal>
  );
}

// Offers to email a member their sign-in details (needs SMTP on the server).
async function offerEmailCredentials(dialog, user, password) {
  if (!user.email) return;
  if (!SETTINGS.mailConfigured) {
    await dialog.alertMsg(`${user.username} has an email address, but email isn't set up on the server (SMTP), so the sign-in details can't be emailed. Give them the username and temporary password yourself.`);
    return;
  }
  const ok = await dialog.confirm(`Email ${user.username}'s username, temporary password and a sign-in link to ${user.email}?`);
  if (!ok) return;
  try { await api.emailCredentials(user.id, password); await dialog.alertMsg(`Sent to ${user.email}.`); }
  catch (err) { await dialog.alertMsg(err.message || "Couldn't send the email."); }
}

// Owner sets a temporary password for a member: pre-filled, editable. The
// member must replace it at their next sign-in.
function ResetPasswordModal({ user, onClose, onDone }) {
  const dialog = useDialog();
  const [password, setPassword] = useState(() => genTempPassword());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (password.length < MIN_PASSWORD) { setError(`The temporary password must be at least ${MIN_PASSWORD} characters.`); return; }
    setBusy(true); setError("");
    try {
      const r = await api.ownerResetPassword(user.id, password);
      onDone();
      onClose();
      await offerEmailCredentials(dialog, user, r.temporaryPassword);
    } catch (err) { setError(err.message || "Couldn't reset the password"); setBusy(false); }
  };
  return (
    <Modal title={`Reset password — ${user.username}`} info="resetPw" onClose={onClose}>
      <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.inkSoft, marginBottom: 12 }}>
        Sets a temporary password for {user.username}. They will be asked to choose their own the next time they sign in, and any devices they're signed in on are signed out now. A password has been suggested; change it if you like.
      </div>
      <Field label="Temporary password">
        <div style={{ display: "flex", gap: 6, alignItems: "stretch" }}>
          <div style={{ flex: 1 }}><PasswordInput style={inputStyle} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" /></div>
          <Btn variant="ghost" onClick={() => setPassword(genTempPassword())} title="Generate another"><RefreshCw size={14} /></Btn>
        </div>
      </Field>
      {error && <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.rust, marginBottom: 10 }}>{error}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" onClick={run} disabled={busy}>Reset password</Btn>
      </div>
    </Modal>
  );
}

function MemberManagementInline({ currentUser }) {
  const dialog = useDialog();
  const [users, setUsers] = useState(null);
  const blankForm = () => ({ username: "", password: genTempPassword(), role: "Executor", email: "" });
  const [form, setForm] = useState(blankForm);
  const [error, setError] = useState("");
  const [notifyUser, setNotifyUser] = useState(null);
  const [resetUser, setResetUser] = useState(null);

  const load = () => api.listUsers().then(setUsers).catch(() => setUsers([]));
  useEffect(() => { load(); }, []); // eslint-disable-line

  const add = async () => {
    setError("");
    if (!form.username.trim() || !form.password) { setError("Username and a temporary password are required."); return; }
    if (form.password.length < MIN_PASSWORD) { setError(`The temporary password must be at least ${MIN_PASSWORD} characters.`); return; }
    try {
      const made = await api.addUser(form.username.trim(), form.password, form.role, form.email.trim());
      const pw = form.password;
      setForm(blankForm());
      load();
      await offerEmailCredentials(dialog, made, pw);
    } catch (err) { setError(err.message); }
  };

  const remove = async (u) => {
    const ok = await dialog.confirm(`Remove ${u.username}'s account? They will no longer be able to sign in.`);
    if (!ok) return;
    await api.removeUser(u.id);
    load();
  };

  return (
    <Panel style={{ padding: 18 }}>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 15, fontWeight: 600, color: C.ink, marginBottom: 10 }}>Members<InfoTip k="members" /></div>
      {users === null && <Empty text="Loading…" />}
      {users && users.map((u) => (
        <div key={u.id} className="hk-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 4px", borderTop: `1px solid ${C.lineSoft}` }}>
          <div>
            <span style={{ fontFamily: FONT_BODY, fontSize: 13.5, fontWeight: 600, color: C.ink }}>{u.username}</span>
            {u.id === currentUser.id && <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: C.inkFaint }}> (you)</span>}
            {u.email && <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: C.inkFaint }}>{u.email}</div>}
            {(u.designations || []).length > 0 && <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: C.teal, fontWeight: 600 }}>{u.designations.map((k) => (DESIGNATIONS.find((d) => d.key === k) || { label: "Executor" }).label).join(" · ")}</div>}
            {u.mustChangePassword && <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: C.orange, fontWeight: 600 }}>Temporary password — must change at next sign-in</div>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Tag text={u.role} color={u.role === "Owner" ? C.navy : u.role === "Manager" ? C.teal : u.role === "Guest" ? C.inkFaint : C.olive} soft={u.role === "Owner" ? C.navySoft : u.role === "Manager" ? C.tealSoft : u.role === "Guest" ? C.panelAlt : C.oliveSoft} />
            {u.id !== currentUser.id && <button onClick={() => setResetUser(u)} title="Reset password" style={{ background: "none", border: "none", cursor: "pointer", color: C.inkSoft }}><Key size={14} /></button>}
            <button onClick={() => setNotifyUser(u)} title="Email, designations and digests" style={{ background: "none", border: "none", cursor: "pointer", color: C.inkSoft }}><Pencil size={14} /></button>
            {u.id !== currentUser.id && <button onClick={() => remove(u)} style={{ background: "none", border: "none", cursor: "pointer", color: C.rust }}><Trash2 size={14} /></button>}
          </div>
        </div>
      ))}
      <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, color: C.ink, margin: "16px 0 8px" }}>Add a member<InfoTip k="addMember" /></div>
      <div className="hk-grid-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <Field label="Username" required><input style={inputStyle} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></Field>
        <Field label="Temporary password" required>
          <div style={{ display: "flex", gap: 6, alignItems: "stretch" }}>
            <div style={{ flex: 1, minWidth: 0 }}><PasswordInput style={inputStyle} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" /></div>
            <Btn variant="ghost" onClick={() => setForm({ ...form, password: genTempPassword() })} title="Generate another"><RefreshCw size={14} /></Btn>
          </div>
        </Field>
        <Field label="Role">
          <select style={inputStyle} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Email (optional — notifications, self-service password reset, and emailing the sign-in details)"><input type="email" style={inputStyle} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@example.com" /></Field>
      <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint, marginTop: -6, marginBottom: 10 }}>
        A temporary password is suggested; you can change it. The member must choose their own the first time they sign in. At least {MIN_PASSWORD} characters. If you enter an email, you'll be asked whether to email them their username, temporary password and a sign-in link (needs SMTP).<br />
        Owner: full access. Manager: same rights as Owner, but can only delete records they created, and can't reach the Owner tools. Executor: does the work — submits requests, updates work orders; Owners can add designations (Planner, Scheduler, Specialist) with the pencil icon. Guest: read-only.
      </div>
      {error && <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.rust, marginBottom: 10 }}>{error}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Btn variant="primary" onClick={add}><UserPlus size={14} /> Add member</Btn>
      </div>
      {notifyUser && <MemberNotifyModal user={notifyUser} onClose={() => setNotifyUser(null)} onSaved={load} />}
      {resetUser && <ResetPasswordModal user={resetUser} onClose={() => setResetUser(null)} onDone={load} />}
    </Panel>
  );
}

function DeleteWorkOrderTool({ data, update }) {
  const dialog = useDialog();
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return data.workOrders.filter((w) => {
      const num = formatWoNum(w.number || 0).toLowerCase();
      const plainNum = String(w.number || "").toLowerCase();
      return num.includes(q) || plainNum.includes(q) || w.title.toLowerCase().includes(q);
    }).slice(0, 20);
  }, [query, data.workOrders]);

  const remove = async (w) => {
    const ok = await dialog.confirm(`Permanently delete ${formatWoNum(w.number)} — "${w.title}"? This cannot be undone.`);
    if (!ok) return;
    update((d) => {
      d.workOrders = d.workOrders.filter((x) => x.id !== w.id);
      d.workRequests.forEach((r) => { if (r.workOrderId === w.id) r.workOrderId = null; });
      d.workOrders.forEach((x) => { if (x.sourcePmBaseId === w.id) x.sourcePmBaseId = null; });
      return d;
    });
  };

  return (
    <Panel style={{ padding: 18 }}>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 15, fontWeight: 600, color: C.ink, marginBottom: 4 }}>Delete a work order<InfoTip k="delWo" /></div>
      <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.inkFaint, marginBottom: 12 }}>Search by number (e.g. WO-0012) or title. This also works for PM Base templates.</div>
      <input style={inputStyle} placeholder="WO-0012" value={query} onChange={(e) => setQuery(e.target.value)} />
      {query.trim() && results.length === 0 && <Empty text="No matching work orders." />}
      {results.map((w) => (
        <div key={w.id} className="hk-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 4px", borderTop: `1px solid ${C.lineSoft}`, marginTop: 8 }}>
          <div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, color: C.ink }}>{formatWoNum(w.number)} · {w.title}</div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint }}>{w.type} · {w.status}</div>
          </div>
          <Btn small variant="danger" onClick={() => remove(w)}><Trash2 size={12} /> Delete</Btn>
        </div>
      ))}
    </Panel>
  );
}

function DeleteWorkRequestTool({ data, update }) {
  const dialog = useDialog();
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return data.workRequests.filter((w) => {
      const num = formatWrNum(w.number || 0).toLowerCase();
      const plainNum = String(w.number || "").toLowerCase();
      return num.includes(q) || plainNum.includes(q) || w.title.toLowerCase().includes(q);
    }).slice(0, 20);
  }, [query, data.workRequests]);

  const remove = async (w) => {
    const ok = await dialog.confirm(`Permanently delete ${formatWrNum(w.number)} — "${w.title}"? This cannot be undone.`);
    if (!ok) return;
    update((d) => { d.workRequests = d.workRequests.filter((x) => x.id !== w.id); return d; });
  };

  return (
    <Panel style={{ padding: 18 }}>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 15, fontWeight: 600, color: C.ink, marginBottom: 4 }}>Delete a work request<InfoTip k="delWr" /></div>
      <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.inkFaint, marginBottom: 12 }}>Search by number (e.g. WR-0004) or title.</div>
      <input style={inputStyle} placeholder="WR-0004" value={query} onChange={(e) => setQuery(e.target.value)} />
      {query.trim() && results.length === 0 && <Empty text="No matching work requests." />}
      {results.map((w) => (
        <div key={w.id} className="hk-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 4px", borderTop: `1px solid ${C.lineSoft}`, marginTop: 8 }}>
          <div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, color: C.ink }}>{formatWrNum(w.number)} · {w.title}</div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint }}>{w.status}</div>
          </div>
          <Btn small variant="danger" onClick={() => remove(w)}><Trash2 size={12} /> Delete</Btn>
        </div>
      ))}
    </Panel>
  );
}

// Manually add something to buy (v2.2): an existing catalogue part, or a
// free-typed item that isn't in the catalogue at all.
function AddPurchaseModal({ data, update, currentUser, onClose }) {
  const [partId, setPartId] = useState("");
  const [name, setName] = useState("");
  const [qty, setQty] = useState("1");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const part = partId ? data.inventory.find((p) => p.id === partId) : null;
  const save = () => {
    const q = Number(qty);
    if (!part && !name.trim()) { setError("Pick a part from the catalogue or type the name of what to buy."); return; }
    if (!Number.isFinite(q) || q <= 0) { setError("Enter a quantity greater than zero."); return; }
    update((d) => {
      d.purchaseList = d.purchaseList || [];
      d.purchaseList.push({ id: uid("pl"), partId: part ? part.id : null, name: part ? part.name : name.trim(), qty: q, note: note.trim(), addedBy: currentUser, date: todayISO() });
      return d;
    });
    onClose();
  };
  return (
    <Modal title="Add a part to buy" info="buyPart" onClose={onClose}>
      <Field label="Part from the catalogue">
        <select style={inputStyle} value={partId} onChange={(e) => { setPartId(e.target.value); setError(""); }}>
          <option value="">— not in the catalogue —</option>
          {data.inventory.map((p) => <option key={p.id} value={p.id}>{formatPartNum(p.partNumber)} · {p.name}</option>)}
        </select>
      </Field>
      {!part && <Field label="Or describe the part" required><input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 20x25x1 furnace filter" autoFocus /></Field>}
      <div className="hk-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
        <Field label="Quantity to buy" required><input type="number" min="1" style={inputStyle} value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
        <Field label="Note (store, link, size…)"><input style={inputStyle} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      </div>
      {error && <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.rust, marginBottom: 10 }}>{error}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" onClick={save}>Add to list</Btn>
      </div>
    </Modal>
  );
}

function PurchasingView({ data, update, currentUser, goToOrder }) {
  const dialog = useDialog();
  const [adding, setAdding] = useState(false);
  const manual = data.purchaseList || [];
  const groups = data.workOrders
    .filter((w) => isOpenStatus(w.status) && w.type !== "PM Base")
    .map((w) => {
      const shortages = (w.parts || []).map(({ partId, qty }) => {
        const part = data.inventory.find((p) => p.id === partId);
        if (!part) return null;
        const needed = Number(qty) || 0;
        const shortfall = needed - part.qty;
        return shortfall > 0 ? { part, needed, onHand: part.qty, shortfall } : null;
      }).filter(Boolean);
      return { wo: w, shortages };
    })
    .filter((g) => g.shortages.length > 0);

  const totalItems = groups.reduce((s, g) => s + g.shortages.length, 0);
  const removeManual = async (item) => {
    const ok = await dialog.confirm(`Remove "${item.name}" from the list?`);
    if (!ok) return;
    update((d) => { d.purchaseList = (d.purchaseList || []).filter((x) => x.id !== item.id); return d; });
  };

  return (
    <div>
      <SectionHeader
        title="Purchasing"
        subtitle="Parts needed for open work that aren't fully stocked, plus anything you add by hand."
        info={PAGE_INFO.purchasing}
        action={<Btn variant="primary" onClick={() => setAdding(true)}><Plus size={15} /> Add part</Btn>}
      />
      {manual.length > 0 && (
        <Panel style={{ padding: 16, marginBottom: 14 }}>
          <div style={{ fontFamily: FONT_HEAD, fontSize: 13.5, fontWeight: 600, color: C.ink, marginBottom: 8 }}>Added by hand ({manual.length})</div>
          {manual.map((item) => {
            const part = item.partId ? data.inventory.find((p) => p.id === item.partId) : null;
            return (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "7px 0", borderTop: `1px solid ${C.lineSoft}` }}>
                <div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.ink }}>{part ? `${formatPartNum(part.partNumber)} · ${part.name}` : item.name} × {item.qty}</div>
                  {(item.note || item.addedBy) && <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint }}>{[item.note, item.addedBy ? `added by ${item.addedBy}` : "", item.date ? fmtDate(item.date) : ""].filter(Boolean).join(" · ")}</div>}
                </div>
                <button onClick={() => removeManual(item)} title="Remove from list" style={{ background: "none", border: "none", cursor: "pointer", color: C.rust }}><Trash2 size={14} /></button>
              </div>
            );
          })}
        </Panel>
      )}
      {groups.length === 0 ? (
        manual.length === 0 && <Empty text="Nothing to buy — every part needed for open work is in stock. Use Add part to note something to pick up." />
      ) : (
        <>
          <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.inkFaint, marginBottom: 14 }}>
            {totalItems} part{totalItems === 1 ? "" : "s"} short across {groups.length} work order{groups.length === 1 ? "" : "s"}.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {groups.map(({ wo, shortages }) => (
              <Panel key={wo.id} style={{ padding: 16 }}>
                <div onClick={() => goToOrder(wo.id)} style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 13.5, fontWeight: 700, color: C.ink }}>{formatWoNum(wo.number)} · {wo.title}</span>
                  <Tag text={wo.status} color={WO_STATUS_COLORS[wo.status]} soft={C.panelAlt} />
                </div>
                {shortages.map(({ part, needed, onHand, shortfall }) => (
                  <div key={part.id} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderTop: `1px solid ${C.lineSoft}` }}>
                    <span style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.ink }}>{formatPartNum(part.partNumber)} · {part.name}</span>
                    <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.rust, fontWeight: 600 }}>need {needed}, have {onHand} — buy {shortfall}</span>
                  </div>
                ))}
              </Panel>
            ))}
          </div>
        </>
      )}
      {adding && <AddPurchaseModal data={data} update={update} currentUser={currentUser} onClose={() => setAdding(false)} />}
    </div>
  );
}

const ALARM_SEVERITY_LABELS = { critical: "Critical", warning: "Warning", info: "Info" };
const ALARM_SOURCE_LABELS = { home_assistant: "Home Assistant", manual: "Manual", pm_checklist: "PM checklist" };

function AlarmsView({ data, update, role, currentUser, onAlarmsChanged, features }) {
  // The Home Assistant webhook integration is an Owner-controlled feature
  // (Owner Tools → Features, see backend/features.js). The rest of this
  // dashboard (manual alarms, PM-checklist-triggered alarms) stays on
  // regardless. Default to on if `features` isn't known yet rather than
  // flashing the setup UI and then yanking it away.
  const haAlarmsEnabled = !features || features.homeAssistantAlarms !== false;
  const dialog = useDialog();
  const [tab, setTab] = useState("open");
  const [alarms, setAlarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mappings, setMappings] = useState([]);
  const [showSetup, setShowSetup] = useState(false);
  const [webhookKey, setWebhookKey] = useState(null);
  const [showKey, setShowKey] = useState(false);
  const [modal, setModal] = useState(null);
  const [actionForm, setActionForm] = useState({});
  const [mapForm, setMapForm] = useState(null);
  const [manualForm, setManualForm] = useState(null);
  const [locFilter, setLocFilter] = useState(null);

  const load = () => {
    setLoading(true);
    api.listAlarms().then((rows) => { setAlarms(rows); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(() => {
    load();
    if (haAlarmsEnabled) api.listAlarmMappings().then(setMappings).catch(() => setMappings([]));
  }, []); // eslint-disable-line
  useEffect(() => {
    if (role === "Owner" && haAlarmsEnabled) api.getWebhookKey().then((r) => setWebhookKey(r.key)).catch(() => {});
  }, [role, haAlarmsEnabled]);

  const afterChange = () => { load(); onAlarmsChanged && onAlarmsChanged(); };

  const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 };
  const SEVERITY_COLORS = { critical: C.rust, warning: C.orange, info: C.navy };
  // An alarm sits at its own location, or its asset's location if it has none.
  const alarmLocId = (a) => a.locationId || (a.assetId ? (data.assets.find((x) => x.id === a.assetId) || {}).locationId : null) || null;
  const allowedLocs = locFilter ? descendantIds(data.locations, locFilter) : null;
  const inFilter = (a) => !allowedLocs || allowedLocs.has(alarmLocId(a));
  // Beacons: every location holding an open alarm, plus all of its parents.
  const beaconIds = new Set();
  alarms.filter((a) => a.status === "open").forEach((a) => {
    let id = alarmLocId(a), guard = 0;
    while (id && !beaconIds.has(id) && guard++ < 50) {
      beaconIds.add(id);
      const loc = data.locations.find((l) => l.id === id);
      id = loc ? loc.parentId : null;
    }
  });
  const openAlarms = alarms.filter((a) => a.status === "open" && inFilter(a))
    .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 1) - (SEVERITY_ORDER[b.severity] ?? 1) || (b.triggeredAt || "").localeCompare(a.triggeredAt || ""));
  const historyAlarms = alarms.filter((a) => a.status !== "open" && inFilter(a))
    .sort((a, b) => (b.resolvedAt || b.triggeredAt || "").localeCompare(a.resolvedAt || a.triggeredAt || ""));
  const shown = tab === "open" ? openAlarms : historyAlarms;

  const openWOOptions = data.workOrders.filter((w) => !isDoneStatus(w.status) && w.type !== "PM Base");

  const openAction = (action, alarm) => {
    setActionForm({
      reason: "",
      title: alarm.friendlyName || alarm.message || "Sensor alert",
      description: alarm.message || "",
      locationId: alarm.locationId || data.locations[0]?.id || "",
      assetId: alarm.assetId || null,
      priority: alarm.severity === "critical" ? "High" : alarm.severity === "info" ? "Low" : "Medium",
      requiredByDate: todayISO(),
      mergeInto: "",
    });
    setModal({ action, alarm });
  };

  const doAcknowledgeFalse = async () => {
    if (!actionForm.reason.trim()) { await dialog.alertMsg("A reason is required."); return; }
    await api.updateAlarm(modal.alarm.id, { status: "acknowledged_false", resolutionReason: actionForm.reason.trim() });
    setModal(null);
    afterChange();
  };
  const doCreateRequest = async () => {
    if (!actionForm.title.trim() || !actionForm.locationId) { await dialog.alertMsg("Title and location are required."); return; }
    const alarm = modal.alarm;
    const newId = uid("wr");
    update((d) => {
      d.counters = d.counters || { wo: 0, wr: 0, part: 0 };
      d.counters.wr += 1;
      d.workRequests.push({
        id: newId, number: d.counters.wr, title: actionForm.title.trim(), description: actionForm.description || "",
        assetId: actionForm.assetId || null, bomNodeId: null, locationId: actionForm.locationId,
        priority: actionForm.priority || "Medium", requiredByDate: actionForm.requiredByDate || todayISO(),
        suggestedType: "Corrective", suggestedParts: [], photos: [],
        requestedBy: currentUser, dateSubmitted: todayISO(),
        status: "Submitted", reviewNote: `From alarm: ${alarm.message || alarm.friendlyName || alarm.sourceEntityId || ""}`.trim(),
        workOrderId: null, createdBy: currentUser,
      });
      return d;
    });
    await api.updateAlarm(alarm.id, { status: "linked_to_work_request", resolutionType: "work_request", resolutionRef: newId });
    setModal(null);
    afterChange();
  };
  const doLinkWO = async () => {
    if (!actionForm.mergeInto) { await dialog.alertMsg("Choose a work order."); return; }
    await api.updateAlarm(modal.alarm.id, { status: "linked_to_work_order", resolutionType: "work_order", resolutionRef: actionForm.mergeInto });
    setModal(null);
    afterChange();
  };

  const openMapForm = (m) => setMapForm(m ? { ...m } : { entityId: "", assetId: "", locationId: "", label: "" });
  const isEditingMap = mapForm && mappings.some((m) => m.entityId === mapForm.entityId);
  const saveMap = async () => {
    if (!mapForm.entityId.trim()) { await dialog.alertMsg("An entity id is required."); return; }
    const saved = await api.saveAlarmMapping(mapForm.entityId.trim(), { assetId: mapForm.assetId || null, locationId: mapForm.locationId || null, label: mapForm.label || "" });
    setMappings((prev) => [...prev.filter((m) => m.entityId !== saved.entityId), saved].sort((a, b) => a.entityId.localeCompare(b.entityId)));
    setMapForm(null);
  };
  const deleteMap = async (entityId) => {
    const ok = await dialog.confirm(`Remove the mapping for "${entityId}"?`);
    if (!ok) return;
    await api.deleteAlarmMapping(entityId);
    setMappings((prev) => prev.filter((m) => m.entityId !== entityId));
  };
  const regenerateKey = async () => {
    const ok = await dialog.confirm("Regenerate the webhook API key? Any Home Assistant automation using the old key will stop working until it's updated there too.");
    if (!ok) return;
    const r = await api.regenerateWebhookKey();
    setWebhookKey(r.key);
  };
  const copyText = async (text) => { try { await navigator.clipboard.writeText(text); } catch (e) { /* no clipboard access — nothing to fall back to */ } };

  const openManualForm = () => setManualForm({
    title: "", message: "", severity: "warning",
    locationId: data.locations[0]?.id || "", assetId: "",
  });
  const saveManual = async () => {
    if (!manualForm.title.trim()) { await dialog.alertMsg("A title is required."); return; }
    await api.createManualAlarm({
      source: "manual",
      friendlyName: manualForm.title.trim(),
      message: manualForm.message.trim() || manualForm.title.trim(),
      severity: manualForm.severity,
      assetId: manualForm.assetId || null,
      locationId: manualForm.locationId || null,
    });
    setManualForm(null);
    afterChange();
  };

  return (
    <div>
      <SectionHeader
        title="Alarms"
        subtitle={
          haAlarmsEnabled
            ? "Everything that needs attention right now: sensor alerts from Home Assistant, out-of-spec PM checklist readings, and manually raised alarms."
            : "Everything that needs attention right now: out-of-spec PM checklist readings and manually raised alarms."
        }
        info={PAGE_INFO.alarms}
        action={
          <div style={{ display: "flex", gap: 8 }}>
            {isAdmin(role) && <Btn small variant="primary" onClick={openManualForm}><Plus size={13} /> Create alarm</Btn>}
            {isAdmin(role) && haAlarmsEnabled && <Btn small variant="ghost" onClick={() => setShowSetup((s) => !s)}><Key size={13} /> Webhook & sensor setup</Btn>}
          </div>
        }
      />

      {showSetup && isAdmin(role) && haAlarmsEnabled && (
        <Panel style={{ padding: 16, marginBottom: 16 }}>
          {role === "Owner" && (
            <>
              <div style={{ fontFamily: FONT_HEAD, fontSize: 13.5, fontWeight: 600, color: C.ink, marginBottom: 10 }}>Home Assistant webhook<InfoTip k="haWebhook" /></div>
              <div className="hk-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 10.5, fontWeight: 700, color: C.inkFaint, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 4 }}>Webhook URL</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <code style={{ fontFamily: "monospace", fontSize: 11.5, color: C.ink, background: C.panelAlt, padding: "5px 8px", borderRadius: 3, overflowX: "auto", whiteSpace: "nowrap", flex: 1 }}>{api.webhookUrl()}</code>
                    <button onClick={() => copyText(api.webhookUrl())} title="Copy" className="hk-tap" style={{ background: "none", border: `1px solid ${C.line}`, borderRadius: 3, cursor: "pointer", color: C.inkSoft, padding: 6 }}><Copy size={13} /></button>
                  </div>
                </div>
                <div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 10.5, fontWeight: 700, color: C.inkFaint, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 4 }}>API key</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <code style={{ fontFamily: "monospace", fontSize: 11.5, color: C.ink, background: C.panelAlt, padding: "5px 8px", borderRadius: 3, overflowX: "auto", whiteSpace: "nowrap", flex: 1 }}>
                      {webhookKey ? (showKey ? webhookKey : "•".repeat(24)) : "loading…"}
                    </code>
                    <button onClick={() => setShowKey((s) => !s)} title={showKey ? "Hide" : "Reveal"} className="hk-tap" style={{ background: "none", border: `1px solid ${C.line}`, borderRadius: 3, cursor: "pointer", color: C.inkSoft, padding: 6 }}>{showKey ? <EyeOff size={13} /> : <Eye size={13} />}</button>
                    <button onClick={() => webhookKey && copyText(webhookKey)} title="Copy" className="hk-tap" style={{ background: "none", border: `1px solid ${C.line}`, borderRadius: 3, cursor: "pointer", color: C.inkSoft, padding: 6 }}><Copy size={13} /></button>
                  </div>
                  <Btn small variant="ghost" onClick={regenerateKey}>Regenerate</Btn>
                </div>
              </div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint, marginBottom: 8 }}>
                POST a JSON body with header <code>X-Api-Key</code> (or <code>Authorization: Bearer …</code>). Fields: <code>entity_id</code>, <code>friendly_name</code>, <code>state</code>, <code>attributes</code>, <code>message</code>, <code>severity</code> (info/warning/critical, defaults to warning), <code>timestamp</code> — only <code>entity_id</code> or <code>message</code> is required. Example Home Assistant <code>rest_command</code>:
              </div>
              <pre style={{ fontFamily: "monospace", fontSize: 11, color: C.ink, background: C.panelAlt, padding: 10, borderRadius: 4, overflowX: "auto", marginBottom: 16 }}>
{`rest_command:
  maintenhance_alarm:
    url: "${api.webhookUrl()}"
    method: POST
    headers:
      X-Api-Key: "<your key>"
    content_type: "application/json"
    payload: >
      {"entity_id": "{{ entity_id }}", "friendly_name": "{{ friendly_name }}",
       "state": "{{ state }}", "severity": "warning",
       "message": "{{ friendly_name }} reads {{ state }}"}`}
              </pre>
            </>
          )}
          <div style={{ fontFamily: FONT_HEAD, fontSize: 13.5, fontWeight: 600, color: C.ink, marginBottom: 6 }}>Sensor mappings<InfoTip k="sensorMaps" /></div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint, marginBottom: 10 }}>Map an HA entity id to an asset/location so alerts from it arrive already linked, instead of unassigned.</div>
          {mappings.length === 0 && <Empty text="No sensor mappings yet." />}
          {mappings.map((m) => (
            <div key={m.entityId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderTop: `1px solid ${C.lineSoft}` }}>
              <div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, fontWeight: 600, color: C.ink }}>{m.entityId}{m.label ? ` · ${m.label}` : ""}</div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint }}>
                  {m.assetId ? nameOf(data.assets, m.assetId) : "no asset"}{m.locationId ? ` · ${locationPath(data.locations, m.locationId)}` : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <Btn small variant="ghost" onClick={() => openMapForm(m)}><Pencil size={12} /></Btn>
                <Btn small variant="danger" onClick={() => deleteMap(m.entityId)}><Trash2 size={12} /></Btn>
              </div>
            </div>
          ))}
          <Btn small variant="ghost" onClick={() => openMapForm(null)} style={{ marginTop: 10 }}><Plus size={13} /> Add mapping</Btn>
        </Panel>
      )}

      <div className="hk-grid-fixed2" style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 16 }}>
      <LocationNavTree data={data} selectedId={locFilter} onSelect={setLocFilter} beaconIds={beaconIds} />
      <div style={{ minWidth: 0 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <Btn small variant={tab === "open" ? "primary" : "ghost"} onClick={() => setTab("open")}>Open ({openAlarms.length})</Btn>
        <Btn small variant={tab === "history" ? "primary" : "ghost"} onClick={() => setTab("history")}>History</Btn>
      </div>

      <Panel>
        {loading && <div style={{ padding: 20 }}><Loader2 className="animate-spin" size={16} color={C.inkSoft} /></div>}
        {!loading && shown.length === 0 && <Empty text={tab === "open" ? "No open alarms." : "No resolved alarms yet."} />}
        {!loading && shown.map((a) => (
          <div key={a.id} style={{ padding: "14px 18px", borderTop: `1px solid ${C.lineSoft}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, color: C.ink }}>{a.message || a.friendlyName || "Sensor alert"}</div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.inkFaint, marginTop: 2 }}>
                  {ALARM_SOURCE_LABELS[a.source] || a.source} ·{" "}
                  {a.source === "home_assistant" && a.sourceEntityId ? `${a.sourceEntityId} · ` : ""}
                  {a.assetId ? `${nameOf(data.assets, a.assetId)} · ` : ""}
                  {a.locationId ? `${locationPath(data.locations, a.locationId)} · ` : ""}
                  {fmtDate((a.triggeredAt || "").slice(0, 10))}
                </div>
              </div>
              <Tag text={ALARM_SEVERITY_LABELS[a.severity] || a.severity} color={SEVERITY_COLORS[a.severity] || C.navy} soft={C.panelAlt} />
            </div>
            {tab === "open" && (
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                <Btn small variant="primary" onClick={() => openAction("convert", a)}><Plus size={12} /> Create work request</Btn>
                <Btn small variant="ghost" onClick={() => openAction("link", a)}><Link2 size={12} /> Link to work order</Btn>
                <Btn small variant="danger" onClick={() => openAction("false", a)}>Acknowledge as false</Btn>
              </div>
            )}
            {tab === "history" && (
              <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.inkFaint, marginTop: 8 }}>
                {a.status === "acknowledged_false" && `Acknowledged as false alarm${a.resolutionReason ? `: ${a.resolutionReason}` : ""}`}
                {a.status === "linked_to_work_request" && "Linked to a work request"}
                {a.status === "linked_to_work_order" && "Linked to a work order"}
              </div>
            )}
          </div>
        ))}
      </Panel>
      </div>
      </div>

      {modal && modal.action === "false" && (
        <Modal title="Acknowledge as false alarm" info="falseAlarm" onClose={() => setModal(null)}>
          <Field label="Reason (helps tune this sensor later)" required>
            <textarea style={{ ...inputStyle, minHeight: 70 }} value={actionForm.reason} onChange={(e) => setActionForm({ ...actionForm, reason: e.target.value })} autoFocus />
          </Field>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn variant="danger" onClick={doAcknowledgeFalse}>Acknowledge as false</Btn>
          </div>
        </Modal>
      )}
      {modal && modal.action === "convert" && (
        <Modal title="Create a work request from this alarm" info="alarmToWr" onClose={() => setModal(null)} wide>
          <Field label="Title" required><input style={inputStyle} value={actionForm.title} onChange={(e) => setActionForm({ ...actionForm, title: e.target.value })} autoFocus /></Field>
          <Field label="Description"><textarea style={{ ...inputStyle, minHeight: 60 }} value={actionForm.description} onChange={(e) => setActionForm({ ...actionForm, description: e.target.value })} /></Field>
          <div className="hk-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Location" required>
              <select style={inputStyle} value={actionForm.locationId} onChange={(e) => setActionForm({ ...actionForm, locationId: e.target.value })}>
                {flattenTree(data.locations, "parentId", null).map(({ item, depth }) => (
                  <option key={item.id} value={item.id}>{"—".repeat(depth) + " " + item.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Priority">
              <select style={inputStyle} value={actionForm.priority} onChange={(e) => setActionForm({ ...actionForm, priority: e.target.value })}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Required by"><input type="date" style={inputStyle} value={actionForm.requiredByDate} onChange={(e) => setActionForm({ ...actionForm, requiredByDate: e.target.value })} /></Field>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn variant="primary" onClick={doCreateRequest}>Create work request</Btn>
          </div>
        </Modal>
      )}
      {modal && modal.action === "link" && (
        <Modal title="Link to an existing work order" info="linkWo" onClose={() => setModal(null)}>
          <Field label="Work order" required>
            <select style={inputStyle} value={actionForm.mergeInto} onChange={(e) => setActionForm({ ...actionForm, mergeInto: e.target.value })}>
              <option value="">— choose —</option>
              {openWOOptions.map((w) => <option key={w.id} value={w.id}>{formatWoNum(w.number)} · {w.title} ({w.type})</option>)}
            </select>
          </Field>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn variant="primary" onClick={doLinkWO}>Link</Btn>
          </div>
        </Modal>
      )}
      {mapForm && (
        <Modal title={isEditingMap ? "Edit sensor mapping" : "Add sensor mapping"} info="sensorMap" onClose={() => setMapForm(null)}>
          <Field label="Entity id" required>
            <input style={inputStyle} value={mapForm.entityId} onChange={(e) => setMapForm({ ...mapForm, entityId: e.target.value })} placeholder="e.g. binary_sensor.basement_leak" autoFocus disabled={isEditingMap} />
          </Field>
          <Field label="Label (optional)"><input style={inputStyle} value={mapForm.label} onChange={(e) => setMapForm({ ...mapForm, label: e.target.value })} placeholder="e.g. Basement leak sensor" /></Field>
          <Field label="Asset (optional)">
            <select style={inputStyle} value={mapForm.assetId || ""} onChange={(e) => {
              const assetId = e.target.value || "";
              const asset = data.assets.find((a) => a.id === assetId);
              setMapForm({ ...mapForm, assetId: assetId || null, locationId: asset ? asset.locationId : mapForm.locationId });
            }}>
              <option value="">— none —</option>
              {liveAssets(data).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Field>
          <Field label="Location (optional)">
            <select style={inputStyle} value={mapForm.locationId || ""} onChange={(e) => setMapForm({ ...mapForm, locationId: e.target.value || null })}>
              <option value="">— none —</option>
              {flattenTree(data.locations, "parentId", null).map(({ item, depth }) => (
                <option key={item.id} value={item.id}>{"—".repeat(depth) + " " + item.name}</option>
              ))}
            </select>
          </Field>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Btn variant="ghost" onClick={() => setMapForm(null)}>Cancel</Btn>
            <Btn variant="primary" onClick={saveMap}>Save</Btn>
          </div>
        </Modal>
      )}
      {manualForm && (
        <Modal title="Create alarm" info="createAlarm" onClose={() => setManualForm(null)} wide>
          <Field label="Title" required><input style={inputStyle} value={manualForm.title} onChange={(e) => setManualForm({ ...manualForm, title: e.target.value })} autoFocus /></Field>
          <Field label="Details"><textarea style={{ ...inputStyle, minHeight: 60 }} value={manualForm.message} onChange={(e) => setManualForm({ ...manualForm, message: e.target.value })} /></Field>
          <div className="hk-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Severity">
              <select style={inputStyle} value={manualForm.severity} onChange={(e) => setManualForm({ ...manualForm, severity: e.target.value })}>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </Field>
            <Field label="Asset (optional)">
              <select style={inputStyle} value={manualForm.assetId || ""} onChange={(e) => setManualForm({ ...manualForm, assetId: e.target.value || "" })}>
                <option value="">— none —</option>
                {liveAssets(data).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Location (optional)">
            <select style={inputStyle} value={manualForm.locationId || ""} onChange={(e) => setManualForm({ ...manualForm, locationId: e.target.value || "" })}>
              <option value="">— none —</option>
              {flattenTree(data.locations, "parentId", null).map(({ item, depth }) => (
                <option key={item.id} value={item.id}>{"—".repeat(depth) + " " + item.name}</option>
              ))}
            </select>
          </Field>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Btn variant="ghost" onClick={() => setManualForm(null)}>Cancel</Btn>
            <Btn variant="primary" onClick={saveManual}>Create alarm</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// v1.8: editor for the PM Wizard's starter-maintenance catalogue (see
// effectiveWizardCatalog / PmWizardModal). Add/edit/remove entries here;
// changes apply the next time anyone runs the wizard from a Property.
// Export/import rides along with the rest of the app's data via
// BackupTools (see the "pmWizardCatalog" entry in SHEET_SPECS).
function PmWizardCatalogEditor({ data, update }) {
  const dialog = useDialog();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);
  const catalog = effectiveWizardCatalog(data);
  const ZONE_OPTIONS = CLIMATE_ZONES.filter((z) => z !== "Unknown");
  const [fType, setFType] = useState("");
  const [fCat, setFCat] = useState("");
  const [fq, setFq] = useState("");
  const typeOptions = uniqSorted(catalog.map(catType));
  const catOptions = uniqSorted(catalog.filter((i) => !fType || catType(i) === fType).map(catCategory));
  const visible = catalog.filter((i) => (!fType || catType(i) === fType) && (!fCat || catCategory(i) === fCat)
    && (!fq.trim() || (i.title + " " + (i.description || "")).toLowerCase().includes(fq.trim().toLowerCase())));

  const openAdd = () => {
    setForm({ type: fType || "Home", category: fCat || "", title: "", description: "", frequencyValue: 12, frequencyUnit: "months", crewRequired: 1, estHours: 1, allZones: true, zones: [] });
    setModal("add");
  };
  const openEdit = (item) => {
    setForm({
      id: item.id, type: catType(item), category: item.category || "", title: item.title, description: item.description || "",
      frequencyValue: item.frequencyValue || 12, frequencyUnit: item.frequencyUnit || "months",
      crewRequired: item.crewRequired || 1, estHours: item.estHours || 1,
      allZones: item.zones === "all", zones: item.zones === "all" ? [] : (item.zones || []),
    });
    setModal("edit");
  };
  const toggleZone = (z) => setForm((f) => ({
    ...f, zones: f.zones.includes(z) ? f.zones.filter((x) => x !== z) : [...f.zones, z],
  }));

  const save = async () => {
    if (!form.title.trim()) { await dialog.alertMsg("A title is required."); return; }
    const entry = {
      id: form.id || uid("wc"),
      type: form.type.trim() || "Home",
      category: form.category.trim(),
      title: form.title.trim(),
      description: form.description.trim(),
      frequencyValue: Number(form.frequencyValue) || 1,
      frequencyUnit: form.frequencyUnit,
      crewRequired: Number(form.crewRequired) >= 1 ? Number(form.crewRequired) : 1,
      estHours: Number(form.estHours) > 0 ? Number(form.estHours) : 1,
      zones: form.allZones ? "all" : form.zones,
    };
    update((d) => {
      const current = effectiveWizardCatalog(d);
      d.pmWizardCatalog = modal === "edit"
        ? current.map((i) => (i.id === entry.id ? entry : i))
        : [...current, entry];
      return d;
    });
    setModal(null);
    setForm(null);
  };
  const remove = async (item) => {
    const ok = await dialog.confirm(`Remove "${item.title}" from the starter catalogue? This doesn't touch any PM Base already created from it.`);
    if (!ok) return;
    update((d) => {
      d.pmWizardCatalog = effectiveWizardCatalog(d).filter((i) => i.id !== item.id);
      return d;
    });
  };
  const resetToDefault = async () => {
    const ok = await dialog.confirm("Replace the current starter catalogue with the built-in default list? Any custom entries you've added will be lost.");
    if (!ok) return;
    update((d) => { d.pmWizardCatalog = PM_WIZARD_CATALOG.map((i) => ({ ...i })); return d; });
  };

  const listBody = (
    <>
      {catalog.length === 0 && <Empty text="No starter-catalogue entries — the wizard will offer nothing to pick from until you add some." />}
      {catalog.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, margin: "10px 0 4px" }}>
          <select style={inputStyle} value={fType} onChange={(e) => { setFType(e.target.value); setFCat(""); }}>
            <option value="">All types</option>
            {typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select style={inputStyle} value={fCat} onChange={(e) => setFCat(e.target.value)}>
            <option value="">All sub types</option>
            {catOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input style={inputStyle} value={fq} onChange={(e) => setFq(e.target.value)} placeholder="Search…" />
        </div>
      )}
      {catalog.length > 0 && <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint, marginBottom: 4 }}>{visible.length} of {catalog.length} entries shown</div>}
      {visible.map((item) => (
        <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 0", borderTop: `1px solid ${C.lineSoft}`, gap: 10 }}>
          <div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, color: C.ink }}>{item.title}</div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint, marginTop: 2 }}>
              {catType(item)} · {catCategory(item)} · Every {item.frequencyValue} {item.frequencyUnit} · {item.zones === "all" ? "All climate zones" : (item.zones || []).join(", ") || "No zones selected"}
            </div>
            {item.description && <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint, marginTop: 2 }}>{item.description}</div>}
          </div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <Btn small variant="ghost" onClick={() => openEdit(item)}><Pencil size={12} /></Btn>
            <Btn small variant="danger" onClick={() => remove(item)}><Trash2 size={12} /></Btn>
          </div>
        </div>
      ))}
    </>
  );
  const btns = (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <Btn small variant="ghost" onClick={resetToDefault}>Reset to default</Btn>
      <Btn small onClick={openAdd}><Plus size={13} /> Add an entry</Btn>
    </div>
  );
  return (
    <Panel style={{ padding: 18 }}>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 15, fontWeight: 600, color: C.ink }}>PM Wizard starter catalogue<InfoTip k="pmWizardCatalog" /></div>
      <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.inkFaint, margin: "2px 0 12px" }}>
        The suggested maintenance list the PM setup wizard offers when it's run on a {levelLabel(LOCATION_LEVELS[SETTINGS.terms.siteLevelIndex])}. Editing this doesn't change any PM Base already created. {catalog.length} entries.
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Btn small variant="ghost" onClick={resetToDefault}>Reset to default</Btn>
        <Btn small onClick={openAdd}><Plus size={13} /> Add an entry</Btn>
        <Btn small variant="primary" onClick={() => setViewOpen(true)}><Search size={13} /> View entries</Btn>
      </div>
      {viewOpen && (
        <Modal title="PM Wizard starter catalogue — entries" info="pmWizardCatalog" onClose={() => setViewOpen(false)} wide>
          <div style={{ marginBottom: 8 }}>{btns}</div>
          {listBody}
        </Modal>
      )}
      {modal && form && (
        <Modal title={modal === "edit" ? "Edit starter-catalogue entry" : "Add starter-catalogue entry"} info="catEntry" onClose={() => { setModal(null); setForm(null); }} wide>
          <div className="hk-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Type (Home, Facilities, …)">
              <input style={inputStyle} list="pmcat-types" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
              <datalist id="pmcat-types">{typeOptions.map((t) => <option key={t} value={t} />)}</datalist>
            </Field>
            <Field label="Sub type (HVAC, Lawn & garden, …)">
              <input style={inputStyle} list="pmcat-cats" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              <datalist id="pmcat-cats">{uniqSorted(catalog.filter((i) => catType(i) === (form.type.trim() || "Home")).map(catCategory)).map((c) => <option key={c} value={c} />)}</datalist>
            </Field>
          </div>
          <Field label="Title" required><input style={inputStyle} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus /></Field>
          <Field label="Description"><textarea style={{ ...inputStyle, minHeight: 60 }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <div className="hk-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Every"><input type="number" min="1" style={inputStyle} value={form.frequencyValue} onChange={(e) => setForm({ ...form, frequencyValue: e.target.value })} /></Field>
            <Field label="Unit">
              <select style={inputStyle} value={form.frequencyUnit} onChange={(e) => setForm({ ...form, frequencyUnit: e.target.value })}>
                {FREQUENCY_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </Field>
          </div>
          <div className="hk-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Executors required"><input type="number" min="1" step="1" style={inputStyle} value={form.crewRequired} onChange={(e) => setForm({ ...form, crewRequired: e.target.value })} /></Field>
            <Field label="Hours per executor"><input type="number" min="0" step="0.25" style={inputStyle} value={form.estHours} onChange={(e) => setForm({ ...form, estHours: e.target.value })} /></Field>
          </div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint, marginTop: -2, marginBottom: 6 }}>
            Every entry created here becomes a Calendar / Non-fixed PM Base — matching what the wizard has always generated. Meter- and seasonal-triggered PM still need to be set up by hand afterward, from Work Orders.
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: FONT_BODY, fontSize: 13, color: C.ink, cursor: "pointer", marginBottom: 8 }}>
            <input type="checkbox" checked={form.allZones} onChange={(e) => setForm({ ...form, allZones: e.target.checked })} /> Applies to all climate zones
          </label>
          {!form.allZones && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
              {ZONE_OPTIONS.map((z) => (
                <label key={z} style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: FONT_BODY, fontSize: 12.5, color: C.ink, cursor: "pointer" }}>
                  <input type="checkbox" checked={form.zones.includes(z)} onChange={() => toggleZone(z)} /> {z}
                </label>
              ))}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Btn variant="ghost" onClick={() => { setModal(null); setForm(null); }}>Cancel</Btn>
            <Btn variant="primary" onClick={save}>Save</Btn>
          </div>
        </Modal>
      )}
    </Panel>
  );
}

function hexLuminance(hex) {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const ch = [0, 2, 4].map((i) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
function contrastRatio(a, b) {
  const la = hexLuminance(a), lb = hexLuminance(b);
  if (la == null || lb == null) return null;
  const hi = Math.max(la, lb), lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}
const LOGO_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
const LOGO_MAX = 512 * 1024;

function BrandingCard() {
  const dialog = useDialog();
  const { onConfigChanged } = useContext(SettingsContext);
  const fromSettings = () => ({
    name: SETTINGS.brand.name, shortName: SETTINGS.brand.shortName, tagline: SETTINGS.brand.tagline,
    topBarTitle: SETTINGS.brand.topBarTitle, logoWrench: !!SETTINGS.brand.logoWrench, colors: { ...SETTINGS.brand.colors },
    levels: [...SETTINGS.terms.locationLevels], siteLevelIndex: SETTINGS.terms.siteLevelIndex, orgNoun: SETTINGS.terms.orgNoun,
  });
  const [f, setF] = useState(fromSettings);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [errs, setErrs] = useState([]);
  const logoRef = useRef(null);
  const set = (k, v) => { setF((p) => ({ ...p, [k]: v })); setMsg(""); };
  const setColor = (k, v) => { setF((p) => ({ ...p, colors: { ...p.colors, [k]: v } })); setMsg(""); };
  const setLevel = (i, v) => { setF((p) => ({ ...p, levels: p.levels.map((l, j) => (j === i ? v : l)) })); setMsg(""); };

  const trimmed = f.levels.map((l) => l.trim());
  const dupes = trimmed.some((l, i) => l && trimmed.findIndex((x) => x.toLowerCase() === l.toLowerCase()) !== i);
  const warnings = [];
  const cLight = contrastRatio(f.colors.primary, "#ffffff"), cAcc = contrastRatio(f.colors.accent, "#ffffff");
  const cPd = contrastRatio(f.colors.primaryDark, "#14181d"), cAd = contrastRatio(f.colors.accentDark, "#14181d");
  if (cLight != null && cLight < 4.5) warnings.push("Primary colour is light: white text on it may be hard to read.");
  if (cAcc != null && cAcc < 3) warnings.push("Accent colour is light: white button text on it may be hard to read.");
  if (cPd != null && cPd < 4.5) warnings.push("Dark-mode primary colour is dark: it may be hard to read on a dark background.");
  if (cAd != null && cAd < 4.5) warnings.push("Dark-mode accent colour is dark: it may be hard to read on a dark background.");

  const save = async () => {
    setErrs([]); setMsg("");
    if (!f.name.trim()) { setErrs(["The name is required."]); return; }
    if (trimmed.some((l) => !l || l.length > 15)) { setErrs(["Each location label is required and can be at most 15 characters."]); return; }
    if (dupes) { setErrs(["Location labels must be different from each other."]); return; }
    setBusy("save");
    try {
      const resp = await api.saveSettings({
        brand: { name: f.name.trim(), shortName: f.shortName.trim(), tagline: f.tagline.trim(), topBarTitle: f.topBarTitle.trim(), logoWrench: !!f.logoWrench, colors: f.colors },
        terms: { orgNoun: f.orgNoun.trim(), locationLevels: trimmed, siteLevelIndex: Number(f.siteLevelIndex) },
        features: { ...SETTINGS.features },
      });
      onConfigChanged(resp);
      setMsg("Saved.");
    } catch (e) { setErrs(e.errors && e.errors.length ? e.errors : [e.message]); }
    finally { setBusy(""); }
  };
  const pickLogo = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type)) { await dialog.alertMsg("The logo must be a PNG, JPG, SVG or WebP image."); return; }
    if (file.size > LOGO_MAX) { await dialog.alertMsg("The logo must be 512 KB or smaller."); return; }
    setBusy("logo");
    try {
      const dataUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
      onConfigChanged(await api.uploadLogo(dataUrl));
      setMsg("Logo updated.");
    } catch (err) { await dialog.alertMsg(err.message); }
    finally { setBusy(""); }
  };
  const removeLogo = async () => {
    setBusy("logo");
    try { onConfigChanged(await api.removeLogo()); setMsg("Logo removed."); } catch (err) { await dialog.alertMsg(err.message); }
    finally { setBusy(""); }
  };
  const reset = async () => {
    const ok = await dialog.confirm("Reset the name, logo, colours, location labels and wording back to the original defaults? Your data isn't affected.");
    if (!ok) return;
    setBusy("reset");
    try {
      const resp = await api.resetSettings();
      onConfigChanged(resp);
      applySettings(resp);
      setF(fromSettings());
      setMsg("Reset to defaults.");
    } catch (err) { await dialog.alertMsg(err.message); }
    finally { setBusy(""); }
  };

  const note = { fontFamily: FONT_BODY, fontSize: 12, color: C.inkSoft };
  const sub = { fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, color: C.ink, margin: "16px 0 8px" };
  const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 };
  const colorField = (k, label) => (
    <Field label={label}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="color" value={/^#[0-9a-f]{6}$/i.test(f.colors[k]) ? f.colors[k] : "#000000"} onChange={(e) => setColor(k, e.target.value)} style={{ width: 40, height: 32, padding: 0, border: `1px solid ${C.line}`, background: "none" }} />
        <input style={inputStyle} value={f.colors[k]} onChange={(e) => setColor(k, e.target.value)} maxLength={9} />
      </div>
    </Field>
  );
  return (
    <Panel style={{ padding: 18 }}>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 15, fontWeight: 600, color: C.ink, marginBottom: 4 }}>Branding & terminology<InfoTip k="branding" /></div>
      <div style={{ ...note, marginBottom: 12 }}>Make the app your own: name, logo, colours, and the words used for locations. Changes apply to everyone straight away and are included in the Excel backup.</div>

      <div style={grid}>
        <Field label="Name" required><input style={inputStyle} value={f.name} maxLength={40} onChange={(e) => set("name", e.target.value)} /></Field>
        <Field label="Short name"><input style={inputStyle} value={f.shortName} maxLength={12} onChange={(e) => set("shortName", e.target.value)} /></Field>
        <Field label="Tagline"><input style={inputStyle} value={f.tagline} maxLength={60} onChange={(e) => set("tagline", e.target.value)} /></Field>
        <Field label="Top-bar title (optional)"><input style={inputStyle} value={f.topBarTitle} maxLength={40} placeholder="Shown in the top bar when filled" onChange={(e) => set("topBarTitle", e.target.value)} /></Field>
      </div>

      <div style={sub}>Logo</div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <div style={{ padding: 10, border: `1px solid ${C.line}`, borderRadius: 3, background: C.bg }}><BrandMark size={40} radius={5} /></div>
        <Btn small variant="ghost" onClick={() => logoRef.current?.click()} disabled={!!busy}>{busy === "logo" ? "Working…" : "Upload logo…"}</Btn>
        {SETTINGS.brand.logoUrl && <Btn small variant="ghost" onClick={removeLogo} disabled={!!busy}>Use the built-in logo</Btn>}
        <input ref={logoRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" style={{ display: "none" }} onChange={pickLogo} />
        <span style={note}>PNG, JPG, SVG or WebP, up to 512 KB.</span>
      </div>
      {SETTINGS.brand.logoUrl && (
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontFamily: FONT_BODY, fontSize: 13, color: C.ink, cursor: "pointer" }}>
          <input type="checkbox" checked={!!f.logoWrench} onChange={(e) => set("logoWrench", e.target.checked)} />
          Overlay the orange wrench from the built-in logo (combined brand)
        </label>
      )}

      <div style={sub}>Colours</div>
      <div style={grid}>
        {colorField("primary", "Primary (light mode)")}
        {colorField("accent", "Accent (light mode)")}
        {colorField("primaryDark", "Primary (dark mode)")}
        {colorField("accentDark", "Accent (dark mode)")}
      </div>
      {warnings.map((w, i) => <div key={i} style={{ ...note, color: C.rust, marginTop: 4 }}>⚠ {w}</div>)}

      <div style={sub}>Location labels</div>
      <div style={{ ...note, marginBottom: 8 }}>Rename the six location levels, top to bottom. Existing records follow automatically. Each label is required, up to 15 characters, and must be different.</div>
      <div style={grid}>
        {f.levels.map((l, i) => (
          <Field key={i} label={`Level ${i + 1}`}><input style={inputStyle} value={l} maxLength={15} onChange={(e) => setLevel(i, e.target.value)} /></Field>
        ))}
      </div>
      <div style={grid}>
        <Field label="Site level (carries address, year built, climate zone and the PM setup wizard)">
          <select style={inputStyle} value={f.siteLevelIndex} onChange={(e) => set("siteLevelIndex", Number(e.target.value))}>
            {f.levels.map((l, i) => <option key={i} value={i}>{l.trim() || `Level ${i + 1}`}</option>)}
          </select>
        </Field>
        <Field label="Word for organization (e.g. Organization, Company, Household)"><input style={inputStyle} value={f.orgNoun} maxLength={20} onChange={(e) => set("orgNoun", e.target.value)} /></Field>
      </div>

      {errs.length > 0 && <div style={{ ...note, color: C.rust, marginTop: 4 }}>{errs.map((e, i) => <div key={i}>{e}</div>)}</div>}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
        <Btn variant="primary" onClick={save} disabled={!!busy}>{busy === "save" ? "Saving…" : "Save branding"}</Btn>
        <Btn variant="ghost" onClick={reset} disabled={!!busy}>Reset to defaults</Btn>
        {msg && <span style={{ ...note, color: C.olive }}>{msg}</span>}
      </div>
    </Panel>
  );
}

function FeaturesCard() {
  const dialog = useDialog();
  const { onConfigChanged } = useContext(SettingsContext);
  const [busy, setBusy] = useState(false);
  const setFeature = async (key, on) => {
    setBusy(true);
    try {
      const resp = await api.saveSettings({
        brand: { name: SETTINGS.brand.name, shortName: SETTINGS.brand.shortName, tagline: SETTINGS.brand.tagline, topBarTitle: SETTINGS.brand.topBarTitle, logoWrench: !!SETTINGS.brand.logoWrench, colors: SETTINGS.brand.colors },
        terms: { orgNoun: SETTINGS.terms.orgNoun, locationLevels: SETTINGS.terms.locationLevels, siteLevelIndex: SETTINGS.terms.siteLevelIndex },
        features: { ...SETTINGS.features, [key]: on },
      });
      onConfigChanged(resp);
    } catch (e) { await dialog.alertMsg(e.message); }
    finally { setBusy(false); }
  };
  const note = { fontFamily: FONT_BODY, fontSize: 12, color: C.inkSoft };
  const row = { display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", fontFamily: FONT_BODY, fontSize: 13.5, color: C.ink, marginBottom: 12 };
  const hasKey = !!SETTINGS.geminiKeyDetected;
  return (
    <Panel style={{ padding: 18 }}>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 15, fontWeight: 600, color: C.ink, marginBottom: 4 }}>Features<InfoTip k="features" /></div>
      <div style={{ ...note, marginBottom: 12 }}>Turn optional parts of the app on or off. Takes effect immediately.</div>
      <label style={row}>
        <input type="checkbox" disabled={busy} checked={!!SETTINGS.features.homeAssistantAlarms} onChange={(e) => setFeature("homeAssistantAlarms", e.target.checked)} style={{ marginTop: 3 }} />
        <span>Home Assistant alarms<div style={note}>Receive alarms from Home Assistant by webhook, map them to assets and locations, and show the Alarms page. Turning it off hides the page and refuses incoming alarms; existing alarm history is kept.</div></span>
      </label>
      <label style={row}>
        <input type="checkbox" disabled={busy} checked={SETTINGS.features.linkPrefill !== false} onChange={(e) => setFeature("linkPrefill", e.target.checked)} style={{ marginTop: 3 }} />
        <span>Fill in from a link<InfoTip k="linkFill" /><div style={note}>On asset, vendor and part forms, paste a web link and the name, maker, model, description and price are filled in from the page. Without AI it reads the page's own product details.</div></span>
      </label>
      <label style={{ ...row, opacity: SETTINGS.features.linkPrefill === false ? 0.5 : 1, marginLeft: 22 }}>
        <input type="checkbox" disabled={busy || !hasKey || SETTINGS.features.linkPrefill === false} checked={!!SETTINGS.features.linkPrefillAi} onChange={(e) => setFeature("linkPrefillAi", e.target.checked)} style={{ marginTop: 3 }} />
        <span>Use AI (Gemini) to improve the results<div style={note}>
          Gemini API key detected: <strong>{hasKey ? "yes" : "no"}</strong>.{" "}
          {hasKey ? "When on, the link and the page's text are sent to Google's Gemini service for each look-up." : "Set GEMINI_API_KEY in the Docker environment to make this available."}
        </div></span>
      </label>
      <label style={row}>
        <input type="checkbox" disabled={busy} checked={!!SETTINGS.features.executionScheduling} onChange={(e) => setFeature("executionScheduling", e.target.checked)} style={{ marginTop: 3 }} />
        <span>Execution-based scheduling and time keeping<div style={note}>Renames Schedule to Labour assignment. Work orders get an estimated time per executor and a number of executors required; several executors can be assigned; the schedule gains Week and Day views with drag-and-drop; executors enter hours worked when completing a work order.</div></span>
      </label>
      <label style={row}>
        <input type="checkbox" disabled={busy} checked={!!SETTINGS.features.workforceScheduling} onChange={(e) => setFeature("workforceScheduling", e.target.checked)} style={{ marginTop: 3 }} />
        <span>Workforce scheduling<div style={note}>Adds a Workforce schedule tab where managers set each person's shifts (with daily and weekly templates) and everyone can view and export it. With execution-based scheduling on, people only appear on the labour assignment screen on days they are scheduled.</div></span>
      </label>
      {(() => {
        const avail = !!SETTINGS.features.executionScheduling && !!SETTINGS.features.workforceScheduling;
        return (
          <label style={{ ...row, opacity: avail ? 1 : 0.5, marginLeft: 22 }}>
            <input type="checkbox" disabled={busy || !avail} checked={avail && !!SETTINGS.features.hourlyAssignment} onChange={(e) => setFeature("hourlyAssignment", e.target.checked)} style={{ marginTop: 3 }} />
            <span>Hourly labour assignments<div style={note}>{avail ? "Adds an hour grid to the day view so work orders can be dragged to a 30-minute start time inside each person's shift." : "Available only when both execution-based scheduling and workforce scheduling are on."}</div></span>
          </label>
        );
      })()}
      <div style={{ ...note, marginTop: 6 }}>
        Emailed password reset: {SETTINGS.passwordResetEmail ? "available (mail server and APP_URL are configured)." : "not available. Set SMTP_HOST and APP_URL in the Docker environment to enable the “Forgot password?” link."}
      </div>
    </Panel>
  );
}

/* ============================================================
   v2.4 — "More info" notes for individual features. The small (i)
   beside a card title or pop-up title opens one. Page-level notes
   live in PAGE_INFO above.
============================================================ */
const FEATURE_INFO = {
  changelog: ["Everything that changed in each version of the app, newest first.", "Scroll to read. The installed version is marked.", "Everyone."],
  bomCopy: ["Copies the bill of materials from another asset onto this one, so similar equipment does not need to be typed twice.", "Choose the source asset and select Copy. Rows are added to the existing list.", "Managers and owners."],
  designations: ["Designations give an executor extra duties: Planner (assign and plan work), Scheduler (use the Workforce schedule) and Specialist (flagged for specialist jobs).", "Tick them on the member row. Owners and managers can also be flagged as an Executor so that work can be assigned to them (off by default).", "Owners only."],
  digests: ["The emails you receive: the daily digests that apply to your role and designations, such as alarms, low stock, my schedule and team schedule.", "Tick the ones you want, then choose how often (every day, weekdays or weekly) and the time of day. App updates lists what changed in new versions since your last email. Emails only go out when your Owner has set up email and your account has an address.", "Everyone with an email address."],
  editShift: ["Change or delete one scheduled shift.", "Tap a shift on the Workforce schedule, adjust start, duration or end (fill any two) or pick a daily template, then Save, or choose Delete shift.", "Owners, managers and schedulers."],
  metrics: ["Owner measures of how maintenance is running over the chosen period.", "Pick a period at the top right. Lead time and verification time are only measured for work from v2.6 onward.", "Owners only."],
  mWr: ["How many work requests each person entered.", "Nothing to maintain; it counts requests in the period.", "Owners only."],
  mEff: ["Hours booked against the estimate on completed work orders, per executor.", "Under 100% means faster than estimated; over 100% means slower.", "Owners only."],
  mComp: ["Of the work orders scheduled for a person, the share they worked on the scheduled day.", "Nothing to maintain; it uses scheduled dates and logged hours.", "Owners only."],
  mLead: ["Average time from a work request being created to it becoming a work order.", "Only requests created from v2.6 onward are included.", "Owners only."],
  mVerify: ["Average time from a work order being Completed to it being verified and Closed.", "Only work completed from v2.6 onward is included.", "Owners only."],
  mReactive: ["The share of work orders that were unplanned, out of all work orders in the period. Lower is generally better.", "Nothing to maintain; it counts work order types.", "Owners only."],
  removeAsset: ["Retires an asset. If nothing links to it, it can be deleted permanently; otherwise it is archived (hidden, history kept).", "Read the pop-up and choose Archive or, when offered, Delete.", "Owners and managers; managers can delete only unlinked assets."],
  // ---- cards and sections
  nextDays: ["A seven-day look-ahead of work orders that are scheduled to start soon.", "Each box is one day. Click a work order to open it.", "Everyone can see it."],
  wrAwaiting: ["Requests that have been submitted and are waiting for a manager or owner to decide.", "Click a request to jump to the Work Requests page. A manager then converts, merges, asks for more information or declines it.", "Everyone sees the list; managers and owners act on it."],
  upcomingWo: ["The next work orders that are due or scheduled, soonest first, so nothing sneaks up on you.", "Click one to open its detail. Overdue work is shown in red.", "Everyone can see it."],
  warranty: ["Assets whose warranty ends soon, so a repair can be claimed before cover lapses.", "Add a warranty end date on the asset. Assets appear here when the date is close.", "Everyone can see it; managers and owners edit the dates."],
  bom: ["The Bill of Materials is the tree of components, sub-components and parts that make up an asset, such as a furnace, its blower and the blower motor.", "Add items with the + button. A work order can point at a specific item so repairs are recorded against the exact component. Items can link to parts in the catalogue.", "Executors, managers and owners can edit it; guests can only view."],
  pmTasks: ["Lightweight reminders attached to this asset or component for things that recur.", "Add a reminder with a title and interval. For full scheduling with checklists and generated work orders, use a PM Base on the Work Orders page.", "Managers and owners edit; everyone can view."],
  woHistory: ["Every work order ever raised against this asset, newest first. This is the asset's maintenance history.", "Click an entry to open it. Closed work stays here permanently.", "Everyone can see it."],
  checklist: ["Steps to follow while doing the job. A step can be a tick, a numeric reading with an expected range, a required photo or a pass/fail.", "Work down the list in order. A reading outside its range raises an alarm for the managers automatically. Checklist progress is saved as you go.", "Executors, managers and owners can fill it in; managers and owners design the template on the PM Base."],
  standby: ["Pauses a PM Base so it stops generating new jobs, either by hand or outside a yearly window (for example lawn care only from 1 May to 1 November).", "Tick Standby to pause now, or set the yearly window. Jobs already open are left alone. Generation resumes by itself when standby ends.", "Managers and owners."],
  genPm: ["The jobs this PM Base has generated so far, with their status.", "Only one open job exists per base at a time; completing it creates the next. Click one to open it.", "Everyone can view."],
  pmBases: ["PM Bases are templates for maintenance that repeats. They are never worked themselves; they generate PM work orders.", "Click a base to see its rule, checklist and generated jobs. Managers and owners create and edit bases, put them on standby, or delete them.", "Everyone can view; managers and owners edit."],
  comments: ["The running conversation and notes on a work order, with who wrote each and when.", "Type a comment and select Add. Completing a Scheduled work order also requires a comment, which is added here.", "Executors, managers and owners can comment."],
  spend: ["Costs logged on work orders, added up by asset category, so you can see where upkeep money goes.", "Nothing to maintain here; enter cost on work orders and this updates itself.", "Everyone can view."],
  backup: ["Safety copies of your data and tools for bulk editing in Excel.", "Export to Excel for a spreadsheet of every record. Full backup (.zip) adds photos. Import lets you pick tabs from a file, checks it first and then applies it. Nightly snapshots are kept automatically.", "Owners only."],
  members: ["Everyone who can sign in, with their role.", "Use the member buttons to set an email and designations, reset the password, or remove them. Roles are Owner, Manager, Executor or Guest.", "Owners only."],
  addMember: ["Creates a new account.", "Enter a username, a temporary password (they must change it at first sign-in), a role and, optionally, an email address.", "Owners only."],
  delWo: ["Permanently deletes a work order found by its number or title. Use it for entries created by mistake.", "Search, select the work order and confirm. This cannot be undone and the number is not reused.", "Owners only."],
  delWr: ["Permanently deletes a work request found by its number or title.", "Search, select it and confirm. This cannot be undone.", "Owners only."],
  pmWizardCatalog: ["The list of starter maintenance jobs the PM setup wizard offers when you set up a property.", "Add, edit or remove entries (title, description, frequency, climate zones, type and sub type). Reset restores the built-in list.", "Owners only."],
  branding: ["The name, logo, colours, location labels and top-bar title shown to everyone.", "Change the fields and select Save branding. Location levels are relabelled for display only; stored data is not changed. Reset to defaults undoes your changes.", "Owners only."],
  features: ["Switches for optional parts of the app. Changes apply immediately.", "Home Assistant alarms, Fill in from a link (with optional AI), Execution-based scheduling and time keeping, Workforce scheduling, and Hourly labour assignments (needs the previous two). Turning something off hides it; nothing is deleted.", "Owners only."],
  colours: ["Gives each person a colour that is used wherever their name or card appears on Labour assignment, Workforce schedule and shift template screens.", "Pick a colour with the swatch. Reset returns to the automatic colour.", "Managers and owners."],
  templates: ["Named shift patterns used to schedule people quickly on the Workforce schedule.", "A daily template has a start, a duration (8, 8.5, 10, 10.5 or 12 hours) and an end: fill any two and the third is calculated. A weekly template does the same for each day of the week. An end before the start means an overnight shift.", "Managers and owners."],
  myAccount: ["Your own email address and password.", "Select Open my account. Your email is used for notifications and password reset.", "Everyone except guests."],
  myHours: ["Hours you have logged when completing work orders: the last 7 days, last 30 days and all time, with recent entries.", "Hours are entered when you move a work order to Completed. Nothing to maintain here.", "Everyone except guests see their own; managers and owners also see everyone's."],
  hoursAll: ["Hours logged by every executor, with totals and recent entries.", "Use it for timesheets and to compare estimates with actual time.", "Managers and owners."],
  sideList: ["Open work orders sorted by due date, waiting to be placed on the schedule.", "Drag a card onto a person's column (week or day view) or a day on the month view. On a touch screen, tap the card to pick it up, then tap where it should go (tap Cancel to put it down). Untick Unscheduled only to include work that already has a date. Red text means overdue.", "Managers and owners."],
  haWebhook: ["The address and key a Home Assistant automation uses to send alarms into this app.", "Copy the URL and key into a Home Assistant REST command. Each message becomes an alarm. Regenerating the key stops the old one working.", "Managers and owners; only Owners can see or regenerate the key."],
  sensorMaps: ["Links each Home Assistant sensor to the asset or location it watches.", "Add a mapping per sensor. Alarms from mapped sensors show on the right asset and on the location beacon.", "Managers and owners."],
  linkFill: ["Pastes a product or supplier web link and fills in name, maker, model, description and price.", "On an asset, vendor or part form, paste the link and select Fill in. Only empty fields are filled, each with a clear (x). Optional AI improves results.", "Managers and owners who can edit those forms; Owners turn it on or off."],
  autoSchedule: ["Schedules several Active work orders at once on their required-by dates.", "Tick the work orders on the board, then select Auto schedule and confirm. Work orders without a required-by date are skipped.", "Managers and owners."],
  nameCards: ["One card per person. They stay in place so you can use them again and again.", "Drag a name onto a day or onto a week-number box (on a touch screen, tap the name, then tap the day or week), then choose a template or a one-time schedule.", "Managers and owners drag; everyone can see the team."],
  // ---- pop-up windows
  qr: ["A printable label for an asset. Scanning its QR code with a phone opens the asset's record.", "Print the label and stick it on the equipment. Scanning it takes signed-in people straight to the asset, where they can start a work order.", "Everyone can view and print."],
  meter: ["Records a new reading of an asset's usage meter (hours, kilometres and so on).", "Enter the reading and date. Meter-based PM Bases generate a new job when the reading passes their interval.", "Managers and owners."],
  pmWizard: ["Creates a starter set of PM Bases for a property from a catalogue of common jobs, scaled to the property's climate zone.", "Choose the climate zone, tick the jobs you want (use the filters and search), then create them. Each becomes an editable PM Base.", "Managers and owners."],
  location: ["A place in the household tree: property, structure, floor, room, area and sub-area.", "Choose a parent and name it. Properties also hold an address, year built and climate zone.", "Managers and owners."],
  bomNode: ["A component, sub-component or part within an asset.", "Name it, pick its parent in the tree and optionally link a catalogue part, install date and notes.", "Executors, managers and owners."],
  asset: ["A piece of equipment worth maintaining.", "Enter name, category and location. Manufacturer, model, serial, purchase date, warranty end and manual link are optional. Meter fields enable usage-based maintenance. The link fill-in can complete details from a web page.", "Managers and owners."],
  part: ["A spare part or consumable in the catalogue.", "Give it a name and quantity on hand. Add manufacturer, cost, reorder level and a purchase link. The part number is assigned automatically.", "Managers and owners edit; everyone can adjust quantity."],
  wrForm: ["Reports that something needs attention.", "Describe the problem, choose its location (and asset if known), set a priority and, optionally, attach photos. You can edit your request until a manager decides it.", "Executors, managers and owners."],
  convert: ["Turns an approved request into a work order.", "Check the details, set dates, executor and priority and select Convert. The request is marked Approved and linked to the new work order.", "Managers and owners."],
  decline: ["Closes a request without doing work.", "Give a reason. The requester can see it.", "Managers and owners."],
  moreInfo: ["Sends a request back for clarification.", "Write what you need to know. The request moves to Under Review and the requester can edit and resubmit.", "Managers and owners."],
  merge: ["Combines a request into a work order that already exists, so duplicates do not pile up.", "Pick the open work order. The request is marked Merged and linked to it.", "Managers and owners."],
  archive: ["Every Closed work order, kept permanently as history.", "Search or scroll, and click one to read it.", "Everyone can view."],
  newWo: ["Creates a work order directly.", "Give it a title, type, location and required-by date. Add a scheduled date to make it Scheduled. Executors, estimate and crew appear when execution-based scheduling is on. PM Base types add a repeat rule.", "Executors, managers and owners."],
  woDetail: ["Everything about one work order: its facts, status buttons, checklist, parts, comments and photos.", "Use the status buttons to move it along. Managers and owners can edit fields and Close it. Completing may ask for a comment and, with execution-based scheduling on, hours worked.", "Everyone can view; executors change status and comment; managers and owners edit."],
  vendor: ["A contractor or service provider you call on.", "Name, specialty, phone, email and website. Work orders can reference a vendor.", "Managers and owners."],
  excelImport: ["Applies selected tabs from an Excel backup after checking the whole file.", "Tick the tabs to apply and choose Update and add or Replace tab. Nothing changes until the pre-check passes and you confirm.", "Owners only."],
  notify: ["Sets a member's email and which daily digests they receive.", "Tick the digests wanted: overdue work orders, warranties expiring, unreviewed requests. Emails need an SMTP server configured.", "Owners only."],
  resetPw: ["Sets a temporary password for a member.", "Enter a temporary password; they must choose their own at next sign-in. Their other sessions are ended.", "Owners only."],
  buyPart: ["Adds a part to the shopping list by hand.", "Pick a catalogue part or type a name, then quantity and a note.", "Managers and owners."],
  falseAlarm: ["Dismisses an alarm that was not real.", "Add a short note on why. It is kept in the alarm history.", "Managers and owners."],
  alarmToWr: ["Raises a work request from an alarm.", "Review the pre-filled details and submit. The alarm links to the request.", "Managers and owners."],
  linkWo: ["Connects an alarm to a work order that already covers it.", "Pick the work order. The alarm then shows it.", "Managers and owners."],
  sensorMap: ["Tells the app which asset or location a Home Assistant sensor belongs to.", "Enter the sensor's entity id, pick the asset and/or location and a label. Alarms from that sensor are then placed correctly.", "Managers and owners."],
  createAlarm: ["Records an alarm by hand.", "Describe it, set severity and optionally pick the asset or location.", "Managers and owners."],
  catEntry: ["One starter job offered by the PM wizard.", "Title, description, how often, which climate zones, and its type and sub type.", "Owners only."],
  tplModal: ["Creates or edits a shift template.", "Name it and fill in any two of start, duration and end; the third is calculated. For weekly templates tick the working days and set each. Save to reuse it.", "Managers and owners."],
  hoursModal: ["Records the hours each executor spent when a work order is completed.", "Enter hours for each executor listed. They must be greater than zero. The totals feed the hours reports.", "Whoever completes the work order."],
  applyShift: ["Chooses the shift to apply for the person you dropped.", "Pick a saved template or set a one-time schedule (optionally saving it as a template). The person's existing shifts on those days are replaced.", "Managers and owners."],
  account: ["Your own email address and password.", "Change the email used for notifications and resets, or set a new password (signs out your other devices).", "Everyone except guests."],
};
function InfoTip({ k, size }) {
  const [open, setOpen] = useState(false);
  const f = FEATURE_INFO[k];
  if (!f) return null;
  return (
    <>
      <button type="button" aria-label="More info" title="More info" data-info={k} onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        style={{ background: "none", border: "none", cursor: "pointer", color: C.inkFaint, display: "inline-flex", alignItems: "center", verticalAlign: "middle", padding: "0 2px", marginLeft: 4 }}>
        <Info size={size || 14} />
      </button>
      {open && createPortal(
        <div style={{ position: "relative", zIndex: 80 }} onClick={(e) => e.stopPropagation()}>
          <Modal title="About this feature" onClose={() => setOpen(false)}>
            <InfoBlock label="Purpose" text={term(f[0])} />
            <InfoBlock label="How to use it" text={term(f[1])} />
            <InfoBlock label="Who can" text={term(f[2])} />
          </Modal>
        </div>, document.body)}
    </>
  );
}

/* ============================================================
   v2.4 — HELP TAB: the training guide, with a linked table of contents
============================================================ */
function HelpView({ role }) {
  const mgr = role === "Owner" || role === "Manager";
  const [guide, setGuide] = useState(mgr ? "managers" : "executors");
  const base = import.meta.env.BASE_URL;
  const names = { executors: "MaintEnhance_Training_Guide_Executors.docx", managers: "MaintEnhance_Training_Guide_Managers_and_Owners.docx" };
  const seg = (v, lab) => <button key={v} type="button" onClick={() => setGuide(v)} aria-pressed={guide === v} style={{ fontFamily: FONT_BODY, fontSize: 12.5, fontWeight: 600, padding: "6px 12px", border: "none", cursor: "pointer", background: guide === v ? C.navy : "transparent", color: guide === v ? "#fff" : C.ink }}>{lab}</button>;
  return (
    <div>
      <SectionHeader
        title="Help" subtitle="The training guide. Use the contents list to jump to any subject."
        info={PAGE_INFO.help}
        action={
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "inline-flex", border: `1px solid ${C.line}`, borderRadius: 3, overflow: "hidden" }}>{seg("executors", "Executor guide")}{seg("managers", "Manager & Owner guide")}</div>
            <a href={`${base}help/${names[guide]}`} download style={{ textDecoration: "none" }}><Btn small variant="ghost"><Download size={13} /> Download .docx</Btn></a>
          </div>
        }
      />
      <iframe key={guide} title="Training guide" data-helpframe src={`${base}help/${guide}.html`} style={{ width: "100%", height: "calc(100vh - 190px)", minHeight: 480, border: `1px solid ${C.line}`, borderRadius: 4, background: "#fff" }} />
    </div>
  );
}

/* ============================================================
   v2.4 — SHARED HELPERS (labour assignment, workforce schedule, tools)
============================================================ */
const FEAT = () => (SETTINGS && SETTINGS.features) || {};
const execOn = () => !!FEAT().executionScheduling;
const workforceOn = () => !!FEAT().workforceScheduling;
const hourlyOn = () => execOn() && workforceOn() && !!FEAT().hourlyAssignment;

const EXEC_PALETTE = ["#2F6FB0", "#C2571A", "#2E8B57", "#8E44AD", "#B8860B", "#C0392B", "#16A085", "#D35498", "#5D6D7E", "#7D6608"];
function defaultExecColor(id) {
  let h = 0;
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return EXEC_PALETTE[h % EXEC_PALETTE.length];
}
function execColor(data, id) {
  const c = data && data.executorColors && data.executorColors[id];
  return /^#[0-9a-fA-F]{6}$/.test(c || "") ? c : defaultExecColor(id);
}
function textOn(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return "#fff";
  const n = parseInt(m[1], 16);
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) > 165 ? "#1b1b1b" : "#fff";
}

const pad2 = (n) => String(n).padStart(2, "0");
const isoLocal = (dt) => `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
const parseISO = (s) => new Date(s + "T00:00:00");
const todayLocal = () => isoLocal(new Date());
const addDaysISO = (s, n) => { const d = parseISO(s); d.setDate(d.getDate() + n); return isoLocal(d); };
const addMonthsISO = (s, n) => { const d = parseISO(s); d.setDate(1); d.setMonth(d.getMonth() + n); return isoLocal(d); };
const weekStartISO = (s) => addDaysISO(s, -parseISO(s).getDay());
// ISO-8601 week number of the week containing the given Sunday-first week's Wednesday.
function isoWeekNum(s) {
  const d = parseISO(addDaysISO(weekStartISO(s), 3));
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dn = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dn);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - y0) / 86400000 + 1) / 7);
}
const fmtShort = (s) => parseISO(s).toLocaleDateString(undefined, { month: "short", day: "numeric" });

const toMin = (t) => {
  if (!/^\d{1,2}:\d{2}$/.test(t || "")) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const fromMin = (m) => { m = ((m % 1440) + 1440) % 1440; return `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`; };
const SHIFT_DURS = [8, 8.5, 10, 10.5, 12];
const fmtH = (h) => { const n = Number(h); return Number.isFinite(n) ? String(Math.round(n * 100) / 100) : "—"; };

// Shift = { start:"HH:MM", dur:"8", end:"HH:MM", touched:[...] }. Fill any two
// of start / duration / end and the third is calculated. `touched` remembers
// the two most recently edited fields so the older one is the one recalculated.
function editShift(sh, field, value) {
  const n = { ...sh, [field]: value };
  const t = [field, ...(sh.touched || []).filter((x) => x !== field)].slice(0, 2);
  n.touched = t;
  if (t.length === 2) {
    const third = ["start", "dur", "end"].find((f) => !t.includes(f));
    const s = toMin(n.start), e = toMin(n.end), d = n.dur === "" || n.dur == null ? null : Number(n.dur);
    if (third === "end" && s != null && d != null) n.end = fromMin(s + Math.round(d * 60));
    else if (third === "start" && e != null && d != null) n.start = fromMin(e - Math.round(d * 60));
    else if (third === "dur" && s != null && e != null) { const diff = (e - s + 1440) % 1440; n.dur = diff === 0 ? "" : String(diff / 60); }
  }
  return n;
}
const blankShift = () => ({ start: "", dur: "", end: "", touched: [] });
const shiftOk = (sh) => !!sh && toMin(sh.start) != null && toMin(sh.end) != null && toMin(sh.start) !== toMin(sh.end);
// End at or before start means the shift runs past midnight; it is always
// shown on the day it starts.
function shiftSpan(sh) {
  const s = toMin(sh.start), e0 = toMin(sh.end);
  if (s == null || e0 == null) return null;
  return { s, e: e0 <= s ? e0 + 1440 : e0 };
}
const shiftText = (sh) => `${sh.start}–${sh.end}`;
function dayCoverage(dayShifts) {
  const iv = dayShifts.map(shiftSpan).filter(Boolean).sort((a, b) => a.s - b.s);
  if (!iv.length) return null;
  const gaps = [];
  let cur = iv[0].e, last = iv[0].e;
  for (let i = 1; i < iv.length; i++) {
    if (iv[i].s > cur) gaps.push([cur, iv[i].s]);
    cur = Math.max(cur, iv[i].e);
    last = Math.max(last, iv[i].e);
  }
  return { first: iv[0].s, last, gaps };
}
const covText = (c) => `${fromMin(c.first)}–${fromMin(c.last)}${c.last >= 1440 ? " +1" : ""}`;
const gapText = (c) => c.gaps.map(([a, b]) => `${fromMin(a)}–${fromMin(b)}`).join(", ");

const execIdsOf = (w) => (w.executorIds && w.executorIds.length ? w.executorIds : (w.executorId ? [w.executorId] : []));
const crewOf = (w) => Math.max(1, Number(w.crewRequired) || 1);
const underStaffed = (w) => isOpenStatus(w.status) && execIdsOf(w).length < crewOf(w);
const planFieldsFrom = (b) => ({ estHours: b.estHours || "", crewRequired: b.crewRequired || "", executorIds: [...(b.executorIds || [])] });

// Weekly template/ad hoc days are indexed Sunday=0 … Saturday=6 (Date.getDay()).
const blankWeek = () => Array.from({ length: 7 }, (_, i) => ({ ...blankShift(), off: i === 0 || i === 6 }));
function shiftSummary(sh) { return shiftOk(sh) ? `${shiftText(sh)}${sh.dur ? ` (${fmtH(sh.dur)} h)` : ""}` : "not set"; }
function templateSummary(t) {
  if (t.kind === "daily") return shiftSummary(t.shift || {});
  const on = (t.days || []).map((d, i) => (!d.off && shiftOk(d) ? `${WEEKDAY_LABELS[i]} ${shiftText(d)}` : null)).filter(Boolean);
  return on.length ? on.join(" · ") : "no working days";
}

/* ---------- shift editors ---------- */
function ShiftEditor({ value, onChange, compact }) {
  const v = value || blankShift();
  const lab = { fontFamily: FONT_BODY, fontSize: 10.5, fontWeight: 700, color: C.inkFaint, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 2 };
  const s = toMin(v.start), e = toMin(v.end);
  const overnight = s != null && e != null && e <= s;
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
      <div><div style={lab}>Start</div><input type="time" aria-label="Shift start" style={{ ...inputStyle, width: compact ? 112 : 124 }} value={v.start || ""} onChange={(ev) => onChange(editShift(v, "start", ev.target.value))} /></div>
      <div><div style={lab}>Duration (hours)</div>
        <input type="number" inputMode="decimal" min="0" max="24" step="any" aria-label="Shift duration in hours" placeholder="e.g. 7.5" style={{ ...inputStyle, width: compact ? 92 : 104 }} value={v.dur === "" || v.dur == null ? "" : v.dur} onChange={(ev) => onChange(editShift(v, "dur", ev.target.value))} />
      </div>
      <div><div style={lab}>End</div><input type="time" aria-label="Shift end" style={{ ...inputStyle, width: compact ? 112 : 124 }} value={v.end || ""} onChange={(ev) => onChange(editShift(v, "end", ev.target.value))} /></div>
      {overnight && <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: C.orange, fontWeight: 700, paddingBottom: 9 }}>Overnight (ends next day)</span>}
    </div>
  );
}
function WeeklyEditor({ value, onChange }) {
  const days = value && value.length === 7 ? value : blankWeek();
  const setDay = (i, patch) => onChange(days.map((d, j) => (j === i ? (typeof patch === "function" ? patch(d) : { ...d, ...patch }) : d)));
  return (
    <div>
      {days.map((d, i) => (
        <div key={i} style={{ display: "flex", alignItems: "flex-end", gap: 10, padding: "6px 0", borderBottom: `1px solid ${C.lineSoft}`, flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, width: 78, fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, color: C.ink, paddingBottom: 8 }}>
            <input type="checkbox" checked={!d.off} onChange={(ev) => setDay(i, { off: !ev.target.checked })} /> {WEEKDAY_LABELS[i]}
          </label>
          {d.off ? <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.inkFaint, paddingBottom: 9 }}>Day off</span> : <ShiftEditor compact value={d} onChange={(sh) => setDay(i, () => ({ ...sh, off: false }))} />}
        </div>
      ))}
      <div style={{ marginTop: 8 }}>
        <Btn small variant="ghost" onClick={() => { const f = days.find((d) => !d.off && shiftOk(d)); if (f) onChange(days.map((d) => (d.off ? d : { ...f, off: false }))); }}>Copy first working day to all working days</Btn>
      </div>
    </div>
  );
}

/* ---------- Tools tab: executor colours ---------- */
function useStaff() {
  const [users, setUsers] = useState([]);
  useEffect(() => { api.listUsers().then(setUsers).catch(() => setUsers([])); }, []);
  const list = users.filter(isExecPerson);
  list.all = users.filter((u) => u.role !== "Guest");
  return list;
}
function ExecutorColoursCard({ data, update }) {
  const staff = useStaff();
  const setColour = (id, v) => update((d) => { d.executorColors = d.executorColors || {}; if (v) d.executorColors[id] = v; else delete d.executorColors[id]; return d; });
  return (
    <Panel style={{ padding: 18 }}>
      <div id="tools-colours" style={{ fontFamily: FONT_HEAD, fontSize: 15, fontWeight: 600, color: C.ink, marginBottom: 4 }}>Executor colours<InfoTip k="colours" /></div>
      <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.inkSoft, marginBottom: 12 }}>Each person's colour is used wherever their name or card appears on the labour assignment and workforce schedule screens, and in shift template previews.</div>
      {staff.length === 0 && <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.inkFaint }}>No accounts found.</div>}
      {staff.map((u) => {
        const col = execColor(data, u.id);
        const custom = !!(data.executorColors && data.executorColors[u.id]);
        return (
          <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: `1px solid ${C.lineSoft}` }}>
            <input type="color" aria-label={`Colour for ${u.username}`} value={col} onChange={(e) => setColour(u.id, e.target.value)} style={{ width: 34, height: 26, padding: 0, border: `1px solid ${C.line}`, borderRadius: 3, background: "none", cursor: "pointer" }} />
            <span style={{ background: col, color: textOn(col), fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 11 }}>{u.username}</span>
            <span style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint, flex: 1 }}>{u.role}{custom ? "" : " · automatic colour"}</span>
            {custom && <Btn small variant="ghost" onClick={() => setColour(u.id, null)}>Reset</Btn>}
          </div>
        );
      })}
    </Panel>
  );
}

/* ---------- Tools tab: shift templates ---------- */
function TemplateModal({ initial, onClose, onSave }) {
  const [name, setName] = useState(initial.name || "");
  const [shift, setShift] = useState(initial.shift || blankShift());
  const [days, setDays] = useState(initial.days || blankWeek());
  const [err, setErr] = useState("");
  const weekly = initial.kind === "weekly";
  const save = () => {
    if (!name.trim()) { setErr("Give the template a name."); return; }
    if (weekly) {
      const working = days.filter((d) => !d.off);
      if (!working.length) { setErr("Pick at least one working day."); return; }
      if (working.some((d) => !shiftOk(d))) { setErr("Each working day needs a start and either a duration or an end time."); return; }
    } else if (!shiftOk(shift)) { setErr("Fill in any two of start, duration and end."); return; }
    onSave({ ...initial, name: name.trim(), kind: initial.kind, ...(weekly ? { days: days.map((d) => ({ off: !!d.off, start: d.start, dur: d.dur, end: d.end, touched: d.touched || [] })) } : { shift: { start: shift.start, dur: shift.dur, end: shift.end, touched: shift.touched || [] } }) });
  };
  return (
    <Modal title={`${initial.id ? "Edit" : "New"} ${weekly ? "weekly" : "daily"} template`} info="tplModal" onClose={onClose} wide={weekly}>
      <Field label="Template name" required><input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder={weekly ? "e.g. Mon–Fri days" : "e.g. Day shift"} /></Field>
      <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.inkSoft, marginBottom: 10 }}>Fill in any two of start, duration and end — the third is calculated. An end time earlier than the start means the shift runs overnight and is shown on the day it starts.</div>
      {weekly ? <WeeklyEditor value={days} onChange={setDays} /> : <ShiftEditor value={shift} onChange={setShift} />}
      {err && <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.rust, marginTop: 10 }}>{err}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" onClick={save}>Save template</Btn>
      </div>
    </Modal>
  );
}
function ShiftTemplatesCard({ data, update }) {
  const dialog = useDialog();
  const [editing, setEditing] = useState(null);
  const list = data.shiftTemplates || [];
  const save = (t) => {
    update((d) => {
      d.shiftTemplates = d.shiftTemplates || [];
      if (t.id) { const i = d.shiftTemplates.findIndex((x) => x.id === t.id); if (i >= 0) d.shiftTemplates[i] = t; }
      else d.shiftTemplates.push({ ...t, id: uid("tpl") });
      return d;
    });
    setEditing(null);
  };
  const del = async (t) => {
    if (!(await dialog.confirm(`Delete the template “${t.name}”? Shifts already scheduled from it are not changed.`))) return;
    update((d) => { d.shiftTemplates = (d.shiftTemplates || []).filter((x) => x.id !== t.id); return d; });
  };
  return (
    <Panel style={{ padding: 18 }}>
      <div id="tools-templates" style={{ fontFamily: FONT_HEAD, fontSize: 15, fontWeight: 600, color: C.ink, marginBottom: 4 }}>Shift templates<InfoTip k="templates" /></div>
      <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.inkSoft, marginBottom: 12 }}>Named daily or weekly shift patterns, applied by dragging a person onto a day or week on the Workforce schedule.</div>
      {!workforceOn() && <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.orange, marginBottom: 10 }}>Workforce scheduling is turned off, so templates are not used yet. The Owner can turn it on under Features.</div>}
      {list.length === 0 && <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.inkFaint, marginBottom: 10 }}>No templates yet.</div>}
      {list.map((t) => (
        <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.lineSoft}` }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: FONT_BODY, fontSize: 13.5, fontWeight: 600, color: C.ink }}>{t.name} <span style={{ fontSize: 11, fontWeight: 700, color: C.inkFaint }}>· {t.kind === "weekly" ? "Weekly" : "Daily"}</span></div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.inkSoft }}>{templateSummary(t)}</div>
          </div>
          <button title="Edit" onClick={() => setEditing(t)} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkSoft }}><Pencil size={14} /></button>
          <button title="Delete" onClick={() => del(t)} style={{ background: "none", border: "none", cursor: "pointer", color: C.rust }}><Trash2 size={14} /></button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <Btn small onClick={() => setEditing({ kind: "daily" })}><Plus size={13} /> New daily template</Btn>
        <Btn small onClick={() => setEditing({ kind: "weekly" })}><Plus size={13} /> New weekly template</Btn>
      </div>
      {editing && <TemplateModal initial={editing} onClose={() => setEditing(null)} onSave={save} />}
    </Panel>
  );
}

/* ---------- Tools tab: hours ---------- */
function allTimeEntries(data) {
  const out = [];
  (data.workOrders || []).forEach((w) => (w.timeEntries || []).forEach((t) => out.push({ ...t, wo: w })));
  return out.sort((a, b) => String(b.date).localeCompare(String(a.date)));
}
function HoursCard({ data, scope, userId }) {
  const staff = useStaff();
  const name = (id) => ((staff.all || staff).find((u) => u.id === id) || {}).username || "Former member";
  const entries = allTimeEntries(data).filter((t) => scope === "all" || t.executorId === userId);
  const today = todayLocal(), d7 = addDaysISO(today, -6), d30 = addDaysISO(today, -29);
  const sum = (arr) => arr.reduce((s, t) => s + (Number(t.hours) || 0), 0);
  const ids = scope === "all" ? [...new Set(entries.map((t) => t.executorId))] : [userId];
  const th = { textAlign: "left", fontFamily: FONT_BODY, fontSize: 10.5, fontWeight: 700, color: C.inkFaint, textTransform: "uppercase", padding: "4px 8px 4px 0" };
  const td = { fontFamily: FONT_BODY, fontSize: 12.5, color: C.ink, padding: "5px 8px 5px 0", borderTop: `1px solid ${C.lineSoft}` };
  return (
    <Panel style={{ padding: 18 }}>
      <div id={scope === "all" ? "tools-hours-all" : "tools-hours-me"} style={{ fontFamily: FONT_HEAD, fontSize: 15, fontWeight: 600, color: C.ink, marginBottom: 4 }}>{scope === "all" ? "Hours worked — all executors" : "My hours"}<InfoTip k={scope === "all" ? "hoursAll" : "myHours"} /></div>
      <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.inkSoft, marginBottom: 10 }}>Hours are logged when a work order is moved to Completed.</div>
      {entries.length === 0 ? <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.inkFaint }}>No hours logged yet.</div> : (
        <>
          <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: 12 }}>
            <thead><tr>{scope === "all" && <th style={th}>Executor</th>}<th style={th}>Last 7 days</th><th style={th}>Last 30 days</th><th style={th}>All time</th></tr></thead>
            <tbody>
              {ids.map((id) => {
                const mine = entries.filter((t) => t.executorId === id);
                return (
                  <tr key={id}>
                    {scope === "all" && <td style={td}><span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 5, background: execColor(data, id), marginRight: 6 }} />{name(id)}</td>}
                    <td style={td}>{fmtH(sum(mine.filter((t) => t.date >= d7)))} h</td>
                    <td style={td}>{fmtH(sum(mine.filter((t) => t.date >= d30)))} h</td>
                    <td style={td}>{fmtH(sum(mine))} h</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: C.inkFaint, textTransform: "uppercase", marginBottom: 4 }}>Recent entries</div>
          {entries.slice(0, 8).map((t) => (
            <div key={t.id} style={{ display: "flex", gap: 10, fontFamily: FONT_BODY, fontSize: 12.5, color: C.ink, padding: "4px 0", borderTop: `1px solid ${C.lineSoft}` }}>
              <span style={{ width: 82, color: C.inkSoft }}>{t.date}</span>
              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{formatWoNum(t.wo.number)} {t.wo.title}</span>
              {scope === "all" && <span style={{ color: C.inkSoft }}>{name(t.executorId)}</span>}
              <span style={{ fontWeight: 700 }}>{fmtH(t.hours)} h</span>
            </div>
          ))}
        </>
      )}
    </Panel>
  );
}

/* ---------- hours worked prompt (on completion) ---------- */
function HoursWorkedModal({ wo, staff, currentUserId, onCancel, onSave }) {
  const ids = execIdsOf(wo).length ? execIdsOf(wo) : [currentUserId];
  const [hrs, setHrs] = useState(() => Object.fromEntries(ids.map((i) => [i, wo.estHours ? String(wo.estHours) : ""])));
  const [err, setErr] = useState("");
  const nameOf2 = (id) => (staff.find((u) => u.id === id) || {}).username || "You";
  const save = () => {
    const out = [];
    for (const id of ids) {
      const n = Number(hrs[id]);
      if (!(n > 0)) { setErr("Enter the hours worked for each executor (greater than 0)."); return; }
      out.push({ executorId: id, hours: Math.round(n * 100) / 100 });
    }
    onSave(out);
  };
  return (
    <Modal title="Hours worked" info="hoursModal" onClose={onCancel}>
      <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.inkSoft, marginBottom: 12 }}>How many hours did each executor spend on {formatWoNum(wo.number)} {wo.title}?{wo.estHours ? ` (Estimate: ${fmtH(wo.estHours)} h each.)` : ""}</div>
      {ids.map((id) => (
        <Field key={id} label={`${nameOf2(id)} — hours`} required>
          <input type="number" min="0" step="0.25" aria-label={`Hours for ${nameOf2(id)}`} style={{ ...inputStyle, boxSizing: "border-box" }} value={hrs[id]} onChange={(e) => setHrs({ ...hrs, [id]: e.target.value })} />
        </Field>
      ))}
      {err && <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.rust, marginBottom: 8 }}>{err}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
        <Btn variant="primary" onClick={save}>Complete</Btn>
      </div>
    </Modal>
  );
}

/* ---------- work order form: executors, estimate, crew ---------- */
// `part`: "all" (default), "crew" (executors required + hours per executor) or "select" (who is assigned).
function ExecutorPicker({ obj, onChange, users, part = "all", crewRequiredFields = false }) {
  if (!execOn()) {
    if (part === "crew") return null;
    return (
      <Field label="Executor">
        <select style={inputStyle} value={obj.executorId || ""} onChange={(e) => onChange({ executorId: e.target.value })}>
          <option value="">— unassigned —</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.username} ({u.role})</option>)}
        </select>
      </Field>
    );
  }
  const ids = execIdsOf(obj);
  const toggle = (id) => { const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]; onChange({ executorIds: next, executorId: next[0] || "" }); };
  const crew = (
    <div className="hk-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      <Field label="Executors required" required={crewRequiredFields}>
        <input type="number" min="1" step="1" style={inputStyle} value={obj.crewRequired || ""} onChange={(e) => onChange({ crewRequired: e.target.value })} placeholder="1" />
      </Field>
      <Field label="Hours per executor" required={crewRequiredFields}>
        <input type="number" min="0" step="0.25" style={inputStyle} value={obj.estHours || ""} onChange={(e) => onChange({ estHours: e.target.value })} placeholder="e.g. 2" />
      </Field>
    </div>
  );
  const select = (
    <Field label="Executors">
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {users.map((u) => {
          const on = ids.includes(u.id);
          return (
            <button key={u.id} type="button" onClick={() => toggle(u.id)} aria-pressed={on} title={`${u.username} (${u.role})`}
              style={{ cursor: "pointer", fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 12, border: `1px solid ${on ? C.navy : C.line}`, background: on ? C.navy : "transparent", color: on ? "#fff" : C.ink }}>
              {on ? "✓ " : ""}{u.username}
            </button>
          );
        })}
        {users.length === 0 && <span style={{ fontSize: 12, color: C.inkFaint }}>No one is available — mark people as executors under Tools and settings</span>}
      </div>
    </Field>
  );
  if (part === "crew") return crew;
  if (part === "select") return select;
  return <>{select}{crew}</>;
}
/* ============================================================
   v2.4 — PLANNING CALENDAR (Labour assignment + Workforce schedule)
============================================================ */
const PC_CSS = `
:root{--pc-week:color-mix(in srgb,var(--hk-bg) 86%,#000);}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--pc-week:color-mix(in srgb,var(--hk-bg) 84%,#fff);}}
:root[data-theme="dark"]{--pc-week:color-mix(in srgb,var(--hk-bg) 84%,#fff);}
.pc-over{outline:2px dashed var(--hk-orange);outline-offset:-2px;}
.pc-card{cursor:grab;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none;} .pc-card:active{cursor:grabbing;}
.pc-held{outline:2px solid var(--hk-orange)!important;outline-offset:1px;box-shadow:0 0 0 4px color-mix(in srgb,var(--hk-orange) 25%,transparent);}
@media (pointer:coarse){.pc-card{cursor:pointer;}}
/* v2.6: on narrow screens the work orders to place sit above the calendar, in a card about three work orders tall */
@media (max-width:860px){
  .pc-split{grid-template-columns:minmax(0,1fr)!important;}
  .pc-side{order:-1;position:static!important;max-height:var(--pc-side-h,262px)!important;overflow-y:auto!important;}
}
`;
const SLOT_H = 22;

/* v2.5 touch support: tap (or tap and hold) a card to pick it up, then tap a target to place it.
   Mouse drag and drop is unchanged; touch taps are recognised by event.nativeEvent.pointerType. */
const HELD = { v: null, subs: new Set() };
function setHeld(v) { HELD.v = v; HELD.subs.forEach((f) => f()); }
function useHeld() {
  const [, force] = useState(0);
  useEffect(() => { const f = () => force((x) => x + 1); HELD.subs.add(f); return () => { HELD.subs.delete(f); }; }, []);
  return HELD.v;
}
const sameHeld = (a, b) => !!a && !!b && a.t === b.t && a.id === b.id;
// Returns true when the tap was used to pick up (or put down) the card, so the caller should not open it.
function tapPick(e, payload) {
  const pt = e && e.nativeEvent && e.nativeEvent.pointerType;
  if (pt !== "touch" && !HELD.v) return false;
  if (pt !== "touch" && HELD.v) return false; // a mouse click while holding bubbles to the drop target
  if (HELD.v) { if (sameHeld(HELD.v, payload)) { e.stopPropagation(); setHeld(null); return true; } return false; }
  e.stopPropagation(); setHeld(payload); return true;
}

function ExecMultiFilter({ staff, value, onChange, data }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  const label = value.length === 0 ? "All executors" : value.length === 1 ? ((staff.find((u) => u.id === value[0]) || {}).username || "1 selected") : `${value.length} executors`;
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" aria-label="Filter by executors" onClick={() => setOpen((o) => !o)} style={{ ...inputStyle, width: "auto", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, textAlign: "left" }}>
        {label} <ChevronDown size={13} />
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 30, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 4, padding: 8, minWidth: 190, maxHeight: 280, overflowY: "auto", boxShadow: "0 6px 20px rgba(0,0,0,0.18)" }}>
          {staff.map((u) => (
            <label key={u.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 4px", cursor: "pointer", fontFamily: FONT_BODY, fontSize: 13, color: C.ink }}>
              <input type="checkbox" checked={value.includes(u.id)} onChange={() => onChange(value.includes(u.id) ? value.filter((x) => x !== u.id) : [...value, u.id])} />
              <span style={{ width: 9, height: 9, borderRadius: 5, background: execColor(data, u.id) }} /> {u.username}
            </label>
          ))}
          <div style={{ marginTop: 6 }}><Btn small variant="ghost" onClick={() => onChange([])}>Show all</Btn></div>
        </div>
      )}
    </div>
  );
}

function locationOptions(locations) {
  const out = [];
  const walk = (parent, depth) => locations.filter((l) => (l.parentId || null) === parent).forEach((l) => { out.push({ id: l.id, label: "  ".repeat(depth) + l.name }); walk(l.id, depth + 1); });
  walk(null, 0);
  return out;
}

function PlanWoCard({ w, data, fromExec, draggable, onOpen, onRemove, tight, style }) {
  const under = underStaffed(w);
  const crew = crewOf(w);
  const done = isDoneStatus(w.status);
  const held = useHeld();
  const isHeld = sameHeld(held, { t: "wo", id: w.id });
  const tip = under ? `Needs ${crew} executor${crew === 1 ? "" : "s"}, ${execIdsOf(w).length} assigned` : "";
  return (
    <div
      className={"pc-card" + (isHeld ? " pc-held" : "")} draggable={!!draggable && !done} data-wo={w.id}
      onDragStart={(e) => { e.dataTransfer.setData("text/plain", JSON.stringify({ t: "wo", id: w.id, from: fromExec || "" })); e.dataTransfer.effectAllowed = "move"; }}
      onClick={(e) => { if (draggable && !done && tapPick(e, { t: "wo", id: w.id, from: fromExec || "" })) return; onOpen && onOpen(w.id); }} title={`${formatWoNum(w.number)} ${w.title}${tip ? " — " + tip : ""}`}
      style={{
        background: C.panel, border: `1px ${under ? "dashed" : "solid"} ${under ? C.rust : C.line}`, borderLeft: `4px solid ${WO_TYPE_COLORS[w.type] || C.navy}`,
        borderRadius: 3, boxSizing: "border-box", padding: tight ? "1px 4px" : "4px 5px", marginBottom: tight ? 0 : 4, opacity: done ? 0.6 : 1, fontFamily: FONT_BODY, overflow: "hidden", minWidth: 0, ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
        <div style={{ fontSize: 10.5, fontWeight: 600, color: C.ink, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: tight ? "nowrap" : "normal", lineHeight: 1.25, maxHeight: tight ? undefined : 27 }}>
          <span style={{ color: C.inkFaint }}>{formatWoNum(w.number)}</span> {w.title}
        </div>
        {tight && <span style={{ display: "inline-flex", alignItems: "center", gap: 2, fontSize: 10, color: C.inkSoft, flexShrink: 0 }}><User size={10} />{crew}</span>}
        {tight && under && <AlertTriangle size={11} color="var(--hk-rust)" />}
        {onRemove && <button type="button" title="Remove from this person's schedule" onClick={(e) => { e.stopPropagation(); onRemove(); }} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkFaint, padding: 0, display: "flex" }}><X size={10} /></button>}
      </div>
      {!tight && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10, color: C.inkSoft, marginTop: 2 }}>
          <span title="Executors required" style={{ display: "inline-flex", alignItems: "center", gap: 2 }}><User size={11} />{crew}</span>
          <span title="Estimated hours per executor" style={{ display: "inline-flex", alignItems: "center", gap: 2 }}><Clock size={11} />{w.estHours ? fmtH(w.estHours) : "—"}</span>
          {under && <span title={tip} style={{ display: "inline-flex", alignItems: "center", gap: 2, color: C.rust, fontWeight: 700 }}><AlertTriangle size={11} />Short</span>}
        </div>
      )}
    </div>
  );
}

function PlanningCalendar({ kind, data, update, role, currentUserId, goToOrder, goTemplates }) {
  const labour = kind === "labour";
  const canEdit = scheduleRole(role);
  const dialog = useDialog();
  const staff = useStaff();
  const wfOn = workforceOn();
  const hourly = labour && hourlyOn();
  const [view, setView] = useState("month");
  const [anchor, setAnchor] = useState(todayLocal());
  const [execSel, setExecSel] = useState(labour && role === "Executor" && !scheduleRole(role) ? [currentUserId] : []);
  const [locFilter, setLocFilter] = useState("");
  const [unschedOnly, setUnschedOnly] = useState(true);
  const [popup, setPopup] = useState(null);
  const [editShift, setEditShift] = useState(null); // shift id being edited

  const shifts = data.workShifts || [];
  const allowedLocs = locFilter ? descendantIds(data.locations, locFilter) : null;
  const wos = data.workOrders.filter((w) => w.type !== "PM Base" && w.scheduledDate && (!allowedLocs || allowedLocs.has(w.locationId)));
  const woPassesExec = (w) => !execSel.length || execIdsOf(w).some((i) => execSel.includes(i));
  const wosOn = (date) => wos.filter((w) => w.scheduledDate === date);
  const worksOn = (id, date) => shifts.some((s) => s.date === date && s.executorId === id);
  const dayShifts = (date) => shifts.filter((s) => s.date === date);
  const nameOf = (id) => ((staff.all || staff).find((u) => u.id === id) || {}).username || "Former member";

  // Executors shown for a day on the labour screens.
  const colsFor = (date) => staff.filter((u) => {
    if (execSel.length && !execSel.includes(u.id)) return false;
    const hasWo = wosOn(date).some((w) => execIdsOf(w).includes(u.id));
    if (wfOn) return worksOn(u.id, date) || hasWo;
    return isExecPerson(u) || execSel.includes(u.id) || hasWo;
  });
  const hoursFor = (id, date) => wosOn(date).filter((w) => execIdsOf(w).includes(id)).reduce((s, w) => s + (Number(w.estHours) || 0), 0);

  /* ----- mutations ----- */
  const placeWo = (woId, date, target, from, startTime) => update((d) => {
    const w = d.workOrders.find((x) => x.id === woId);
    if (!w || isDoneStatus(w.status)) return d;
    let ids = [...execIdsOf(w)];
    if (from && from !== target) ids = ids.filter((i) => i !== from);
    if (target && !ids.includes(target)) ids.push(target);
    const dateChanged = w.scheduledDate !== date;
    w.executorIds = ids; w.executorId = ids[0] || "";
    w.scheduledDate = date;
    applyScheduleStatus(w);
    if (dateChanged) w.startTimes = {};
    w.startTimes = w.startTimes || {};
    if (from && from !== target) delete w.startTimes[from];
    if (target && startTime != null) { if (startTime === "") delete w.startTimes[target]; else w.startTimes[target] = startTime; }
    return d;
  });
  const removeExec = (woId, execId) => update((d) => {
    const w = d.workOrders.find((x) => x.id === woId);
    if (!w) return d;
    w.executorIds = execIdsOf(w).filter((i) => i !== execId); w.executorId = w.executorIds[0] || "";
    if (w.startTimes) delete w.startTimes[execId];
    return d;
  });
  const removeShift = (id) => update((d) => { d.workShifts = (d.workShifts || []).filter((s) => s.id !== id); return d; });
  const applyShifts = (execId, list) => update((d) => {
    d.workShifts = d.workShifts || [];
    const dates = new Set(list.map((x) => x.date));
    d.workShifts = d.workShifts.filter((s) => !(s.executorId === execId && dates.has(s.date)));
    list.forEach((x) => { if (x.sh) d.workShifts.push({ id: uid("sh"), executorId: execId, date: x.date, start: x.sh.start, end: x.sh.end }); });
    return d;
  });

  /* ----- drag/drop plumbing ----- */
  const held = useHeld();
  useEffect(() => {
    const esc = (e) => { if (e.key === "Escape") setHeld(null); };
    window.addEventListener("keydown", esc);
    return () => { window.removeEventListener("keydown", esc); setHeld(null); };
  }, []);
  useEffect(() => { setHeld(null); }, [view, anchor]);
  const dz = (handler) => (canEdit ? {
    onDragOver: (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; e.currentTarget.classList.add("pc-over"); },
    onDragLeave: (e) => e.currentTarget.classList.remove("pc-over"),
    onDrop: (e) => {
      e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.remove("pc-over");
      let p = null;
      try { p = JSON.parse(e.dataTransfer.getData("text/plain")); } catch { p = null; }
      if (p) handler(p, e);
    },
    onClick: (e) => {
      const p = HELD.v;
      if (!p) return;
      e.stopPropagation();
      setHeld(null);
      handler(p, e);
    },
  } : {});
  const dropOnDay = (date, execId) => (p) => {
    if (labour && p.t === "wo") placeWo(p.id, date, execId, p.from);
    else if (!labour && p.t === "exec") setPopup({ execId: p.id, scope: "day", date });
  };
  const dropOnWeek = (weekStart) => (p) => { if (!labour && p.t === "exec") setPopup({ execId: p.id, scope: "week", date: weekStart }); };

  /* ----- navigation ----- */
  const step = (dir) => setAnchor((a) => (view === "month" ? addMonthsISO(a, dir) : addDaysISO(a, dir * (view === "week" ? 7 : 1))));
  const up = () => setView((v) => (v === "day" ? "week" : "month"));
  const openDay = (date) => { setAnchor(date); setView("day"); };
  const openWeek = (date) => { setAnchor(date); setView("week"); };
  const wkStart = weekStartISO(anchor);
  const title = view === "month"
    ? parseISO(anchor).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : view === "week"
      ? `Week ${isoWeekNum(anchor)} · ${fmtShort(wkStart)} – ${fmtShort(addDaysISO(wkStart, 6))}, ${parseISO(addDaysISO(wkStart, 6)).getFullYear()}`
      : parseISO(anchor).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const exportPdf = () => exportSchedulePdf({ view, anchor, data, staff, shifts, title });

  /* ----- small renderers ----- */
  const execChip = (id, extra) => {
    const col = execColor(data, id);
    return <span style={{ background: col, color: textOn(col), fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%", ...extra }}>{nameOf(id)}</span>;
  };
  const covBadge = (date, big) => {
    const c = dayCoverage(dayShifts(date));
    if (!c) return null;
    const bad = c.gaps.length > 0;
    return <span data-cov={date} title={bad ? `Nobody is working ${gapText(c)}` : "Everyone's shifts cover this period"} style={{ fontFamily: FONT_BODY, fontSize: big ? 11.5 : 10, fontWeight: 700, color: bad ? "var(--hk-rust)" : C.inkSoft, whiteSpace: "nowrap" }}>{covText(c)}</span>;
  };
  const shiftChip = (s, big) => {
    const col = execColor(data, s.executorId);
    return (
      <div key={s.id} data-shift={s.id} role={canEdit ? "button" : undefined} tabIndex={canEdit ? 0 : undefined}
        title={`${nameOf(s.executorId)} ${shiftText(s)}${canEdit ? " — tap to edit or delete" : ""}`}
        onClick={(e) => { if (!canEdit) return; if (HELD.v) return; e.stopPropagation(); setEditShift(s.id); }}
        onKeyDown={(e) => { if (canEdit && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setEditShift(s.id); } }}
        style={{ background: col, color: textOn(col), borderRadius: 2, padding: "2px 4px", marginBottom: 2, fontFamily: FONT_BODY, fontSize: big ? 12 : 10.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 3, cursor: canEdit ? "pointer" : "default", minWidth: 0 }}>
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nameOf(s.executorId)} {shiftText(s)}</span>
      </div>
    );
  };
  const sortedShifts = (date) => dayShifts(date).filter((s) => !execSel.length || execSel.includes(s.executorId)).sort((a, b) => (toMin(a.start) || 0) - (toMin(b.start) || 0));
  const isToday = (d) => d === todayLocal();

  const weekHeaderCell = (ws, h) => (
    <div
      data-weekhdr={ws} {...dz(dropOnWeek(ws))}
      onClick={(e) => { if (HELD.v) { dz(dropOnWeek(ws)).onClick(e); } else openWeek(ws); }} title={`Open week ${isoWeekNum(ws)}${!labour && canEdit ? " — or drop a name card here to schedule the whole week" : ""}`}
      style={{ cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: C.inkSoft, minHeight: h || 0 }}
    >
      <span>W{isoWeekNum(ws)}</span>
      {!labour && canEdit && <span style={{ fontSize: 9, fontWeight: 600, color: C.inkFaint }}>drop</span>}
    </div>
  );

  /* ----- MONTH ----- */
  const renderMonth = () => {
    const first = parseISO(anchor); first.setDate(1);
    const gridStart = weekStartISO(isoLocal(first));
    const month = first.getMonth();
    const weeks = [];
    for (let ws = gridStart; ; ws = addDaysISO(ws, 7)) {
      weeks.push(ws);
      if (parseISO(addDaysISO(ws, 7)).getMonth() !== month && parseISO(addDaysISO(ws, 7)) > first) break;
      if (weeks.length > 6) break;
    }
    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "44px repeat(7, minmax(0,1fr))", gap: 4, padding: "0 6px 4px" }}>
          <div />
          {WEEKDAY_LABELS.map((w) => <div key={w} style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: C.inkFaint, textAlign: "center" }}>{w}</div>)}
        </div>
        {weeks.map((ws) => (
          <div key={ws} data-week={ws} style={{ display: "grid", gridTemplateColumns: "44px repeat(7, minmax(0,1fr))", gap: 4, background: "var(--pc-week)", border: `1px solid ${C.line}`, borderRadius: 4, padding: 6, marginBottom: 8 }}>
            {weekHeaderCell(ws, 70)}
            {Array.from({ length: 7 }).map((_, i) => {
              const date = addDaysISO(ws, i);
              const inMonth = parseISO(date).getMonth() === month;
              const list = labour ? wosOn(date).filter(woPassesExec) : sortedShifts(date);
              return (
                <div key={date} data-day={date} {...dz(dropOnDay(date, ""))} style={{ minHeight: 84, minWidth: 0, border: `1px solid ${C.lineSoft}`, borderRadius: 3, padding: 4, background: isToday(date) ? C.orangeSoft : C.panel, opacity: inMonth ? 1 : 0.55 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 4, marginBottom: 3 }}>
                    <span onClick={() => { if (!HELD.v) openDay(date); }} title="Open this day" style={{ cursor: "pointer", fontFamily: FONT_BODY, fontSize: 11.5, fontWeight: 700, color: isToday(date) ? C.orange : C.inkFaint }}>{parseISO(date).getDate()}</span>
                    {!labour && covBadge(date)}
                  </div>
                  {labour
                    ? <>
                      {list.slice(0, 3).map((w) => {
                        const under = underStaffed(w);
                        return (
                          <div key={w.id} draggable={canEdit && !isDoneStatus(w.status)} className={"pc-card" + (sameHeld(held, { t: "wo", id: w.id }) ? " pc-held" : "")}
                            onDragStart={(e) => { e.dataTransfer.setData("text/plain", JSON.stringify({ t: "wo", id: w.id, from: "" })); }}
                            onClick={(e) => { if (canEdit && !isDoneStatus(w.status) && tapPick(e, { t: "wo", id: w.id, from: "" })) return; goToOrder(w.id); }} title={`${formatWoNum(w.number)} ${w.title}${under ? " — needs more executors" : ""}`}
                            style={{ fontFamily: FONT_BODY, fontSize: 10.5, fontWeight: 600, color: "#fff", background: WO_TYPE_COLORS[w.type], borderRadius: 2, padding: "2px 4px", marginBottom: 2, display: "flex", alignItems: "center", gap: 3, minWidth: 0, outline: under ? "2px dashed var(--hk-rust)" : "none" }}>
                            <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.title}</span>
                            {execIdsOf(w).slice(0, 3).map((id) => <span key={id} title={nameOf(id)} style={{ width: 8, height: 8, borderRadius: 4, background: execColor(data, id), border: "1px solid #fff", flexShrink: 0 }} />)}
                            {under && <AlertTriangle size={10} />}
                          </div>
                        );
                      })}
                      {list.length > 3 && <div style={{ fontFamily: FONT_BODY, fontSize: 10, color: C.inkFaint }}>+{list.length - 3} more</div>}
                    </>
                    : <>
                      {list.slice(0, 4).map((s) => shiftChip(s))}
                      {list.length > 4 && <div style={{ fontFamily: FONT_BODY, fontSize: 10, color: C.inkFaint }}>+{list.length - 4} more</div>}
                    </>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  /* ----- column header used by labour week boards and day view ----- */
  const colHeader = (id, date, label) => {
    const col = id ? execColor(data, id) : null;
    const hrs = id ? hoursFor(id, date) : wosOn(date).filter((w) => !execIdsOf(w).length).reduce((s, w) => s + (Number(w.estHours) || 0), 0);
    const off = id && wfOn && !worksOn(id, date);
    return (
      <div data-colhdr={`${id || "unassigned"}|${date}`} style={{ background: col || C.panelAlt, color: col ? textOn(col) : C.ink, padding: "0 6px", height: 28, boxSizing: "border-box", borderRadius: "3px 3px 0 0", fontFamily: FONT_BODY, fontSize: 11.5, fontWeight: 700, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4, minWidth: 0 }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label || (id ? nameOf(id) : "Unassigned")}</span>
        <span title={off ? "Not on shift this day" : "Total estimated hours scheduled this day"} style={{ display: "inline-flex", alignItems: "center", gap: 3, flexShrink: 0, fontWeight: 600 }}>
          {off && <AlertTriangle size={11} />}<Clock size={11} />{fmtH(hrs)}
        </span>
      </div>
    );
  };
  const woList = (list, date, execId, fromExec) => list.map((w) => (
    <PlanWoCard key={w.id} w={w} data={data} draggable={canEdit} fromExec={fromExec} onOpen={goToOrder} onRemove={canEdit && execId ? () => removeExec(w.id, execId) : null} />
  ));

  /* ----- WEEK ----- */
  const renderWeek = () => {
    const days = Array.from({ length: 7 }, (_, i) => addDaysISO(wkStart, i));
    if (!labour) {
      return (
        <div data-week={wkStart} style={{ display: "grid", gridTemplateColumns: "44px repeat(7, minmax(0,1fr))", gap: 4, background: "var(--pc-week)", border: `1px solid ${C.line}`, borderRadius: 4, padding: 6 }}>
          {weekHeaderCell(wkStart, 200)}
          {days.map((date) => (
            <div key={date} data-day={date} {...dz(dropOnDay(date))} style={{ minWidth: 0, background: isToday(date) ? C.orangeSoft : C.panel, border: `1px solid ${C.lineSoft}`, borderRadius: 3, minHeight: 200, padding: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4, gap: 4 }}>
                <span onClick={() => { if (!HELD.v) openDay(date); }} style={{ cursor: "pointer", fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, color: C.ink }}>{parseISO(date).toLocaleDateString(undefined, { weekday: "short", day: "numeric" })}</span>
                {covBadge(date)}
              </div>
              {sortedShifts(date).map((s) => shiftChip(s))}
            </div>
          ))}
        </div>
      );
    }
    const ids = new Set();
    days.forEach((d) => colsFor(d).forEach((u) => ids.add(u.id)));
    const people = staff.filter((u) => ids.has(u.id));
    const boards = [...people.map((u) => ({ id: u.id })), { id: "" }];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {people.length === 0 && wfOn && <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.inkSoft }}>Nobody is scheduled to work this week. Set shifts on the Workforce schedule tab.</div>}
        {boards.map(({ id }) => {
          const col = id ? execColor(data, id) : C.line;
          const total = days.reduce((s, d) => s + (id ? hoursFor(id, d) : 0), 0);
          return (
            <div key={id || "un"} data-board={id || "unassigned"} style={{ border: `1px solid ${C.line}`, borderLeft: `5px solid ${col}`, borderRadius: 4, background: "var(--pc-week)", padding: 6 }}>
              <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 4, display: "flex", gap: 10, alignItems: "baseline" }}>
                {id ? nameOf(id) : "Unassigned work"}{id && <span style={{ fontSize: 11.5, color: C.inkSoft, fontWeight: 600 }}>{fmtH(total)} h this week</span>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0,1fr))", gap: 4 }}>
                {days.map((date) => {
                  const mine = (id ? wosOn(date).filter((w) => execIdsOf(w).includes(id)) : wosOn(date).filter((w) => !execIdsOf(w).length)).filter(woPassesExec);
                  const off = id && wfOn && !worksOn(id, date) && mine.length === 0;
                  return (
                    <div key={date} data-cell={`${id || "unassigned"}|${date}`} {...(off ? {} : dz(dropOnDay(date, id)))} style={{ minWidth: 0, opacity: off ? 0.5 : 1 }}>
                      <div onClick={() => { if (!HELD.v) openDay(date); }} style={{ cursor: "pointer" }}>{colHeader(id, date, parseISO(date).toLocaleDateString(undefined, { weekday: "short", day: "numeric" }))}</div>
                      <div style={{ minHeight: 70, background: off ? C.panelAlt : (isToday(date) ? C.orangeSoft : C.panel), border: `1px solid ${C.lineSoft}`, borderTop: "none", borderRadius: "0 0 3px 3px", padding: 3 }}>
                        {off ? <div style={{ fontFamily: FONT_BODY, fontSize: 10, color: C.inkFaint, textAlign: "center", paddingTop: 6 }}>Off</div> : woList(mine, date, id, id)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  /* ----- DAY ----- */
  const renderDay = () => {
    const date = anchor;
    if (!labour) {
      const cols = staff.filter((u) => !execSel.length || execSel.includes(u.id));
      return (
        <div data-day={date} {...dz(dropOnDay(date))} style={{ border: `1px solid ${C.line}`, borderRadius: 4, background: "var(--pc-week)", padding: 8 }}>
          <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.inkSoft, marginBottom: 8, display: "flex", gap: 8, alignItems: "baseline" }}>Coverage {covBadge(date, true) || <span style={{ color: C.inkFaint }}>nobody scheduled</span>}{canEdit && <span style={{ color: C.inkFaint }}>· drop a name card anywhere here to schedule this day</span>}</div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(1, cols.length)}, minmax(0,1fr))`, gap: 6 }}>
            {cols.map((u) => {
              const mine = dayShifts(date).filter((s) => s.executorId === u.id);
              const col = execColor(data, u.id);
              return (
                <div key={u.id} data-cell={`${u.id}|${date}`} style={{ minWidth: 0 }}>
                  <div style={{ background: col, color: textOn(col), padding: "5px 6px", borderRadius: "3px 3px 0 0", fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.username}</div>
                  <div style={{ minHeight: 90, background: C.panel, border: `1px solid ${C.lineSoft}`, borderTop: "none", padding: 5 }}>
                    {mine.length === 0 ? <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: C.inkFaint }}>Not scheduled</div> : mine.map((s) => shiftChip(s, true))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    const cols = colsFor(date);
    const colList = [...cols.map((u) => u.id), ""];
    const empty = cols.length === 0 && wfOn;
    return (
      <div data-day={date} style={{ border: `1px solid ${C.line}`, borderRadius: 4, background: "var(--pc-week)", padding: 8 }}>
        {empty && <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.inkSoft, marginBottom: 8 }}>Nobody is scheduled to work this day. Set shifts on the Workforce schedule tab.</div>}
        {hourly ? renderHourly(date, colList) : (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${colList.length}, minmax(0,1fr))`, gap: 6 }}>
            {colList.map((id) => {
              const mine = (id ? wosOn(date).filter((w) => execIdsOf(w).includes(id)) : wosOn(date).filter((w) => !execIdsOf(w).length)).filter(woPassesExec);
              return (
                <div key={id || "un"} data-cell={`${id || "unassigned"}|${date}`} {...dz(dropOnDay(date, id))} style={{ minWidth: 0 }}>
                  {colHeader(id, date)}
                  <div style={{ minHeight: 260, background: C.panel, border: `1px solid ${C.lineSoft}`, borderTop: "none", borderRadius: "0 0 3px 3px", padding: 4 }}>{woList(mine, date, id, id)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  /* ----- hourly day grid ----- */
  const renderHourly = (date, colList) => {
    const real = colList.filter(Boolean);
    const spans = real.flatMap((id) => dayShifts(date).filter((s) => s.executorId === id).map(shiftSpan).filter(Boolean));
    let a0 = spans.length ? Math.min(...spans.map((x) => x.s)) : 360;
    let a1 = spans.length ? Math.max(...spans.map((x) => x.e)) : 1080;
    a0 = Math.floor(a0 / 60) * 60; a1 = Math.min(1440, Math.ceil(a1 / 60) * 60);
    if (a1 <= a0) a1 = Math.min(1440, a0 + 60);
    const slots = (a1 - a0) / 30;
    const labels = Array.from({ length: slots }, (_, i) => a0 + i * 30);
    return (
      <div style={{ display: "grid", gridTemplateColumns: `38px repeat(${colList.length}, minmax(0,1fr))`, gap: 6 }}>
        <div>
          <div style={{ height: 28 + 64 }} />
          <div>
            {labels.map((m) => <div key={m} style={{ height: SLOT_H, fontFamily: FONT_BODY, fontSize: 9.5, color: C.inkFaint, textAlign: "right", paddingRight: 3, lineHeight: "10px" }}>{m % 60 === 0 ? fromMin(m) : ""}</div>)}
          </div>
        </div>
        {colList.map((id) => {
          const mine = (id ? wosOn(date).filter((w) => execIdsOf(w).includes(id)) : wosOn(date).filter((w) => !execIdsOf(w).length)).filter(woPassesExec);
          const myShift = id ? dayShifts(date).filter((s) => s.executorId === id).map(shiftSpan).filter(Boolean) : [];
          const inShift = (m) => myShift.some((x) => m >= x.s && m < x.e);
          const placed = [], unplaced = [];
          mine.forEach((w) => {
            const st = id ? toMin((w.startTimes || {})[id]) : null;
            if (st != null && st >= a0 && st < a1) placed.push({ w, s: st, e: st + Math.max(30, Math.round((Number(w.estHours) || 0.5) * 60 / 30) * 30) });
            else unplaced.push(w);
          });
          const sorted = [...placed].sort((p, q) => p.s - q.s || q.e - p.e);
          const laneEnd = []; const lane = {};
          sorted.forEach((it) => { let l = laneEnd.findIndex((end) => end <= it.s); if (l < 0) { l = laneEnd.length; laneEnd.push(it.e); } else laneEnd[l] = it.e; lane[it.w.id] = l; });
          const lanes = Math.max(1, laneEnd.length);
          const onGridDrop = (p, e) => {
            if (p.t !== "wo" || !id) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const idx = Math.max(0, Math.min(slots - 1, Math.floor((e.clientY - rect.top) / SLOT_H)));
            const start = a0 + idx * 30;
            if (!inShift(start)) { dialog.alertMsg(`${nameOf(id)} is not scheduled to work at ${fromMin(start)} on this day.`); return; }
            placeWo(p.id, date, id, p.from, fromMin(start));
          };
          return (
            <div key={id || "un"} data-cell={`${id || "unassigned"}|${date}`} style={{ minWidth: 0 }}>
              {colHeader(id, date)}
              <div data-unplaced={id || "unassigned"} {...dz((p) => { if (p.t === "wo") placeWo(p.id, date, id, p.from, id ? "" : undefined); })} style={{ background: C.panel, border: `1px solid ${C.lineSoft}`, borderTop: "none", padding: 3, height: 64, boxSizing: "border-box", overflowY: "auto" }}>
                <div style={{ fontFamily: FONT_BODY, fontSize: 9.5, color: C.inkFaint, marginBottom: 2 }}>{id ? "No start time" : "Unassigned"}</div>
                {woList(unplaced, date, id, id)}
              </div>
              {id ? (
                <div data-grid={id} {...dz(onGridDrop)} style={{ position: "relative", height: slots * SLOT_H, border: `1px solid ${C.lineSoft}`, borderTop: "none", background: C.panel }}>
                  {labels.map((m, i) => (
                    <div key={m} data-slot={`${id}|${fromMin(m)}`} style={{ position: "absolute", left: 0, right: 0, top: i * SLOT_H, height: SLOT_H, borderTop: `1px ${m % 60 === 0 ? "solid" : "dotted"} ${C.lineSoft}`, background: inShift(m) ? "transparent" : C.panelAlt, opacity: inShift(m) ? 1 : 0.85 }} />
                  ))}
                  {placed.map(({ w, s, e }) => (
                    <PlanWoCard key={w.id} w={w} data={data} tight draggable={canEdit} fromExec={id} onOpen={goToOrder} onRemove={canEdit ? () => removeExec(w.id, id) : null}
                      style={{ position: "absolute", top: ((s - a0) / 30) * SLOT_H + 1, height: ((e - s) / 30) * SLOT_H - 2, left: `${(lane[w.id] / lanes) * 100}%`, width: `calc(${100 / lanes}% - 2px)`, display: "flex", flexDirection: "column", justifyContent: "flex-start" }} />
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  };

  /* ----- side list ----- */
  const sideList = data.workOrders
    .filter((w) => w.type !== "PM Base" && isOpenStatus(w.status) && (!unschedOnly || !w.scheduledDate) && (!allowedLocs || allowedLocs.has(w.locationId)))
    .sort((a, b) => (a.requiredByDate || "9999").localeCompare(b.requiredByDate || "9999") || a.number - b.number);

  const seg = (v, lab) => <button key={v} type="button" onClick={() => setView(v)} aria-pressed={view === v} style={{ fontFamily: FONT_BODY, fontSize: 12.5, fontWeight: 600, padding: "6px 12px", border: "none", cursor: "pointer", background: view === v ? C.navy : "transparent", color: view === v ? "#fff" : C.ink }}>{lab}</button>;

  return (
    <div>
      <style>{PC_CSS}</style>
      <SectionHeader
        title={labour ? "Labour assignment" : "Workforce schedule"}
        subtitle={labour ? "Who is doing which work, and when." : "Who is working, and when. Everyone can view; managers set it."}
        info={labour ? PAGE_INFO.labour : PAGE_INFO.workforce}
        action={!labour ? (
          <div style={{ display: "flex", gap: 8 }}>
            <Btn small variant="ghost" onClick={exportPdf}><Printer size={13} /> Export PDF</Btn>
            {canEdit && <Btn small onClick={goTemplates}><Plus size={13} /> Create new template</Btn>}
          </div>
        ) : null}
      />
      <div data-title style={{ fontFamily: FONT_HEAD, fontSize: 17, fontWeight: 700, color: C.ink, marginBottom: 8 }}>{title}</div>
      <div data-controls style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <Btn small variant="ghost" onClick={() => step(-1)} title="Previous"><ChevronLeft size={14} /></Btn>
        <Btn small variant="ghost" onClick={() => step(1)} title="Next"><ChevronRight size={14} /></Btn>
        <Btn small variant="ghost" onClick={up} disabled={view === "month"} title={view === "day" ? "Up to the week" : "Up to the month"}><ChevronUp size={14} /></Btn>
        <Btn small variant="ghost" onClick={() => setAnchor(todayLocal())}>Today</Btn>
        <div style={{ display: "inline-flex", border: `1px solid ${C.line}`, borderRadius: 3, overflow: "hidden" }}>{seg("month", "Month")}{seg("week", "Week")}{seg("day", "Day")}</div>
        <select aria-label="Filter by location" style={{ ...inputStyle, width: "auto", maxWidth: 220 }} value={locFilter} onChange={(e) => setLocFilter(e.target.value)}>
          <option value="">All locations</option>
          {locationOptions(data.locations).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
        <ExecMultiFilter staff={staff} value={execSel} onChange={setExecSel} data={data} />
      </div>
      {!labour && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }} data-namecards>
          <span style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint, marginRight: 4 }}>{canEdit ? "Drag (or tap, then tap the day or week) a name:" : "Team:"}<InfoTip k="nameCards" /></span>
          {staff.filter((u) => !execSel.length || execSel.includes(u.id)).map((u) => {
            const col = execColor(data, u.id);
            return (
              <div key={u.id} data-namecard={u.id} className={(canEdit ? "pc-card" : "") + (sameHeld(held, { t: "exec", id: u.id }) ? " pc-held" : "")} draggable={canEdit}
                onClick={(e) => { if (canEdit) tapPick(e, { t: "exec", id: u.id }); }}
                onDragStart={(e) => { e.dataTransfer.setData("text/plain", JSON.stringify({ t: "exec", id: u.id })); e.dataTransfer.effectAllowed = "move"; }}
                style={{ background: col, color: textOn(col), fontFamily: FONT_BODY, fontSize: 12.5, fontWeight: 700, padding: "5px 12px", borderRadius: 14 }}>{u.username}</div>
            );
          })}
        </div>
      )}
      {held && (() => {
        const hw = held.t === "wo" ? (data.workOrders || []).find((x) => x.id === held.id) : null;
        const label = held.t === "wo" ? (hw ? `${formatWoNum(hw.number)} ${hw.title}` : "work order") : nameOf(held.id);
        return (
          <div data-heldbar style={{ position: "sticky", top: 60, zIndex: 20, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", background: C.orangeSoft, border: `1px solid ${C.orange}`, borderRadius: 4, padding: "6px 10px", marginBottom: 10, fontFamily: FONT_BODY, fontSize: 12.5, color: C.ink }}>
            <span style={{ flex: 1, minWidth: 160 }}><b>Holding:</b> {label} — {held.t === "wo" ? (labour ? "tap a day, a person's day or an hour slot to place it." : "tap a day to place it.") : "tap a day or a week to schedule them."}</span>
            {held.t === "wo" && <Btn small variant="ghost" onClick={() => { const id = held.id; setHeld(null); goToOrder(id); }}>Open</Btn>}
            <Btn small variant="ghost" onClick={() => setHeld(null)}>Cancel</Btn>
          </div>
        );
      })()}
      <div className="pc-split" style={{ display: "grid", gridTemplateColumns: labour && canEdit ? "minmax(0,1fr) 236px" : "minmax(0,1fr)", gap: 14, alignItems: "start" }}>
        <div style={{ minWidth: 0 }}>
          {view === "day" ? renderDay() : <div className="hk-hscroll" data-hscroll={view}><div className="hk-hscroll-in">{view === "month" ? renderMonth() : renderWeek()}</div></div>}
        </div>
        {labour && canEdit && (
          <Panel className="pc-side" style={{ padding: 10, position: "sticky", top: 70, maxHeight: "calc(100vh - 100px)", overflowY: "auto" }}>
            <div data-sidelist style={{ fontFamily: FONT_HEAD, fontSize: 13.5, fontWeight: 700, color: C.ink }}>Work orders to place<InfoTip k="sideList" /></div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: C.inkFaint, margin: "2px 0 6px" }}>By due date. Drag (or tap, then tap the target) onto a person (week or day view) or a calendar day.</div>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: FONT_BODY, fontSize: 12, color: C.ink, marginBottom: 8 }}>
              <input type="checkbox" checked={unschedOnly} onChange={(e) => setUnschedOnly(e.target.checked)} /> Unscheduled only
            </label>
            {sideList.length === 0 && <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.inkFaint }}>Nothing waiting.</div>}
            {sideList.map((w) => {
              const overdue = w.requiredByDate && w.requiredByDate < todayLocal();
              return (
                <div key={w.id}>
                  <PlanWoCard w={w} data={data} draggable fromExec="" onOpen={goToOrder} />
                  <div style={{ fontFamily: FONT_BODY, fontSize: 10, color: overdue ? "var(--hk-rust)" : C.inkFaint, margin: "-2px 0 6px 4px" }}>{w.requiredByDate ? `Due ${fmtShort(w.requiredByDate)}` : "No due date"}{w.scheduledDate ? ` · scheduled ${fmtShort(w.scheduledDate)}` : ""}</div>
                </div>
              );
            })}
          </Panel>
        )}
      </div>
      {editShift && (() => {
        const sh = shifts.find((x) => x.id === editShift);
        if (!sh) return null;
        return (
          <EditShiftModal shift={sh} name={nameOf(sh.executorId)} templates={(data.shiftTemplates || []).filter((t) => t.kind === "daily")}
            onClose={() => setEditShift(null)}
            onDelete={() => { removeShift(sh.id); setEditShift(null); }}
            onSave={(v) => { update((d) => { const x = (d.workShifts || []).find((q) => q.id === sh.id); if (x) { x.start = v.start; x.end = v.end; } return d; }); setEditShift(null); }} />
        );
      })()}
      {popup && (
        <ApplyShiftModal
          popup={popup} data={data} name={nameOf(popup.execId)}
          onClose={() => setPopup(null)}
          onApply={(sh, weekDays, saveName) => {
            const list = [];
            if (popup.scope === "day") list.push({ date: popup.date, sh: shiftOk(sh) ? sh : null });
            else for (let i = 0; i < 7; i++) { const d = weekDays[i]; list.push({ date: addDaysISO(popup.date, i), sh: d && !d.off && shiftOk(d) ? d : null }); }
            applyShifts(popup.execId, list);
            if (saveName) update((d) => { d.shiftTemplates = d.shiftTemplates || []; d.shiftTemplates.push(popup.scope === "day" ? { id: uid("tpl"), name: saveName, kind: "daily", shift: { start: sh.start, dur: sh.dur, end: sh.end, touched: [] } } : { id: uid("tpl"), name: saveName, kind: "weekly", days: weekDays.map((x) => ({ off: !!x.off, start: x.start, dur: x.dur, end: x.end, touched: [] })) }); return d; });
            setPopup(null);
          }}
        />
      )}
    </div>
  );
}

// Edit or delete a single scheduled shift: change the template, start, end or duration.
function EditShiftModal({ shift, name, templates, onClose, onSave, onDelete }) {
  const initial = () => {
    const s = toMin(shift.start), e = toMin(shift.end);
    const diff = s != null && e != null ? ((e - s + 1440) % 1440) / 60 : "";
    return { start: shift.start, end: shift.end, dur: diff === 0 ? "" : String(diff), touched: ["start", "end"] };
  };
  const [v, setV] = useState(initial);
  const [err, setErr] = useState("");
  const when = parseISO(shift.date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const save = () => { if (!shiftOk(v)) { setErr("Fill in any two of start, duration and end."); return; } onSave(v); };
  return (
    <Modal title={`Edit shift — ${name}`} info="editShift" onClose={onClose}>
      <div data-edit-shift style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.inkSoft, marginBottom: 12 }}>{name} on {when}.</div>
      {templates.length > 0 && (
        <Field label="Use a template">
          <select aria-label="Use a daily template" style={inputStyle} value="" onChange={(e) => { const t = templates.find((x) => x.id === e.target.value); if (t && t.shift) setV({ ...blankShift(), ...t.shift }); }}>
            <option value="">— keep the times below —</option>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name} — {templateSummary(t)}</option>)}
          </select>
        </Field>
      )}
      <ShiftEditor value={v} onChange={setV} />
      {err && <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.rust, marginTop: 8 }}>{err}</div>}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 16 }}>
        <Btn variant="danger" onClick={onDelete}><Trash2 size={13} /> Delete shift</Btn>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={save}>Save</Btn>
        </div>
      </div>
    </Modal>
  );
}

function ApplyShiftModal({ popup, data, name, onClose, onApply }) {
  const day = popup.scope === "day";
  const templates = (data.shiftTemplates || []).filter((t) => t.kind === (day ? "daily" : "weekly"));
  const [mode, setMode] = useState("pick");
  const [shift, setShift] = useState(blankShift());
  const [days, setDays] = useState(blankWeek());
  const [saveName, setSaveName] = useState("");
  const [err, setErr] = useState("");
  const when = day ? parseISO(popup.date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) : `the week of ${fmtShort(popup.date)} (week ${isoWeekNum(popup.date)})`;
  const adhoc = () => {
    if (day ? !shiftOk(shift) : (days.filter((d) => !d.off).length === 0 || days.some((d) => !d.off && !shiftOk(d)))) { setErr(day ? "Fill in any two of start, duration and end." : "Pick working days and give each a start plus a duration or end."); return; }
    onApply(shift, days, saveName.trim());
  };
  return (
    <Modal title={`Schedule ${name}`} info="applyShift" onClose={onClose} wide={!day}>
      <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.inkSoft, marginBottom: 12 }}>Apply a {day ? "daily" : "weekly"} schedule to {when}. Existing shifts for {name} on those days are replaced.</div>
      {mode === "pick" ? (
        <>
          <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: C.inkFaint, textTransform: "uppercase", marginBottom: 4 }}>Saved {day ? "daily" : "weekly"} templates</div>
          {templates.length === 0 && <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.inkFaint, marginBottom: 8 }}>No {day ? "daily" : "weekly"} templates yet. Create one from the Workforce schedule's “Create new template” button, or set a one-time schedule below.</div>}
          {templates.map((t) => (
            <button key={t.id} type="button" data-template={t.name} onClick={() => onApply(day ? t.shift : null, day ? null : t.days)} style={{ display: "block", width: "100%", textAlign: "left", cursor: "pointer", background: C.panelAlt, border: `1px solid ${C.line}`, borderRadius: 3, padding: "8px 10px", marginBottom: 6 }}>
              <div style={{ fontFamily: FONT_BODY, fontSize: 13.5, fontWeight: 600, color: C.ink }}>{t.name}</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.inkSoft }}>{templateSummary(t)}</div>
            </button>
          ))}
          <div style={{ marginTop: 10 }}><Btn small variant="ghost" onClick={() => setMode("adhoc")}>One-time {day ? "daily" : "weekly"} schedule…</Btn></div>
        </>
      ) : (
        <>
          {day ? <ShiftEditor value={shift} onChange={setShift} /> : <WeeklyEditor value={days} onChange={setDays} />}
          <Field label="Save as a template (optional name)"><input style={{ ...inputStyle, marginTop: 10 }} value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="Leave blank to use once" /></Field>
          {err && <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.rust, marginBottom: 8 }}>{err}</div>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Btn variant="ghost" onClick={() => setMode("pick")}>Back</Btn>
            <Btn variant="primary" onClick={adhoc}>Apply</Btn>
          </div>
        </>
      )}
    </Modal>
  );
}

/* ---------- PDF export (print dialog → "Save as PDF") ---------- */
function exportSchedulePdf({ view, anchor, data, staff, shifts, title }) {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const nm = (id) => (staff.find((u) => u.id === id) || {}).username || "Former member";
  const dayCell = (date, inMonth) => {
    const list = shifts.filter((s) => s.date === date).sort((a, b) => (toMin(a.start) || 0) - (toMin(b.start) || 0));
    const cov = dayCoverage(list);
    const bad = cov && cov.gaps.length;
    return `<td style="${inMonth ? "" : "background:#f1f1f1;color:#888"}"><div class="d"><b>${parseISO(date).getDate()}</b>${cov ? `<span class="${bad ? "bad" : ""}">${covText(cov)}${bad ? " ⚠ gap " + gapText(cov) : ""}</span>` : ""}</div>${list.map((s) => `<div class="s" style="border-left:4px solid ${execColor(data, s.executorId)}">${esc(nm(s.executorId))} ${esc(shiftText(s))}</div>`).join("")}</td>`;
  };
  let body = "";
  if (view === "day") {
    const list = shifts.filter((s) => s.date === anchor).sort((a, b) => (toMin(a.start) || 0) - (toMin(b.start) || 0));
    const cov = dayCoverage(list);
    body = `<p>${cov ? "Coverage " + covText(cov) + (cov.gaps.length ? ` — <span class="bad">nobody working ${gapText(cov)}</span>` : "") : "Nobody scheduled."}</p><table><tr><th>Name</th><th>Start</th><th>End</th></tr>${list.map((s) => `<tr><td style="border-left:6px solid ${execColor(data, s.executorId)}">${esc(nm(s.executorId))}</td><td>${s.start}</td><td>${s.end}${toMin(s.end) <= toMin(s.start) ? " (+1 day)" : ""}</td></tr>`).join("")}</table>`;
  } else {
    let weeks = [];
    if (view === "week") weeks = [weekStartISO(anchor)];
    else {
      const first = parseISO(anchor); first.setDate(1);
      for (let ws = weekStartISO(isoLocal(first)); ; ws = addDaysISO(ws, 7)) {
        weeks.push(ws);
        if (parseISO(addDaysISO(ws, 7)).getMonth() !== first.getMonth() && parseISO(addDaysISO(ws, 7)) > first) break;
        if (weeks.length > 6) break;
      }
    }
    const month = parseISO(anchor).getMonth();
    body = `<table><tr><th style="width:36px">Wk</th>${WEEKDAY_LABELS.map((w) => `<th>${w}</th>`).join("")}</tr>${weeks.map((ws) => `<tr><th>${isoWeekNum(ws)}</th>${Array.from({ length: 7 }, (_, i) => { const d = addDaysISO(ws, i); return dayCell(d, view === "week" || parseISO(d).getMonth() === month); }).join("")}</tr>`).join("")}</table>`;
  }
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
body{font-family:Arial,Helvetica,sans-serif;margin:18px;color:#111}h1{font-size:18px;margin:0 0 4px}.sub{color:#555;font-size:12px;margin-bottom:10px}
table{border-collapse:collapse;width:100%;table-layout:fixed}th,td{border:1px solid #999;padding:3px;vertical-align:top;font-size:10px;word-wrap:break-word}th{background:#e8e8e8}
td{height:${view === "week" ? 220 : 80}px}.d{display:flex;justify-content:space-between;margin-bottom:2px}.d span{font-size:9px;color:#444}.bad{color:#c00!important;font-weight:bold}
.s{margin:1px 0;padding:1px 3px;background:#f6f6f6}@page{size:landscape;margin:10mm}</style></head><body>
<h1>${esc(SETTINGS.brand.name)} — Workforce schedule</h1><div class="sub">${esc(title)}</div>${body}</body></html>`;
  const w = window.open("", "_blank");
  if (!w) { window.alert("Allow pop-ups for this site to export the schedule, then try again."); return; }
  w.document.write(html); w.document.close(); w.focus();
  setTimeout(() => { try { w.print(); } catch { /* user can print manually */ } }, 350);
}

/* ============================================================
   TOOLS (formerly Owner Tools) — cards depend on role
============================================================ */
let TOOLS_FOCUS = null;
function ToolsSection({ title, sub }) {
  return (
    <div style={{ margin: "8px 0 -4px" }}>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 700, color: C.inkFaint, textTransform: "uppercase", letterSpacing: "0.05em" }}>{title}</div>
      <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.inkFaint }}>{sub}</div>
    </div>
  );
}
function ToolsView({ data, update, currentUser, role, account }) {
  const owner = role === "Owner", mgr = isAdmin(role);
  useEffect(() => {
    if (!TOOLS_FOCUS) return;
    const id = TOOLS_FOCUS; TOOLS_FOCUS = null;
    setTimeout(() => { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }, 60);
  }, []);
  const me = currentUser || {};
  return (
    <div>
      <SectionHeader title="Tools and settings" subtitle={owner ? "Everything you can set up: your account, team scheduling tools, accounts, branding, backups and record clean-up." : mgr ? "Your account, hours and team scheduling tools." : "Your account and hours."} info={PAGE_INFO.owner} />
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {role !== "Guest" && <ToolsSection title="Executor tools" sub="Available to everyone who works on maintenance." />}
        <MyAccountCard user={{ ...currentUser, color: execColor(data, currentUser.id) }} {...account} />
        {execOn() && isExecPerson(me) && <HoursCard data={data} scope="me" userId={me.id} />}
        {(mgr || canSchedule()) && <ToolsSection title={mgr ? "Manager tools" : "Scheduler tools"} sub="Team scheduling and reporting." />}
        {(mgr || canSchedule()) && <ExecutorColoursCard data={data} update={update} />}
        {(mgr || canSchedule()) && <ShiftTemplatesCard data={data} update={update} />}
        {mgr && execOn() && <HoursCard data={data} scope="all" userId={me.id} />}
        {owner && <ToolsSection title="Owner tools" sub="Accounts, branding, features, backups and clean-up." />}
        {owner && <MemberManagementInline currentUser={currentUser} />}
        {owner && <BrandingCard />}
        {owner && <FeaturesCard />}
        {owner && <BackupTools data={data} update={update} />}
        {owner && <PmWizardCatalogEditor data={data} update={update} />}
        {owner && <DeleteWorkOrderTool data={data} update={update} />}
        {owner && <DeleteWorkRequestTool data={data} update={update} />}
      </div>
    </div>
  );
}

/* ============================================================
   AUTH
============================================================ */
function AuthCard({ children, subtitle }) {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_BODY, padding: 16 }}>
      <GlobalStyle />
      <Panel style={{ padding: 30, width: 380, maxWidth: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <BrandMark size={28} radius={4} />
          <span style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 19, color: C.ink }}>{SETTINGS.brand.name}</span>
        </div>
        <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.inkFaint, marginBottom: 20 }}>{subtitle}</div>
        {children}
      </Panel>
    </div>
  );
}
const MIN_PASSWORD = 8;
// Shared "new password + confirm" validation. Returns an error string or "".
function newPasswordProblem(pw, confirmPw) {
  if (!pw || pw.length < MIN_PASSWORD) return `The new password must be at least ${MIN_PASSWORD} characters.`;
  if (pw !== confirmPw) return "The two new passwords don't match.";
  return "";
}

function AuthScreen({ onAuthed }) {
  const resetToken = useRef(typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("reset") : null);
  const [mode, setMode] = useState(null); // setup | login | forgot | forgotSent | reset | resetDone
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const canReset = !!SETTINGS.passwordResetEmail;

  useEffect(() => {
    if (resetToken.current) { setMode("reset"); return; }
    api.setupStatus().then((r) => setMode(r.needsSetup ? "setup" : "login")).catch(() => setMode("login"));
  }, []);
  const go = (m) => { setError(""); setPassword(""); setConfirmPw(""); setMode(m); };

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      if (mode === "setup") {
        if (password.length < MIN_PASSWORD) { setError(`The password must be at least ${MIN_PASSWORD} characters.`); return; }
        if (password !== confirmPw) { setError("The two passwords do not match."); return; }
        onAuthed(await api.setup(username, password));
      } else if (mode === "login") {
        onAuthed(await api.login(username, password));
      } else if (mode === "forgot") {
        await api.forgotPassword(username);
        setMode("forgotSent");
      } else if (mode === "reset") {
        const problem = newPasswordProblem(password, confirmPw);
        if (problem) { setError(problem); return; }
        await api.resetPassword(resetToken.current, password);
        try { window.history.replaceState(null, "", window.location.pathname); } catch (err) { /* ignore */ }
        resetToken.current = null;
        setPassword(""); setConfirmPw("");
        setMode("resetDone");
      }
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally { setBusy(false); }
  };

  if (!mode) {
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg }}><Loader2 className="animate-spin" size={20} color={C.inkSoft} /></div>;
  }

  const linkStyle = { background: "none", border: "none", padding: 0, color: C.navy, cursor: "pointer", fontFamily: FONT_BODY, fontSize: 12.5, textDecoration: "underline" };
  const subtitle = {
    setup: "Create the first Owner account.",
    login: "Sign in",
    forgot: "Reset your password",
    forgotSent: "Check your email",
    reset: "Choose a new password",
    resetDone: "Password updated",
  }[mode];

  return (
    <AuthCard subtitle={subtitle}>
      {mode === "forgotSent" && (
        <>
          <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.ink, marginBottom: 16 }}>If an account matches, a reset link has been emailed. It works once and expires in one hour.</div>
          <Btn variant="primary" onClick={() => go("login")}>Back to sign in</Btn>
        </>
      )}
      {mode === "resetDone" && (
        <>
          <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.ink, marginBottom: 16 }}>Your password has been changed. Sign in with the new password.</div>
          <Btn variant="primary" onClick={() => go("login")}>Sign in</Btn>
        </>
      )}
      {mode !== "forgotSent" && mode !== "resetDone" && (
        <form onSubmit={submit}>
          {mode !== "reset" && (
            <Field label={mode === "forgot" ? "Username or email" : "Username"} required><input style={inputStyle} value={username} onChange={(e) => setUsername(e.target.value)} autoFocus required /></Field>
          )}
          {mode !== "forgot" && (
            <Field label={mode === "reset" ? "New password" : "Password"} required>
              <PasswordInput style={inputStyle} value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus={mode === "reset"} autoComplete={mode === "login" ? "current-password" : "new-password"} />
            </Field>
          )}
          {(mode === "reset" || mode === "setup") && (
            <Field label={mode === "setup" ? "Confirm password" : "Confirm new password"} required><PasswordInput style={inputStyle} value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required autoComplete="new-password" /></Field>
          )}
          {(mode === "setup" || mode === "reset") && <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint, marginTop: -6, marginBottom: 12 }}>At least {MIN_PASSWORD} characters.{mode === "setup" ? " You can add member accounts later from Tools." : ""}</div>}
          {error && <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.rust, marginBottom: 12 }}>{error}</div>}
          <Btn type="submit" variant="primary" disabled={busy}>{busy ? "…" : { setup: "Create account & continue", login: "Sign in", forgot: "Email me a reset link", reset: "Set new password" }[mode]}</Btn>
          {mode === "login" && canReset && (
            <div style={{ marginTop: 14 }}><button type="button" style={linkStyle} onClick={() => go("forgot")}>Forgot your password?</button></div>
          )}
          {(mode === "forgot" || mode === "reset") && (
            <div style={{ marginTop: 14 }}><button type="button" style={linkStyle} onClick={() => { try { window.history.replaceState(null, "", window.location.pathname); } catch (err) { /* ignore */ } resetToken.current = null; go("login"); }}>Back to sign in</button></div>
          )}
        </form>
      )}
    </AuthCard>
  );
}

// Shown (instead of the app) while an account's password is a temporary one
// set by the Owner. Nothing else is reachable until it is replaced.
function ForcedPasswordChange({ user, onDone, onLogout }) {
  const [next, setNext] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    const problem = newPasswordProblem(next, confirmPw);
    if (problem) { setError(problem); return; }
    setError(""); setBusy(true);
    try {
      const r = await api.changePassword("", next);
      onDone(r.user ? { ...user, ...r.user } : { ...user, mustChangePassword: false });
    } catch (err) { setError(err.message || "Couldn't change the password"); }
    finally { setBusy(false); }
  };
  return (
    <AuthCard subtitle={`Hi ${user.username} — choose a new password`}>
      <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.inkSoft, marginBottom: 14 }}>
        Your password was set or reset by the Owner, so it's temporary. Choose a password of your own to continue.
      </div>
      <form onSubmit={submit}>
        <Field label="New password" required><PasswordInput style={inputStyle} value={next} onChange={(e) => setNext(e.target.value)} required autoComplete="new-password" /></Field>
        <Field label="Confirm new password" required><PasswordInput style={inputStyle} value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required autoComplete="new-password" /></Field>
        <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint, marginTop: -6, marginBottom: 12 }}>At least {MIN_PASSWORD} characters, and different from the temporary one.</div>
        {error && <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.rust, marginBottom: 12 }}>{error}</div>}
        <div style={{ display: "flex", gap: 8 }}>
          <Btn type="submit" variant="primary" disabled={busy}>{busy ? "…" : "Set new password"}</Btn>
          <Btn type="button" variant="ghost" onClick={onLogout}>Sign out</Btn>
        </div>
      </form>
    </AuthCard>
  );
}

// v2.6: "My account" lives on the Tools and settings page (it used to be a pop-up behind the key button).
function Avatar({ user, color, size = 32 }) {
  const initial = ((user && user.username) || "?").trim().charAt(0).toUpperCase();
  if (user && user.avatar) {
    return <img src={user.avatar} alt="" data-avatar="photo" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", display: "block", flexShrink: 0 }} />;
  }
  return (
    <span data-avatar="initial" aria-hidden="true" style={{ width: size, height: size, borderRadius: "50%", background: color || C.navy, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_HEAD, fontWeight: 700, fontSize: Math.round(size * 0.44), flexShrink: 0 }}>{initial}</span>
  );
}
// Centre-crops to a square and shrinks to a small JPEG data URL for the profile photo.
async function avatarFromFile(file) {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const edge = Math.min(bmp.width, bmp.height), N = 192;
  const canvas = document.createElement("canvas"); canvas.width = N; canvas.height = N;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, N, N);
  ctx.drawImage(bmp, (bmp.width - edge) / 2, (bmp.height - edge) / 2, edge, edge, 0, 0, N, N);
  bmp.close && bmp.close();
  return canvas.toDataURL("image/jpeg", 0.82);
}
function DigestSettings({ user, onSave, mailOk }) {
  const opts = DIGEST_OPTIONS.filter((o) => digestAllowed(user, o));
  const [busy, setBusy] = useState("");
  const toggle = async (key, val) => { setBusy(key); try { await onSave({ [key]: val }); } finally { setBusy(""); } };
  return (
    <div id="tools-digests">
      <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, color: C.ink, margin: "4px 0 6px" }}>Email digests<InfoTip k="digests" /></div>
      <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint, marginBottom: 8 }}>
        Choose which items are emailed to you, and how often and when. You need an email address saved above{mailOk ? "" : ", and the server's email (SMTP) must be set up — it isn't yet"}. Only items that apply to your role and designations are listed.
      </div>
      {opts.length === 0 && <Empty text="No digests apply to your role." />}
      {opts.map((o) => (
        <label key={o.key} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8, fontFamily: FONT_BODY, fontSize: 12.5, color: C.ink, cursor: "pointer" }}>
          <input type="checkbox" checked={!!user[o.key]} disabled={busy === o.key} onChange={(e) => toggle(o.key, e.target.checked)} style={{ marginTop: 2 }} />
          <span>{o.label}</span>
        </label>
      ))}
      {opts.some((o) => user[o.key]) && (
        <DigestSchedule value={user} onChange={async (p) => { setBusy("sched"); try { await onSave(p); } finally { setBusy(""); } }} />
      )}
      <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: C.inkFaint }}>One email covers everything ticked, sent at the time you choose (server time zone). Nothing is sent when there is nothing to report.</div>
    </div>
  );
}
function MyAccountCard({ user, onUserChanged, theme, setTheme, installPrompt, doInstall, onSignOut }) {
  const dialog = useDialog();
  const [email, setEmail] = useState(user.email || "");
  const [emailMsg, setEmailMsg] = useState("");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwMsg, setPwMsg] = useState({ text: "", bad: false });
  const [busy, setBusy] = useState(false);
  const photoRef = useRef(null);

  const patch = async (p) => {
    const r = await api.updateProfile(p);
    if (r && r.user) onUserChanged({ ...user, ...r.user });
    return r;
  };
  const saveEmail = async () => {
    setBusy(true); setEmailMsg("");
    try { await patch({ email: email.trim() }); setEmailMsg("Saved."); }
    catch (err) { setEmailMsg(err.message || "Couldn't save"); }
    finally { setBusy(false); }
  };
  const pickPhoto = async (e) => {
    const file = e.target.files && e.target.files[0]; e.target.value = "";
    if (!file) return;
    if (!/^image\//.test(file.type)) { await dialog.alertMsg("Please choose an image file."); return; }
    try { await patch({ avatar: await avatarFromFile(file) }); }
    catch (err) { await dialog.alertMsg(err.message || "Couldn't use that photo."); }
  };
  const changePw = async () => {
    const problem = newPasswordProblem(next, confirmPw);
    if (problem) { setPwMsg({ text: problem, bad: true }); return; }
    setBusy(true); setPwMsg({ text: "", bad: false });
    try {
      await api.changePassword(current, next);
      setCurrent(""); setNext(""); setConfirmPw("");
      setPwMsg({ text: "Password changed. Your other signed-in devices were signed out.", bad: false });
    } catch (err) { setPwMsg({ text: err.message || "Couldn't change the password", bad: true }); }
    finally { setBusy(false); }
  };
  const sub = { fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, color: C.ink, margin: "4px 0 8px" };
  const rule = { borderTop: `1px solid ${C.lineSoft}`, paddingTop: 14, marginTop: 16 };
  const desLabels = [...DESIGNATIONS.filter((d) => (user.designations || []).includes(d.key)).map((d) => d.label), ...((user.role === "Owner" || user.role === "Manager") && (user.designations || []).includes("executor") ? ["Executor"] : [])];
  return (
    <Panel style={{ padding: 18 }}>
      <div id="tools-account" style={{ fontFamily: FONT_HEAD, fontSize: 15, fontWeight: 600, color: C.ink, marginBottom: 4 }}>My account — {user.username}<InfoTip k="myAccount" /></div>
      <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.inkSoft, marginBottom: 12 }}>{user.role}{desLabels.length ? ` · ${desLabels.join(", ")}` : ""}</div>

      <div style={sub}>Profile photo</div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 6 }}>
        <Avatar user={user} color={user.color} size={56} />
        <Btn small variant="ghost" onClick={() => photoRef.current && photoRef.current.click()}><Upload size={13} /> {user.avatar ? "Change photo" : "Upload photo"}</Btn>
        {user.avatar && <Btn small variant="ghost" onClick={() => patch({ avatar: "" })}>Remove photo</Btn>}
        <input ref={photoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={pickPhoto} />
        <span style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint }}>Shown as a circle in the top bar. Without a photo you get your initial on your colour.</span>
      </div>

      <div style={rule}>
        <div style={sub}>Email</div>
        <Field label="Email address (used for notifications and to reset your password)">
          <input type="email" style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
        </Field>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Btn small onClick={saveEmail} disabled={busy}>Save email</Btn>
          {emailMsg && <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: emailMsg === "Saved." ? C.olive : C.rust }}>{emailMsg}</span>}
        </div>
      </div>

      <div style={rule}><DigestSettings user={user} onSave={patch} mailOk={!!SETTINGS.mailConfigured} /></div>

      <div style={rule}>
        <div style={sub}>Appearance and app</div>
        <Field label="Colour theme">
          <select style={{ ...inputStyle, maxWidth: 260 }} value={theme} onChange={(e) => setTheme(e.target.value)}>
            <option value="auto">Match my device</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </Field>
        {installPrompt
          ? <Btn small variant="ghost" onClick={doInstall}><Download size={13} /> Install app</Btn>
          : <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint }}>Install app: your browser offers this when the app can be installed on this device (look for “Install” in the browser menu if the button doesn't appear here).</div>}
      </div>

      <div style={rule}>
        <div style={sub}>Change password</div>
        <Field label="Current password"><PasswordInput style={inputStyle} value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" /></Field>
        <Field label="New password"><PasswordInput style={inputStyle} value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" /></Field>
        <Field label="Confirm new password"><PasswordInput style={inputStyle} value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} autoComplete="new-password" /></Field>
        <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint, marginTop: -6, marginBottom: 10 }}>At least {MIN_PASSWORD} characters, different from the current one.</div>
        {pwMsg.text && <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: pwMsg.bad ? C.rust : C.olive, marginBottom: 10 }}>{pwMsg.text}</div>}
        <Btn small variant="primary" onClick={changePw} disabled={busy || !current || !next}>Change password</Btn>
      </div>

      <div style={rule}>
        <Btn small variant="danger" onClick={onSignOut}><LogOut size={13} /> Sign out</Btn>
      </div>
    </Panel>
  );
}

/* ============================================================
   APP SHELL
============================================================ */
// Lets Owner Tools push a changed config (branding, labels, toggles) back up to
// the bootstrap wrapper, which re-applies it and re-renders the whole app.
const SettingsContext = createContext({ onConfigChanged: () => {} });

// Maps pre-v2.2 statuses and fills collections added since the saved data was
// written. The server migrates stored data once; this also covers older
// tabs/devices and restored files.
function normalizeData(d) {
  if (!d) return d;
  (d.workOrders || []).forEach((w) => {
    if (w.type !== "PM Base" && LEGACY_STATUS_MAP[w.status]) w.status = LEGACY_STATUS_MAP[w.status];
  });
  if (!Array.isArray(d.purchaseList)) d.purchaseList = [];
  // v2.4: executor colours, shift templates and scheduled shifts.
  if (!d.executorColors || typeof d.executorColors !== "object") d.executorColors = {};
  if (!Array.isArray(d.shiftTemplates)) d.shiftTemplates = [];
  if (!Array.isArray(d.workShifts)) d.workShifts = [];
  return d;
}

function MaintEnhanceAppInner() {
  const [user, setUser] = useState(null);
  const [data, setDataRaw] = useState(null);
  // A scanned QR label (or any shared link) can land here as "#asset/<id>"
  // — captured once on first mount, consumed by AssetsView, then cleared.
  const deepLinkAssetId = useRef(parseAssetDeepLink());
  const [tab, setTabRaw] = useState(() => (deepLinkAssetId.current ? "assets" : "dashboard"));
  const [sidebarOpen, setSidebarOpen] = useState(() => (typeof window === "undefined" ? true : window.innerWidth > 860));
  const [openOrderId, setOpenOrderId] = useState(null);
  const [pendingFilter, setPendingFilter] = useState(null);
  const [prefillOrder, setPrefillOrder] = useState(null);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("hk-theme") || "auto"; } catch { return "auto"; }
  });
  const saveTimer = useRef(null);

  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setInstallPrompt(e); };
    const onInstalled = () => setInstallPrompt(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  const doInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  // Theme: "auto" follows the OS/browser color-scheme preference (via CSS,
  // see GlobalStyle); "light"/"dark" force it via a data-theme attribute
  // on <html>, and the choice is remembered for next time.
  useEffect(() => {
    if (theme === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("hk-theme", theme); } catch {}
  }, [theme]);
  const cycleTheme = () => setTheme((t) => (t === "auto" ? "light" : t === "light" ? "dark" : "auto"));
  const themeIcon = theme === "auto" ? <MonitorSmartphone size={17} /> : theme === "light" ? <Sun size={17} /> : <Moon size={17} />;
  const themeLabel = theme === "auto" ? "Theme: matching your device" : theme === "light" ? "Theme: light" : "Theme: dark";

  useEffect(() => { api.me().then(setUser).catch(() => setUser(false)); }, []);
  // A forced password change can start mid-session (the server answers 403
  // PASSWORD_CHANGE_REQUIRED after an Owner reset) — show the change screen.
  useEffect(() => {
    const onForced = () => setUser((u) => (u ? { ...u, mustChangePassword: true } : u));
    window.addEventListener("me-password-change-required", onForced);
    return () => window.removeEventListener("me-password-change-required", onForced);
  }, []);
  useEffect(() => {
    if (!user || user.mustChangePassword) return;
    api.getData().then((d) => setDataRaw(normalizeData(d))).catch(() => setDataRaw(null));
  }, [user && user.id, user && user.mustChangePassword]); // eslint-disable-line
  // Once data is loaded, pick up PM Base standby windows that opened or
  // closed while the app wasn't being used.
  const standbyChecked = useRef(false);
  useEffect(() => {
    if (!data || standbyChecked.current) return;
    standbyChecked.current = true;
    if (pmStandbyNeedsSync(data)) update((d) => d);
  }, [data]); // eslint-disable-line
  if (user && user.id) ME = user;
  const [userMenu, setUserMenu] = useState(false);
  const menuRef = useRef(null);
  useEffect(() => {
    if (!userMenu) return;
    const onDown = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setUserMenu(false); };
    const onKey = (e) => { if (e.key === "Escape") setUserMenu(false); };
    document.addEventListener("mousedown", onDown); document.addEventListener("touchstart", onDown); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("touchstart", onDown); document.removeEventListener("keydown", onKey); };
  }, [userMenu]);

  const persist = (next) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { api.saveData(next).catch((e) => console.error("Save failed:", e)); }, 250);
  };
  const update = (fn) => {
    setDataRaw((prev) => {
      // Guards a sync-queue flush (below) that can, in principle, land
      // between login and the first /api/data response — nothing else in
      // the app calls update() before data has loaded.
      if (!prev) return prev;
      const next = checkMeterPmTriggers(syncPmStandby(fn(structuredClone(prev))));
      persist(next);
      return next;
    });
  };
  const logout = async () => { await api.logout().catch(() => {}); setUser(false); setDataRaw(null); standbyChecked.current = false; };

  /* -----------------------------------------------------------
     v1.6 — offline work-request queue & sync. A request submitted
     with no connection (or one whose upload/save fails mid-flight)
     is written to IndexedDB by WorkRequestsView's queueWorkRequest
     instead of failing outright; syncNow drains that queue — upload
     each photo, then create the work request normally — whenever the
     browser comes back online, on app load, on a "Sync now" click, or
     every couple of minutes as a fallback for the cases (notably iOS
     Safari PWAs) where the 'online' event doesn't fire reliably.
  ----------------------------------------------------------- */
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const [queueCount, setQueueCount] = useState(0);
  const [queueFailedCount, setQueueFailedCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);

  const refreshQueueCounts = async () => {
    try {
      const items = await getQueuedItems();
      setQueueCount(items.length);
      setQueueFailedCount(items.filter((i) => i.status === "failed").length);
    } catch (e) {
      // IndexedDB unavailable (private browsing, very old browser, etc.) —
      // the offline queue is simply not offered; online submission still
      // works normally.
    }
  };

  const queueWorkRequest = async ({ fields, photoFiles, requestedBy }) => {
    await queueItem({
      id: `queued_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: "workRequest",
      form: fields,
      photos: photoFiles || [],
      requestedBy,
      queuedAt: new Date().toISOString(),
      status: "pending",
      error: "",
    });
    await refreshQueueCounts();
  };

  const syncNow = async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      const items = await getQueuedItems();
      for (const item of items) {
        if (item.type !== "workRequest") continue;
        try {
          await updateQueuedItem(item.id, { status: "syncing", error: "" });
          const photoIds = [];
          for (const file of item.photos || []) photoIds.push((await api.uploadAttachment(file)).id);
          update((d) => {
            d.counters = d.counters || { wo: 0, wr: 0, part: 0 };
            d.counters.wr += 1;
            d.workRequests.push({
              id: uid("wr"), number: d.counters.wr, ...item.form, title: (item.form.title || "").trim(), photos: photoIds,
              requestedBy: item.requestedBy, dateSubmitted: (item.queuedAt || todayISO()).slice(0, 10),
              status: "Submitted", reviewNote: "", workOrderId: null, createdBy: item.requestedBy,
            });
            return d;
          });
          await removeQueuedItem(item.id);
        } catch (e) {
          await updateQueuedItem(item.id, { status: "failed", error: (e && e.message) || "Sync failed" });
        }
      }
    } finally {
      await refreshQueueCounts();
      setSyncing(false);
      syncingRef.current = false;
    }
  };

  useEffect(() => {
    const onOnline = () => { setIsOnline(true); syncNow(); };
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    refreshQueueCounts();
    if (typeof navigator !== "undefined" && navigator.onLine) syncNow();
    const interval = setInterval(() => { if (typeof navigator === "undefined" || navigator.onLine) syncNow(); }, 120000);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      clearInterval(interval);
    };
  }, []); // eslint-disable-line

  /* -----------------------------------------------------------
     v1.7 — open-alarm count for the sidebar badge. Alarms live in
     their own SQL table (see AlarmsView), not the household JSON
     blob, so they need their own fetch/poll rather than piggybacking
     on `data`. Polling (not push) is the honest option here: Home
     Assistant pushes to the *server*, but the browser has no
     websocket/SSE channel to be pushed to in turn, so a new alarm
     is only reflected here once this poll — or AlarmsView's own
     refresh after an action — picks it up.
  ----------------------------------------------------------- */
  const [openAlarmCount, setOpenAlarmCount] = useState(0);
  // Deliberately keyed off `user.role` rather than the `role` const
  // declared further below (after this component's early returns) —
  // a closure created on a render that bails out early (e.g. while
  // `data` is still loading) would otherwise capture an uninitialized
  // `role` binding and throw when this effect later fires.
  const refreshAlarmCount = () => {
    if (!user || !(isAdmin(user.role) || canDes(user, "specialist"))) return;
    api.listAlarms("open").then((rows) => setOpenAlarmCount(rows.length)).catch(() => {});
  };
  useEffect(() => {
    if (!user || !(isAdmin(user.role) || canDes(user, "specialist"))) return;
    refreshAlarmCount();
    const interval = setInterval(refreshAlarmCount, 30000);
    return () => clearInterval(interval);
  }, [user]); // eslint-disable-line

  const setTab = (t) => { setTabRaw(t); setOpenOrderId(null); setPendingFilter(null); };
  const applyFilter = (t, filter) => { setTabRaw(t); setOpenOrderId(null); setPendingFilter(filter); };
  const goToOrder = (id) => { setTabRaw("orders"); setOpenOrderId(id); setPendingFilter(null); };
  const goToRequest = (id) => { setTabRaw("requests"); setPendingFilter(null); };
  const goToNewOrderForAsset = (asset) => {
    setTabRaw("orders"); setOpenOrderId(null); setPendingFilter(null);
    setPrefillOrder({ assetId: asset.id, locationId: asset.locationId });
  };
  const consumeDeepLinkAsset = () => { deepLinkAssetId.current = null; };

  if (user === null) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg }}><GlobalStyle /><Loader2 className="animate-spin" size={20} color={C.inkSoft} /></div>;
  if (!user) return <AuthScreen onAuthed={setUser} />;
  if (user.mustChangePassword) return <ForcedPasswordChange user={user} onDone={setUser} onLogout={logout} />;
  if (!data) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, fontFamily: FONT_BODY, color: C.inkSoft }}>
        <GlobalStyle /><Loader2 className="animate-spin" size={18} style={{ marginRight: 8 }} /> Loading {SETTINGS.brand.name}…
      </div>
    );
  }

  const role = user.role;
  const counts = {
    requests: data.workRequests.filter((w) => w.status === "Submitted" || w.status === "Under Review").length,
    orders: data.workOrders.filter((w) => isOpenStatus(w.status)).length,
    alarms: openAlarmCount,
  };

  const views = {
    dashboard: <Dashboard data={data} setTab={setTab} role={role} applyFilter={applyFilter} goToOrder={goToOrder} goToRequest={goToRequest} />,
    locations: <LocationsView data={data} update={update} role={role} />,
    assets: <AssetsView data={data} update={update} role={role} goToOrder={goToOrder} deepLinkAssetId={tab === "assets" ? deepLinkAssetId.current : null} onConsumeDeepLink={consumeDeepLinkAsset} onNewOrderForAsset={goToNewOrderForAsset} />,
    requests: <WorkRequestsView data={data} update={update} role={role} currentUser={user.username} goToOrder={goToOrder} pendingFilter={tab === "requests" ? pendingFilter : null} consumeFilter={() => setPendingFilter(null)} isOnline={isOnline} queueWorkRequest={queueWorkRequest} />,
    orders: <WorkOrdersView data={data} update={update} role={role} currentUser={user.username} currentUserId={user.id} openId={openOrderId} setOpenId={setOpenOrderId} pendingFilter={tab === "orders" ? pendingFilter : null} consumeFilter={() => setPendingFilter(null)} prefillOrder={tab === "orders" ? prefillOrder : null} consumePrefill={() => setPrefillOrder(null)} />,
    schedule: execOn()
      ? <PlanningCalendar key="labour" kind="labour" data={data} update={update} role={role} currentUserId={user.id} goToOrder={goToOrder} />
      : <ScheduleView data={data} role={role} currentUserId={user.id} goToOrder={goToOrder} />,
    workforce: workforceOn()
      ? <PlanningCalendar key="workforce" kind="workforce" data={data} update={update} role={role} currentUserId={user.id} goToOrder={goToOrder} goTemplates={() => { TOOLS_FOCUS = "tools-templates"; setTab("owner"); }} />
      : <Dashboard data={data} setTab={setTab} role={role} applyFilter={applyFilter} goToOrder={goToOrder} goToRequest={goToRequest} />,
    vendors: <VendorsView data={data} update={update} role={role} currentUser={user.username} />,
    parts: <PartsView data={data} update={update} role={role} currentUser={user.username} />,
    budget: <BudgetView data={data} />,
    purchasing: isAdmin(role) ? <PurchasingView data={data} update={update} currentUser={user.username} goToOrder={goToOrder} /> : <Dashboard data={data} setTab={setTab} role={role} applyFilter={applyFilter} goToOrder={goToOrder} goToRequest={goToRequest} />,
    alarms: (isAdmin(role) || canAck()) ? <AlarmsView data={data} update={update} role={role} currentUser={user.username} onAlarmsChanged={refreshAlarmCount} features={SETTINGS.features} /> : <Dashboard data={data} setTab={setTab} role={role} applyFilter={applyFilter} goToOrder={goToOrder} goToRequest={goToRequest} />,
    help: <HelpView role={role} />,
    owner: <ToolsView data={data} update={update} currentUser={user} role={role} account={{ onUserChanged: setUser, theme, setTheme, installPrompt, doInstall, onSignOut: logout }} />,
  };

  return (
    <DialogProvider>
      <div style={{ minHeight: "100vh", background: C.bg, fontFamily: FONT_BODY }}>
        <GlobalStyle />
        <Sidebar tab={tab} setTab={setTab} open={sidebarOpen} role={role} counts={counts} onNavigate={() => { if (window.innerWidth <= 860) setSidebarOpen(false); }} />
        {sidebarOpen && <div className="hk-sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}
        <div className="hk-main-shell" style={{ marginLeft: sidebarOpen ? 216 : 0, transition: "margin .15s ease" }}>
          <div className="hk-topbar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", borderBottom: `1px solid ${C.line}`, background: C.panel, position: "sticky", top: 0, zIndex: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
              <button onClick={() => setSidebarOpen((o) => !o)} className="hk-tap" style={{ background: "none", border: "none", cursor: "pointer", color: C.ink }}>
                {sidebarOpen ? <ChevronLeft size={18} /> : <Menu size={18} />}
              </button>
              {SETTINGS.brand.topBarTitle && (
                <span style={{ fontFamily: FONT_HEAD, fontSize: 15, fontWeight: 600, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{SETTINGS.brand.topBarTitle}</span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {!isOnline && (
                <span title="No connection — work requests you submit will be saved on this device and sync automatically once you're back online" style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: FONT_BODY, fontSize: 11.5, fontWeight: 600, color: C.orange, border: `1px solid ${C.orange}`, borderRadius: 3, padding: "4px 7px" }}>
                  <WifiOff size={12} /> Offline
                </span>
              )}
              {queueCount > 0 && (
                <button onClick={syncNow} disabled={syncing || !isOnline} title={!isOnline ? "Will sync once you're back online" : "Sync now"} className="hk-tap"
                  style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: `1px solid ${queueFailedCount > 0 ? C.rust : C.line}`, borderRadius: 3, cursor: (syncing || !isOnline) ? "default" : "pointer", color: queueFailedCount > 0 ? C.rust : C.inkSoft, padding: "4px 8px", fontFamily: FONT_BODY, fontSize: 11.5, fontWeight: 600 }}>
                  <RefreshCw size={12} className={syncing ? "animate-spin" : undefined} />
                  {queueFailedCount > 0 ? `${queueFailedCount} failed to sync` : `${queueCount} pending sync`}
                </button>
              )}
              <div ref={menuRef} style={{ position: "relative" }}>
                <button onClick={() => setUserMenu((o) => !o)} aria-haspopup="menu" aria-expanded={userMenu} title={`${user.username} — account menu`} data-usermenu className="hk-tap"
                  style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                  <div className="hk-user-meta" style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, fontWeight: 700, color: C.ink, lineHeight: 1.2 }}>{user.username}</div>
                    <div style={{ fontFamily: FONT_BODY, fontSize: 10.5, color: C.inkFaint, lineHeight: 1.2 }}>{role}</div>
                  </div>
                  <Avatar user={user} color={execColor(data, user.id)} size={34} />
                </button>
                {userMenu && (
                  <div role="menu" data-usermenu-pop style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, minWidth: 190, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 6, boxShadow: "0 6px 20px rgba(0,0,0,.18)", padding: 6, zIndex: 40 }}>
                    <button role="menuitem" className="hk-row" onClick={() => { setUserMenu(false); TOOLS_FOCUS = "tools-account"; setTab("owner"); if (window.innerWidth <= 860) setSidebarOpen(false); }}
                      style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: "9px 10px", borderRadius: 4, fontFamily: FONT_BODY, fontSize: 13, color: C.ink }}>
                      <Settings size={15} color={C.inkSoft} /> Account settings
                    </button>
                    <button role="menuitem" onClick={() => { setUserMenu(false); logout(); }}
                      style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", textAlign: "left", cursor: "pointer", marginTop: 4, padding: "9px 10px", borderRadius: 4, border: "none", background: C.rust, color: "#fff", fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600 }}>
                      <LogOut size={15} /> Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="hk-page-pad" style={{ padding: 24, maxWidth: 1280 }}>{views[tab]}</div>
        </div>
      </div>
    </DialogProvider>
  );
}

/* ============================================================
   SETTINGS BOOTSTRAP (v2.2)
   Fetches the public config (Owner-managed brand, colours, terminology,
   feature toggles) and applies it before the app renders, so the login
   screen and every label are correct from the first paint. Owner Tools
   calls onConfigChanged after saving, which re-applies and re-renders.
============================================================ */
export default function MaintEnhanceApp() {
  const [ready, setReady] = useState(false);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let alive = true;
    api.getConfig().then(applySettings).catch(() => applySettings(null)).finally(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    if (!ready) return;
    document.title = SETTINGS.brand.name;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta && /^#[0-9a-fA-F]{3,8}$/.test(SETTINGS.brand.colors.primary)) meta.setAttribute("content", SETTINGS.brand.colors.primary);
  }, [ready, version]);
  const ctx = useMemo(() => ({ onConfigChanged: (cfg) => { applySettings(cfg); setVersion((v) => v + 1); } }), []);
  if (!ready) {
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg }}><GlobalStyle /><Loader2 className="animate-spin" size={20} color={C.inkSoft} /></div>;
  }
  return (
    <SettingsContext.Provider value={ctx}>
      <BrandStyle />
      <MaintEnhanceAppInner />
    </SettingsContext.Provider>
  );
}
