import { apiFetch } from "./http";

export const postsApi = {
  // public list/search (your backend route is public)
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/api/posts${qs ? `?${qs}` : ""}`);
  },

  // ✅ NEW: load categories for dropdown
  getCategories: () => {
    return apiFetch("/api/posts/categories/all");
  },

  // admin create (needs token)
  create: (token, formData) => {
    return apiFetch("/api/posts", {
      method: "POST",
      token,
      body: formData,
      isForm: true,
    });
  },

  // admin update (needs token)
  update: (token, id, formData) => {
    return apiFetch(`/api/posts/${id}`, {
      method: "PUT",
      token,
      body: formData,
      isForm: true,
    });
  },

  // admin delete (needs token)
  remove: (token, id) => {
    return apiFetch(`/api/posts/${id}`, { method: "DELETE", token });
  },
};
