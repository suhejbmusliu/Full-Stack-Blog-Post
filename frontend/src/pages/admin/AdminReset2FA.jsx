import { useSearchParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { authApi } from "../../api/authApi";
import "../../styles/admintheme/adminAuth.css";

export default function AdminReset2FA() {
  const [searchParams] = useSearchParams();
  const nav = useNavigate();

  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  async function handleReset() {
    if (!token || !email) {
      setMsg({ type: "error", text: "Invalid recovery link." });
      return;
    }

    setLoading(true);
    setMsg({ type: "", text: "" });

    try {
      await authApi.confirmTwoFaReset({ email, token });

      setMsg({
        type: "ok",
        text: "2FA has been reset. You can now login again.",
      });

      setTimeout(() => {
        nav("/admin/login");
      }, 2000);
    } catch (err) {
      setMsg({
        type: "error",
        text: err.message || "Reset failed.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="adminAuth">
      <div className="adminCard">
        <h2>Confirm 2FA Reset</h2>
        <p className="adminMuted">
          Click below to reset 2FA for your account.
        </p>

        <button className="adminBtn" onClick={handleReset} disabled={loading}>
          {loading ? "Processing..." : "Reset 2FA"}
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
      </div>
    </div>
  );
}
