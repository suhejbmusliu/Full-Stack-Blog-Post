const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    credentials: "include",
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data?.error || "Request failed";
    const err = new Error(msg);
    err.code = data?.error || "ERROR";
    err.status = res.status;
    throw err;
  }

  return data;
}

export const authApi = {
  async login({ email, password, twoFactorCode }) {
    return request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, twoFactorCode }),
    });
  },

  async me(accessToken) {
    return request("/api/auth/me", {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },

  async refresh() {
    return request("/api/auth/refresh", { method: "POST" });
  },

  async logout() {
    return request("/api/auth/logout", { method: "POST" });
  },

  async forgotPassword(email) {
    return request("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword({ email, token, newPassword }) {
    return request("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ email, token, newPassword }),
    });
  },

  async twoFaSetup(accessToken) {
    return request("/api/auth/2fa/setup", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },

  async twoFaEnable(accessToken, code) {
    return request("/api/auth/2fa/enable", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ code }),
    });
  },

  async twoFaDisable(accessToken, code) {
    return request("/api/auth/2fa/disable", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ code }),
    });
  },

  /* =======================================================
     ✅ NEW — LOST 2FA (RECOVERY FLOW)
     ======================================================= */

  async requestTwoFaReset(email) {
    return request("/api/auth/2fa-reset/request", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  async confirmTwoFaReset({ email, token }) {
    return request("/api/auth/2fa-reset/confirm", {
      method: "POST",
      body: JSON.stringify({ email, token }),
    });
  },
};
