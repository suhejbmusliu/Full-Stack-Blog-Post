import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { postsApi } from "../../api/postsApi";
import "./../../styles/admintheme/adminPosts.css";

const fade = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

function StatusBadge({ status }) {
  const nice =
    status === "PUBLISHED"
      ? "Published"
      : status === "DRAFT"
      ? "Draft"
      : "Archived";

  const cls =
    status === "PUBLISHED"
      ? "ap-badge ap-badge--good"
      : "ap-badge ap-badge--warn";

  return <span className={cls}>{nice}</span>;
}

function Modal({ title, onClose, children, footer }) {
  return (
    <div className="ap-modalOverlay" onMouseDown={onClose}>
      <motion.div
        className="ap-modal"
        onMouseDown={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: 0.18 }}
      >
        <div className="ap-modal__head">
          <h3>{title}</h3>
          <button className="ap-iconBtn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="ap-modal__body">{children}</div>

        {footer ? <div className="ap-modal__footer">{footer}</div> : null}
      </motion.div>
    </div>
  );
}

function firstCategory(p) {
  const c = p?.categories?.[0]?.category?.name;
  return c || "Other";
}

export default function AdminPosts() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const [editOpen, setEditOpen] = useState(false);
  const [editPost, setEditPost] = useState(null);

  const [delOpen, setDelOpen] = useState(false);
  const [delPost, setDelPost] = useState(null);

  const token = localStorage.getItem("accessToken");

  async function loadPosts(query = "") {
    setLoading(true);
    try {
      const res = await postsApi.list({
        q: query,
        page: 1,
        limit: 50,
        sort: "newest",
      });
      setPosts(res.items || []);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPosts("");
  }, []);

  // live search (simple)
  useEffect(() => {
    const t = setTimeout(() => {
      loadPosts(q);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const filtered = useMemo(() => posts, [posts]);

  const openEdit = (p) => {
    setEditPost({
      id: p.id,
      title: p.title || "",
      excerpt: p.excerpt || "",
      status: p.status || "DRAFT",
      category: firstCategory(p),
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    try {
      if (!token) return alert("No token. Login again.");
      if (!editPost?.title?.trim()) return;

      const fd = new FormData();
      fd.append("title", editPost.title);
      fd.append("excerpt", editPost.excerpt || "");
      fd.append("status", editPost.status);

      // categories is accepted as comma string in backend
      if (editPost.category) fd.append("categories", editPost.category);

      const res = await postsApi.update(token, editPost.id, fd);

      setPosts((prev) =>
        prev.map((p) => (p.id === editPost.id ? res.post : p))
      );
      setEditOpen(false);
      setEditPost(null);
    } catch (e) {
      alert(e.message || "Update failed");
    }
  };

  const openDelete = (p) => {
    setDelPost(p);
    setDelOpen(true);
  };

  const confirmDelete = async () => {
    try {
      if (!token) return alert("No token. Login again.");
      await postsApi.remove(token, delPost.id);
      setPosts((prev) => prev.filter((p) => p.id !== delPost.id));
      setDelOpen(false);
      setDelPost(null);
    } catch (e) {
      alert(e.message || "Delete failed");
    }
  };

  return (
    <div className="ap-wrap">
      <div className="ap-head">
        <div>
          <h1 className="ap-title">Posts</h1>
          <p className="ap-sub">Manage posts</p>
        </div>

        <button
          className="ap-btn ap-btn--primary"
          onClick={() => navigate("/admin/posts/new")}
        >
          + New Post
        </button>
      </div>

      <motion.section
        className="ap-card"
        variants={fade}
        initial="hidden"
        animate="show"
      >
        <h3 className="ap-cardTitle">Search</h3>
        <input
          className="ap-input"
          placeholder="Search by title..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </motion.section>

      <motion.section
        className="ap-card"
        variants={fade}
        initial="hidden"
        animate="show"
      >
        <div className="ap-cardTop">
          <h3 className="ap-cardTitle">All posts</h3>
          <span className="ap-count">
            {loading ? "Loading..." : `${filtered.length} items`}
          </span>
        </div>

        <div className="ap-tableWrap">
          <table className="ap-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Updated</th>
                <th className="ap-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="ap-titleCell">
                      <div className="ap-titleCell__title">{p.title}</div>
                      <div className="ap-titleCell__meta">
                        {firstCategory(p)} • {p.excerpt || ""}
                      </div>
                    </div>
                  </td>

                  <td>
                    <StatusBadge status={p.status} />
                  </td>

                  <td className="ap-mono">
                    {String(p.updatedAt).slice(0, 10)}
                  </td>

                  <td className="ap-right">
                    <button className="ap-action" onClick={() => openEdit(p)}>
                      Edit
                    </button>
                    <button
                      className="ap-action ap-action--danger"
                      onClick={() => openDelete(p)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}

              {!loading && !filtered.length ? (
                <tr>
                  <td colSpan={4} className="ap-empty">
                    No posts found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </motion.section>

      <AnimatePresence>
        {editOpen && editPost ? (
          <Modal
            title="Edit post"
            onClose={() => {
              setEditOpen(false);
              setEditPost(null);
            }}
            footer={
              <>
                <button
                  className="ap-btn"
                  onClick={() => {
                    setEditOpen(false);
                    setEditPost(null);
                  }}
                >
                  Cancel
                </button>
                <button className="ap-btn ap-btn--primary" onClick={saveEdit}>
                  Save
                </button>
              </>
            }
          >
            <div className="ap-form">
              <div className="ap-field">
                <label>Title</label>
                <input
                  className="ap-input"
                  value={editPost.title}
                  onChange={(e) =>
                    setEditPost((s) => ({ ...s, title: e.target.value }))
                  }
                />
              </div>

              <div className="ap-field">
                <label>Status</label>
                <select
                  className="ap-select"
                  value={editPost.status}
                  onChange={(e) =>
                    setEditPost((s) => ({ ...s, status: e.target.value }))
                  }
                >
                  <option value="PUBLISHED">Published</option>
                  <option value="DRAFT">Draft</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>

              <div className="ap-field">
                <label>Category</label>
                <input
                  className="ap-input"
                  value={editPost.category}
                  onChange={(e) =>
                    setEditPost((s) => ({ ...s, category: e.target.value }))
                  }
                />
              </div>

              <div className="ap-field ap-field--full">
                <label>Excerpt</label>
                <textarea
                  className="ap-textarea"
                  rows={4}
                  value={editPost.excerpt}
                  onChange={(e) =>
                    setEditPost((s) => ({ ...s, excerpt: e.target.value }))
                  }
                />
              </div>
            </div>
          </Modal>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {delOpen && delPost ? (
          <Modal
            title="Delete post"
            onClose={() => {
              setDelOpen(false);
              setDelPost(null);
            }}
            footer={
              <>
                <button
                  className="ap-btn"
                  onClick={() => {
                    setDelOpen(false);
                    setDelPost(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="ap-btn ap-btn--danger"
                  onClick={confirmDelete}
                >
                  Delete
                </button>
              </>
            }
          >
            <p className="ap-dangerText">
              Are you sure you want to delete <b>{delPost.title}</b>? This can’t
              be undone.
            </p>
          </Modal>
        ) : null}
      </AnimatePresence>
    </div>
  );
}  