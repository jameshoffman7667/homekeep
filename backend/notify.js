// Daily email digest: overdue work orders, warranties expiring soon, and
// work requests that have sat unreviewed too long. Entirely opt-in — with
// no SMTP_HOST set, this module does nothing but log once at startup.
// See .env.example for the SMTP_* variables and README.md for setup.
const db = require("./db");
const settings = require("./settings");
const brandName = () => settings.current().brand.name;

const SMTP_HOST = process.env.SMTP_HOST || "";
const SWEEP_INTERVAL_MS = 24 * 60 * 60 * 1000; // once a day
const FIRST_RUN_DELAY_MS = 30 * 1000; // let the server finish starting up first
const WARRANTY_WINDOW_DAYS = Number(process.env.NOTIFY_WARRANTY_WINDOW_DAYS) || 30;
const UNREVIEWED_WINDOW_DAYS = Number(process.env.NOTIFY_UNREVIEWED_WINDOW_DAYS) || 3;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function daysBetween(aISO, bISO) {
  return Math.round((new Date(bISO + "T00:00:00") - new Date(aISO + "T00:00:00")) / 86400000);
}

function getAppData() {
  const row = db.prepare("SELECT data FROM app_data WHERE id = 1").get();
  return row ? JSON.parse(row.data) : null;
}

function getNotifiableUsers() {
  return db
    .prepare(
      "SELECT id, username, role, designations, email, notify_pm_overdue, notify_warranty_expiring, notify_work_request_unreviewed, notify_alarms, notify_low_stock, notify_my_schedule, notify_team_schedule FROM users WHERE email IS NOT NULL AND email != ''"
    )
    .all();
}

// Builds the per-user digest sections. Returns null if there's nothing
// this user has opted into and has something to report right now.
// v2.6: which digest options a member may receive. Owners and Managers get
// everything; Executors by designation; Guests none. "My schedule" needs
// the person to be an executor (Executor role, or Owner/Manager flagged Executor).
function designationsOf(user) {
  try { const a = JSON.parse(user.designations || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; }
}
function allowedDigests(user) {
  const d = designationsOf(user);
  const admin = user.role === "Owner" || user.role === "Manager";
  const ex = user.role === "Executor";
  const can = (des) => admin || (ex && d.includes(des));
  return {
    overdue: can("scheduler"), unreviewed: can("planner"), warranty: can("specialist"), alarms: can("specialist"),
    lowStock: can("planner"), teamSchedule: can("scheduler"),
    mySchedule: ex || (admin && d.includes("executor")),
  };
}
function addDays(iso, n) {
  const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10);
}
function buildDigest(data, user, today) {
  const lines = [];
  const allow = allowedDigests(user);
  const openWo = (w) => w.type !== "PM Base" && (w.status === "Active" || w.status === "Scheduled");

  if (user.notify_pm_overdue && allow.overdue) {
    const overdue = data.workOrders.filter(
      (w) =>
        w.type !== "PM Base" &&
        (w.status === "Active" || w.status === "Scheduled") &&
        (w.scheduledDate || w.requiredByDate) &&
        (w.scheduledDate || w.requiredByDate) < today
    );
    if (overdue.length) {
      lines.push(`Overdue work orders (${overdue.length}):`);
      overdue.forEach((w) => {
        lines.push(`  - #${w.number} ${w.title} — was due ${w.scheduledDate || w.requiredByDate}`);
      });
    }
  }

  if (user.notify_warranty_expiring && allow.warranty) {
    const soon = (data.assets || []).filter((a) => {
      if (!a.warrantyEnd) return false;
      const d = daysBetween(today, a.warrantyEnd);
      return d >= 0 && d <= WARRANTY_WINDOW_DAYS;
    });
    if (soon.length) {
      lines.push(`Warranties expiring within ${WARRANTY_WINDOW_DAYS} days (${soon.length}):`);
      soon.forEach((a) => {
        lines.push(`  - ${a.name} — expires ${a.warrantyEnd}`);
      });
    }
  }

  if (user.notify_work_request_unreviewed && allow.unreviewed) {
    const stale = (data.workRequests || []).filter((r) => {
      if (r.status !== "Submitted" && r.status !== "Under Review") return false;
      if (!r.dateSubmitted) return false;
      return daysBetween(r.dateSubmitted, today) >= UNREVIEWED_WINDOW_DAYS;
    });
    if (stale.length) {
      lines.push(`Work requests unreviewed for ${UNREVIEWED_WINDOW_DAYS}+ days (${stale.length}):`);
      stale.forEach((r) => {
        lines.push(`  - #${r.number} ${r.title} — submitted ${r.dateSubmitted}`);
      });
    }
  }

  if (user.notify_alarms && allow.alarms) {
    let open = [];
    try { open = db.prepare("SELECT message, severity, triggered_at FROM alarms WHERE status = 'open' ORDER BY triggered_at DESC").all(); } catch (e) { /* none */ }
    if (open.length) {
      lines.push(`Open alarms (${open.length}):`);
      open.forEach((a) => lines.push(`  - [${a.severity}] ${a.message} — ${String(a.triggered_at || "").slice(0, 10)}`));
    }
  }

  if (user.notify_low_stock && allow.lowStock) {
    const need = {}; // partId -> { total, wos: [] }
    data.workOrders.filter(openWo).forEach((w) => (w.parts || []).forEach(({ partId, qty }) => {
      const n = need[partId] || (need[partId] = { total: 0, wos: [] });
      n.total += Number(qty) || 0; n.wos.push(`#${w.number} ${w.title}`);
    }));
    const low = (data.inventory || []).map((p) => {
      const n = need[p.id];
      const atReorder = Number(p.qty) <= Number(p.reorderAt || 0);
      const short = n && Number(p.qty) < n.total;
      return atReorder || short ? { p, n, atReorder, short } : null;
    }).filter(Boolean);
    if (low.length) {
      lines.push(`Low stock parts (${low.length}):`);
      low.forEach(({ p, n, atReorder, short }) => {
        const why = [atReorder ? `at/below reorder level ${p.reorderAt}` : "", short ? `below the ${n.total} needed by open work orders` : ""].filter(Boolean).join("; ");
        lines.push(`  - ${p.name} — ${p.qty} on hand (${why})`);
        if (n) lines.push(`      needed by: ${n.wos.join(", ")}`);
      });
    }
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const nameOf = (id) => { const r = db.prepare("SELECT username FROM users WHERE id = ?").get(id); return r ? r.username : id; };
  const schedFor = (execId) => {
    const out = [];
    const shifts = (data.workShifts || []).filter((s) => s.executorId === execId && weekDays.includes(s.date));
    shifts.sort((a, b) => a.date.localeCompare(b.date));
    shifts.forEach((s) => out.push(`  - ${s.date}: shift ${s.start}–${s.end}`));
    data.workOrders.filter((w) => openWo(w) && (w.executorIds || []).includes(execId) && w.scheduledDate && weekDays.includes(w.scheduledDate))
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
      .forEach((w) => out.push(`  - ${w.scheduledDate}: #${w.number} ${w.title}`));
    return out;
  };
  if (user.notify_my_schedule && allow.mySchedule) {
    const mine = schedFor(user.id);
    if (mine.length) { lines.push("Your schedule for the next 7 days:"); lines.push(...mine); }
  }
  if (user.notify_team_schedule && allow.teamSchedule) {
    const ids = new Set();
    (data.workShifts || []).forEach((s) => weekDays.includes(s.date) && ids.add(s.executorId));
    data.workOrders.filter(openWo).forEach((w) => w.scheduledDate && weekDays.includes(w.scheduledDate) && (w.executorIds || []).forEach((i) => ids.add(i)));
    const rows = [];
    ids.forEach((id) => { const r = schedFor(id); if (r.length) { rows.push(`${nameOf(id)}:`); rows.push(...r); } });
    if (rows.length) { lines.push("Team schedule for the next 7 days:"); lines.push(...rows); }
  }

  return lines.length ? lines.join("\n") : null;
}

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  const nodemailer = require("nodemailer");
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return transporter;
}

