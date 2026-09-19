import React, { useState, useEffect, useRef, useContext, createContext, useMemo } from "react";
import {
  LayoutDashboard, MapPin, Wrench, ClipboardList, Package,
  Users, DollarSign, Plus, ChevronRight, ChevronDown, X,
  Check, AlertTriangle, Bell, Menu, Trash2, Pencil, ArrowRight,
  Layers, Search, Boxes, ChevronLeft, Loader2, LogOut, UserPlus, Shield,
  Calendar, FileDown, FileUp,
} from "lucide-react";
import * as XLSX from "xlsx";
import { api } from "./api.js";

/* ============================================================
   DESIGN TOKENS — a field-service / toolbox identity: a
   blueprint navy for structure, tool-orange for action and
   urgency, a brass-olive for completed/verified states, on a
   cool utility-room backdrop.
============================================================ */
const C = {
  bg: "#E5E8E2",
  panel: "#FBFAF7",
  panelAlt: "#F1F0EA",
  ink: "#1C2420",
  inkSoft: "#5B655F",
  inkFaint: "#8C948D",
  line: "#C8CCC1",
  lineSoft: "#DBDED4",
  navy: "#28415F",
  navySoft: "#DCE3EA",
  orange: "#C85410",
  orangeSoft: "#F4DBC4",
  olive: "#5C6B3B",
  oliveSoft: "#DEE4CB",
  rust: "#A03B2A",
  rustSoft: "#F1D9D2",
  gold: "#A97D22",
  goldSoft: "#EFE1BE",
  teal: "#2F6E62",
  tealSoft: "#D9E7E3",
};

const FONT_HEAD = '"Space Grotesk", sans-serif';
const FONT_BODY = '"Inter", sans-serif';

const inputStyle = {
  width: "100%",
  padding: "8px 10px",
  border: `1px solid ${C.line}`,
  borderRadius: 3,
  fontFamily: FONT_BODY,
  fontSize: 13.5,
  color: C.ink,
  background: "#fff",
  outline: "none",
};
const labelStyle = {
  display: "block",
  fontFamily: FONT_BODY,
  fontSize: 11.5,
  fontWeight: 600,
  color: C.inkSoft,
  marginBottom: 4,
  letterSpacing: "0.01em",
};

const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');
    .hk-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
    .hk-scroll::-webkit-scrollbar-thumb { background: ${C.line}; border-radius: 4px; }
    .hk-fade { animation: hkfade .14s ease-out; }
    @keyframes hkfade { from { opacity:0; transform: translateY(3px);} to {opacity:1; transform:none;} }
    .hk-btn { cursor: pointer; transition: filter .1s ease; }
    .hk-btn:hover { filter: brightness(0.94); }
    .hk-row:hover { background: ${C.panelAlt}; }
    .hk-nav-item:hover { background: rgba(255,255,255,0.08); }
  `}</style>
);

/* ============================================================
   NOTE: sample/seed data lives on the backend (backend/seed.js)
   and is written to the database the first time an Owner
   completes setup. The frontend has no copy of its own.
============================================================ */

/* ============================================================
   HELPERS
============================================================ */
const LOCATION_LEVELS = ["Property", "Structure", "Floor", "Room", "Area", "Sub-area"];
const BOM_LEVELS = ["Component", "Sub-component", "Part"];
const WO_TYPES = ["PM", "PM Base", "Benchmark", "Corrective", "Unplanned"];
const WO_STATUSES = ["Open", "In Progress", "Completed", "Verified"];
const PRIORITIES = ["Urgent", "Soon", "When convenient"];
const FREQUENCY_UNITS = ["days", "weeks", "months", "years"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const WR_STATUS_COLORS = {
  Submitted: C.navy, "Under Review": C.gold, Approved: C.olive,
  Declined: C.inkFaint, Merged: C.inkFaint,
};
const WO_TYPE_COLORS = { PM: C.navy, "PM Base": C.teal, Benchmark: C.gold, Corrective: C.orange, Unplanned: C.rust };
const WO_STATUS_COLORS = { Open: C.orange, "In Progress": C.gold, Completed: C.olive, Verified: C.navy, Active: C.teal };

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

// Depth of a location node (0 = top level). Passing a falsy id (no
// parent) returns -1, so a brand-new top-level node comes out at depth 0.
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
// The level a new location should default to, based on how deep its
// parent sits: top level → Property, its children → Structure, then
// Floor, Room, Area, Sub-area (and Sub-area again for anything deeper).
function defaultLevelForParent(locations, parentId) {
  const childDepth = depthOf(locations, parentId) + 1;
  return LOCATION_LEVELS[Math.min(childDepth, LOCATION_LEVELS.length - 1)];
}
// Every location id "at or below" rootId in the hierarchy (root included).
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

function formatWoNum(n) {
  return "WO-" + String(n || 0).padStart(4, "0");
}
function formatWrNum(n) {
  return "WR-" + String(n || 0).padStart(4, "0");
}

// Date arithmetic for PM Base generation.
function addInterval(dateISO, value, unit) {
  const d = new Date((dateISO || todayISO()) + "T00:00:00");
  const n = Number(value) || 0;
  if (unit === "days") d.setDate(d.getDate() + n);
  else if (unit === "weeks") d.setDate(d.getDate() + n * 7);
  else if (unit === "months") d.setMonth(d.getMonth() + n);
  else if (unit === "years") d.setFullYear(d.getFullYear() + n);
  return d.toISOString().slice(0, 10);
}
// Next calendar occurrence of month/day on/after fromISO (this year if
// it hasn't happened yet, otherwise next year).
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
function sameDateNextYear(dateISO) {
  const d = new Date((dateISO || todayISO()) + "T00:00:00");
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

// Push a new PM work order copied from a PM Base template.
function spawnPmInstance(d, base, opts) {
  const afterDateISO = opts.afterDateISO;
  const fixedDate = opts.fixedDate;
  const requiredByDate = fixedDate
    ? nextFixedOccurrence(fixedDate.month, fixedDate.day, afterDateISO)
    : addInterval(afterDateISO, base.frequencyValue, base.frequencyUnit);
  d.counters = d.counters || { wo: 0, wr: 0 };
  d.counters.wo += 1;
  d.workOrders.push({
    id: uid("wo"), number: d.counters.wo, title: base.title, type: "PM", status: "Open",
    assetId: base.assetId, bomNodeId: base.bomNodeId, locationId: base.locationId,
    description: base.description, sourceRequestId: null, sourceBenchmarkId: null,
    sourcePmBaseId: base.id, sourceFixedDate: fixedDate || null,
    scheduledDate: "", requiredByDate, completedDate: null,
    cost: "", vendorId: base.vendorId || null, notes: "",
  });
}
// Called when a PM generated from a base is marked Completed — spawns
// the next occurrence. Fixed-schedule PMs advance exactly one year from
// their own required date ("regardless of when the last was completed");
// non-fixed PMs count the frequency forward from the completion date.
function regeneratePmAfterCompletion(d, completedWO) {
  const base = d.workOrders.find((w) => w.id === completedWO.sourcePmBaseId && w.type === "PM Base");
  if (!base) return;
  if (base.pmMode === "Fixed" && completedWO.sourceFixedDate) {
    const requiredByDate = sameDateNextYear(completedWO.requiredByDate || todayISO());
    d.counters = d.counters || { wo: 0, wr: 0 };
    d.counters.wo += 1;
    d.workOrders.push({
      id: uid("wo"), number: d.counters.wo, title: base.title, type: "PM", status: "Open",
      assetId: base.assetId, bomNodeId: base.bomNodeId, locationId: base.locationId,
      description: base.description, sourceRequestId: null, sourceBenchmarkId: null,
      sourcePmBaseId: base.id, sourceFixedDate: completedWO.sourceFixedDate,
      scheduledDate: "", requiredByDate, completedDate: null,
      cost: "", vendorId: base.vendorId || null, notes: "",
    });
  } else {
    spawnPmInstance(d, base, { afterDateISO: completedWO.completedDate || todayISO(), fixedDate: null });
  }
}

/* ============================================================
   SMALL UI PRIMITIVES
============================================================ */
function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function Tag({ text, color, soft }) {
  return (
    <span
      style={{
        display: "inline-block",
        fontFamily: FONT_BODY,
        fontSize: 11,
        fontWeight: 700,
        padding: "3px 8px",
        borderRadius: 3,
        color,
        background: soft,
        whiteSpace: "nowrap",
        letterSpacing: "0.01em",
      }}
    >
      {text}
    </span>
  );
}

function Btn({ children, onClick, variant, small, type, disabled, title }) {
  const base = {
    fontFamily: FONT_BODY,
    fontWeight: 600,
    fontSize: small ? 12.5 : 13.5,
    padding: small ? "6px 10px" : "9px 14px",
    borderRadius: 3,
    border: "1px solid transparent",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    opacity: disabled ? 0.5 : 1,
  };
  let style;
  if (variant === "primary") style = { ...base, background: C.orange, color: "#fff" };
  else if (variant === "ghost") style = { ...base, background: "transparent", color: C.ink, border: `1px solid ${C.line}` };
  else if (variant === "danger") style = { ...base, background: "transparent", color: C.rust, border: `1px solid ${C.rustSoft}` };
  else style = { ...base, background: C.navy, color: "#fff" };
  return (
    <button
      title={title}
      type={type || "button"}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className="hk-btn"
      style={{ ...style, cursor: disabled ? "not-allowed" : "pointer" }}
    >
      {children}
    </button>
  );
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(28,36,32,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 16 }}
      onClick={onClose}
    >
      <div
        className="hk-fade hk-scroll"
        style={{ background: C.panel, width: wide ? 640 : 460, maxWidth: "100%", maxHeight: "88vh", overflowY: "auto", border: `1px solid ${C.line}`, borderRadius: 5 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${C.line}`, position: "sticky", top: 0, background: C.panel }}>
          <h3 style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, color: C.ink, margin: 0 }}>{title}</h3>
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
   DIALOG SYSTEM — in-app confirm/alert/prompt replacements,
   used everywhere instead of the native browser dialogs so the
   look stays consistent.
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
  return (
    <Modal title="Name it" onClose={() => onResult(null)}>
      <div style={{ fontFamily: FONT_BODY, fontSize: 13.5, color: C.ink, marginBottom: 10 }}>{dialog.message}</div>
      <input
        style={inputStyle}
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") onResult(text); }}
      />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
        <Btn variant="ghost" onClick={() => onResult(null)}>Cancel</Btn>
        <Btn variant="primary" onClick={() => onResult(text)}>Save</Btn>
      </div>
    </Modal>
  );
}

