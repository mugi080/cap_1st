// src/components/admin/AdminSidebar.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './css/AdminSidebar.css';

const AdminSidebar = ({ isOpen, onClose }) => {
  const location = useLocation();

  const navItems = [
    { to: "/admin/dashboard", label: "Dashboard" },
    { to: "/admin/orders", label: "Orders" },
    { to: "/admin/inventory", label: "Inventory" },
    { to: "/admin/custom-users", label: "Users" },
    { to: "/admin/vehicles", label: "Vehicles" },
    { to: "/admin/logistics", label: "Logistics" },
    { to: "/admin/reviews", label: "Reviews" },
    { to: "/admin/analytics", label: "Analytics" },
    { to: "/admin/download-reports", label: "Download Reports" },
  ];

  return (
    <div className={`admin-sidebar ${isOpen ? 'sidebar-open' : ''}`}>
      <button className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">
        ✕
      </button>

      <h2 className="sidebar-title">Admin Panel</h2>
      <ul>
        {navItems.map((item) => (
          <li key={item.to}>
            <Link
              to={item.to}
              className={`sidebar-link ${location.pathname === item.to ? 'active' : ''}`}
              onClick={onClose}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AdminSidebar;