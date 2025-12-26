const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const yearsApi = {
  async list() {
    const res = await fetch(`${API}/api/years`);
    const data = await res.json();
    if (!res.ok || !data?.ok) throw new Error(data?.error || "Failed to load years");
    return data;
  },

  async ensure(token, year) {
    const res = await fetch(`${API}/api/years`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ year }),
    });

    const data = await res.json();
    if (!res.ok || !data?.ok) throw new Error(data?.error || "Failed to create year");
    return data;
  },

  async remove(token, year) {
    const res = await fetch(`${API}/api/years/${year}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();
    if (!res.ok || !data?.ok) throw new Error(data?.error || "Failed to delete year");
    return data;
  },
};
