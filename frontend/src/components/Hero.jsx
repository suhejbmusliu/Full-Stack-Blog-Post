import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import "./Hero.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Hero({ posts = [] }) {
  const latest = useMemo(() => posts.slice(0, 3), [posts]);
  const safePosts = latest.length ? latest : [];

  const [index, setIndex] = useState(0);

  // ✅ keep index valid if posts count changes
  useEffect(() => {
    if (!safePosts.length) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (index > safePosts.length - 1) setIndex(0);
  }, [safePosts.length, index]);

  if (!safePosts.length) return null;

  const current = safePosts[index];

  const getImage = (p) => {
    if (!p?.coverImage) return "";

    if (p.coverImage.startsWith("http")) return p.coverImage;

    // ✅ add missing "/" so "uploads/..." becomes "/uploads/..."
    const path = p.coverImage.startsWith("/") ? p.coverImage : `/${p.coverImage}`;
    return `${API}${path}`;
  };

  const next = () => setIndex((i) => (i + 1) % safePosts.length);
  const prev = () => setIndex((i) => (i - 1 + safePosts.length) % safePosts.length);

  return (
    <section className="hero">
      <div className="container hero__container">
        <div className="heroCard">
          <Link
            to={`/posts/${current.slug}`}
            className="heroCard__clickArea"
            aria-label="Open post"
          />

          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              className="heroCard__bg"
              style={{ backgroundImage: `url(${getImage(current)})` }}
              initial={{ x: 60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -60, opacity: 0 }}
              transition={{ duration: 0.55, ease: "easeInOut" }}
            />
          </AnimatePresence>

          <div className="heroCard__shade" />

          <div className="heroCard__content">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${current.id}-text`}
                initial={{ x: 40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -40, opacity: 0 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
              >
                <p className="heroCard__label">Aktivitetet e fundit</p>
                <h1 className="heroCard__title">{current.title}</h1>
              </motion.div>
            </AnimatePresence>
          </div>

          <button
            className="heroCard__arrow heroCard__arrow--left"
            onClick={(e) => {
              e.preventDefault();
              prev();
            }}
            aria-label="Previous"
          >
            ‹
          </button>

          <button
            className="heroCard__arrow heroCard__arrow--right"
            onClick={(e) => {
              e.preventDefault();
              next();
            }}
            aria-label="Next"
          >
            ›
          </button>

          <div className="heroCard__dots">
            {safePosts.map((p, i) => (
              <button
                key={p.id}
                className={`heroDot ${i === index ? "heroDot--active" : ""}`}
                onClick={(e) => {
                  e.preventDefault();
                  setIndex(i);
                }}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
