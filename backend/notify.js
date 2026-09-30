// Daily email digest: overdue work orders, warranties expiring soon, and
// work requests that have sat unreviewed too long. Entirely opt-in — with
// no SMTP_HOST set, this module does nothing but log once at startup.
// See .env.example for the SMTP_* variables and README.md for setup.
const db = require("./db");

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
      "SELECT username, email, notify_pm_overdue, notify_warranty_expiring, notify_work_request_unreviewed FROM users WHERE email IS NOT NULL AND email != ''"
    )
    .all();
}

// Builds the per-user digest sections. Returns null if there's nothing
// this user has opted into and has something to report right now.
function buildDigest(data, user, today) {
  const lines = [];

  if (user.notify_pm_overdue) {
    const overdue = data.workOrders.filter(
      (w) =>
        w.type !== "PM Base" &&
        (w.status === "Open" || w.status === "In Progress") &&
        w.scheduledDate &&
        w.scheduledDate < today
    );
    if (overdue.length) {
      lines.push(`Overdue work orders (${overdue.length}):`);
      overdue.forEach((w) => {
        lines.push(`  - #${w.number} ${w.title} — was scheduled ${w.scheduledDate}`);
      });
    }
  }

  if (user.notify_warranty_expiring) {
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

  if (user.notify_work_request_unreviewed) {
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
    const from = process.env.SMTP_FROM || `MaintEnhance <maintenhance@${SMTP_HOST}>`;

    for (const user of users) {
      const body = buildDigest(data, user, today);
      if (!body) continue;
      try {
        await t.sendMail({
          from,
          to: user.email,
          subject: "MaintEnhance — items that need attention",
          text: `Hi ${user.username},\n\n${body}\n\n— MaintEnhance`,
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

module.exports = { startNotificationScheduler, runNotificationSweep, buildDigest };