async function runNotificationSweep() {
  if (!SMTP_HOST) return; // not configured — silently skip
  try {
    const data = getAppData();
    if (!data) return;
    const today = todayISO();
    const users = getNotifiableUsers();
    const t = getTransporter();
    const from = process.env.SMTP_FROM || `${brandName()} <maintenhance@${SMTP_HOST}>`;

    for (const user of users) {
      const body = buildDigest(data, user, today);
      if (!body) continue;
      try {
        await t.sendMail({
          from,
          to: user.email,
          subject: `${brandName()} — items that need attention`,
          text: `Hi ${user.username},\n\n${body}\n\n— ${brandName()}`,
        });
        console.log(`[maintenhance] Sent notification digest to ${user.email}`);
      } catch (e) {
        console.error(`[maintenhance] Failed to send digest to ${user.email}:`, e.message);
      }
    }
  } catch (e) {
    console.error("[maintenhance] Notification sweep failed:", e.message);
  }
}

function startNotificationScheduler() {
  if (!SMTP_HOST) {
    console.log("[maintenhance] SMTP_HOST not set — email notifications are disabled. See .env.example to enable them.");
    return;
  }
  console.log(`[maintenhance] Email notifications enabled via ${SMTP_HOST}; running a daily digest sweep.`);
  setTimeout(runNotificationSweep, FIRST_RUN_DELAY_MS);
  setInterval(runNotificationSweep, SWEEP_INTERVAL_MS);
}

// v2.2: used by the emailed password-reset link.
function mailEnabled() { return !!SMTP_HOST; }
async function sendMail({ to, subject, text }) {
  if (!SMTP_HOST) throw new Error("SMTP is not configured");
  const from = process.env.SMTP_FROM || `${brandName()} <maintenhance@${SMTP_HOST}>`;
  await getTransporter().sendMail({ from, to, subject, text });
}

module.exports = { startNotificationScheduler, runNotificationSweep, buildDigest, mailEnabled, sendMail };
