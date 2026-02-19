import { Routes, Route, Navigate } from "react-router-dom";

import PublicLayout from "./layouts/PublicLayout";
import AdminLayout from "./layouts/AdminLayout";
import ProtectedAdmin from "./components/ProtectedAdmin";

import Home from "./pages/Home";
import About from "./pages/About";
import Activities from "./pages/Activities";
import Contact from "./pages/Contact";
import PostDetails from "./pages/PostDetails";

import AdminLogin from "./pages/admin/AdminLogin";
import AdminForgotPassword from "./pages/admin/AdminForgotPassword";
import AdminResetPassword from "./pages/admin/AdminResetPassword";

// ✅ NEW
import AdminForgot2FA from "./pages/admin/AdminForgot2FA";
import AdminReset2FA from "./pages/admin/AdminReset2FA";

import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminPosts from "./pages/admin/AdminPosts";
import AdminPostForm from "./pages/admin/AdminPostForm";
import AdminSecurity2FA from "./pages/admin/AdminSecurity2FA";

export default function App() {
  return (
    <Routes>
      {/* ================= PUBLIC ================= */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/activities" element={<Activities />} />
        <Route path="/activities/:year" element={<Activities />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/posts/:slug" element={<PostDetails />} />
      </Route>

      {/* ================= ADMIN AUTH (NO LAYOUT) ================= */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/forgot-password" element={<AdminForgotPassword />} />
      <Route path="/admin/reset-password" element={<AdminResetPassword />} />

      {/* ✅ NEW — PUBLIC 2FA RECOVERY ROUTES */}
      <Route path="/admin/forgot-2fa" element={<AdminForgot2FA />} />
      <Route path="/admin/reset-2fa" element={<AdminReset2FA />} />

      {/* ================= ADMIN PANEL (PROTECTED) ================= */}
      <Route
        path="/admin"
        element={
          <ProtectedAdmin>
            <AdminLayout />
          </ProtectedAdmin>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="posts" element={<AdminPosts />} />
        <Route path="posts/new" element={<AdminPostForm mode="create" />} />
        <Route path="posts/:id" element={<AdminPostForm mode="edit" />} />
        <Route path="security/2fa" element={<AdminSecurity2FA />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
