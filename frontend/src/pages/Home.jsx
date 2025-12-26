// src/pages/Home.jsx
import { useEffect, useMemo, useState } from "react";
import Hero from "../components/Hero.jsx";
import PostGrid from "../components/PostGrid.jsx";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        setErr("");
        setLoading(true);

        const res = await fetch(
          `${API}/api/posts?status=PUBLISHED&limit=9&page=1&sort=newest`
        );

        const data = await res.json().catch(() => ({}));

        if (!res.ok || data?.ok === false) {
          throw new Error(data?.error || `API error: ${res.status}`);
        }

        // ✅ your backend returns { ok, total, page, limit, items }
        const items = Array.isArray(data.items) ? data.items : [];

        if (!alive) return;
        setPosts(items);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Failed to load posts");
        setPosts([]);
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, []);

  const heroPosts = useMemo(() => posts.slice(0, 3), [posts]);
  const gridPosts = useMemo(() => posts.slice(3, 9), [posts]);

  return (
    <>
      {loading ? (
        <div className="container" style={{ padding: "24px 0" }}>
          <p style={{ opacity: 0.7 }}>Loading...</p>
        </div>
      ) : err ? (
        <div className="container" style={{ padding: "24px 0", color: "crimson" }}>
          {err}
        </div>
      ) : posts.length ? (
        <>
          {/* ✅ avoid any weird crash if empty */}
          {heroPosts.length ? <Hero posts={heroPosts} /> : null}
          <PostGrid title="Recent Blog Posts" posts={gridPosts} viewMoreTo="/activities" />
        </>
      ) : (
        <div className="container" style={{ padding: "24px 0" }}>
          <p style={{ opacity: 0.75 }}>No posts yet.</p>
        </div>
      )}
    </>
  );
}