function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolver = useRef(null);

  const open = (type, message, defaultValue) =>
    new Promise((resolve) => {
      resolver.current = resolve;
      setDialog({ type, message, defaultValue });
    });

  const handleResult = (result) => {
    if (resolver.current) resolver.current(result);
    resolver.current = null;
    setDialog(null);
  };

  const dialogApi = {
    confirm: (message) => open("confirm", message),
    alertMsg: (message) => open("alert", message),
    promptMsg: (message, def) => open("prompt", message, def),
  };

  return (
    <DialogContext.Provider value={dialogApi}>
      {children}
      {dialog && <DialogHost dialog={dialog} onResult={handleResult} />}
    </DialogContext.Provider>
  );
}

function Panel({ children, style }) {
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 4, ...style }}>
      {children}
    </div>
  );
}

function SectionHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
      <div>
        <h2 style={{ fontFamily: FONT_HEAD, fontSize: 22, fontWeight: 700, color: C.ink, margin: 0 }}>{title}</h2>
        {subtitle && <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.inkSoft, margin: "4px 0 0" }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function Empty({ text }) {
  return (
    <div style={{ padding: "28px 16px", textAlign: "center", color: C.inkFaint, fontFamily: FONT_BODY, fontSize: 13 }}>
      {text}
    </div>
  );
}

/* ============================================================
   LOCATION HIERARCHY NAV — a reusable, expandable location tree
   used to filter Assets, Work Orders, and Work Requests by
   location-or-below.
============================================================ */
function LocationNavTree({ data, selectedId, onSelect, title }) {
  const [expanded, setExpanded] = useState(() => new Set(data.locations.map((l) => l.id)));
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
            </div>
            {hasKids && isOpen && renderChildren(item.id, depth + 1)}
          </div>
        );
      });

  return (
    <Panel style={{ padding: 6, alignSelf: "start" }}>
      {title && (
        <div style={{ fontFamily: FONT_BODY, fontSize: 10.5, fontWeight: 700, color: C.inkFaint, textTransform: "uppercase", letterSpacing: "0.03em", padding: "6px 6px 4px" }}>
          {title}
        </div>
      )}
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
  { id: "vendors", label: "Vendors", icon: Users },
  { id: "inventory", label: "Inventory", icon: Package },
  { id: "budget", label: "Budget", icon: DollarSign },
  { id: "owner", label: "Owner Tools", icon: Shield, ownerOnly: true },
];

function Sidebar({ tab, setTab, open, role, counts }) {
  const items = NAV.filter((n) => !n.ownerOnly || role === "Owner");
  return (
    <div
      style={{
        width: 216,
        flexShrink: 0,
        background: C.navy,
        color: "#fff",
        display: open ? "flex" : "none",
        flexDirection: "column",
        position: "fixed",
        top: 0,
        bottom: 0,
        left: 0,
        zIndex: 40,
      }}
      className="hk-scroll"
    >
      <div style={{ padding: "20px 18px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 26, height: 26, background: C.orange, borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Wrench size={15} color="#fff" />
          </div>
          <span style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 17, letterSpacing: "0.01em" }}>HomeKeep</span>
        </div>
        <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: "#B7C3CF", marginTop: 4 }}>Household CMMS</div>
      </div>
      <div style={{ flex: 1, padding: "6px 10px", overflowY: "auto" }}>
        {items.map((n) => {
          const Icon = n.icon;
          const active = tab === n.id;
          const badge = counts[n.id];
          return (
            <div
              key={n.id}
              onClick={() => setTab(n.id)}
              className="hk-nav-item"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 10px",
                borderRadius: 3,
                cursor: "pointer",
                marginBottom: 2,
                background: active ? "rgba(255,255,255,0.14)" : "transparent",
                borderLeft: active ? `3px solid ${C.orange}` : "3px solid transparent",
              }}
            >
              <Icon size={16} color={active ? "#fff" : "#B7C3CF"} />
              <span style={{ fontFamily: FONT_BODY, fontSize: 13.5, fontWeight: active ? 600 : 500, color: active ? "#fff" : "#D3DBE2", flex: 1 }}>
                {n.label}
              </span>
              {!!badge && (
                <span style={{ background: C.orange, color: "#fff", fontSize: 10.5, fontWeight: 700, borderRadius: 10, padding: "1px 6px" }}>
                  {badge}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ padding: 14, borderTop: "1px solid rgba(255,255,255,0.12)", fontFamily: FONT_BODY, fontSize: 11, color: "#8FA0AF" }}>
        v1.4 · matches the HomeKeep functional spec
      </div>
    </div>
  );
}

