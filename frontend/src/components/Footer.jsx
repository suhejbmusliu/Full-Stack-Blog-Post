import React from "react"
import { NavLink } from "react-router-dom"
import { FaFacebookF, FaInstagram, FaYoutube } from "react-icons/fa"
import "./Footer.css"

export default function Footer() {
  return (
    <footer className="footer" aria-label="Site footer">
      <div className="footer__inner">
      

        {/* Main content card */}
        <div className="footer__card">
          {/* Top small text (right) */}
          <p className="footer__madeby">Made by Suhejb Musliu</p>
          {/* Row 1: nav (left) + contacts (center) + socials (right) */}
          <div className="footer__row footer__row--top">
            {/* Left: Navigation */}
            <nav className="footer__nav" aria-label="Footer navigation">
              <NavLink className="footer__link" to="/">
                Home
              </NavLink>
              <NavLink className="footer__link" to="/activity">
                Activity
              </NavLink>
              <NavLink className="footer__link" to="/about">
                About Us
              </NavLink>
              <NavLink className="footer__link" to="/contact">
                Contact
              </NavLink>
            </nav>

            {/* Center: Contact info */}
            <address className="footer__contact" aria-label="Contact information">
              <span className="footer__contactItem">Presevo, Serbia</span>

              {/* clickable phone/email for real UX */}
              <a className="footer__contactItem footer__contactLink" href="tel:+38111156765">
                +38111156765
              </a>

              <a className="footer__contactItem footer__contactLink" href="mailto:shkdituria@info.com">
                shkdituria@info.com
              </a>
            </address>

            {/* Right: Social icons */}
            <div className="footer__social" aria-label="Social media links">
              <a
                className="footer__icon footer__icon--fb"
                href="https://www.facebook.com/ShoqataKulturoreDituria/"
                target="_blank"
                rel="noreferrer"
                aria-label="Open Facebook"
                title="Facebook"
              >
                <FaFacebookF aria-hidden="true" focusable="false" />
              </a>

              <a
                className="footer__icon footer__icon--ig"
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Open Instagram"
                title="Instagram"
              >
                <FaInstagram aria-hidden="true" focusable="false" />
              </a>

              <a
                className="footer__icon footer__icon--yt"
                href="https://www.youtube.com/@shoqatakulturoredituria-kanali"
                target="_blank"
                rel="noreferrer"
                aria-label="Open YouTube"
                title="YouTube"
              >
                <FaYoutube aria-hidden="true" focusable="false" />
              </a>
            </div>
          </div>

          {/* Divider line */}
          <div className="footer__divider" role="separator" aria-hidden="true" />

          {/* Big branding */}
          <div className="footer__brandWrap">
            <h2 className="footer__brand" aria-label="Shoqata Dituria">
              "SHOQATA DITURIA"
            </h2>
          </div>

          {/* Bottom small text */}
          <p className="footer__copyright">copyright@shoqatadituria</p>
        </div>
      </div>
    </footer>
  )
}
