import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { postsApi } from "../../api/postsApi";
import { yearsApi } from "../../api/yearsApi";
import "./../../styles/admintheme/adminPostForm.css";

const fade = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

function ResultModal({ open, onClose, kind, title, message, actions }) {
  if (!open) return null;

  return (
    <div
      className="np-modalBack"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="np-modal">
        <div className={`np-modalIcon ${kind === "ok" ? "ok" : "err"}`}>
          {kind === "ok" ? "✓" : "!"}
        </div>

        <h3 className="np-modalTitle">{title}</h3>
        <p className="np-modalText">{message}</p>

        <div className="np-modalActions">
          {actions}
          <button className="np-btn" type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPostForm() {
  const navigate = useNavigate();

  // cover picker (single)
  const coverRef = useRef(null);

  // detail images picker (multi)
  const imagesRef = useRef(null);

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState(""); // excerpt
  const [content, setContent] = useState("");

  // ✅ Activity Date (controls year grouping)
  const [activityDate, setActivityDate] = useState(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });

  // ✅ Category
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState("");

  // ✅ Cover (appearance) image
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState("");

  // ✅ Detail images (gallery)
  const [detailImages, setDetailImages] = useState([]); // [{file, url}]

  const [msg, setMsg] = useState({ type: "", text: "" });
  const [saving, setSaving] = useState(false);

  // ✅ Modal state
  const [modal, setModal] = useState({
    open: false,
    kind: "ok", // ok | err
    title: "",
    message: "",
    slug: null,
  });

  const token = localStorage.getItem("accessToken");

  const canSubmit = useMemo(() => {
    return title.trim().length > 2 && content.trim().length > 10;
  }, [title, content]);

  // --- Load categories (frontend only) ---
  useEffect(() => {
    let cancelled = false;

    async function loadCats() {
      try {
        const res = await postsApi.getCategories?.();
        const list = res?.categories || res || [];
        if (cancelled) return;

        setCategories(list);
        if (list?.length && !categoryId) setCategoryId(list[0].id);
      } catch (e) {
        console.log("categories load error:", e);
      }
    }

    loadCats();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------- Cover Image (single) ----------------
  function pickCover() {
    coverRef.current?.click();
  }

  function onCoverChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMsg({ type: "error", text: "Cover must be an image file (png/jpg/webp)." });
      return;
    }

    if (coverPreview) URL.revokeObjectURL(coverPreview);

    const url = URL.createObjectURL(file);
    setCoverFile(file);
    setCoverPreview(url);
    setMsg({ type: "", text: "" });

    if (coverRef.current) coverRef.current.value = "";
  }

  function removeCover() {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverFile(null);
    setCoverPreview("");
    if (coverRef.current) coverRef.current.value = "";
  }

  // ---------------- Detail Images (multi) ----------------
  function pickDetailImages() {
    imagesRef.current?.click();
  }

  function onDetailImagesChange(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    for (const f of files) {
      if (!f.type.startsWith("image/")) {
        setMsg({ type: "error", text: "Detail images must be image files only (png/jpg/webp)." });
        return;
      }
    }

    const newItems = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));

    setDetailImages((prev) => [...prev, ...newItems]);
    setMsg({ type: "", text: "" });

    if (imagesRef.current) imagesRef.current.value = "";
  }

  function removeOneDetailImage(index) {
    setDetailImages((prev) => {
      const copy = [...prev];
      const removed = copy.splice(index, 1)[0];
      if (removed?.url) URL.revokeObjectURL(removed.url);
      return copy;
    });
  }

  function clearDetailImages() {
    detailImages.forEach((img) => img?.url && URL.revokeObjectURL(img.url));
    setDetailImages([]);
    if (imagesRef.current) imagesRef.current.value = "";
  }

  // ---------------- Reset ----------------
  function resetForm() {
    setTitle("");
    setSubtitle("");
    setContent("");
    setCategoryId(categories?.[0]?.id || "");

    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    setActivityDate(`${yyyy}-${mm}-${dd}`);

    removeCover();
    clearDetailImages();
    setMsg({ type: "", text: "" });
  }

  // ---------------- Submit ----------------
  async function submit(status) {
    try {
      if (!token) {
        setMsg({ type: "error", text: "No access token found. Please login again." });
        setModal({
          open: true,
          kind: "err",
          title: "Session Error",
          message: "No access token found. Please login again.",
          slug: null,
        });
        return;
      }

      if (!canSubmit) {
        setMsg({ type: "error", text: "Please fill Title and Content." });
        setModal({
          open: true,
          kind: "err",
          title: "Missing Fields",
          message: "Please fill Title and Content.",
          slug: null,
        });
        return;
      }

      if (!categoryId) {
        setMsg({ type: "error", text: "Please choose a category." });
        setModal({
          open: true,
          kind: "err",
          title: "Missing Category",
          message: "Please choose a category.",
          slug: null,
        });
        return;
      }

      if (!activityDate || !/^\d{4}-\d{2}-\d{2}$/.test(activityDate)) {
        setMsg({ type: "error", text: "Please choose a valid activity date." });
        setModal({
          open: true,
          kind: "err",
          title: "Invalid Date",
          message: "Please choose a valid activity date.",
          slug: null,
        });
        return;
      }

      setSaving(true);
      setMsg({ type: "", text: "Saving..." });

      const fd = new FormData();
      fd.append("title", title);
      fd.append("content", content);
      fd.append("excerpt", subtitle || "");
      fd.append("status", status);

      // ✅ activityDate for year grouping
      fd.append("activityDate", activityDate);

      // ✅ category
      fd.append("categoryId", categoryId);

      // ✅ cover image
      if (coverFile) fd.append("cover", coverFile);

      // ✅ detail images
      detailImages.forEach((img) => fd.append("images", img.file));

      // ✅ create post (expect { ok:true, post:{ slug } })
      const created = await postsApi.create(token, fd);
      const slug = created?.post?.slug || created?.slug || null;

      // ✅ ensure year exists in DB (not critical if fails)
      const y = Number(activityDate.slice(0, 4));
      if (y) {
        try {
          await yearsApi.ensure(token, y);
        } catch (e) {
          console.log("ensure year failed:", e);
        }
      }

      setMsg({
        type: "ok",
        text: status === "PUBLISHED" ? "Post published successfully!" : "Draft saved successfully!",
      });

      // ✅ OPEN MODAL
      setModal({
        open: true,
        kind: "ok",
        title: status === "PUBLISHED" ? "Post Published ✅" : "Draft Saved ✅",
        message:
          status === "PUBLISHED"
            ? "Your post is now live and visible in Activities."
            : "Your draft was saved successfully.",
        slug,
      });
    } catch (e) {
      const errText = e?.message || "Failed to save post";
      setMsg({ type: "error", text: errText });

      setModal({
        open: true,
        kind: "err",
        title: "Save Failed",
        message: errText,
        slug: null,
      });
    } finally {
      setSaving(false);
    }
  }

  function publish() {
    submit("PUBLISHED");
  }

  return (
    <div className="np-wrap">
      {/* ✅ MODAL */}
      <ResultModal
        open={modal.open}
        kind={modal.kind}
        title={modal.title}
        message={modal.message}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
        actions={
          modal.kind === "ok" ? (
            <>
              {modal.slug ? (
                <button
                  className="np-btn np-btn--primary"
                  type="button"
                  onClick={() => navigate(`/posts/${modal.slug}`)}
                >
                  View Post
                </button>
              ) : null}

              <button
                className="np-btn np-btn--primary"
                type="button"
                onClick={() => {
                  setModal((m) => ({ ...m, open: false }));
                  resetForm();
                }}
              >
                Create Another
              </button>
            </>
          ) : null
        }
      />

      <div className="np-head">
        <div>
          <h1 className="np-title">New Post</h1>
          <p className="np-sub">Create a new post with category, cover image, detail images and content.</p>
        </div>

        <div className="np-actions">
          <button className="np-btn np-btn--primary" onClick={publish} disabled={!canSubmit || saving}>
            Publish
          </button>
        </div>
      </div>

      {msg.text ? (
        <div className={`np-msg ${msg.type === "ok" ? "np-msg--ok" : "np-msg--err"}`}>{msg.text}</div>
      ) : null}

      <motion.section className="np-card" variants={fade} initial="hidden" animate="show">
        <h3 className="np-cardTitle">Post Details</h3>

        <div className="np-form">
          {/* Title */}
          <div className="np-field np-field--full">
            <label>Title</label>
            <input
              className="np-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter post title..."
            />
            <div className="np-hint">Recommended: 5–10 words.</div>
          </div>

          {/* Subtitle */}
          <div className="np-field np-field--full">
            <label>Subtitle</label>
            <input
              className="np-input"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Enter subtitle (optional)..."
            />
          </div>

          {/* ✅ Activity Date */}
          <div className="np-field np-field--full">
            <label>Activity Date</label>
            <input className="np-input" type="date" value={activityDate} onChange={(e) => setActivityDate(e.target.value)} />
            <div className="np-hint">This date decides the year (2023/2024/2025/...).</div>
          </div>

          {/* Category */}
          <div className="np-field np-field--full">
            <label>Category</label>
            <select className="np-select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {categories?.length ? (
                categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))
              ) : (
                <option value="">No categories loaded</option>
              )}
            </select>
            <div className="np-hint">Choose where this post belongs.</div>
          </div>

          {/* Cover */}
          <div className="np-field np-field--full">
            <label>Appearance Image (Cover)</label>

            <div className="np-imageBox">
              {coverPreview ? (
                <div className="np-preview">
                  <img src={coverPreview} alt="Cover preview" />
                  <div className="np-previewBar">
                    <span className="np-fileName">
                      {coverFile?.name}{" "}
                      <span className="np-fileMeta">({Math.round((coverFile.size / 1024) * 10) / 10} KB)</span>
                    </span>
                    <div className="np-previewBtns">
                      <button className="np-miniBtn" onClick={pickCover} type="button">
                        Change
                      </button>
                      <button className="np-miniBtn np-miniBtn--danger" onClick={removeCover} type="button">
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="np-emptyUpload">
                  <div className="np-emptyText">
                    <div className="np-emptyTitle">No cover image selected</div>
                    <div className="np-emptySub">This is the first image shown in grids/cards.</div>
                  </div>
                  <button className="np-btn np-btn--primary" type="button" onClick={pickCover}>
                    Choose Cover Image
                  </button>
                </div>
              )}

              <input ref={coverRef} type="file" accept="image/*" onChange={onCoverChange} style={{ display: "none" }} />
            </div>
          </div>

          {/* Detail Images */}
          <div className="np-field np-field--full">
            <label>Detail Images (Gallery)</label>

            <div className="np-imageBox">
              {detailImages.length ? (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
                    {detailImages.map((img, idx) => (
                      <div key={img.url} className="np-preview" style={{ height: "auto" }}>
                        <img src={img.url} alt={`Detail ${idx + 1}`} style={{ height: 140, objectFit: "cover" }} />
                        <div className="np-previewBar" style={{ justifyContent: "space-between" }}>
                          <span
                            className="np-fileName"
                            style={{
                              maxWidth: 110,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {img.file?.name}
                          </span>
                          <button className="np-miniBtn np-miniBtn--danger" type="button" onClick={() => removeOneDetailImage(idx)}>
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                    <button className="np-btn np-btn--primary" type="button" onClick={pickDetailImages}>
                      Add More Images
                    </button>
                    <button className="np-btn" type="button" onClick={clearDetailImages}>
                      Clear Gallery
                    </button>
                  </div>
                </>
              ) : (
                <div className="np-emptyUpload">
                  <div className="np-emptyText">
                    <div className="np-emptyTitle">No detail images selected</div>
                    <div className="np-emptySub">These images will show inside the activity details page.</div>
                  </div>
                  <button className="np-btn np-btn--primary" type="button" onClick={pickDetailImages}>
                    Choose Detail Images
                  </button>
                </div>
              )}

              <input
                ref={imagesRef}
                type="file"
                accept="image/*"
                multiple
                onChange={onDetailImagesChange}
                style={{ display: "none" }}
              />
            </div>
          </div>

          {/* Content */}
          <div className="np-field np-field--full">
            <label>Content</label>
            <textarea
              className="np-textarea"
              rows={10}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your post content here..."
            />
          </div>
        </div>

        <div className="np-footerRow">
          <button className="np-btn np-btn--ghost" onClick={resetForm} type="button" disabled={saving}>
            Clear
          </button>

          <div className="np-actions">
            <button className="np-btn np-btn--primary" onClick={publish} disabled={!canSubmit || saving}>
              Publish
            </button>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