/* ============================================================
   DASHBOARD
============================================================ */
function Dashboard({ data, setTab, role }) {
  const openWO = data.workOrders.filter((w) => w.status === "Open" || w.status === "In Progress");
  const pendingWR = data.workRequests.filter((w) => w.status === "Submitted" || w.status === "Under Review");
  const overduePM = data.pmTemplates.filter((p) => daysUntil(p.nextDue) !== null && daysUntil(p.nextDue) < 0);
  const upcomingPM = data.pmTemplates.filter((p) => {
    const d = daysUntil(p.nextDue);
    return d !== null && d >= 0 && d <= 30;
  });
  const warrantySoon = data.assets.filter((a) => {
    const d = daysUntil(a.warrantyEnd);
    return d !== null && d >= 0 && d <= 90;
  });

  const stat = (label, value, color) => (
    <Panel style={{ padding: "16px 18px", flex: "1 1 150px" }}>
      <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, fontWeight: 600, color: C.inkSoft, letterSpacing: "0.02em" }}>{label}</div>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 30, fontWeight: 700, color: color || C.ink, marginTop: 4 }}>{value}</div>
    </Panel>
  );

  return (
    <div>
      <SectionHeader title="Dashboard" subtitle={`Logged in as ${role}`} />
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 22 }}>
        {stat("Open work orders", openWO.length, C.orange)}
        {stat("Pending requests", pendingWR.length, C.gold)}
        {stat("Overdue PM tasks", overduePM.length, overduePM.length ? C.rust : C.ink)}
        {stat("Due within 30 days", upcomingPM.length)}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Panel style={{ padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h3 style={{ fontFamily: FONT_HEAD, fontSize: 15, margin: 0, color: C.ink }}>Work requests awaiting review</h3>
            <span onClick={() => setTab("requests")} style={{ cursor: "pointer", color: C.navy, fontSize: 12.5, fontFamily: FONT_BODY, fontWeight: 600 }}>
              View all →
            </span>
          </div>
          {pendingWR.length === 0 && <Empty text="Nothing waiting on review." />}
          {pendingWR.map((wr) => (
            <div key={wr.id} style={{ padding: "9px 0", borderTop: `1px solid ${C.lineSoft}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, color: C.ink }}>{formatWrNum(wr.number)} · {wr.title}</span>
                <Tag text={wr.priority} color={wr.priority === "Urgent" ? C.rust : C.inkSoft} soft={wr.priority === "Urgent" ? C.rustSoft : C.panelAlt} />
              </div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.inkFaint, marginTop: 2 }}>
                {locationPath(data.locations, wr.locationId)}
              </div>
            </div>
          ))}
        </Panel>

        <Panel style={{ padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h3 style={{ fontFamily: FONT_HEAD, fontSize: 15, margin: 0, color: C.ink }}>Preventive maintenance</h3>
            <span onClick={() => setTab("assets")} style={{ cursor: "pointer", color: C.navy, fontSize: 12.5, fontFamily: FONT_BODY, fontWeight: 600 }}>
              View assets →
            </span>
          </div>
          {overduePM.concat(upcomingPM).length === 0 && <Empty text="Nothing due in the next 30 days." />}
          {overduePM.map((p) => (
            <div key={p.id} style={{ padding: "9px 0", borderTop: `1px solid ${C.lineSoft}`, display: "flex", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, color: C.ink }}>{p.title}</div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.inkFaint }}>{nameOf(data.assets, p.assetId)}</div>
              </div>
              <Tag text={`Overdue ${Math.abs(daysUntil(p.nextDue))}d`} color={C.rust} soft={C.rustSoft} />
            </div>
          ))}
          {upcomingPM.map((p) => (
            <div key={p.id} style={{ padding: "9px 0", borderTop: `1px solid ${C.lineSoft}`, display: "flex", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, color: C.ink }}>{p.title}</div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.inkFaint }}>{nameOf(data.assets, p.assetId)}</div>
              </div>
              <Tag text={`Due in ${daysUntil(p.nextDue)}d`} color={C.gold} soft={C.goldSoft} />
            </div>
          ))}
        </Panel>
      </div>

      {warrantySoon.length > 0 && (
        <Panel style={{ padding: 16, marginTop: 16 }}>
          <h3 style={{ fontFamily: FONT_HEAD, fontSize: 15, margin: "0 0 10px", color: C.ink }}>Warranty expiring soon</h3>
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

/* ============================================================
   LOCATIONS
============================================================ */
function LocationsView({ data, update, role }) {
  const dialog = useDialog();
  const [modal, setModal] = useState(null); // {mode, parentId} or {mode, node}
  const [form, setForm] = useState({ name: "", level: "Property" });

  const openAdd = (parentId) => {
    setForm({ name: "", level: defaultLevelForParent(data.locations, parentId) });
    setModal({ mode: "add", parentId });
  };
  const openEdit = (node) => {
    setForm({ name: node.name, level: node.level });
    setModal({ mode: "edit", node });
  };
  const save = () => {
    if (!form.name.trim()) return;
    update((d) => {
      if (modal.mode === "add") {
        d.locations.push({ id: uid("loc"), name: form.name.trim(), level: form.level, parentId: modal.parentId || null });
      } else {
        const n = d.locations.find((l) => l.id === modal.node.id);
        n.name = form.name.trim();
        n.level = form.level;
      }
      return d;
    });
    setModal(null);
  };
  const remove = async (node) => {
    const hasChildren = data.locations.some((l) => l.parentId === node.id);
    const hasAssets = data.assets.some((a) => a.locationId === node.id);
    if (hasChildren || hasAssets) {
      await dialog.alertMsg("Move or remove child locations and linked assets first.");
      return;
    }
    const ok = await dialog.confirm(`Delete "${node.name}"?`);
    if (!ok) return;
    update((d) => {
      d.locations = d.locations.filter((l) => l.id !== node.id);
      return d;
    });
  };

  const rows = flattenTree(data.locations, "parentId", null);

  return (
    <div>
      <SectionHeader
        title="Location Hierarchy"
        subtitle="Every asset, work request, and work order is tied to a node here."
        action={role === "Owner" && <Btn variant="primary" onClick={() => openAdd(null)}><Plus size={15} /> Add top-level location</Btn>}
      />
      <Panel>
        {rows.length === 0 && <Empty text="No locations yet." />}
        {rows.map(({ item, depth }) => {
          const assetCount = data.assets.filter((a) => a.locationId === item.id).length;
          return (
            <div key={item.id} className="hk-row" style={{ display: "flex", alignItems: "center", padding: "10px 16px", borderTop: `1px solid ${C.lineSoft}`, gap: 10 }}>
              <div style={{ width: depth * 20 }} />
              <MapPin size={14} color={C.inkFaint} />
              <span style={{ fontFamily: FONT_BODY, fontSize: 13.5, fontWeight: 600, color: C.ink, flex: 1 }}>{item.name}</span>
              <Tag text={item.level} color={C.navy} soft={C.navySoft} />
              {assetCount > 0 && <span style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint }}>{assetCount} asset{assetCount > 1 ? "s" : ""}</span>}
              {role === "Owner" && (
                <div style={{ display: "flex", gap: 6 }}>
                  <button title="Add child" onClick={() => openAdd(item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.navy }}><Plus size={15} /></button>
                  <button title="Edit" onClick={() => openEdit(item)} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkSoft }}><Pencil size={14} /></button>
                  <button title="Delete" onClick={() => remove(item)} style={{ background: "none", border: "none", cursor: "pointer", color: C.rust }}><Trash2 size={14} /></button>
                </div>
              )}
            </div>
          );
        })}
      </Panel>

      {modal && (
        <Modal title={modal.mode === "add" ? "Add location" : "Edit location"} onClose={() => setModal(null)}>
          <Field label="Name">
            <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Primary Bathroom" autoFocus />
          </Field>
          <Field label="Level">
            <select style={inputStyle} value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
              {LOCATION_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </Field>
          {modal.mode === "add" && (
            <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.inkFaint, marginBottom: 12 }}>
              Parent: {modal.parentId ? locationPath(data.locations, modal.parentId) : "— (top level)"}
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

/* ============================================================
   ASSETS + BOM
============================================================ */
function BomTree({ data, update, assetId }) {
  const dialog = useDialog();
  const nodes = data.bomNodes.filter((n) => n.assetId === assetId);
  const rows = flattenTree(nodes, "parentId", null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  const blankForm = { name: "", level: "Component", manufacturer: "", model: "", installDate: "", cost: "", notes: "" };

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
    update((d) => {
      d.bomNodes = d.bomNodes.filter((n) => n.id !== node.id);
      return d;
    });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontFamily: FONT_HEAD, fontSize: 14, fontWeight: 600, color: C.ink }}>Bill of Materials</div>
        <Btn small variant="ghost" onClick={() => openAdd(null)}><Plus size={13} /> Add component</Btn>
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
          <button title="Add child" onClick={() => openAdd(item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.navy }}><Plus size={13} /></button>
          <button title="Edit" onClick={() => openEdit(item)} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkSoft }}><Pencil size={12} /></button>
          <button title="Remove" onClick={() => remove(item)} style={{ background: "none", border: "none", cursor: "pointer", color: C.rust }}><Trash2 size={12} /></button>
        </div>
      ))}

      {modal && (
        <Modal title={modal.mode === "add" ? "Add BOM node" : "Edit BOM node"} onClose={() => setModal(null)}>
          <Field label="Name">
            <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Ignitor" autoFocus />
          </Field>
          <Field label="Level">
            <select style={inputStyle} value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
              {BOM_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
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

function AssetsView({ data, update, role, goToOrder }) {
  const dialog = useDialog();
  const [locFilter, setLocFilter] = useState(null);
  const [selected, setSelected] = useState(data.assets[0]?.id || null);
  const [modal, setModal] = useState(null);
  const blank = { name: "", category: "", locationId: data.locations[0]?.id || "", manufacturer: "", model: "", serial: "", purchaseDate: "", warrantyEnd: "", notes: "" };
  const [form, setForm] = useState(blank);

  const allowedLocs = locFilter ? descendantIds(data.locations, locFilter) : null;
  const filteredAssets = data.assets.filter((a) => !allowedLocs || allowedLocs.has(a.locationId));

  const asset = data.assets.find((a) => a.id === selected);

  const openAdd = () => { setForm(blank); setModal("add"); };
  const openEdit = () => { setForm({ ...asset }); setModal("edit"); };
  const save = () => {
    if (!form.name.trim()) return;
    update((d) => {
      if (modal === "add") {
        const id = uid("a");
        d.assets.push({ id, ...form, name: form.name.trim() });
        setSelected(id);
      } else {
        Object.assign(d.assets.find((a) => a.id === asset.id), form, { name: form.name.trim() });
      }
      return d;
    });
    setModal(null);
  };
  const removeAsset = async () => {
    const ok = await dialog.confirm(`Archive "${asset.name}"? Its BOM and history stay in the record but it's removed from the active list.`);
    if (!ok) return;
    const remaining = data.assets.filter((a) => a.id !== asset.id);
    update((d) => {
      d.assets = d.assets.filter((a) => a.id !== asset.id);
      return d;
    });
    setSelected(remaining[0]?.id || null);
  };

  const relatedWO = data.workOrders.filter((w) => w.assetId === asset?.id && w.type !== "PM Base");
  const relatedPM = data.pmTemplates.filter((p) => p.assetId === asset?.id);

  return (
    <div>
      <SectionHeader
        title="Assets & Bill of Materials"
        subtitle="Each asset can be broken down into components, sub-components, and parts."
        action={role === "Owner" && <Btn variant="primary" onClick={openAdd}><Plus size={15} /> Add asset</Btn>}
      />
      <div style={{ display: "grid", gridTemplateColumns: "200px 240px 1fr", gap: 16 }}>
        <LocationNavTree data={data} selectedId={locFilter} onSelect={setLocFilter} />

        <Panel style={{ padding: 6, alignSelf: "start" }}>
          {filteredAssets.map((a) => (
            <div
              key={a.id}
              onClick={() => setSelected(a.id)}
              className="hk-row"
              style={{
                padding: "9px 10px",
                borderRadius: 3,
                cursor: "pointer",
                background: selected === a.id ? C.navySoft : "transparent",
              }}
            >
              <div style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, color: C.ink }}>{a.name}</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint }}>{locationPath(data.locations, a.locationId)}</div>
            </div>
          ))}
          {filteredAssets.length === 0 && <Empty text="No assets at this location." />}
        </Panel>

        {asset ? (
          <div>
            <Panel style={{ padding: 18, marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontFamily: FONT_HEAD, fontSize: 20, fontWeight: 700, color: C.ink }}>{asset.name}</div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.inkFaint, marginTop: 2 }}>{locationPath(data.locations, asset.locationId)}</div>
                </div>
                {role === "Owner" && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <Btn small variant="ghost" onClick={openEdit}><Pencil size={12} /> Edit</Btn>
                    <Btn small variant="danger" onClick={removeAsset}><Trash2 size={12} /> Archive</Btn>
                  </div>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 16 }}>
                {[
                  ["Category", asset.category || "—"],
                  ["Manufacturer", asset.manufacturer || "—"],
                  ["Model", asset.model || "—"],
                  ["Serial", asset.serial || "—"],
                  ["Purchased", fmtDate(asset.purchaseDate)],
                  ["Warranty ends", fmtDate(asset.warrantyEnd)],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontFamily: FONT_BODY, fontSize: 10.5, fontWeight: 700, color: C.inkFaint, textTransform: "uppercase", letterSpacing: "0.03em" }}>{k}</div>
                    <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.ink }}>{v}</div>
                  </div>
                ))}
              </div>
              {asset.notes && <div style={{ marginTop: 12, fontFamily: FONT_BODY, fontSize: 12.5, color: C.inkSoft, fontStyle: "italic" }}>{asset.notes}</div>}
            </Panel>

            <Panel style={{ padding: 16, marginBottom: 14 }}>
              <BomTree data={data} update={update} assetId={asset.id} />
            </Panel>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Panel style={{ padding: 16 }}>
                <div style={{ fontFamily: FONT_HEAD, fontSize: 14, fontWeight: 600, color: C.ink, marginBottom: 8 }}>PM tasks</div>
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
                <div style={{ fontFamily: FONT_HEAD, fontSize: 14, fontWeight: 600, color: C.ink, marginBottom: 8 }}>Work order history</div>
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

      {modal && (
        <Modal title={modal === "add" ? "Add asset" : "Edit asset"} onClose={() => setModal(null)} wide>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Name"><input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus /></Field>
            <Field label="Category"><input style={inputStyle} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="HVAC, Appliance, Vehicle…" /></Field>
            <Field label="Location">
              <select style={inputStyle} value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })}>
                {flattenTree(data.locations, "parentId", null).map(({ item, depth }) => (
                  <option key={item.id} value={item.id}>{"—".repeat(depth) + " " + item.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Manufacturer"><input style={inputStyle} value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} /></Field>
            <Field label="Model"><input style={inputStyle} value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></Field>
            <Field label="Serial"><input style={inputStyle} value={form.serial} onChange={(e) => setForm({ ...form, serial: e.target.value })} /></Field>
            <Field label="Purchase date"><input type="date" style={inputStyle} value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} /></Field>
            <Field label="Warranty ends"><input type="date" style={inputStyle} value={form.warrantyEnd} onChange={(e) => setForm({ ...form, warrantyEnd: e.target.value })} /></Field>
          </div>
          <Field label="Notes"><textarea style={{ ...inputStyle, minHeight: 60 }} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn variant="primary" onClick={save}>Save</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ============================================================
   LOCATION / ASSET / BOM PICKER (shared control)
============================================================ */
function AssetBomPicker({ data, assetId, bomNodeId, onChange }) {
  const bomOptions = assetId ? flattenTree(data.bomNodes.filter((n) => n.assetId === assetId), "parentId", null) : [];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      <Field label="Asset (optional)">
        <select style={inputStyle} value={assetId || ""} onChange={(e) => onChange({ assetId: e.target.value || null, bomNodeId: null })}>
          <option value="">— none —</option>
          {data.assets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </Field>
      <Field label="BOM component (optional)">
        <select style={inputStyle} value={bomNodeId || ""} disabled={!assetId} onChange={(e) => onChange({ assetId, bomNodeId: e.target.value || null })}>
          <option value="">— whole asset —</option>
          {bomOptions.map(({ item, depth }) => <option key={item.id} value={item.id}>{"—".repeat(depth) + " " + item.name}</option>)}
        </select>
      </Field>
    </div>
  );
}

/* ============================================================
   WORK REQUESTS
============================================================ */
function WorkRequestsView({ data, update, role, currentUser, goToOrder }) {
  const dialog = useDialog();
  const [modal, setModal] = useState(null); // 'new' | {action, wr}
  const [locFilter, setLocFilter] = useState(null);
  const [search, setSearch] = useState("");
  const blank = { title: "", description: "", assetId: null, bomNodeId: null, locationId: "", priority: "When convenient" };
  const [form, setForm] = useState(blank);
  const [reviewForm, setReviewForm] = useState({});

  const openNew = () => { setForm({ ...blank, locationId: data.locations[0]?.id || "" }); setModal("new"); };
  const submitRequest = async () => {
    if (!form.title.trim() || !form.locationId) { await dialog.alertMsg("Title and a location are required."); return; }
    update((d) => {
      d.counters = d.counters || { wo: 0, wr: 0 };
      d.counters.wr += 1;
      d.workRequests.push({
        id: uid("wr"), number: d.counters.wr, ...form, title: form.title.trim(),
        requestedBy: currentUser, dateSubmitted: todayISO(),
        status: "Submitted", reviewNote: "", workOrderId: null,
      });
      return d;
    });
    setModal(null);
  };

  const openReview = (wr, action) => {
    setReviewForm({ type: "Corrective", scheduledDate: todayISO(), requiredByDate: "", reason: "", mergeInto: "" });
    setModal({ action, wr });
  };

  const doConvert = () => {
    const wr = modal.wr;
    update((d) => {
      d.counters = d.counters || { wo: 0, wr: 0 };
      d.counters.wo += 1;
      const woId = uid("wo");
      d.workOrders.push({
        id: woId, number: d.counters.wo, title: wr.title, type: reviewForm.type, status: "Open",
        assetId: wr.assetId, bomNodeId: wr.bomNodeId, locationId: wr.locationId,
        description: wr.description, sourceRequestId: wr.id, sourceBenchmarkId: null,
        sourcePmBaseId: null, sourceFixedDate: null,
        scheduledDate: reviewForm.scheduledDate, requiredByDate: reviewForm.requiredByDate || "", completedDate: null,
        cost: "", vendorId: null, notes: "",
      });
      const req = d.workRequests.find((r) => r.id === wr.id);
      req.status = "Approved";
      req.workOrderId = woId;
      return d;
    });
    setModal(null);
  };
  const doDecline = async () => {
    if (!reviewForm.reason.trim()) { await dialog.alertMsg("A reason is required."); return; }
    update((d) => {
      const req = d.workRequests.find((r) => r.id === modal.wr.id);
      req.status = "Declined";
      req.reviewNote = reviewForm.reason.trim();
      return d;
    });
    setModal(null);
  };
  const doMerge = async () => {
    if (!reviewForm.mergeInto) { await dialog.alertMsg("Choose a work order to merge into."); return; }
    update((d) => {
      const req = d.workRequests.find((r) => r.id === modal.wr.id);
      req.status = "Merged";
      req.workOrderId = reviewForm.mergeInto;
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

  const allowedLocs = locFilter ? descendantIds(data.locations, locFilter) : null;
  const searchLower = search.trim().toLowerCase();
  const visible = (role === "Owner" ? data.workRequests : data.workRequests.filter((w) => w.requestedBy === currentUser))
    .filter((wr) => !allowedLocs || allowedLocs.has(wr.locationId))
    .filter((wr) => !searchLower || wr.title.toLowerCase().includes(searchLower) || formatWrNum(wr.number).toLowerCase().includes(searchLower));
  const openWOOptions = data.workOrders.filter((w) => w.status !== "Completed" && w.status !== "Verified" && w.type !== "PM Base");

  return (
    <div>
      <SectionHeader
        title="Work Requests"
        subtitle="Anyone can flag an issue. Owners review and convert into a work order."
        action={<Btn variant="primary" onClick={openNew}><Plus size={15} /> Submit request</Btn>}
      />
      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 16 }}>
        <LocationNavTree data={data} selectedId={locFilter} onSelect={setLocFilter} />
        <div>
          <div style={{ position: "relative", maxWidth: 340, marginBottom: 12 }}>
            <Search size={14} color={C.inkFaint} style={{ position: "absolute", left: 10, top: 10 }} />
            <input style={{ ...inputStyle, paddingLeft: 30 }} placeholder="Search by title or number…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Panel>
            {visible.length === 0 && <Empty text="No matching work requests." />}
            {visible.map((wr) => (
              <div key={wr.id} style={{ padding: "14px 18px", borderTop: `1px solid ${C.lineSoft}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, color: C.ink }}>{formatWrNum(wr.number)} · {wr.title}</div>
                    <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.inkFaint, marginTop: 2 }}>
                      {locationPath(data.locations, wr.locationId)}
                      {wr.bomNodeId && ` · ${nameOf(data.bomNodes, wr.bomNodeId)}`}
                      {" · by "}{wr.requestedBy}{" · "}{fmtDate(wr.dateSubmitted)}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                    <Tag text={wr.priority} color={wr.priority === "Urgent" ? C.rust : C.inkSoft} soft={wr.priority === "Urgent" ? C.rustSoft : C.panelAlt} />
                    <Tag text={wr.status} color={WR_STATUS_COLORS[wr.status]} soft={C.panelAlt} />
                  </div>
                </div>
                {wr.description && <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.inkSoft, marginTop: 8 }}>{wr.description}</div>}
                {wr.reviewNote && <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.gold, marginTop: 6, fontStyle: "italic" }}>{wr.reviewNote}</div>}
                {wr.workOrderId && (
                  <div onClick={() => goToOrder(wr.workOrderId)} style={{ marginTop: 8, cursor: "pointer", fontFamily: FONT_BODY, fontSize: 12.5, color: C.navy, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                    View linked work order <ArrowRight size={12} />
                  </div>
                )}
                {role === "Owner" && (wr.status === "Submitted" || wr.status === "Under Review") && (
                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    <Btn small variant="primary" onClick={() => openReview(wr, "convert")}><Check size={12} /> Convert to work order</Btn>
                    <Btn small variant="ghost" onClick={() => openReview(wr, "merge")}>Merge into existing</Btn>
                    <Btn small variant="ghost" onClick={() => openReview(wr, "info")}>Request more info</Btn>
                    <Btn small variant="danger" onClick={() => openReview(wr, "decline")}>Decline</Btn>
                  </div>
                )}
              </div>
            ))}
          </Panel>
        </div>
      </div>

      {modal === "new" && (
        <Modal title="Submit a work request" onClose={() => setModal(null)} wide>
          <Field label="Title"><input style={inputStyle} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="What needs attention?" autoFocus /></Field>
          <Field label="Description"><textarea style={{ ...inputStyle, minHeight: 70 }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <AssetBomPicker data={data} assetId={form.assetId} bomNodeId={form.bomNodeId} onChange={({ assetId, bomNodeId }) => setForm({ ...form, assetId, bomNodeId, locationId: assetId ? data.assets.find((a) => a.id === assetId).locationId : form.locationId })} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Location (required)">
              <select style={inputStyle} value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })}>
                {flattenTree(data.locations, "parentId", null).map(({ item, depth }) => (
                  <option key={item.id} value={item.id}>{"—".repeat(depth) + " " + item.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Priority">
              <select style={inputStyle} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn variant="primary" onClick={submitRequest}>Submit</Btn>
          </div>
        </Modal>
      )}

      {modal && modal.action === "convert" && (
        <Modal title="Convert to work order" onClose={() => setModal(null)}>
          <Field label="Work order type">
            <select style={inputStyle} value={reviewForm.type} onChange={(e) => setReviewForm({ ...reviewForm, type: e.target.value })}>
              <option value="PM">PM</option>
              <option value="Benchmark">Benchmark</option>
              <option value="Corrective">Corrective</option>
            </select>
          </Field>
          <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint, marginTop: -6, marginBottom: 12 }}>
            A request can never become an Unplanned or PM Base work order — those are always created directly.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Scheduled date"><input type="date" style={inputStyle} value={reviewForm.scheduledDate} onChange={(e) => setReviewForm({ ...reviewForm, scheduledDate: e.target.value })} /></Field>
            <Field label="Required by (optional)"><input type="date" style={inputStyle} value={reviewForm.requiredByDate} onChange={(e) => setReviewForm({ ...reviewForm, requiredByDate: e.target.value })} /></Field>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn variant="primary" onClick={doConvert}>Create work order</Btn>
          </div>
        </Modal>
      )}
      {modal && modal.action === "decline" && (
        <Modal title="Decline request" onClose={() => setModal(null)}>
          <Field label="Reason (shown to the submitter)"><textarea style={{ ...inputStyle, minHeight: 70 }} value={reviewForm.reason} onChange={(e) => setReviewForm({ ...reviewForm, reason: e.target.value })} autoFocus /></Field>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn variant="danger" onClick={doDecline}>Decline request</Btn>
          </div>
        </Modal>
      )}
      {modal && modal.action === "info" && (
        <Modal title="Request more info" onClose={() => setModal(null)}>
          <Field label="What do you need to know?"><textarea style={{ ...inputStyle, minHeight: 70 }} value={reviewForm.reason} onChange={(e) => setReviewForm({ ...reviewForm, reason: e.target.value })} autoFocus /></Field>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn variant="primary" onClick={doRequestInfo}>Send</Btn>
          </div>
        </Modal>
      )}
      {modal && modal.action === "merge" && (
        <Modal title="Merge into an existing work order" onClose={() => setModal(null)}>
          <Field label="Existing work order">
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
  const linked = data.workOrders
    .filter((w) => w.sourcePmBaseId === base.id)
    .sort((a, b) => (a.requiredByDate || "").localeCompare(b.requiredByDate || ""));
  return (
    <div>
      <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.ink, marginBottom: 10 }}>
        {base.pmMode === "Fixed"
          ? `Fixed schedule — runs every year on: ${(base.fixedDates || []).map((f) => `${MONTH_NAMES[f.month - 1]} ${f.day}`).join(", ")}`
          : `Repeats every ${base.frequencyValue} ${base.frequencyUnit}, counted forward from each completion date.`}
      </div>
      {base.description && <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.inkSoft, marginBottom: 14, fontStyle: "italic" }}>{base.description}</div>}
      <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 6 }}>Generated PM instances</div>
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

function WorkOrdersView({ data, update, role, openId, setOpenId }) {
  const dialog = useDialog();
  const [modal, setModal] = useState(null); // 'new'
  const [locFilter, setLocFilter] = useState(null);
  const [search, setSearch] = useState("");
  const blank = {
    title: "", type: "Unplanned", assetId: null, bomNodeId: null, locationId: data.locations[0]?.id || "",
    description: "", scheduledDate: todayISO(), requiredByDate: "", vendorId: "", benchmarkId: "",
    pmMode: "Non-fixed", frequencyValue: "3", frequencyUnit: "months", fixedDates: [],
  };
  const [form, setForm] = useState(blank);
  const [detailEdits, setDetailEdits] = useState({});

  const openNew = () => { setForm(blank); setModal("new"); };

  const addFixedDate = () => setForm((f) => ({ ...f, fixedDates: [...f.fixedDates, { month: 1, day: 1 }] }));
  const removeFixedDate = (i) => setForm((f) => ({ ...f, fixedDates: f.fixedDates.filter((_, idx) => idx !== i) }));
  const updateFixedDate = (i, patch) => setForm((f) => ({ ...f, fixedDates: f.fixedDates.map((fd, idx) => (idx === i ? { ...fd, ...patch } : fd)) }));

  const createWO = async () => {
    if (!form.title.trim() || !form.locationId) { await dialog.alertMsg("Title and location are required."); return; }
    if (form.type === "PM Base") {
      if (form.pmMode === "Non-fixed" && (!form.frequencyValue || Number(form.frequencyValue) <= 0)) {
        await dialog.alertMsg("Enter a frequency greater than zero."); return;
      }
      if (form.pmMode === "Fixed" && form.fixedDates.length === 0) {
        await dialog.alertMsg("Add at least one fixed date."); return;
      }
    }
    update((d) => {
      d.counters = d.counters || { wo: 0, wr: 0 };
      let checklist = "";
      if (form.type === "Corrective" && form.benchmarkId) {
        const bm = d.benchmarks.find((b) => b.id === form.benchmarkId);
        checklist = bm ? bm.checklist : "";
      }
      d.counters.wo += 1;
      const id = uid("wo");
      const wo = {
        id, number: d.counters.wo, title: form.title.trim(), type: form.type,
        status: form.type === "PM Base" ? "Active" : "Open",
        assetId: form.assetId, bomNodeId: form.bomNodeId, locationId: form.locationId,
        description: form.description, sourceRequestId: null,
        sourceBenchmarkId: form.type === "Corrective" ? (form.benchmarkId || null) : null,
        sourcePmBaseId: null, sourceFixedDate: null,
        scheduledDate: form.type === "PM Base" ? "" : form.scheduledDate,
        requiredByDate: form.type === "PM Base" ? "" : (form.requiredByDate || ""),
        completedDate: null,
        cost: "", vendorId: form.vendorId || null,
        notes: checklist ? "Checklist: " + checklist : "",
      };
      if (form.type === "PM Base") {
        wo.pmMode = form.pmMode;
        if (form.pmMode === "Non-fixed") {
          wo.frequencyValue = Number(form.frequencyValue);
          wo.frequencyUnit = form.frequencyUnit;
        } else {
          wo.fixedDates = form.fixedDates.map((f) => ({ month: Number(f.month), day: Number(f.day) }));
        }
      }
      d.workOrders.push(wo);

      if (form.type === "PM Base") {
        if (wo.pmMode === "Non-fixed") {
          spawnPmInstance(d, wo, { afterDateISO: todayISO(), fixedDate: null });
        } else {
          wo.fixedDates.forEach((fd) => spawnPmInstance(d, wo, { afterDateISO: todayISO(), fixedDate: fd }));
        }
      }
      setOpenId(id);
      return d;
    });
    setModal(null);
  };

  const openWO = data.workOrders.find((w) => w.id === openId);
  useEffect(() => { if (openWO) setDetailEdits({ ...openWO }); }, [openId]); // eslint-disable-line

  const saveDetail = () => {
    update((d) => {
      Object.assign(d.workOrders.find((w) => w.id === openWO.id), detailEdits);
      return d;
    });
  };
  const setStatus = (status) => {
    update((d) => {
      const w = d.workOrders.find((x) => x.id === openWO.id);
      const wasTerminal = w.status === "Completed" || w.status === "Verified";
      w.status = status;
      if (status === "Completed" && !w.completedDate) w.completedDate = todayISO();
      if (status === "Completed" && w.type === "PM" && w.sourcePmBaseId && !wasTerminal) {
        regeneratePmAfterCompletion(d, w);
      }
      return d;
    });
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
      d.benchmarks.push({ id, title, checklist: detailEdits.notes || "", estCost: detailEdits.cost || "", estTime: "", notes: "", vendorId: openWO.vendorId || null, version: 1 });
      return d;
    });
    await dialog.alertMsg("Saved as a new benchmark.");
  };

  const allowedLocs = locFilter ? descendantIds(data.locations, locFilter) : null;
  const searchLower = search.trim().toLowerCase();
  const matchesFilters = (w) => {
    if (allowedLocs && !allowedLocs.has(w.locationId)) return false;
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
    items: boardOrders.filter((w) => w.status === status),
  }));

  return (
    <div>
      <SectionHeader
        title="Work Orders"
        subtitle="Created ad hoc for any type, or by converting an approved work request — except Unplanned and PM Base, which are always ad hoc."
        action={<Btn variant="primary" onClick={openNew}><Plus size={15} /> New work order</Btn>}
      />
      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 16 }}>
        <LocationNavTree data={data} selectedId={locFilter} onSelect={setLocFilter} />
        <div>
          <div style={{ position: "relative", maxWidth: 340, marginBottom: 14 }}>
            <Search size={14} color={C.inkFaint} style={{ position: "absolute", left: 10, top: 10 }} />
            <input style={{ ...inputStyle, paddingLeft: 30 }} placeholder="Search by title or number…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {columns.map((col) => (
              <div key={col.status}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 8, background: WO_STATUS_COLORS[col.status] }} />
                  <span style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, color: C.ink }}>{col.status}</span>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint }}>({col.items.length})</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {col.items.map((w) => {
                    const du = w.requiredByDate ? daysUntil(w.requiredByDate) : null;
                    const notDone = w.status !== "Completed" && w.status !== "Verified";
                    return (
                      <Panel key={w.id} style={{ padding: "10px 12px", cursor: "pointer" }}>
                        <div onClick={() => setOpenId(w.id)}>
                          <div style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, color: C.ink }}>{formatWoNum(w.number)} · {w.title}</div>
                          <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint, marginTop: 3 }}>
                            {locationPath(data.locations, w.locationId)}
                          </div>
                          <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <Tag text={w.type} color={WO_TYPE_COLORS[w.type]} soft={C.panelAlt} />
                            {notDone && du !== null && du < 0 && <Tag text="Overdue" color={C.rust} soft={C.rustSoft} />}
                            {notDone && du !== null && du >= 0 && du <= 7 && <Tag text={`Due ${du}d`} color={C.gold} soft={C.goldSoft} />}
                          </div>
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
              <div style={{ fontFamily: FONT_HEAD, fontSize: 15, fontWeight: 600, color: C.ink, marginBottom: 8 }}>PM Base templates</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                {pmBases.map((b) => {
                  const linked = data.workOrders.filter((w) => w.sourcePmBaseId === b.id);
                  const openLinked = linked.filter((w) => w.status !== "Completed" && w.status !== "Verified");
                  return (
                    <Panel key={b.id} style={{ padding: "10px 12px", cursor: "pointer" }}>
                      <div onClick={() => setOpenId(b.id)}>
                        <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, fontWeight: 700, color: C.ink }}>{formatWoNum(b.number)} · {b.title}</div>
                        <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: C.inkFaint, marginTop: 3 }}>{locationPath(data.locations, b.locationId)}</div>
                        <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <Tag text="PM Base" color={WO_TYPE_COLORS["PM Base"]} soft={C.tealSoft} />
                          <Tag text={b.pmMode} color={C.inkSoft} soft={C.panelAlt} />
                          <Tag text={`${openLinked.length} open`} color={C.navy} soft={C.navySoft} />
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

      {modal === "new" && (
        <Modal title="New work order" onClose={() => setModal(null)} wide>
          <Field label="Title"><input style={inputStyle} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus /></Field>
          <Field label="Type">
            <select style={inputStyle} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {WO_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>

          {form.type === "Corrective" && (
            <Field label="Copy from benchmark (optional)">
              <select style={inputStyle} value={form.benchmarkId} onChange={(e) => setForm({ ...form, benchmarkId: e.target.value })}>
                <option value="">— start blank —</option>
                {data.benchmarks.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
              </select>
            </Field>
          )}

          {form.type === "PM Base" && (
            <>
              <Field label="PM mode">
                <select style={inputStyle} value={form.pmMode} onChange={(e) => setForm({ ...form, pmMode: e.target.value })}>
                  <option value="Non-fixed">Non-fixed (repeats on a frequency)</option>
                  <option value="Fixed">Fixed (same date(s) every year)</option>
                </select>
              </Field>
              {form.pmMode === "Non-fixed" ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Field label="Every">
                    <input type="number" min="1" style={inputStyle} value={form.frequencyValue} onChange={(e) => setForm({ ...form, frequencyValue: e.target.value })} />
                  </Field>
                  <Field label="Unit">
                    <select style={inputStyle} value={form.frequencyUnit} onChange={(e) => setForm({ ...form, frequencyUnit: e.target.value })}>
                      {FREQUENCY_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </Field>
                </div>
              ) : (
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Fixed date(s) of year</label>
                  {form.fixedDates.map((fd, i) => (
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
              <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint, marginTop: -6, marginBottom: 12 }}>
                A PM Base is never scheduled or completed itself — it's a template. Creating it immediately generates the first PM work order(s) copied from it.
              </div>
            </>
          )}

          <AssetBomPicker data={data} assetId={form.assetId} bomNodeId={form.bomNodeId} onChange={({ assetId, bomNodeId }) => setForm({ ...form, assetId, bomNodeId, locationId: assetId ? data.assets.find((a) => a.id === assetId).locationId : form.locationId })} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Location (required)">
              <select style={inputStyle} value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })}>
                {flattenTree(data.locations, "parentId", null).map(({ item, depth }) => (
                  <option key={item.id} value={item.id}>{"—".repeat(depth) + " " + item.name}</option>
                ))}
              </select>
            </Field>
            {form.type !== "PM Base" && (
              <Field label="Scheduled date"><input type="date" style={inputStyle} value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} /></Field>
            )}
          </div>
          {form.type !== "PM Base" && (
            <Field label="Required by (optional)"><input type="date" style={inputStyle} value={form.requiredByDate} onChange={(e) => setForm({ ...form, requiredByDate: e.target.value })} /></Field>
          )}
          <Field label="Vendor (optional)">
            <select style={inputStyle} value={form.vendorId} onChange={(e) => setForm({ ...form, vendorId: e.target.value })}>
              <option value="">— none —</option>
              {data.vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </Field>
          <Field label="Description"><textarea style={{ ...inputStyle, minHeight: 60 }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn variant="primary" onClick={createWO}>Create</Btn>
          </div>
        </Modal>
      )}

      {openWO && (
        <Modal title={`${formatWoNum(openWO.number)} · ${openWO.title}`} onClose={() => setOpenId(null)} wide>
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            <Tag text={openWO.type} color={WO_TYPE_COLORS[openWO.type]} soft={C.panelAlt} />
            {openWO.type !== "PM Base" && <Tag text={openWO.status} color={WO_STATUS_COLORS[openWO.status]} soft={C.panelAlt} />}
          </div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.inkFaint, marginBottom: 12 }}>
            {locationPath(data.locations, openWO.locationId)}
            {openWO.assetId && ` · ${nameOf(data.assets, openWO.assetId)}`}
            {openWO.bomNodeId && ` · ${nameOf(data.bomNodes, openWO.bomNodeId)}`}
          </div>

          {openWO.type === "PM Base" ? (
            <PmBaseDetail data={data} base={openWO} onOpenInstance={setOpenId} />
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="Scheduled date"><input type="date" style={inputStyle} value={detailEdits.scheduledDate || ""} onChange={(e) => setDetailEdits({ ...detailEdits, scheduledDate: e.target.value })} /></Field>
                <Field label="Required by"><input type="date" style={inputStyle} value={detailEdits.requiredByDate || ""} onChange={(e) => setDetailEdits({ ...detailEdits, requiredByDate: e.target.value })} /></Field>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="Cost ($)"><input style={inputStyle} value={detailEdits.cost || ""} onChange={(e) => setDetailEdits({ ...detailEdits, cost: e.target.value })} /></Field>
                <Field label="Vendor">
                  <select style={inputStyle} value={detailEdits.vendorId || ""} onChange={(e) => setDetailEdits({ ...detailEdits, vendorId: e.target.value })}>
                    <option value="">— none —</option>
                    {data.vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Notes / checklist"><textarea style={{ ...inputStyle, minHeight: 80 }} value={detailEdits.notes || ""} onChange={(e) => setDetailEdits({ ...detailEdits, notes: e.target.value })} /></Field>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", gap: 6 }}>
                  {WO_STATUSES.map((s) => (
                    <Btn key={s} small variant={openWO.status === s ? "primary" : "ghost"} onClick={() => setStatus(s)}>{s}</Btn>
                  ))}
                </div>
                <Btn small onClick={saveDetail}>Save changes</Btn>
              </div>

              {(openWO.type === "Benchmark" || openWO.type === "Corrective") && (
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
                  Generated from PM Base {formatWoNum((data.workOrders.find((w) => w.id === openWO.sourcePmBaseId) || {}).number)}. Completing this will automatically generate the next occurrence.
                </div>
              )}
            </>
          )}
        </Modal>
      )}
    </div>
  );
}

/* ============================================================
   VENDORS
============================================================ */
function VendorsView({ data, update, role }) {
  const dialog = useDialog();
  const [modal, setModal] = useState(null);
  const blank = { name: "", specialty: "", contact: "", notes: "" };
  const [form, setForm] = useState(blank);

  const openAdd = () => { setForm(blank); setModal("add"); };
  const openEdit = (v) => { setForm({ ...v }); setModal(v.id); };
  const save = () => {
    if (!form.name.trim()) return;
    update((d) => {
      if (modal === "add") d.vendors.push({ id: uid("v"), ...form, name: form.name.trim() });
      else Object.assign(d.vendors.find((v) => v.id === modal), form, { name: form.name.trim() });
      return d;
    });
    setModal(null);
  };
  const remove = async (v) => {
    const ok = await dialog.confirm(`Remove ${v.name}?`);
    if (!ok) return;
    update((d) => { d.vendors = d.vendors.filter((x) => x.id !== v.id); return d; });
  };

  return (
    <div>
      <SectionHeader title="Vendors & Service Providers" action={role === "Owner" && <Btn variant="primary" onClick={openAdd}><Plus size={15} /> Add vendor</Btn>} />
      <Panel>
        {data.vendors.length === 0 && <Empty text="No vendors saved yet." />}
        {data.vendors.map((v) => (
          <div key={v.id} className="hk-row" style={{ display: "flex", justifyContent: "space-between", padding: "12px 18px", borderTop: `1px solid ${C.lineSoft}` }}>
            <div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 13.5, fontWeight: 700, color: C.ink }}>{v.name}</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.inkFaint }}>{v.specialty} · {v.contact}</div>
              {v.notes && <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.inkSoft, marginTop: 2 }}>{v.notes}</div>}
            </div>
            {role === "Owner" && (
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => openEdit(v)} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkSoft }}><Pencil size={14} /></button>
                <button onClick={() => remove(v)} style={{ background: "none", border: "none", cursor: "pointer", color: C.rust }}><Trash2 size={14} /></button>
              </div>
            )}
          </div>
        ))}
      </Panel>
      {modal && (
        <Modal title={modal === "add" ? "Add vendor" : "Edit vendor"} onClose={() => setModal(null)}>
          <Field label="Name"><input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus /></Field>
          <Field label="Specialty"><input style={inputStyle} value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} /></Field>
          <Field label="Contact"><input style={inputStyle} value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></Field>
          <Field label="Notes"><textarea style={{ ...inputStyle, minHeight: 60 }} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn variant="primary" onClick={save}>Save</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ============================================================
   INVENTORY
============================================================ */
function InventoryView({ data, update, role }) {
  const [modal, setModal] = useState(null);
  const blank = { name: "", assetId: null, bomNodeId: null, qty: 1, reorderAt: 1 };
  const [form, setForm] = useState(blank);

  const openAdd = () => { setForm(blank); setModal("add"); };
  const save = () => {
    if (!form.name.trim()) return;
    update((d) => { d.inventory.push({ id: uid("inv"), ...form, name: form.name.trim(), qty: Number(form.qty) || 0, reorderAt: Number(form.reorderAt) || 0 }); return d; });
    setModal(null);
  };
  const adjust = (item, delta) => {
    update((d) => {
      const it = d.inventory.find((i) => i.id === item.id);
      it.qty = Math.max(0, it.qty + delta);
      return d;
    });
  };
  const remove = (item) => {
    update((d) => { d.inventory = d.inventory.filter((i) => i.id !== item.id); return d; });
  };

  return (
    <div>
      <SectionHeader title="Inventory & Consumables" subtitle="Track parts and supplies tied to an asset or a specific BOM component." action={role === "Owner" && <Btn variant="primary" onClick={openAdd}><Plus size={15} /> Add item</Btn>} />
      <Panel>
        {data.inventory.length === 0 && <Empty text="No consumables tracked yet." />}
        {data.inventory.map((item) => {
          const low = item.qty <= item.reorderAt;
          return (
            <div key={item.id} className="hk-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", borderTop: `1px solid ${C.lineSoft}` }}>
              <div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 13.5, fontWeight: 700, color: C.ink }}>{item.name}</div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.inkFaint }}>
                  {item.assetId ? nameOf(data.assets, item.assetId) : "—"}{item.bomNodeId ? ` · ${nameOf(data.bomNodes, item.bomNodeId)}` : ""}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {low && <Tag text="Reorder" color={C.rust} soft={C.rustSoft} />}
                <button onClick={() => adjust(item, -1)} style={{ border: `1px solid ${C.line}`, background: "#fff", width: 26, height: 26, borderRadius: 3, cursor: "pointer" }}>−</button>
                <span style={{ fontFamily: FONT_BODY, fontWeight: 700, width: 20, textAlign: "center" }}>{item.qty}</span>
                <button onClick={() => adjust(item, 1)} style={{ border: `1px solid ${C.line}`, background: "#fff", width: 26, height: 26, borderRadius: 3, cursor: "pointer" }}>+</button>
                {role === "Owner" && <button onClick={() => remove(item)} style={{ background: "none", border: "none", cursor: "pointer", color: C.rust, marginLeft: 4 }}><Trash2 size={14} /></button>}
              </div>
            </div>
          );
        })}
      </Panel>
      {modal && (
        <Modal title="Add inventory item" onClose={() => setModal(null)}>
          <Field label="Name"><input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. 16x25x1 Furnace Filter" autoFocus /></Field>
          <AssetBomPicker data={data} assetId={form.assetId} bomNodeId={form.bomNodeId} onChange={({ assetId, bomNodeId }) => setForm({ ...form, assetId, bomNodeId })} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Quantity on hand"><input type="number" style={inputStyle} value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} /></Field>
            <Field label="Reorder at"><input type="number" style={inputStyle} value={form.reorderAt} onChange={(e) => setForm({ ...form, reorderAt: e.target.value })} /></Field>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn variant="primary" onClick={save}>Save</Btn>
          </div>
        </Modal>
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
      <SectionHeader title="Budget & Cost Tracking" subtitle="Computed from logged work order costs." />
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
        <div style={{ fontFamily: FONT_HEAD, fontSize: 14, fontWeight: 600, marginBottom: 12, color: C.ink }}>Spend by category</div>
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
   SCHEDULE — monthly calendar of work orders by scheduled date
============================================================ */
function ScheduleView({ data, goToOrder }) {
  const [cursor, setCursor] = useState(() => {
    const t = new Date();
    return { year: t.getFullYear(), month: t.getMonth() };
  });

  const firstOfMonth = new Date(cursor.year, cursor.month, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;

  const eventsByDay = {};
  data.workOrders.forEach((w) => {
    if (w.type === "PM Base" || !w.scheduledDate) return;
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
        subtitle="Work orders by scheduled date."
        action={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Btn small variant="ghost" onClick={goPrev}><ChevronLeft size={14} /></Btn>
            <span style={{ fontFamily: FONT_HEAD, fontSize: 14, fontWeight: 600, color: C.ink, minWidth: 150, textAlign: "center", display: "inline-block" }}>
              {MONTH_NAMES[cursor.month]} {cursor.year}
            </span>
            <Btn small variant="ghost" onClick={goNext}><ChevronRight size={14} /></Btn>
            <Btn small variant="ghost" onClick={goToday}>Today</Btn>
          </div>
        }
      />
      <Panel style={{ padding: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
          {WEEKDAY_LABELS.map((w) => (
            <div key={w} style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: C.inkFaint, textAlign: "center", padding: "4px 0" }}>{w}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {Array.from({ length: totalCells }).map((_, i) => {
            const dayNum = i - startWeekday + 1;
            const inMonth = dayNum >= 1 && dayNum <= daysInMonth;
            const dateStr = inMonth ? `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}` : null;
            const isToday = dateStr === todayStr;
            const dayEvents = inMonth ? (eventsByDay[dayNum] || []) : [];
            return (
              <div
                key={i}
                style={{
                  minHeight: 92, border: `1px solid ${C.lineSoft}`, borderRadius: 3, padding: 5,
                  background: inMonth ? (isToday ? C.orangeSoft : "#fff") : C.panelAlt,
                  opacity: inMonth ? 1 : 0.5,
                }}
              >
                {inMonth && (
                  <>
                    <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: isToday ? 700 : 600, color: isToday ? C.orange : C.inkFaint, marginBottom: 3 }}>{dayNum}</div>
                    {dayEvents.slice(0, 3).map((w) => (
                      <div
                        key={w.id}
                        onClick={() => goToOrder(w.id)}
                        title={`${formatWoNum(w.number)} ${w.title}`}
                        style={{
                          fontFamily: FONT_BODY, fontSize: 10.5, fontWeight: 600, color: "#fff",
                          background: WO_TYPE_COLORS[w.type], borderRadius: 2, padding: "2px 4px", marginBottom: 2,
                          cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}
                      >
                        {formatWoNum(w.number)} {w.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div style={{ fontFamily: FONT_BODY, fontSize: 10, color: C.inkFaint }}>+{dayEvents.length - 3} more</div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

/* ============================================================
   BACKUP — export the whole household to an Excel workbook and
   re-import it (e.g. after bulk edits made in Excel).
============================================================ */
const SHEET_SPECS = [
  {
    key: "locations", sheetName: "Locations", idPrefix: "loc",
    toRow: (l) => ({ id: l.id, name: l.name, level: l.level, parentId: l.parentId || "" }),
    fromRow: (r) => ({ id: r.id, name: String(r.name || ""), level: String(r.level || "Room"), parentId: r.parentId ? String(r.parentId) : null }),
  },
  {
    key: "assets", sheetName: "Assets", idPrefix: "a",
    toRow: (a) => ({ id: a.id, name: a.name, category: a.category || "", locationId: a.locationId || "", manufacturer: a.manufacturer || "", model: a.model || "", serial: a.serial || "", purchaseDate: a.purchaseDate || "", warrantyEnd: a.warrantyEnd || "", notes: a.notes || "" }),
    fromRow: (r) => ({ id: r.id, name: String(r.name || ""), category: String(r.category || ""), locationId: r.locationId ? String(r.locationId) : "", manufacturer: String(r.manufacturer || ""), model: String(r.model || ""), serial: String(r.serial || ""), purchaseDate: String(r.purchaseDate || ""), warrantyEnd: String(r.warrantyEnd || ""), notes: String(r.notes || "") }),
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
    toRow: (w) => ({ id: w.id, number: w.number || "", title: w.title, description: w.description || "", assetId: w.assetId || "", bomNodeId: w.bomNodeId || "", locationId: w.locationId || "", requestedBy: w.requestedBy || "", dateSubmitted: w.dateSubmitted || "", priority: w.priority || "", status: w.status || "", reviewNote: w.reviewNote || "", workOrderId: w.workOrderId || "" }),
    fromRow: (r) => ({ id: r.id, number: r.number ? Number(r.number) : undefined, title: String(r.title || ""), description: String(r.description || ""), assetId: r.assetId ? String(r.assetId) : null, bomNodeId: r.bomNodeId ? String(r.bomNodeId) : null, locationId: r.locationId ? String(r.locationId) : "", requestedBy: String(r.requestedBy || ""), dateSubmitted: String(r.dateSubmitted || ""), priority: String(r.priority || "When convenient"), status: String(r.status || "Submitted"), reviewNote: String(r.reviewNote || ""), workOrderId: r.workOrderId ? String(r.workOrderId) : null }),
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
      scheduledDate: w.scheduledDate || "", requiredByDate: w.requiredByDate || "", completedDate: w.completedDate || "",
      cost: w.cost || "", vendorId: w.vendorId || "", notes: w.notes || "",
    }),
    fromRow: (r) => {
      const fixedDates = String(r.fixedDates || "").split(",").map((s) => s.trim()).filter(Boolean).map((tok) => {
        const parts = tok.split("-").map(Number);
        return { month: parts[0], day: parts[1] };
      });
      const sourceFixedDate = (r.sourceFixedDateMonth && r.sourceFixedDateDay) ? { month: Number(r.sourceFixedDateMonth), day: Number(r.sourceFixedDateDay) } : null;
      return {
        id: r.id, number: r.number ? Number(r.number) : undefined, title: String(r.title || ""), type: String(r.type || "Unplanned"), status: String(r.status || "Open"),
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
        scheduledDate: String(r.scheduledDate || ""), requiredByDate: String(r.requiredByDate || ""), completedDate: r.completedDate ? String(r.completedDate) : null,
        cost: r.cost !== "" && r.cost != null ? String(r.cost) : "", vendorId: r.vendorId ? String(r.vendorId) : null, notes: String(r.notes || ""),
      };
    },
  },
  {
    key: "benchmarks", sheetName: "Benchmarks", idPrefix: "bm",
    toRow: (b) => ({ id: b.id, title: b.title, checklist: b.checklist || "", estCost: b.estCost || "", estTime: b.estTime || "", notes: b.notes || "", vendorId: b.vendorId || "", version: b.version || 1 }),
    fromRow: (r) => ({ id: r.id, title: String(r.title || ""), checklist: String(r.checklist || ""), estCost: String(r.estCost || ""), estTime: String(r.estTime || ""), notes: String(r.notes || ""), vendorId: r.vendorId ? String(r.vendorId) : null, version: r.version ? Number(r.version) : 1 }),
  },
  {
    key: "vendors", sheetName: "Vendors", idPrefix: "v",
    toRow: (v) => ({ id: v.id, name: v.name, specialty: v.specialty || "", contact: v.contact || "", notes: v.notes || "" }),
    fromRow: (r) => ({ id: r.id, name: String(r.name || ""), specialty: String(r.specialty || ""), contact: String(r.contact || ""), notes: String(r.notes || "") }),
  },
  {
    key: "inventory", sheetName: "Inventory", idPrefix: "inv",
    toRow: (i) => ({ id: i.id, name: i.name, assetId: i.assetId || "", bomNodeId: i.bomNodeId || "", qty: i.qty, reorderAt: i.reorderAt }),
    fromRow: (r) => ({ id: r.id, name: String(r.name || ""), assetId: r.assetId ? String(r.assetId) : null, bomNodeId: r.bomNodeId ? String(r.bomNodeId) : null, qty: Number(r.qty) || 0, reorderAt: Number(r.reorderAt) || 0 }),
  },
];

function BackupTools({ data, update }) {
  const dialog = useDialog();
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const doExport = () => {
    const wb = XLSX.utils.book_new();
    const readme = XLSX.utils.aoa_to_sheet([
      ["HomeKeep backup"],
      ["Exported " + new Date().toLocaleString()],
      [""],
      ["Each tab is one data type. Edit rows in Excel and re-import this file to apply changes."],
      ["To ADD a new row: leave its 'id' column blank — HomeKeep assigns one on import."],
      ["To edit an existing row: keep its 'id' (and 'number', where present) unchanged."],
      ["Don't rename the sheet tabs or column headers — import matches on those."],
    ]);
    XLSX.utils.book_append_sheet(wb, readme, "Read me");
    SHEET_SPECS.forEach((spec) => {
      const rows = (data[spec.key] || []).map(spec.toRow);
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, spec.sheetName);
    });
    XLSX.writeFile(wb, `homekeep-backup-${todayISO()}.xlsx`);
  };

  const doImport = async (file) => {
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const next = { locations: [], assets: [], bomNodes: [], pmTemplates: [], workRequests: [], workOrders: [], benchmarks: [], vendors: [], inventory: [], counters: { wo: 0, wr: 0 } };
      for (const spec of SHEET_SPECS) {
        const ws = wb.Sheets[spec.sheetName];
        if (!ws) continue;
        const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
        next[spec.key] = rows.map((r) => {
          const withId = { ...r, id: r.id && String(r.id).trim() ? String(r.id).trim() : uid(spec.idPrefix) };
          return spec.fromRow(withId);
        });
      }
      let maxWo = 0, maxWr = 0;
      next.workOrders.forEach((w) => { if (w.number) maxWo = Math.max(maxWo, w.number); });
      next.workRequests.forEach((w) => { if (w.number) maxWr = Math.max(maxWr, w.number); });
      next.workOrders.forEach((w) => { if (!w.number) w.number = ++maxWo; });
      next.workRequests.forEach((w) => { if (!w.number) w.number = ++maxWr; });
      next.counters = { wo: maxWo, wr: maxWr };

      const ok = await dialog.confirm("This will replace ALL current HomeKeep data with the contents of this file. Continue?");
      if (!ok) return;
      update(() => next);
      await dialog.alertMsg("Import complete.");
    } catch (err) {
      console.error(err);
      await dialog.alertMsg("Couldn't read that file. Make sure it's an unmodified export from this app (sheet names and headers intact).");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Panel style={{ padding: 18 }}>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 15, fontWeight: 600, color: C.ink, marginBottom: 4 }}>Backup & bulk edit</div>
      <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.inkSoft, marginBottom: 14 }}>
        Export everything to an Excel file — edit it (including bulk changes across many rows) and re-import to apply the changes, or just keep it as a backup.
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <Btn onClick={doExport}><FileDown size={14} /> Export to Excel</Btn>
        <Btn variant="ghost" disabled={busy} onClick={() => fileRef.current?.click()}>
          <FileUp size={14} /> {busy ? "Importing…" : "Import from Excel"}
        </Btn>
        <input ref={fileRef} type="file" accept=".xlsx" style={{ display: "none" }} onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) doImport(f); }} />
      </div>
    </Panel>
  );
}

/* ============================================================
   OWNER TOOLS — member management, backup, and work order
   deletion. Only reachable/visible when role === "Owner".
============================================================ */
function MemberManagementInline({ currentUser }) {
  const dialog = useDialog();
  const [users, setUsers] = useState(null);
  const [form, setForm] = useState({ username: "", password: "", role: "Household Member" });
  const [error, setError] = useState("");

  const load = () => api.listUsers().then(setUsers).catch(() => setUsers([]));
  useEffect(() => { load(); }, []); // eslint-disable-line

  const add = async () => {
    setError("");
    if (!form.username.trim() || !form.password) { setError("Username and password are required."); return; }
    try {
      await api.addUser(form.username.trim(), form.password, form.role);
      setForm({ username: "", password: "", role: "Household Member" });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (u) => {
    const ok = await dialog.confirm(`Remove ${u.username}'s account? They will no longer be able to sign in.`);
    if (!ok) return;
    await api.removeUser(u.id);
    load();
  };

  return (
    <Panel style={{ padding: 18 }}>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 15, fontWeight: 600, color: C.ink, marginBottom: 10 }}>Household members</div>
      {users === null && <Empty text="Loading…" />}
      {users && users.map((u) => (
        <div key={u.id} className="hk-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 4px", borderTop: `1px solid ${C.lineSoft}` }}>
          <div>
            <span style={{ fontFamily: FONT_BODY, fontSize: 13.5, fontWeight: 600, color: C.ink }}>{u.username}</span>
            {u.id === currentUser.id && <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: C.inkFaint }}> (you)</span>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Tag text={u.role} color={u.role === "Owner" ? C.navy : C.olive} soft={u.role === "Owner" ? C.navySoft : C.oliveSoft} />
            {u.id !== currentUser.id && (
              <button onClick={() => remove(u)} style={{ background: "none", border: "none", cursor: "pointer", color: C.rust }}><Trash2 size={14} /></button>
            )}
          </div>
        </div>
      ))}
      <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, color: C.ink, margin: "16px 0 8px" }}>Add a member</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <Field label="Username"><input style={inputStyle} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></Field>
        <Field label="Password"><input type="password" style={inputStyle} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
        <Field label="Role">
          <select style={inputStyle} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="Household Member">Household Member</option>
            <option value="Owner">Owner</option>
          </select>
        </Field>
      </div>
      {error && <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.rust, marginBottom: 10 }}>{error}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Btn variant="primary" onClick={add}><UserPlus size={14} /> Add member</Btn>
      </div>
    </Panel>
  );
}

