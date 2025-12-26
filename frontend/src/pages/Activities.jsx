import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PostGrid from "../components/PostGrid";
import { yearsApi } from "../api/yearsApi";
import "./Activities.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Activities() {
  const INITIAL = 9;
  const STEP = 6;

  const { year } = useParams(); // ✅ /activities/:year
  const navigate = useNavigate();

  const [allPosts, setAllPosts] = useState([]);
  const [visibleCount, setVisibleCount] = useState(INITIAL);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const endRef = useRef(null);

  // ✅ If user opens /activities (no year) -> go to latest year
  useEffect(() => {
    let cancelled = false;

    async function ensureYearInUrl() {
      // if year exists, do nothing
      if (year) return;

      try {
        const res = await yearsApi.list();
        const list = res?.years || [];
        const latest = list?.[0]?.year ? String(list[0].year) : String(new Date().getFullYear());
        if (!cancelled) navigate(`/activities/${latest}`, { replace: true });
      // eslint-disable-next-line no-unused-vars
      } catch (e) {
        // fallback: current year
        if (!cancelled) navigate(`/activities/${new Date().getFullYear()}`, { replace: true });
      }
    }

    ensureYearInUrl();
    return () => {
      cancelled = true;
    };
  }, [year, navigate]);

  // ✅ Load posts for selected year
  useEffect(() => {
    const load = async () => {
      try {
        setErr("");
        setLoading(true);
        setVisibleCount(INITIAL);

        // if year missing (redirect is happening), wait
        if (!year) return;

        const res = await fetch(
          `${API}/api/posts?status=PUBLISHED&year=${encodeURIComponent(year)}&limit=50&page=1&sort=newest`
        );
        const data = await res.json();

        if (!res.ok || data?.ok === false) throw new Error(data?.error || "Failed to load activities");

        setAllPosts(Array.isArray(data.items) ? data.items : []);
      } catch (e) {
        setErr(e?.message || "Something went wrong");
        setAllPosts([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [year]);

  const visiblePosts = useMemo(() => allPosts.slice(0, visibleCount), [allPosts, visibleCount]);
  const hasMore = visibleCount < allPosts.length;

  const onViewMore = () => setVisibleCount((prev) => Math.min(prev + STEP, allPosts.length));

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [visibleCount]);

  return (
    <section className="activitiesPage">
      <div className="container">
        <h1 className="activitiesPage__title">{year ? `${year} Activity` : "Activities"}</h1>

        {loading ? (
          <p className="activitiesPage__muted">Loading...</p>
        ) : err ? (
          <p className="activitiesPage__muted">{err}</p>
        ) : (
          <>
            <PostGrid title="" posts={visiblePosts} showViewMore={false} />

            {hasMore ? (
              <div className="activitiesPage__moreWrap" ref={endRef}>
                <button className="activitiesPage__moreBtn" onClick={onViewMore}>
                  View More
                </button>
              </div>
            ) : null}

            {!hasMore && !allPosts.length ? (
              <p className="activitiesPage__muted" style={{ marginTop: 18 }}>
                No activities found for {year}.
              </p>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
