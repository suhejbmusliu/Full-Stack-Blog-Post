import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { FaFacebookF, FaInstagram, FaYoutube } from "react-icons/fa";
import { FiMenu, FiX, FiChevronDown } from "react-icons/fi";
import { motion } from "framer-motion";
import { dropdownWrapper, dropdownIcon, dropdownItem } from "../utils/animation";
import { yearsApi } from "../api/yearsApi"; 
import "./Navbar.css";
import img from "../assets/logo.png";

export default function Navbar() {
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);

  // Desktop dropdown (Activities)
  const [actOpen, setActOpen] = useState(false);

  // ✅ NEW: years from DB
  const [years, setYears] = useState([]);
  const [yearsLoaded, setYearsLoaded] = useState(false);

  const lastY = useRef(0);

  const closeAll = () => {
    setOpen(false);
    setActOpen(false);
  };

  // Hide on scroll down, show on scroll up (smooth on mobile)
useEffect(() => {
  lastY.current = window.scrollY;

  let ticking = false;

  const update = () => {
    const y = window.scrollY;
    const diff = y - lastY.current;

    // ignore tiny scroll changes (prevents jitter)
    if (Math.abs(diff) < 10) {
      ticking = false;
      return;
    }

    const goingDown = diff > 0;

    // decide next state
    const nextHidden = y >= 80 ? goingDown : false;

    // update only if changed (prevents rerender spam)
    setHidden((prev) => (prev === nextHidden ? prev : nextHidden));

    lastY.current = y;
    ticking = false;
  };

  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  return () => window.removeEventListener("scroll", onScroll);
}, []);

  // Prevent body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close Activities dropdown on outside click / Esc
  useEffect(() => {
    if (!actOpen) return;

    const onKey = (e) => {
      if (e.key === "Escape") setActOpen(false);
    };

    const onClickOutside = (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (!target.closest(".navdrop")) setActOpen(false);
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClickOutside);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClickOutside);
    };
  }, [actOpen]);

  // ✅ NEW: Load years from backend
  useEffect(() => {
    let cancelled = false;

    async function loadYears() {
      try {
        const res = await yearsApi.list();
        const list = res?.years || [];
        const onlyYears = list.map((x) => String(x.year));
        if (cancelled) return;

        setYears(onlyYears);
        setYearsLoaded(true);
      } catch (e) {
        console.log("years load error:", e);

        // fallback years if API fails (keeps your UI working)
        const fallback = ["2026", "2025", "2024", "2023", "2022"];
        if (!cancelled) {
          setYears(fallback);
          setYearsLoaded(true);
        }
      }
    }

    loadYears();
    return () => {
      cancelled = true;
    };
  }, []);

  // ✅ latestYear is now dynamic (first year is biggest because API returns desc)
  const latestYear = years?.[0] || String(new Date().getFullYear());

  return (
    <header className={`navbar ${hidden && !open ? "navbar--hidden" : ""}`}>
      <div className="container navbar__inner">
        {/* Logo */}
        <NavLink to="/" className="navbar__logo" onClick={closeAll}>
          <img src={img} alt="Shoqata Dituria" />
        </NavLink>

        {/* Desktop links */}
        <nav className="navbar__links">
          <NavLink to="/" className={({ isActive }) => `navlink ${isActive ? "active" : ""}`}>
            Ballina
          </NavLink>

          {/* Activities dropdown (desktop) */}
          <div className="navdrop">
            <button
              className="navdrop__btn"
              type="button"
              onClick={() => {
                closeAll();
                navigate(`/activities/${latestYear}`);
              }}
              aria-haspopup="menu"
              aria-expanded={actOpen}
              disabled={!yearsLoaded} // optional: prevent click before years load
              style={!yearsLoaded ? { opacity: 0.7, cursor: "not-allowed" } : undefined}
            >
              Aktivitetet

              {/* arrow toggles dropdown only */}
              <motion.span
                className="navdrop__chev"
                animate={actOpen ? "open" : "closed"}
                variants={dropdownIcon}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActOpen((v) => !v);
                }}
                role="button"
                tabIndex={0}
              >
                <FiChevronDown />
              </motion.span>
            </button>

            <motion.div
              className="navdrop__menu"
              initial="closed"
              animate={actOpen ? "open" : "closed"}
              variants={dropdownWrapper}
              style={{
                transformOrigin: "top center",
                pointerEvents: actOpen ? "auto" : "none",
              }}
              role="menu"
            >
              {years.map((y) => (
                <motion.div key={y} variants={dropdownItem}>
                  <NavLink
                    to={`/activities/${y}`}
                    className="navdrop__item"
                    onClick={() => {
                      setActOpen(false);
                      setOpen(false);
                    }}
                    role="menuitem"
                  >
                    {y}
                  </NavLink>
                </motion.div>
              ))}
            </motion.div>
          </div>

          <NavLink to="/about" className={({ isActive }) => `navlink ${isActive ? "active" : ""}`}>
            Rreth Nesh
          </NavLink>

          <NavLink to="/contact" className={({ isActive }) => `navlink ${isActive ? "active" : ""}`}>
            Kontakti
          </NavLink>
        </nav>

        {/* Desktop social */}
        <div className="navbar__social">
          <a className="social" href="https://www.facebook.com/ShoqataKulturoreDituria/" aria-label="Facebook">
            <FaFacebookF />
          </a>
          <a className="social" href="#" aria-label="Instagram">
            <FaInstagram />
          </a>
          <a className="social" href="https://www.youtube.com/@shoqatakulturoredituria-kanali" aria-label="YouTube">
            <FaYoutube />
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          className="navbar__toggle"
          onClick={() => {
            setOpen((v) => !v);
            setActOpen(false);
          }}
          aria-label="Toggle menu"
          type="button"
        >
          {open ? <FiX /> : <FiMenu />}
        </button>
      </div>

      {/* Mobile drawer */}
      <div className={`mobile ${open ? "mobile--open" : ""}`}>
        <button className="mobile__backdrop" onClick={closeAll} aria-label="Close menu" type="button" />

        <div className="mobile__panel" role="dialog" aria-modal="true">
          <div className="mobile__links">
            <NavLink to="/" onClick={closeAll} className={({ isActive }) => `m-link ${isActive ? "active" : ""}`}>
              Home
            </NavLink>

            <details className="m-details">
              <summary className="m-summary">Activities</summary>
              <div className="m-sub">
                {years.map((y) => (
                  <NavLink
                    key={y}
                    to={`/activities/${y}`}
                    onClick={closeAll}
                    className={({ isActive }) => `m-sublink ${isActive ? "active" : ""}`}
                  >
                    {y}
                  </NavLink>
                ))}
              </div>
            </details>

            <NavLink to="/about" onClick={closeAll} className={({ isActive }) => `m-link ${isActive ? "active" : ""}`}>
              About
            </NavLink>

            <NavLink
              to="/contact"
              onClick={closeAll}
              className={({ isActive }) => `m-link ${isActive ? "active" : ""}`}
            >
              Contact
            </NavLink>
          </div>

          <div className="mobile__social">
            <a className="social" href="#" aria-label="Facebook">
              <FaFacebookF />
            </a>
            <a className="social" href="#" aria-label="Instagram">
              <FaInstagram />
            </a>
            <a className="social" href="#" aria-label="YouTube">
              <FaYoutube />
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}