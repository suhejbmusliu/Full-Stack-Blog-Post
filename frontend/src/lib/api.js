const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

export async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    credentials: "include", // ✅ important for cookie auth
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.error || "Request failed");
  }

  return data;
}
