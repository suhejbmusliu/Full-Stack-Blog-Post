import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../../api/authApi";
import "../../styles/admintheme/adminAuth.css";

export default function AdminLogin() {
  const nav = useNavigate();

  const [step, setStep] = useState("CREDENTIALS"); // CREDENTIALS | TWOFA
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // ✅ NEW: show/hide password
  const [showPassword, setShowPassword] = useState(false);

  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [msg, setMsg] = useState({ type: "", text: "" });

  const canSubmit = useMemo(() => {
    if (step === "CREDENTIALS") return email.trim() && password.trim();
    return twoFactorCode.trim().length >= 6;
  }, [step, email, password, twoFactorCode]);

  async function onSubmit(e) {
    e.preventDefault();
    setMsg({ type: "", text: "" });
    setLoading(true);

    try {
      const payload = {
        email: email.trim(),
        password,
        twoFactorCode: step === "TWOFA" ? twoFactorCode.trim() : undefined,
      };

      const data = await authApi.login(payload);

      localStorage.setItem("accessToken", data.accessToken);
      setMsg({ type: "ok", text: "Logged in successfully." });
      nav("/admin");
    } catch (err) {
      const code = err.code || err.message;

      if (code === "2FA_REQUIRED") {
        setStep("TWOFA");
        setMsg({
          type: "",
          text: "Enter the 6-digit code from your authenticator app.",
        });
      } else if (code === "INVALID_2FA") {
        setMsg({ type: "error", text: "Wrong 2FA code. Try again." });
      } else {
        setMsg({ type: "error", text: err.message || "Login failed." });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="adminAuth">
      <div className="adminCard">
        <div className="adminBrand">
          <div className="adminBrand__title">Admin Panel</div>
          <div className="adminBrand__sub">
            Shoqata Dituria — secure access for administrators only.
          </div>
        </div>

        <form className="adminForm" onSubmit={onSubmit}>
          {step === "CREDENTIALS" && (
            <>
              <div className="adminField">
                <label>Email</label>
                <input
                  className="adminInput"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@domain.com"
                  required
                />
              </div>
              <div className="adminField">
                <label>Password</label>

                <div className="adminInputWrap">
                  <input
                    className="adminInput"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    required
                  />

                  <button
                    type="button"
                    className="adminEyeBtn"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    title={showPassword ? "Hide" : "Show"}
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              <div className="adminRow">
                <button
                  type="button"
                  className="adminLink"
                  onClick={() => nav("/admin/forgot-password")}
                >
                  Forgot password?
                </button>

                <span className="adminSmall">JWT + Refresh cookie enabled</span>
              </div>
            </>
          )}

          {step === "TWOFA" && (
            <div className="admin2FABox">
              <div className="adminField">
                <label>2FA Code</label>
                <input
                  className="adminInput"
                  inputMode="numeric"
                  value={twoFactorCode}
                  onChange={(e) =>
                    setTwoFactorCode(
                      e.target.value.replace(/\D/g, "").slice(0, 6)
                    )
                  }
                  placeholder="123456"
                  required
                />
              </div>

              <div className="adminRow">
                <button
                  type="button"
                  className="adminLink"
                  onClick={() => {
                    setStep("CREDENTIALS");
                    setTwoFactorCode("");
                    setMsg({ type: "", text: "" });
                  }}
                >
                  Back
                </button>
                <span className="adminSmall">Google Authenticator / Authy</span>
              </div>
            </div>
          )}

          <button className="adminBtn" disabled={!canSubmit || loading}>
            {loading
              ? "Please wait..."
              : step === "TWOFA"
              ? "Verify & Login"
              : "Login"}
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

        <div className="adminDivider" />
        <div className="adminHint">
          Tip: After login, you can enable 2FA inside Admin Settings for extra
          security.
        </div>
      </div>
    </div>
  );
}
