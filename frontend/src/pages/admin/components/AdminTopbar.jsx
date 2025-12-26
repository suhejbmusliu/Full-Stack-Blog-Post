import { NavLink } from "react-router-dom";

export default function AdminTopbar({ onMenu }) {
  return (
    <header className="adminTopbar">
      <div className="adminTopLeft">
        <button className="adminIconBtn" onClick={onMenu} aria-label="Open sidebar">☰</button>
        <div className="adminTopTitle">Admin Panel</div>
      </div>

      <div className="adminTopRight">
        <NavLink className="adminChip" to="/admin/security/2fa">2FA</NavLink>
      </div>
    </header>
  );
}
