import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import "./PostDetails.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const fileUrl = (p) => {
  if (!p) return "";
  if (p.startsWith("http")) return p;

  let fixed = p.startsWith("/") ? p : `/${p}`;
  if (!fixed.startsWith("/uploads/") && !fixed.includes("/uploads/")) {
    fixed = `/uploads${fixed}`;
  }
  return `${API}${fixed}`;
};

export default function PostDetails() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [err, setErr] = useState("");

  // Lightbox state
  const [lbOpen, setLbOpen] = useState(false);
  const [lbIndex, setLbIndex] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        setErr("");
        const res = await fetch(`${API}/api/posts/${slug}`);
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = await res.json();
        setPost(data.post);
      } catch (e) {
        setErr(e.message);
      }
    };
    load();
  }, [slug]);

  // Build a single list for lightbox navigation:
  // cover first, then gallery images
  const lightboxItems = useMemo(() => {
    if (!post) return [];
    const items = [];

    if (post.coverImage) {
      items.push({
        id: "cover",
        url: fileUrl(post.coverImage),
        label: "Cover",
      });
    }

    if (post.images?.length) {
      post.images.forEach((img) => {
        items.push({
          id: img.id,
          url: fileUrl(img.url),
          label: "Photo",
        });
      });
    }

    return items;
  }, [post]);

  const activeUrl = lightboxItems[lbIndex]?.url || "";

  const openLightbox = (index) => {
    setLbIndex(index);
    setLbOpen(true);
  };

  const closeLightbox = () => setLbOpen(false);

  const prev = () => {
    setLbIndex((i) => (i - 1 + lightboxItems.length) % lightboxItems.length);
  };

  const next = () => {
    setLbIndex((i) => (i + 1) % lightboxItems.length);
  };

  // keyboard controls
  useEffect(() => {
    if (!lbOpen) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lbOpen, lightboxItems.length]);

  if (err) {
    return (
      <div className="pd container">
        <div className="pd__pad">
          <p className="pd__error">Error: {err}</p>
          <Link to="/">← Back home</Link>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="pd container">
        <div className="pd__pad">Loading...</div>
      </div>
    );
  }

  const coverSrc = post.coverImage ? fileUrl(post.coverImage) : "";

  return (
    <div className="pd container">
      <div className="pd__pad">
        <Link className="pd__back" to="/activities">
          ← Back
        </Link>

        <h1 className="pd__title">{post.title}</h1>

        <p className="pd__date">
          {post.createdAt ? new Date(post.createdAt).toLocaleString() : ""}
        </p>

        {/* COVER (smaller on desktop) */}
        {coverSrc ? (
          <button
            type="button"
            className="pd__coverBtn"
            onClick={() => openLightbox(0)}
            aria-label="Open cover image"
          >
            <img className="pd__coverImg" src={coverSrc} alt={post.title} />
          </button>
        ) : null}

        {/* TEXT */}
        <div className="pd__content">{post.content}</div>

        {/* GALLERY under text */}
        {post.images?.length ? (
          <div className="pd__galleryWrap">
            <h3 className="pd__galleryTitle">More Photos</h3>

            <div className="pd__galleryGrid">
              {post.images.map((img, idx) => {
                // lightbox index: +1 because cover is index 0
                const lbI = coverSrc ? idx + 1 : idx;
                const src = fileUrl(img.url);

                return (
                  <button
                    type="button"
                    className="pd__thumbBtn"
                    key={img.id}
                    onClick={() => openLightbox(lbI)}
                    aria-label="Open image"
                  >
                    <img className="pd__thumbImg" src={src} alt="" />
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      {/* LIGHTBOX */}
      {lbOpen && lightboxItems.length ? (
        <div className="lb" role="dialog" aria-modal="true" onMouseDown={closeLightbox}>
          <div className="lb__inner" onMouseDown={(e) => e.stopPropagation()}>
            <button className="lb__close" type="button" onClick={closeLightbox} aria-label="Close">
              ✕
            </button>

            {lightboxItems.length > 1 ? (
              <>
                <button className="lb__nav lb__nav--left" type="button" onClick={prev} aria-label="Previous">
                  ‹
                </button>
                <button className="lb__nav lb__nav--right" type="button" onClick={next} aria-label="Next">
                  ›
                </button>
              </>
            ) : null}

            <img className="lb__img" src={activeUrl} alt="" />

            <div className="lb__counter">
              {lbIndex + 1} / {lightboxItems.length}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
