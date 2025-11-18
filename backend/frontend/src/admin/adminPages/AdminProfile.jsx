// src/components/admin/AdminProfile.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./css/AdminProfile.css";

const AdminProfile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    email: "",
    contact_number: "",
    address: ""
  });

  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    re_new_password: ""
  });

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);

  const token = localStorage.getItem("admin_token");

  // Fetch admin profile on mount
  useEffect(() => {
    if (!token) {
      navigate("/admin/login");
      return;
    }

    axios
      .get("http://localhost:8000/auth/users/me/", {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then((res) => {
        const { first_name, last_name, middle_name, email, contact_number, address } = res.data;
        setProfile({
          first_name: first_name || "",
          middle_name: middle_name || "",
          last_name: last_name || "",
          email: email || "",
          contact_number: contact_number || "",
          address: address || ""
        });
      })
      .catch(() => {
        setErrorMessage("Failed to load admin profile.");
      });
  }, [token, navigate]);

  // Handle profile input changes
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  // Handle password input changes
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  // Save profile updates
  const handleProfileSubmit = (e) => {
    e.preventDefault();
    if (!profile.first_name.trim() || !profile.last_name.trim()) {
      setErrorMessage("First Name and Last Name are required.");
      return;
    }

    setLoadingProfile(true);
    setMessage("");
    setErrorMessage("");

    axios
      .put("http://localhost:8000/auth/users/me/", profile, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then((res) => {
        const updatedProfile = res.data;
        setProfile({
          first_name: updatedProfile.first_name || "",
          middle_name: updatedProfile.middle_name || "",
          last_name: updatedProfile.last_name || "",
          email: updatedProfile.email || "",
          contact_number: updatedProfile.contact_number || "",
          address: updatedProfile.address || ""
        });

        // Update localStorage
        const adminData = JSON.parse(localStorage.getItem("admin_data") || "{}");
        localStorage.setItem("admin_data", JSON.stringify({ ...adminData, ...updatedProfile }));

        setMessage("✅ Profile updated successfully!");
        setLoadingProfile(false);
      })
      .catch((err) => {
        console.error("Profile update error:", err.response?.data);
        setErrorMessage("❌ Failed to update profile. Please try again.");
        setLoadingProfile(false);
      });
  };

  // Change password
  const handlePasswordSubmit = (e) => {
    e.preventDefault();

    if (!passwordData.current_password) {
      setErrorMessage("Current password is required.");
      return;
    }

    if (passwordData.new_password !== passwordData.re_new_password) {
      setErrorMessage("⚠️ New password and confirmation do not match.");
      return;
    }

    if (passwordData.new_password.length < 8) {
      setErrorMessage("⚠️ Password must be at least 8 characters long.");
      return;
    }

    setLoadingPassword(true);
    setMessage("");
    setErrorMessage("");

    axios
      .post("http://localhost:8000/auth/users/set_password/", passwordData, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(() => {
        setMessage("✅ Password changed successfully!");
        setPasswordData({ current_password: "", new_password: "", re_new_password: "" });
        setLoadingPassword(false);
      })
      .catch((err) => {
        console.error("Password change error:", err.response?.data);
        const detail = err.response?.data?.detail || err.response?.data?.new_password?.[0];
        setErrorMessage(`❌ ${detail || "Failed to change password. Please check your current password."}`);
        setLoadingPassword(false);
      });
  };

  // Go back to dashboard
  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="admin-profile-container">
      {/* Back Button */}
      <button onClick={handleBack} className="back-button" aria-label="Go back">
        ←
      </button>

      <h2 className="title">👤 Admin Profile</h2>

      {(message || errorMessage) && (
        <div className={`alert ${message ? "alert-success" : "alert-error"}`}>
          {message || errorMessage}
        </div>
      )}

      <div className="forms-container">
        {/* Profile Form */}
        <div className="card">
          <h3 className="subtitle">Edit Profile</h3>
          <form onSubmit={handleProfileSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="first_name">First Name *</label>
                <input
                  id="first_name"
                  type="text"
                  name="first_name"
                  value={profile.first_name}
                  onChange={handleProfileChange}
                  required
                  disabled={loadingProfile}
                />
              </div>

              <div className="form-group">
                <label htmlFor="middle_name">Middle Name</label>
                <input
                  id="middle_name"
                  type="text"
                  name="middle_name"
                  value={profile.middle_name}
                  onChange={handleProfileChange}
                  disabled={loadingProfile}
                />
              </div>

              <div className="form-group">
                <label htmlFor="last_name">Last Name *</label>
                <input
                  id="last_name"
                  type="text"
                  name="last_name"
                  value={profile.last_name}
                  onChange={handleProfileChange}
                  required
                  disabled={loadingProfile}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                id="email"
                type="email"
                name="email"
                value={profile.email}
                onChange={handleProfileChange}
                required
                disabled
              />
            </div>

            <div className="form-group">
              <label htmlFor="contact_number">Phone Number</label>
              <input
                id="contact_number"
                type="tel"
                name="contact_number"
                value={profile.contact_number}
                onChange={handleProfileChange}
                disabled={loadingProfile}
              />
            </div>

            <div className="form-group">
              <label htmlFor="address">Address</label>
              <textarea
                id="address"
                name="address"
                value={profile.address}
                onChange={handleProfileChange}
                disabled={loadingProfile}
                rows="3"
              />
            </div>

            <button
              type="submit"
              disabled={loadingProfile}
              className="btn btn-primary"
            >
              {loadingProfile ? "Saving..." : "Save Profile"}
            </button>
          </form>
        </div>

        {/* Password Form */}
        <div className="card">
          <h3 className="subtitle">🔐 Change Password</h3>
          <form onSubmit={handlePasswordSubmit}>
            <div className="form-group">
              <label htmlFor="current_password">Current Password *</label>
              <input
                id="current_password"
                type="password"
                name="current_password"
                value={passwordData.current_password}
                onChange={handlePasswordChange}
                required
                disabled={loadingPassword}
              />
            </div>

            <div className="form-group">
              <label htmlFor="new_password">New Password *</label>
              <input
                id="new_password"
                type="password"
                name="new_password"
                value={passwordData.new_password}
                onChange={handlePasswordChange}
                required
                minLength="8"
                disabled={loadingPassword}
              />
            </div>

            <div className="form-group">
              <label htmlFor="re_new_password">Confirm New Password *</label>
              <input
                id="re_new_password"
                type="password"
                name="re_new_password"
                value={passwordData.re_new_password}
                onChange={handlePasswordChange}
                required
                disabled={loadingPassword}
              />
            </div>

            <button
              type="submit"
              disabled={loadingPassword}
              className="btn btn-secondary"
            >
              {loadingPassword ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;