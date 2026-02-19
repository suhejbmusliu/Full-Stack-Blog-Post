import { useLocation } from "react-router-dom";
import { useState } from "react";
import { authApi } from "../../api/authApi";
import "../../styles/admintheme/adminAuth.css";

export default function AdminForgot2FA() {
  const location = useLocation();

  const [email, setEmail] = useState(location.state?.email || "");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg({ type: "", text: "" });
    setLoading(true);

    try {
      await authApi.requestTwoFaReset(email.trim());

      setMsg({
        type: "ok",
        text: "If this email exists, a recovery link has been sent.",
      });
    } catch (err) {
      setMsg({
        type: "error",
        text: err.message || "Failed to send recovery email.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="adminAuth">
      <div className="adminCard">
        <h2>2FA Recovery</h2>
        <p className="adminMuted">
          Enter your admin email to receive a 2FA reset link.
        </p>

        <form onSubmit={handleSubmit} className="adminForm">
          <input
            className="adminInput"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@domain.com"
          />

          <button className="adminBtn" disabled={loading}>
            {loading ? "Sending..." : "Send Recovery Email"}
          </button>

          {msg.text && (
            <div
              className={`adminMsg ${
                msg.type === "error"
                  ? "adminMsg--error"
                  : msg.type === "ok"
                  ? "adminMsg--ok"
                  : ""
              }`}
            >
              {msg.text}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
