import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { authApi } from "../api/authApi";

export default function ProtectedAdmin({ children }) {
  const [status, setStatus] = useState("loading"); // loading | ok | denied
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        let token = localStorage.getItem("accessToken");

        // 1) If we have token, try /me
        if (token) {
          try {
            await authApi.me(token);
            if (!cancelled) setStatus("ok");
            return;
          } catch {
            // token invalid/expired -> try refresh
          }
        }

        // 2) Try refresh using HTTP-only cookie
        const refreshed = await authApi.refresh();
        if (!refreshed?.accessToken) throw new Error("No accessToken from refresh");

        localStorage.setItem("accessToken", refreshed.accessToken);

        // 3) Confirm it works
        await authApi.me(refreshed.accessToken);

        if (!cancelled) setStatus("ok");
      } catch {
        localStorage.removeItem("accessToken");
        if (!cancelled) setStatus("denied");
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  if (status === "loading") {
    return (
      <div style={{ padding: 24 }}>
        <p>Checking admin session...</p>
      </div>
    );
  }

  if (status === "denied") {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}
