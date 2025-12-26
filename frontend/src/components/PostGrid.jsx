import { Link } from "react-router-dom";
import "./PostGrid.css";

const API = import.meta.env.VITE_API_URL; // http://localhost:5000

const imgSrc = (p) => {
  // ✅ prefer thumb if exists
  const raw = p?.coverThumb || p?.coverImage;
  if (!raw) return "";

  // absolute URL
  if (raw.startsWith("http")) return raw;

  // normalize path:
  // if backend stored "uploads/xxx.jpg" -> make "/uploads/xxx.jpg"
  // if backend stored "/uploads/xxx.jpg" -> keep
  let fixed = raw;

  if (!fixed.startsWith("/")) fixed = `/${fixed}`;
  if (!fixed.startsWith("/uploads/")) {
    // if it’s just "/abc.jpg" or "/something", force uploads prefix
    // ONLY do this if your processPostImage returns filenames without /uploads
    // If your stored paths already include /uploads, this won't run.
    if (!fixed.includes("/uploads/")) fixed = `/uploads${fixed}`;
  }

  return `${API}${fixed}`;
};

const monthYear = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("en-US", { month: "long", year: "numeric" });
};

export default function PostGrid({
  title = "Recent Blog Posts",
  posts = [],
  viewMoreTo = "/activities",
  showViewMore = true,
}) {
  if (!posts?.length) return null;

  return (
    <section className="postGrid">
      <div className="postGrid__container">
        <h2 className="postGrid__title">{title}</h2>

        <div className="postGrid__grid">
          {posts.map((p) => (
            <article className="postCard" key={p.id}>
              <div className="postCard__imgWrap">
                {p.coverImage ? (
                  <img
                    className="postCard__img"
                    src={imgSrc(p)}
                    alt={p.title}
                    loading="lazy"
                  />
                ) : null}
              </div>

              <div className="postCard__body">
                <p className="postCard__text">{p.title}</p>

                <div className="postCard__meta">
                  <span className="postCard__date">{monthYear(p.createdAt)}</span>

                  {/* ✅ IMPORTANT: use slug, not id */}
                  <Link className="postCard__btn" to={`/posts/${p.slug}`}>
                    Read More
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        {showViewMore ? (
          <div className="postGrid__moreWrap">
            <Link className="postGrid__moreBtn" to={viewMoreTo}>
              View More
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
