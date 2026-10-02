// Vite injects BASE_URL from the `base` config value at build time (always
// ends with a trailing slash — "/" for a normal root deploy, "/maintenhance/"
// for a subpath deploy). Every API path below is written as "/api/..." for
// readability and rewritten to sit under that base here, in one place.
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
    throw err;
  }
  return body;
}

export const api = {
  setupStatus: () => request("/api/auth/setup-status"),
  setup: (username, password) =>
    request("/api/auth/setup", { method: "POST", body: JSON.stringify({ username, password }) }),
  login: (username, password) =>
    request("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  logout: () => request("/api/auth/logout", { method: "POST" }),
  me: () => request("/api/auth/me"),

  listUsers: () => request("/api/users"),
  addUser: (username, password, role, email) =>
    request("/api/users", { method: "POST", body: JSON.stringify({ username, password, role, email }) }),
  updateUser: (id, patch) => request(`/api/users/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  removeUser: (id) => request(`/api/users/${id}`, { method: "DELETE" }),

  // v2.1: public edition config (brand, colours, terminology, features).
  getConfig: () => request("/api/config"),
  // Logo/asset URLs from the config: "/branding/logo.png" needs the app's
  // base path prepended on a subpath deploy; absolute URLs pass through.
  brandUrl: (u) => (/^(https?:)?\/\//.test(u) ? u : withBase(u)),

  getData: () => request("/api/data"),
  saveData: (data) => request("/api/data", { method: "PUT", body: JSON.stringify(data) }),

  // Attachments (v1.6). Upload is multipart — deliberately not run through
  // request() above, since that helper always sets a JSON Content-Type and
  // JSON.stringify's the body; a FormData body needs the browser to set
  // its own multipart boundary header instead.
  uploadAttachment: async (file) => {
    const fd = new FormData();
    fd.append("file", file);
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
