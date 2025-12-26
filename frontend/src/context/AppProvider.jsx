import { AuthProvider } from "../context/AuthContext";

export default function AppProvider({ children }) {
  return <AuthProvider>{children}</AuthProvider>;
}
