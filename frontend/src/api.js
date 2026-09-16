async function request(path, options) {
  const res = await fetch(path, {
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
  addUser: (username, password, role) =>
    request("/api/users", { method: "POST", body: JSON.stringify({ username, password, role }) }),
  removeUser: (id) => request(`/api/users/${id}`, { method: "DELETE" }),

  getData: () => request("/api/data"),
  saveData: (data) => request("/api/data", { method: "PUT", body: JSON.stringify(data) }),
};
