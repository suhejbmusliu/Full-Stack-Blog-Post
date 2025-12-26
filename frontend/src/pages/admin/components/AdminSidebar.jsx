import { NavLink, useNavigate } from "react-router-dom";

export default function AdminSidebar({ open, onClose }) {
  const nav = useNavigate();

  const linkClass = ({ isActive }) =>
    `adminNavLink ${isActive ? "active" : ""}`;

  return (
    <>
      <div
        className={`adminOverlay ${open ? "show" : ""}`}
        onClick={onClose}
      />

      <aside className={`adminSidebar ${open ? "open" : ""}`}>
        <div className="adminBrand">
          <div className="adminBrandLogo">A</div>
          <div>
            <div className="adminBrandTitle">Admin</div>
            <div className="adminBrandSub">Shoqata Dituria</div>
          </div>
        </div>

        <nav className="adminNav">
          <NavLink to="/admin/dashboard" className={linkClass} end>
            Dashboard
          </NavLink>

          <NavLink to="/admin/posts" className={linkClass} end>
            Posts
          </NavLink>

          <NavLink to="/admin/posts/new" className={linkClass} end>
            New Post
          </NavLink>

          <NavLink to="/admin/security/2fa" className={linkClass} end>
            2FA
          </NavLink>
        </nav>

        <button
          className="adminLogout"
          onClick={() => {
            localStorage.removeItem("accessToken");
            nav("/admin/login");
            onClose?.();
          }}
        >
          Logout
        </button>
      </aside>
    </>
  );
}
