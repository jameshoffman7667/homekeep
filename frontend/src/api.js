// Vite injects BASE_URL from the `base` config value at build time (always
// ends with a trailing slash — "/" for a normal root deploy, "/maintenhance/"
// for a subpath deploy). Every API path below is written as "/api/..." for
// readability and rewritten to sit under that base here, in one place.
import { shrinkImage } from "./imageShrink.js";

const BASE_URL = import.meta.env.BASE_URL;
function withBase(path) {
  return BASE_URL + path.replace(/^\//, "");
}

async function request(path, options) {
  const res = await fetch(withBase(path), {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  let body = null;
  try {
    body = await res.json();
  } catch (e) {
    body = null;
  }
  if (!res.ok) {
    const err = new Error((body && body.error) || `Request failed (${res.status})`);
    err.status = res.status;
    err.code = body && body.code;
    err.errors = body && body.errors;
    // v2.2: an Owner-reset account is locked out of everything but the
    // change-password screen until the password is replaced.
    if (res.status === 403 && err.code === "PASSWORD_CHANGE_REQUIRED" && typeof window !== "undefined") {
      window.dispatchEvent(new Event("me-password-change-required"));
    }
    throw err;
  }
  return body;
}

// POST/PUT a raw binary body and read a JSON reply (backup upload).
async function rawJson(method, path, body) {
  const res = await fetch(withBase(path), { method, credentials: "include", headers: { "Content-Type": "application/octet-stream" }, body });
  let out = null;
  try { out = await res.json(); } catch (e) { out = null; }
  if (!res.ok) {
    const err = new Error((out && out.error) || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return out;
}

export const api = {
  setupStatus: () => request("/api/auth/setup-status"),
  setup: (username, password) =>
    request("/api/auth/setup", { method: "POST", body: JSON.stringify({ username, password }) }),
  login: (username, password) =>
    request("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  logout: () => request("/api/auth/logout", { method: "POST" }),
  me: () => request("/api/auth/me"),
  // v2.2: password change / reset
  changePassword: (currentPassword, newPassword) =>
    request("/api/auth/change-password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) }),
  updateProfile: (patch) => request("/api/auth/profile", { method: "PATCH", body: JSON.stringify(typeof patch === "string" ? { email: patch } : patch) }),
  emailCredentials: (id, password) => request(`/api/users/${id}/email-credentials`, { method: "POST", body: JSON.stringify({ password }) }),
  forgotPassword: (identifier) => request("/api/auth/forgot", { method: "POST", body: JSON.stringify({ identifier }) }),
  resetPassword: (token, newPassword) => request("/api/auth/reset", { method: "POST", body: JSON.stringify({ token, newPassword }) }),
  ownerResetPassword: (id, password) =>
    request(`/api/users/${id}/reset-password`, { method: "POST", body: JSON.stringify({ password: password || "" }) }),

  listUsers: () => request("/api/users"),
  addUser: (username, password, role, email) =>
    request("/api/users", { method: "POST", body: JSON.stringify({ username, password, role, email }) }),
  updateUser: (id, patch) => request(`/api/users/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  removeUser: (id) => request(`/api/users/${id}`, { method: "DELETE" }),

  // Public config: Owner-managed brand, colours, terminology, features.
  getConfig: () => request("/api/config"),
  // Owner-only settings edits (Owner Tools → Branding & Terminology / Features).
  saveSettings: (settings) => request("/api/settings", { method: "PUT", body: JSON.stringify(settings) }),
  prefillFromLink: (url, kind) => request("/api/prefill", { method: "POST", body: JSON.stringify({ url, kind }) }),
  resetSettings: () => request("/api/settings/reset", { method: "POST" }),
  uploadLogo: (dataUrl) => request("/api/settings/logo", { method: "PUT", body: JSON.stringify({ dataUrl }) }),
  removeLogo: () => request("/api/settings/logo", { method: "DELETE" }),
  // Logo URLs from the config ("/api/logo?v=…") need the app's base path
  // prepended on a subpath deploy; absolute URLs pass through.
  brandUrl: (u) => (/^(https?:)?\/\//.test(u) ? u : withBase(u)),

  // Backup & restore (Owner only)
  getServerBackupData: (credentials) => request(`/api/backup/server-data${credentials ? "?credentials=1" : ""}`),
  importServerData: (tabs) => request("/api/backup/server-import", { method: "POST", body: JSON.stringify({ tabs }) }),
  buildFullBackup: async (workbookBytes) => {
    const res = await fetch(withBase("/api/backup/full"), { method: "POST", credentials: "include", headers: { "Content-Type": "application/octet-stream" }, body: workbookBytes });
    if (!res.ok) {
      let msg = `Backup failed (${res.status})`;
      try { msg = (await res.json()).error || msg; } catch (e) { /* keep default */ }
      throw new Error(msg);
    }
    return res.blob();
  },
  stageFullBackup: (file) => rawJson("POST", "/api/backup/stage", file),
  applyStagedAttachments: (stageId) => request(`/api/backup/stage/${stageId}/apply-attachments`, { method: "POST" }),
  discardStagedBackup: (stageId) => request(`/api/backup/stage/${stageId}`, { method: "DELETE" }),
  listSnapshots: () => request("/api/backup/snapshots"),
  runSnapshot: () => request("/api/backup/snapshots/run", { method: "POST" }),
  snapshotUrl: (name) => withBase(`/api/backup/snapshots/${encodeURIComponent(name)}`),
  listAttachments: () => request("/api/attachments"),
  replaceAttachment: async (id, file) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(withBase(`/api/attachments/${id}/file`), { method: "PUT", credentials: "include", body: fd });
    let body = null;
    try { body = await res.json(); } catch (e) { body = null; }
    if (!res.ok) throw new Error((body && body.error) || `Upload failed (${res.status})`);
    return body;
  },

  getData: () => request("/api/data"),
  saveData: (data) => request("/api/data", { method: "PUT", body: JSON.stringify(data) }),

  // Attachments (v1.6). Upload is multipart — deliberately not run through
  // request() above, since that helper always sets a JSON Content-Type and
  // JSON.stringify's the body; a FormData body needs the browser to set
  // its own multipart boundary header instead.
  uploadAttachment: async (file) => {
    const fd = new FormData();
    fd.append("file", await shrinkImage(file));
    const res = await fetch(withBase("/api/attachments"), { method: "POST", credentials: "include", body: fd });
    let body = null;
    try { body = await res.json(); } catch (e) { body = null; }
    if (!res.ok) {
      const err = new Error((body && body.error) || `Upload failed (${res.status})`);
      err.status = res.status;
      throw err;
    }
    return body;
  },
  attachmentUrl: (id) => withBase(`/api/attachments/${id}/file`),
  deleteAttachment: (id) => request(`/api/attachments/${id}`, { method: "DELETE" }),

  // Home Assistant sensor alarms (v1.7), plus manual/internal creation (v1.8).
  listAlarms: (status) => request(`/api/alarms${status ? `?status=${encodeURIComponent(status)}` : ""}`),
  updateAlarm: (id, patch) => request(`/api/alarms/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  createManualAlarm: (payload) => request("/api/alarms/manual", { method: "POST", body: JSON.stringify(payload) }),
  listAlarmMappings: () => request("/api/alarm-mappings"),
  saveAlarmMapping: (entityId, patch) => request("/api/alarm-mappings", { method: "POST", body: JSON.stringify({ entityId, ...patch }) }),
  deleteAlarmMapping: (entityId) => request(`/api/alarm-mappings/${encodeURIComponent(entityId)}`, { method: "DELETE" }),
  getWebhookKey: () => request("/api/alarms/webhook-key"),
  regenerateWebhookKey: () => request("/api/alarms/webhook-key/regenerate", { method: "POST" }),
  // Absolute (not just base-relative) — this is copied into a Home
  // Assistant config running on a different device on the network, so a
  // path alone ("/api/alarms") wouldn't be reachable from there.
  webhookUrl: () => (typeof window !== "undefined" ? window.location.origin : "") + withBase("/api/alarms"),
};
