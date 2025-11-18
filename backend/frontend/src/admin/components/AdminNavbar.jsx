// src/components/admin/AdminNavbar.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/logo.png';
import './css/AdminNavbar.css';

const AdminNavbar = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const adminData = JSON.parse(localStorage.getItem('admin_data'));

  if (!adminData) return null;

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_data');
    navigate('/admin/login');
  };

  const goToProfile = () => {
    navigate('/admin/profile');
  };

  return (
    <div className="admin-navbar">
      <button className="menu-toggle" onClick={onMenuClick} aria-label="Open menu">
        ☰
      </button>

      <div className="logo-container">
        <img src={logo} alt="Logo" className="admin-logo" />
      </div>

      <div className="navbar-right">
        <span className="welcome-message">
          Welcome, <span className="admin-name">{adminData.first_name}</span>
        </span>
        <button className="profile-btn" onClick={goToProfile} aria-label="Profile">
          👤
        </button>
        <button className="logout-btn" onClick={logout} aria-label="Logout">
          Logout
        </button>
      </div>
    </div>
  );
};

export default AdminNavbar;