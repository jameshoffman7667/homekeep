import React, { useState, useEffect, useRef, useContext, createContext } from "react";
import {
  LayoutDashboard, MapPin, Wrench, ClipboardList, Package,
  Users, DollarSign, Plus, ChevronRight, ChevronDown, X,
  Check, AlertTriangle, Bell, Menu, Trash2, Pencil, ArrowRight,
  Layers, Search, Boxes, ChevronLeft, Loader2, LogOut, UserPlus, Shield,
} from "lucide-react";
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
   NOTE: sample/seed data now lives on the backend (backend/seed.js)
   and is written to the database the first time an Owner completes
   setup. The frontend no longer needs its own copy.
============================================================ */

/* ============================================================
   HELPERS
============================================================ */
const LOCATION_LEVELS = ["Property", "Structure", "Floor", "Room", "Zone", "Sub-area"];
const BOM_LEVELS = ["Component", "Sub-component", "Part"];
const WO_TYPES = ["PM", "Benchmark", "Corrective", "Unplanned"];
const WO_STATUSES = ["Open", "In Progress", "Completed", "Verified"];
const PRIORITIES = ["Urgent", "Soon", "When convenient"];
const WR_STATUS_COLORS = {
  Submitted: C.navy, "Under Review": C.gold, Approved: C.olive,
  Declined: C.inkFaint, Merged: C.inkFaint,
};
const WO_TYPE_COLORS = { PM: C.navy, Benchmark: C.gold, Corrective: C.orange, Unplanned: C.rust };
const WO_STATUS_COLORS = { Open: C.orange, "In Progress": C.gold, Completed: C.olive, Verified: C.navy };

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
   DIALOG SYSTEM — the artifact sandbox blocks native
   confirm()/alert()/prompt(), so these in-app equivalents
   replace them everywhere in the app.
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

  const api = {
    confirm: (message) => open("confirm", message),
    alertMsg: (message) => open("alert", message),
    promptMsg: (message, def) => open("prompt", message, def),
  };

  return (
    <DialogContext.Provider value={api}>
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
   NAV
============================================================ */
const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "locations", label: "Locations", icon: MapPin },
  { id: "assets", label: "Assets & BOM", icon: Boxes },
  { id: "requests", label: "Work Requests", icon: ClipboardList },
  { id: "orders", label: "Work Orders", icon: Wrench },
  { id: "vendors", label: "Vendors", icon: Users },
  { id: "inventory", label: "Inventory", icon: Package },
  { id: "budget", label: "Budget", icon: DollarSign },
];