function DeleteWorkOrderTool({ data, update }) {
  const dialog = useDialog();
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return data.workOrders
      .filter((w) => {
        const num = formatWoNum(w.number || 0).toLowerCase();
        const plainNum = String(w.number || "").toLowerCase();
        return num.includes(q) || plainNum.includes(q) || w.title.toLowerCase().includes(q);
      })
      .slice(0, 20);
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
      <div style={{ fontFamily: FONT_HEAD, fontSize: 15, fontWeight: 600, color: C.ink, marginBottom: 4 }}>Delete a work order</div>
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

function OwnerToolsView({ data, update, currentUser }) {
  return (
    <div>
      <SectionHeader title="Owner Tools" subtitle="Household member management, backups, and administrative actions." />
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <MemberManagementInline currentUser={currentUser} />
        <BackupTools data={data} update={update} />
        <DeleteWorkOrderTool data={data} update={update} />
      </div>
    </div>
  );
}

/* ============================================================
   AUTH — first-run setup (creates the Owner account) and login.
============================================================ */
function AuthScreen({ onAuthed }) {
  const [mode, setMode] = useState(null); // 'setup' | 'login'
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.setupStatus().then((r) => setMode(r.needsSetup ? "setup" : "login")).catch(() => setMode("login"));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user = mode === "setup" ? await api.setup(username, password) : await api.login(username, password);
      onAuthed(user);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  if (!mode) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg }}>
        <Loader2 className="animate-spin" size={20} color={C.inkSoft} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_BODY, padding: 16 }}>
      <GlobalStyle />
      <Panel style={{ padding: 30, width: 380, maxWidth: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div style={{ width: 28, height: 28, background: C.orange, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Wrench size={16} color="#fff" />
          </div>
          <span style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 19, color: C.ink }}>HomeKeep</span>
        </div>
        <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.inkFaint, marginBottom: 20 }}>
          {mode === "setup" ? "Create the first Owner account to set up your household." : "Sign in to your household."}
        </div>
        <form onSubmit={submit}>
          <Field label="Username">
            <input style={inputStyle} value={username} onChange={(e) => setUsername(e.target.value)} autoFocus required />
          </Field>
          <Field label="Password">
            <input
              type="password"
              style={inputStyle}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={mode === "setup" ? 6 : undefined}
            />
          </Field>
          {mode === "setup" && (
            <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint, marginTop: -6, marginBottom: 12 }}>
              At least 6 characters. You can add household member accounts later from Owner Tools.
            </div>
          )}
          {error && <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.rust, marginBottom: 12 }}>{error}</div>}
          <Btn type="submit" variant="primary" disabled={busy}>
            {busy ? "…" : mode === "setup" ? "Create account & continue" : "Sign in"}
          </Btn>
        </form>
      </Panel>
    </div>
  );
}

