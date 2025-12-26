import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { postsApi } from "../../api/postsApi";
import { apiFetch } from "../../api/http";
import "./../../styles/admintheme/adminDashboard.css";

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const cardHover = {
  rest: { y: 0 },
  hover: { y: -2, transition: { duration: 0.18 } },
};

function StatCard({ title, value, sub, icon }) {
  return (
    <motion.div className="card stat" variants={cardHover} initial="rest" whileHover="hover">
      <div className="stat__top">
        <div className="stat__left">
          <div className="stat__icon">{icon}</div>
          <div className="stat__meta">
            <p className="stat__title">{title}</p>
            <h3 className="stat__value">{value}</h3>
          </div>
        </div>
      </div>
      {sub ? <p className="stat__sub">{sub}</p> : null}
    </motion.div>
  );
}

export default function AdminDashboard() {
  const [category, setCategory] = useState("All");

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [totalPosts, setTotalPosts] = useState(0);
  const [categories, setCategories] = useState([]); // [{id,name,slug,count}]
  const [activity, setActivity] = useState([]); // [{who, action, meta, time}]

  const token = localStorage.getItem("accessToken");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setErr("");

        // 1) total posts (use limit=1 just to get total)
        const postsRes = await postsApi.list({ page: 1, limit: 1 });
        const total = postsRes?.total ?? 0;

        // 2) categories list
        const catsRes = await postsApi.getCategories();
        const cats = catsRes?.categories || [];

        // 3) compute per-category counts from posts endpoint (fast + simple)
        // We call posts list for each category slug to get count.
        // If you have many categories this is still fine (usually few).
        const counts = await Promise.all(
          cats.map(async (c) => {
            const r = await postsApi.list({ page: 1, limit: 1, category: c.slug });
            return { ...c, count: r?.total ?? 0 };
          })
        );

        // 4) recent activity from admin logs (optional)
        // If endpoint doesn't exist or fails, we just show empty.
        let act = [];
        try {
          const logs = await apiFetch("/api/admin-logs?limit=8", { token });
          const items = logs?.items || logs?.logs || [];
          act = items.map((x) => ({
            who: x?.admin?.name || x?.admin?.email || "Admin",
            action: x?.action || "Action",
            meta: x?.entity ? `${x.entity}${x.entityId ? ` (${x.entityId})` : ""}` : "",
            time: x?.createdAt ? new Date(x.createdAt).toLocaleString() : "",
          }));
        } catch {
          act = [];
        }

        if (cancelled) return;

        setTotalPosts(total);
        setCategories(counts);
        setActivity(act);
      } catch (e) {
        if (!cancelled) setErr(e.message || "Failed to load dashboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const topCategory = useMemo(() => {
    const list = categories || [];
    if (!list.length) return { name: "-", count: 0 };
    return [...list].sort((a, b) => (b.count || 0) - (a.count || 0))[0];
  }, [categories]);

  const filteredCategories = useMemo(() => {
    if (category === "All") return categories;
    return categories.filter((c) => c.name === category);
  }, [categories, category]);

  return (
    <div className="adminDash">
      <motion.div
        className="adminDash__header"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="adminDash__title">Admin Dashboard</h1>
          <p className="adminDash__subtitle">Quick overview of posts and latest activity.</p>
          {loading ? <p style={{ opacity: 0.7, marginTop: 8 }}>Loading…</p> : null}
          {err ? <p style={{ color: "crimson", marginTop: 8 }}>{err}</p> : null}
        </div>

        <div className="adminDash__filters">
          <div className="field">
            <label>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="All">All</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </motion.div>

      {/* CORE METRICS */}
      <motion.div className="gridSection" variants={fadeUp} initial="hidden" animate="show">
        <div className="sectionHead">
          <h2>Core Metrics</h2>
        </div>

        <div className="cards2">
          <StatCard title="Total Posts" value={totalPosts} sub="All posts in the system" icon="📝" />
          <StatCard title="Top Category" value={topCategory.name} sub={`${topCategory.count} posts`} icon="🏷️" />
        </div>
      </motion.div>

      {/* POSTS MANAGEMENT */}
      <motion.div className="gridSection" variants={fadeUp} initial="hidden" animate="show">
        <div className="sectionHead">
          <h2>Posts Management</h2>
        </div>

        <div className="card">
          <h3 className="card__title">Most Active Categories</h3>

          <div className="list">
            {filteredCategories
              .slice()
              .sort((a, b) => (b.count || 0) - (a.count || 0))
              .map((c) => {
                const pct = Math.round(((c.count || 0) / (totalPosts || 1)) * 100);
                const tone = pct >= 25 ? "good" : pct >= 15 ? "warn" : "neutral";

                return (
                  <div className="listRow" key={c.id}>
                    <div className="listRow__left">
                      <span className="listRow__name">{c.name}</span>
                      <span className="listRow__meta">{c.count} posts</span>
                    </div>

                    <div className="listRow__right">
                      <div className="bar">
                        <div className={`bar__fill bar__fill--${tone}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="listRow__pct">{pct}%</span>
                    </div>
                  </div>
                );
              })}

            {!loading && !filteredCategories?.length ? (
              <p style={{ opacity: 0.7, padding: "10px 0" }}>No categories yet.</p>
            ) : null}
          </div>
        </div>
      </motion.div>

      {/* RECENT ACTIVITY */}
      <motion.div className="gridSection" variants={fadeUp} initial="hidden" animate="show">
        <div className="sectionHead">
          <h2>Recent Activity</h2>
        </div>

        <div className="card">
          {activity?.length ? (
            <div className="timeline">
              {activity.map((a, i) => (
                <div className="timeRow" key={i}>
                  <div className="timeRow__dot" />
                  <div className="timeRow__body">
                    <div className="timeRow__top">
                      <span className="timeRow__who">{a.who}</span>
                      <span className="timeRow__action">{a.action}</span>
                      <span className="timeRow__time">{a.time}</span>
                    </div>
                    <div className="timeRow__meta">{a.meta}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ opacity: 0.7 }}>No recent activity yet.</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