function Sidebar({ tab, setTab, open, setOpen, counts }) {
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
        {NAV.map((n) => {
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
        v1.3 · matches the HomeKeep functional spec
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
                <span style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, color: C.ink }}>{wr.title}</span>
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
  const [modal, setModal] = useState(null); // {parentId} or {edit: node}
  const [form, setForm] = useState({ name: "", level: "Room" });

  const openAdd = (parentId) => {
    setForm({ name: "", level: "Room" });
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
  const [selected, setSelected] = useState(data.assets[0]?.id || null);
  const [modal, setModal] = useState(null);
  const blank = { name: "", category: "", locationId: data.locations[0]?.id || "", manufacturer: "", model: "", serial: "", purchaseDate: "", warrantyEnd: "", notes: "" };
  const [form, setForm] = useState(blank);

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

  const relatedWO = data.workOrders.filter((w) => w.assetId === asset?.id);
  const relatedPM = data.pmTemplates.filter((p) => p.assetId === asset?.id);

  return (
    <div>
      <SectionHeader
        title="Assets & Bill of Materials"
        subtitle="Each asset can be broken down into components, sub-components, and parts."
        action={role === "Owner" && <Btn variant="primary" onClick={openAdd}><Plus size={15} /> Add asset</Btn>}
      />
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16 }}>
        <Panel style={{ padding: 6, alignSelf: "start" }}>
          {data.assets.map((a) => (
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
          {data.assets.length === 0 && <Empty text="No assets yet." />}
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
                      <div style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, color: C.ink }}>{w.title}</div>
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
  const blank = { title: "", description: "", assetId: null, bomNodeId: null, locationId: "", priority: "When convenient" };
  const [form, setForm] = useState(blank);
  const [reviewForm, setReviewForm] = useState({});

  const openNew = () => { setForm({ ...blank, locationId: data.locations[0]?.id || "" }); setModal("new"); };
  const submitRequest = async () => {
    if (!form.title.trim() || !form.locationId) { await dialog.alertMsg("Title and a location are required."); return; }
    update((d) => {
      d.workRequests.push({
        id: uid("wr"), ...form, title: form.title.trim(),
        requestedBy: currentUser, dateSubmitted: todayISO(),
        status: "Submitted", reviewNote: "", workOrderId: null,
      });
      return d;
    });
    setModal(null);
  };

  const openReview = (wr, action) => {
    setReviewForm({ type: "Corrective", scheduledDate: todayISO(), reason: "", mergeInto: "" });
    setModal({ action, wr });
  };

  const doConvert = () => {
    const wr = modal.wr;
    update((d) => {
      const woId = uid("wo");
      d.workOrders.push({
        id: woId, title: wr.title, type: reviewForm.type, status: "Open",
        assetId: wr.assetId, bomNodeId: wr.bomNodeId, locationId: wr.locationId,
        description: wr.description, sourceRequestId: wr.id, sourceBenchmarkId: null,
        scheduledDate: reviewForm.scheduledDate, completedDate: null, cost: "", vendorId: null, notes: "",
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

  const visible = role === "Owner" ? data.workRequests : data.workRequests.filter((w) => w.requestedBy === currentUser);
  const openWOOptions = data.workOrders.filter((w) => w.status !== "Completed" && w.status !== "Verified");

  return (
    <div>
      <SectionHeader
        title="Work Requests"
        subtitle="Anyone can flag an issue. Owners review and convert into a work order."
        action={<Btn variant="primary" onClick={openNew}><Plus size={15} /> Submit request</Btn>}
      />
      <Panel>
        {visible.length === 0 && <Empty text="No work requests yet." />}
        {visible.map((wr) => (
          <div key={wr.id} style={{ padding: "14px 18px", borderTop: `1px solid ${C.lineSoft}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, color: C.ink }}>{wr.title}</div>
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
            A request can never become an Unplanned work order — that type is always created directly.
          </div>
          <Field label="Scheduled date"><input type="date" style={inputStyle} value={reviewForm.scheduledDate} onChange={(e) => setReviewForm({ ...reviewForm, scheduledDate: e.target.value })} /></Field>
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
              {openWOOptions.map((w) => <option key={w.id} value={w.id}>{w.title} ({w.type})</option>)}
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
function WorkOrdersView({ data, update, role, openId, setOpenId }) {
  const dialog = useDialog();
  const [modal, setModal] = useState(null); // 'new'
  const blank = { title: "", type: "Unplanned", assetId: null, bomNodeId: null, locationId: data.locations[0]?.id || "", description: "", scheduledDate: todayISO(), vendorId: "", benchmarkId: "" };
  const [form, setForm] = useState(blank);
  const [detailEdits, setDetailEdits] = useState({});

  const openNew = () => { setForm(blank); setModal("new"); };
  const createWO = async () => {
    if (!form.title.trim() || !form.locationId) { await dialog.alertMsg("Title and location are required."); return; }
    update((d) => {
      const id = uid("wo");
      let checklist = "";
      if (form.type === "Benchmark" && form.benchmarkId) {
        const bm = d.benchmarks.find((b) => b.id === form.benchmarkId);
        checklist = bm ? bm.checklist : "";
      }
      d.workOrders.push({
        id, title: form.title.trim(), type: form.type, status: "Open",
        assetId: form.assetId, bomNodeId: form.bomNodeId, locationId: form.locationId,
        description: form.description, sourceRequestId: null,
        sourceBenchmarkId: form.type === "Benchmark" ? form.benchmarkId || null : null,
        scheduledDate: form.scheduledDate, completedDate: null,
        cost: "", vendorId: form.vendorId || null, notes: checklist ? "Checklist: " + checklist : "",
      });
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
      w.status = status;
      if (status === "Completed" && !w.completedDate) w.completedDate = todayISO();
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

  const columns = WO_STATUSES.map((status) => ({
    status,
    items: data.workOrders.filter((w) => w.status === status),
  }));

  return (
    <div>
      <SectionHeader
        title="Work Orders"
        subtitle="Created ad hoc for any type, or by converting an approved work request — except Unplanned, which is always ad hoc."
        action={<Btn variant="primary" onClick={openNew}><Plus size={15} /> New work order</Btn>}
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {columns.map((col) => (
          <div key={col.status}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: 8, background: WO_STATUS_COLORS[col.status] }} />
              <span style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, color: C.ink }}>{col.status}</span>
              <span style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint }}>({col.items.length})</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {col.items.map((w) => (
                <Panel key={w.id} style={{ padding: "10px 12px", cursor: "pointer" }}>
                  <div onClick={() => setOpenId(w.id)}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                      <span style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, color: C.ink }}>{w.title}</span>
                    </div>
                    <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint, marginTop: 3 }}>
                      {locationPath(data.locations, w.locationId)}
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <Tag text={w.type} color={WO_TYPE_COLORS[w.type]} soft={C.panelAlt} />
                    </div>
                  </div>
                </Panel>
              ))}
              {col.items.length === 0 && <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.inkFaint, padding: "6px 2px" }}>—</div>}
            </div>
          </div>
        ))}
      </div>

      {modal === "new" && (
        <Modal title="New work order" onClose={() => setModal(null)} wide>
          <Field label="Title"><input style={inputStyle} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus /></Field>
          <Field label="Type">
            <select style={inputStyle} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {WO_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          {form.type === "Benchmark" && (
            <Field label="Copy from benchmark (optional)">
              <select style={inputStyle} value={form.benchmarkId} onChange={(e) => setForm({ ...form, benchmarkId: e.target.value })}>
                <option value="">— start blank —</option>
                {data.benchmarks.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
              </select>
            </Field>
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
            <Field label="Scheduled date"><input type="date" style={inputStyle} value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} /></Field>
          </div>
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
        <Modal title={openWO.title} onClose={() => setOpenId(null)} wide>
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            <Tag text={openWO.type} color={WO_TYPE_COLORS[openWO.type]} soft={C.panelAlt} />
            <Tag text={openWO.status} color={WO_STATUS_COLORS[openWO.status]} soft={C.panelAlt} />
          </div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.inkFaint, marginBottom: 12 }}>
            {locationPath(data.locations, openWO.locationId)}
            {openWO.assetId && ` · ${nameOf(data.assets, openWO.assetId)}`}
            {openWO.bomNodeId && ` · ${nameOf(data.bomNodes, openWO.bomNodeId)}`}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Scheduled date"><input type="date" style={inputStyle} value={detailEdits.scheduledDate || ""} onChange={(e) => setDetailEdits({ ...detailEdits, scheduledDate: e.target.value })} /></Field>
            <Field label="Cost ($)"><input style={inputStyle} value={detailEdits.cost || ""} onChange={(e) => setDetailEdits({ ...detailEdits, cost: e.target.value })} /></Field>
          </div>
          <Field label="Vendor">
            <select style={inputStyle} value={detailEdits.vendorId || ""} onChange={(e) => setDetailEdits({ ...detailEdits, vendorId: e.target.value })}>
              <option value="">— none —</option>
              {data.vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </Field>
          <Field label="Notes / checklist"><textarea style={{ ...inputStyle, minHeight: 80 }} value={detailEdits.notes || ""} onChange={(e) => setDetailEdits({ ...detailEdits, notes: e.target.value })} /></Field>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, flexWrap: "wrap", gap: 8 }}>
            <div style={{ display: "flex", gap: 6 }}>
              {WO_STATUSES.map((s) => (
                <Btn key={s} small variant={openWO.status === s ? "primary" : "ghost"} onClick={() => setStatus(s)}>{s}</Btn>
              ))}
            </div>
            <Btn small onClick={saveDetail}>Save changes</Btn>
          </div>

          {openWO.type === "Benchmark" && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.lineSoft}`, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {openWO.sourceBenchmarkId ? (
                <Btn small variant="ghost" onClick={updateBenchmarkFromWO}>Update benchmark with this run</Btn>
              ) : (
                <Btn small variant="ghost" onClick={saveAsNewBenchmark}>Save as new benchmark</Btn>
              )}
            </div>
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
   AUTH — first-run setup (creates the Owner account) and login.
   Replaces the old demo role-switcher with real accounts.
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
              At least 6 characters. You can add household member accounts later.
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

function UserManagementModal({ onClose, currentUser }) {
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
    <Modal title="Household members" onClose={onClose} wide>
      <div style={{ marginBottom: 18 }}>
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
      </div>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 14, fontWeight: 600, color: C.ink, marginBottom: 8 }}>Add a member</div>
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
    </Modal>
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
  const [showUsers, setShowUsers] = useState(false);
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
    vendors: <VendorsView data={data} update={update} role={role} />,
    inventory: <InventoryView data={data} update={update} role={role} />,
    budget: <BudgetView data={data} />,
  };

  return (
    <DialogProvider>
      <div style={{ minHeight: "100vh", background: C.bg, fontFamily: FONT_BODY }}>
        <GlobalStyle />
        <Sidebar tab={tab} setTab={(t) => { setTab(t); setOpenOrderId(null); }} open={sidebarOpen} setOpen={setSidebarOpen} counts={counts} />
        <div style={{ marginLeft: sidebarOpen ? 216 : 0, transition: "margin .15s ease" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", borderBottom: `1px solid ${C.line}`, background: C.panel, position: "sticky", top: 0, zIndex: 20 }}>
            <button onClick={() => setSidebarOpen((o) => !o)} style={{ background: "none", border: "none", cursor: "pointer", color: C.ink }}>
              {sidebarOpen ? <ChevronLeft size={18} /> : <Menu size={18} />}
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {role === "Owner" && (
                <button onClick={() => setShowUsers(true)} title="Household members" style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: FONT_BODY, fontSize: 12, color: C.inkSoft, background: "none", border: "none", cursor: "pointer" }}>
                  <Shield size={14} /> Members
                </button>
              )}
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
          <div style={{ padding: 24, maxWidth: 1180 }}>{views[tab]}</div>
        </div>
        {showUsers && <UserManagementModal onClose={() => setShowUsers(false)} currentUser={user} />}
      </div>
    </DialogProvider>
  );
}
