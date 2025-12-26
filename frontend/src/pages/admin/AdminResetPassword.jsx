import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authApi } from "../../api/authApi";
import "../../styles/admintheme/adminAuth.css";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function AdminResetPassword() {
  const nav = useNavigate();
  const q = useQuery();

  const email = q.get("email") || "";
  const token = q.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const validLink = Boolean(email && token);

  async function onSubmit(e) {
    e.preventDefault();
    setMsg({ type: "", text: "" });

    if (!validLink) {
      setMsg({ type: "error", text: "Invalid reset link. Please request a new one." });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMsg({ type: "error", text: "Passwords do not match." });
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword({ email, token, newPassword });
      setMsg({ type: "ok", text: "Password updated. You can log in now." });
      setTimeout(() => nav("/admin/login"), 600);
    } catch (err) {
      setMsg({ type: "error", text: err.message || "Reset failed." });
    } finally {
      setLoading(false);
    }
  }

  const strongEnough = newPassword.length >= 10;
  const canSubmit = strongEnough && confirmPassword.length >= 10;

  return (
    <div className="adminAuth">
      <div className="adminCard">
        <div className="adminBrand">
          <div className="adminBrand__title">Create New Password</div>
          <div className="adminBrand__sub">
            This link is valid for a limited time.
          </div>
        </div>

        {!validLink ? (
          <div className="adminMsg adminMsg--error">
            Invalid reset link. Please request a new one.
            <div>
              <button className="adminLink" onClick={() => nav("/admin/forgot-password")}>
                Go to forgot password
              </button>
            </div>
          </div>
        ) : (
          <form className="adminForm" onSubmit={onSubmit}>
            {/* NEW PASSWORD */}
            <div className="adminField">
              <label>New Password</label>

              <div className="adminInputWrap">
                <input
                  className="adminInput"
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Use a strong password"
                  required
                />

                <button
                  type="button"
                  className="adminEyeBtn"
                  onClick={() => setShowNew((v) => !v)}
                  aria-label={showNew ? "Hide password" : "Show password"}
                >
                  {showNew ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {/* CONFIRM PASSWORD */}
            <div className="adminField">
              <label>Confirm Password</label>

              <div className="adminInputWrap">
                <input
                  className="adminInput"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                />

                <button
                  type="button"
                  className="adminEyeBtn"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? "🙈" : "👁️"}
                </button>
              </div>

              {confirmPassword && newPassword !== confirmPassword && (
                <div className="adminSmall" style={{ marginTop: 6 }}>
                  Passwords do not match.
                </div>
              )}
            </div>

            <button className="adminBtn" disabled={!canSubmit || loading}>
              {loading ? "Updating..." : "Update password"}
            </button>

            {msg.text && (
              <div
                className={`adminMsg ${
                  msg.type === "error" ? "adminMsg--error" : "adminMsg--ok"
                }`}
              >
                {msg.text}
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
