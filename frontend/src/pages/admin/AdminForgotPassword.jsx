import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../../api/authApi";
import "../../styles/admintheme/adminAuth.css";

export default function AdminForgotPassword() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMsg({ type: "", text: "" });

    try {
      await authApi.forgotPassword(email.trim());
      // backend returns ok even if email doesn't exist (good security)
      setMsg({ type: "ok", text: "If that email exists, a reset link has been sent." });
    } catch (err) {
      setMsg({ type: "error", text: err.message || "Request failed." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="adminAuth">
      <div className="adminCard">
        <div className="adminBrand">
          <div className="adminBrand__title">Reset Password</div>
          <div className="adminBrand__sub">
            Enter your admin email. We’ll send a recovery link.
          </div>
        </div>

        <form className="adminForm" onSubmit={onSubmit}>
          <div className="adminField">
            <label>Email</label>
            <input
              className="adminInput"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@domain.com"
              required
            />
          </div>

          <button className="adminBtn" disabled={!email.trim() || loading}>
            {loading ? "Sending..." : "Send reset link"}
          </button>

          <div className="adminRow">
            <button type="button" className="adminLink" onClick={() => nav("/admin/login")}>
              Back to login
            </button>
          </div>

          {msg.text && (
            <div className={`adminMsg ${msg.type === "error" ? "adminMsg--error" : "adminMsg--ok"}`}>
              {msg.text}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
