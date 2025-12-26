const API = import.meta.env.VITE_API_URL || "";

export function fileUrl(p) {
  if (!p) return "";
  if (p.startsWith("http")) return p;
  return `${API}${p}`;
}