/* ============================================================
   APP SHELL
============================================================ */
export default function HomeKeepApp() {
  const [user, setUser] = useState(null); // null = not checked yet, false = not authed, object = authed
  const [data, setDataRaw] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [openOrderId, setOpenOrderId] = useState(null);
  const saveTimer = useRef(null);

  useEffect(() => {
    api.me().then(setUser).catch(() => setUser(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    api.getData().then(setDataRaw).catch(() => setDataRaw(null));
  }, [user]);

  const persist = (next) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      api.saveData(next).catch((e) => console.error("Save failed:", e));
    }, 250);
  };

  const update = (fn) => {
    setDataRaw((prev) => {
      const next = fn(structuredClone(prev));
      persist(next);
      return next;
    });
  };

  const logout = async () => {
    await api.logout().catch(() => {});
    setUser(false);
    setDataRaw(null);
  };

  if (user === null) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg }}>
        <Loader2 className="animate-spin" size={20} color={C.inkSoft} />
      </div>
    );
  }
  if (!user) {
    return <AuthScreen onAuthed={setUser} />;
  }
  if (!data) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, fontFamily: FONT_BODY, color: C.inkSoft }}>
        <GlobalStyle />
        <Loader2 className="animate-spin" size={18} style={{ marginRight: 8 }} /> Loading HomeKeep…
      </div>
    );
  }

  const role = user.role;
  const counts = {
    requests: data.workRequests.filter((w) => w.status === "Submitted" || w.status === "Under Review").length,
    orders: data.workOrders.filter((w) => w.status === "Open" || w.status === "In Progress").length,
  };

  const goToOrder = (id) => { setTab("orders"); setOpenOrderId(id); };

  const views = {
    dashboard: <Dashboard data={data} setTab={setTab} role={role} />,
    locations: <LocationsView data={data} update={update} role={role} />,
    assets: <AssetsView data={data} update={update} role={role} goToOrder={goToOrder} />,
    requests: <WorkRequestsView data={data} update={update} role={role} currentUser={user.username} goToOrder={goToOrder} />,
    orders: <WorkOrdersView data={data} update={update} role={role} openId={openOrderId} setOpenId={setOpenOrderId} />,
    schedule: <ScheduleView data={data} goToOrder={goToOrder} />,
    vendors: <VendorsView data={data} update={update} role={role} />,
    inventory: <InventoryView data={data} update={update} role={role} />,
    budget: <BudgetView data={data} />,
    owner: role === "Owner"
      ? <OwnerToolsView data={data} update={update} currentUser={user} />
      : <Dashboard data={data} setTab={setTab} role={role} />,
  };

  return (
    <DialogProvider>
      <div style={{ minHeight: "100vh", background: C.bg, fontFamily: FONT_BODY }}>
        <GlobalStyle />
        <Sidebar tab={tab} setTab={(t) => { setTab(t); setOpenOrderId(null); }} open={sidebarOpen} role={role} counts={counts} />
        <div style={{ marginLeft: sidebarOpen ? 216 : 0, transition: "margin .15s ease" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", borderBottom: `1px solid ${C.line}`, background: C.panel, position: "sticky", top: 0, zIndex: 20 }}>
            <button onClick={() => setSidebarOpen((o) => !o)} style={{ background: "none", border: "none", cursor: "pointer", color: C.ink }}>
              {sidebarOpen ? <ChevronLeft size={18} /> : <Menu size={18} />}
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ position: "relative" }}>
                <Bell size={17} color={C.inkSoft} />
                {counts.requests > 0 && (
                  <span style={{ position: "absolute", top: -5, right: -6, background: C.orange, color: "#fff", fontSize: 9.5, fontWeight: 700, borderRadius: 8, padding: "1px 4px" }}>
                    {counts.requests}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, fontWeight: 700, color: C.ink, lineHeight: 1.2 }}>{user.username}</div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 10.5, color: C.inkFaint, lineHeight: 1.2 }}>{role}</div>
                </div>
                <button onClick={logout} title="Log out" style={{ background: "none", border: `1px solid ${C.line}`, borderRadius: 3, cursor: "pointer", color: C.inkSoft, padding: 6 }}>
                  <LogOut size={14} />
                </button>
              </div>
            </div>
          </div>
          <div style={{ padding: 24, maxWidth: 1280 }}>{views[tab]}</div>
        </div>
      </div>
    </DialogProvider>
  );
}
