// src/admin/components/AdminLayout.jsx
import React, { useState } from "react";
import AdminNavbar from "./AdminNavbar";
import AdminSidebar from "./AdminSidebar";
import { Outlet } from "react-router-dom";
import "./css/AdminLayout.css";

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <AdminNavbar onMenuClick={() => setSidebarOpen(true)} />
      
      <div className="admin-content">
        <AdminSidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
        />
        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </>
  );
};

export default AdminLayout;