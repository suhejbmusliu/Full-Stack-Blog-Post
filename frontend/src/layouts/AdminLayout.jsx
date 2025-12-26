import { Outlet } from "react-router-dom";
import { useState } from "react";
import "../styles/admintheme/adminPanel.css";

import AdminSidebar from "../pages/admin/components/AdminSidebar";
import AdminTopbar from "../pages/admin/components/AdminTopbar";

export default function AdminLayout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="adminShell">
      <AdminSidebar open={open} onClose={() => setOpen(false)} />

      <div className="adminMain">
        <AdminTopbar onMenu={() => setOpen(true)} />

        <main className="adminContent">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
