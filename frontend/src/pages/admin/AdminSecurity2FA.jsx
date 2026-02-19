import { useEffect, useState } from "react";
import { authApi } from "../../api/authApi";
import "../../styles/admintheme/adminPanel.css";

export default function AdminSecurity2FA() {
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(false);

  const [qr, setQr] = useState("");
  const [secretBase32, setSecretBase32] = useState("");

  const [code, setCode] = useState("");
  const [disableCode, setDisableCode] = useState("");

  const [msg, setMsg] = useState({ type: "", text: "" });
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  const token = localStorage.getItem("accessToken");

  async function loadStatus() {
    try {
      const me = await authApi.me(token);
      setEnabled(!!me?.admin?.twoFactorEnabled);
    // eslint-disable-next-line no-unused-vars
    } catch (e) {
      setMsg({ type: "error", text: "Failed to load 2FA status." });
    }
  }

  useEffect(() => {
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startSetup() {
    setMsg({ type: "", text: "" });
    setLoading(true);

    try {
      const data = await authApi.twoFaSetup(token);
      setQr(data.qr || "");
      setSecretBase32(data.secretBase32 || "");
      setMsg({ type: "ok", text: "2FA setup created. Scan QR then enter the 6-digit code." });
    } catch (e) {
      setMsg({ type: "error", text: e.message || "2FA setup failed." });
    } finally {
      setLoading(false);
    }
  }

  async function enable2FA() {
    setMsg({ type: "", text: "" });

    if (code.trim().length !== 6) {
      setMsg({ type: "error", text: "2FA code must be 6 digits." });
      return;
    }

    setLoading(true);
    try {
      await authApi.twoFaEnable(token, code.trim());

      setEnabled(true);
      setQr("");
      setSecretBase32("");
      setCode("");
      setDisableCode("");

      setMsg({ type: "ok", text: "2FA enabled successfully." });
    } catch (e) {
      setMsg({ type: "error", text: e.message || "Enable 2FA failed." });
    } finally {
      setLoading(false);
    }
  }

  async function disable2FA() {
    setMsg({ type: "", text: "" });

    if (disableCode.trim().length !== 6) {
      setMsg({ type: "error", text: "Enter a valid 6-digit 2FA code to disable." });
      return;
    }

    setLoading(true);
    try {
      await authApi.twoFaDisable(token, disableCode.trim());

      setEnabled(false);
      setQr("");
      setSecretBase32("");
      setCode("");
      setDisableCode("");

      setMsg({ type: "ok", text: "2FA disabled successfully." });
    } catch (e) {
      setMsg({ type: "error", text: e.message || "Disable 2FA failed." });
    } finally {
      setLoading(false);
    }
  }

  // ✅ NEW: Request recovery email
  async function sendRecoveryEmail() {
    setMsg({ type: "", text: "" });
    setRecoveryLoading(true);

    try {
      const me = await authApi.me(token);
      const email = me?.admin?.email;

      if (!email) {
        setMsg({ type: "error", text: "Could not detect admin email." });
        return;
      }

      await authApi.requestTwoFaReset(email);

      setMsg({
        type: "ok",
        text: "Recovery email sent. Check your inbox (and spam folder).",
      });
    } catch (e) {
      setMsg({ type: "error", text: e.message || "Failed to send recovery email." });
    } finally {
      setRecoveryLoading(false);
    }
  }

  return (
    <div className="adminPage">
      <h1 className="adminH1">2FA</h1>
      <p className="adminMuted">Two-Factor Authentication for admin login.</p>

      <div style={{ marginTop: 14 }} className="adminPill">
        Status: <b>{enabled ? "Enabled" : "Disabled"}</b>
      </div>

      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>

        {enabled ? (
          <>
            <div style={{ display: "grid", gap: 8 }}>
              <label className="adminMuted">Enter 6-digit code to disable:</label>
              <input
                className="adminInput adminCode"
                inputMode="numeric"
                maxLength={6}
                value={disableCode}
                onChange={(e) =>
                  setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="123456"
              />
            </div>

            <button
              className="adminBtn adminBtnDanger"
              onClick={disable2FA}
              disabled={loading}
            >
              {loading ? "Please wait..." : "Disable 2FA"}
            </button>

            <div className="adminMuted">
              2FA is currently ON. Login will require a 6-digit code from your authenticator app.
            </div>
          </>
        ) : (
          <>
            <button className="adminBtn" onClick={startSetup} disabled={loading}>
              {loading ? "Please wait..." : "Create 2FA Setup (QR)"}
            </button>

            {qr && (
              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                <div className="adminMuted">
                  Scan this QR code with Google Authenticator / Authy:
                </div>
                <img
                  src={qr}
                  alt="2FA QR"
                  style={{
                    width: 220,
                    height: 220,
                    background: "#fff",
                    border: "1px solid #eaeaea",
                    borderRadius: 14,
                  }}
                />

                <div className="adminMuted">
                  If you can’t scan, add manually using this secret:
                </div>

                <div
                  style={{
                    border: "1px solid #eaeaea",
                    borderRadius: 14,
                    padding: 12,
                    background: "#fafafa",
                    wordBreak: "break-all",
                    fontWeight: 800,
                  }}
                >
                  {secretBase32 || "(no secret returned)"}
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  <label className="adminMuted">
                    Enter 6-digit code to enable:
                  </label>
                  <input
                    className="adminInput adminCode"
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={(e) =>
                      setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="123456"
                  />
                  <button
                    className="adminBtn"
                    onClick={enable2FA}
                    disabled={loading}
                  >
                    {loading ? "Please wait..." : "Verify & Enable 2FA"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ===============================
            ✅ NEW RECOVERY SECTION
           =============================== */}
        <div
          style={{
            marginTop: 30,
            padding: 16,
            border: "1px dashed #e0e0e0",
            borderRadius: 14,
            background: "#fafafa",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>
            Lost access to your authenticator?
          </div>

          <div className="adminMuted" style={{ marginBottom: 10 }}>
            If you lose your device or cannot access your 2FA codes,
            you can request a recovery email.
          </div>

          <button
            className="adminBtn"
            onClick={sendRecoveryEmail}
            disabled={recoveryLoading}
          >
            {recoveryLoading ? "Sending..." : "Send 2FA Recovery Email"}
          </button>
        </div>

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
