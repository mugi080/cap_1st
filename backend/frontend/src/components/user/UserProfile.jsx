// src/components/user/UserProfile.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import "./UserProfile.css"; // Optional: add styling

const UserProfile = () => {
  const [profile, setProfile] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    address: "",
    contact_number: ""
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

  const token = localStorage.getItem("access_token");

  // Load profile data on mount
  useEffect(() => {
    if (!token) {
      setErrorMessage("Authentication required.");
      return;
    }

    axios
      .get("http://localhost:8000/auth/users/me/", {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then((res) => {
        const { first_name, last_name, middle_name, address, contact_number } = res.data;
        setProfile({
          first_name: first_name || "",
          middle_name: middle_name || "",  // ✅ Added
          last_name: last_name || "",
          address: address || "",
          contact_number: contact_number || ""
        });
      })
      .catch(() => {
        setErrorMessage("Failed to load profile.");
      });
  }, []);

  // Save profile changes (PUT)
  const handleProfileSubmit = (e) => {
    e.preventDefault();
    setLoadingProfile(true);
    setMessage("");
    setErrorMessage("");

    axios
      .put("http://localhost:8000/auth/users/me/", profile, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(() => {
        setMessage("✅ Profile updated successfully.");

        // ✅ Update localStorage
        const updatedUser = JSON.parse(localStorage.getItem("user_data") || "{}");
        localStorage.setItem("user_data", JSON.stringify({ ...updatedUser, ...profile }));

        setLoadingProfile(false);
      })
      .catch((err) => {
        console.error("Error updating profile:", err.response?.data || err.message);
        setErrorMessage("❌ Failed to update profile.");
        setLoadingProfile(false);
      });
  };

  // Change password (POST)
  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    setLoadingPassword(true);
    setMessage("");
    setErrorMessage("");

    if (passwordData.new_password !== passwordData.re_new_password) {
      setErrorMessage("⚠️ New password and confirmation do not match.");
      setLoadingPassword(false);
      return;
    }

    axios
      .post("http://localhost:8000/auth/users/set_password/", passwordData, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(() => {
        setMessage("✅ Password changed successfully.");
        setPasswordData({ current_password: "", new_password: "", re_new_password: "" });
        setLoadingPassword(false);
      })
      .catch((err) => {
        console.error("Error changing password:", err.response?.data || err.message);
        setErrorMessage("❌ Failed to change password. Check current password.");
        setLoadingPassword(false);
      });
  };

  return (
    <div className="user-profile-container">
      <h2 className="title">👤 Account Settings</h2>

      <div className="forms-container">
        {/* Profile Form */}
        <form onSubmit={handleProfileSubmit} className="profile-form">
          <h3 className="subtitle">Edit Profile</h3>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="first_name">First Name *</label>
              <input
                id="first_name"
                type="text"
                value={profile.first_name}
                onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                required
                disabled={loadingProfile}
              />
            </div>

            <div className="form-group">
              <label htmlFor="middle_name">Middle Name</label>
              <input
                id="middle_name"
                type="text"
                value={profile.middle_name}
                onChange={(e) => setProfile({ ...profile, middle_name: e.target.value })}
                disabled={loadingProfile}
              />
            </div>

            <div className="form-group">
              <label htmlFor="last_name">Last Name *</label>
              <input
                id="last_name"
                type="text"
                value={profile.last_name}
                onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                required
                disabled={loadingProfile}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="contact_number">Phone Number</label>
            <input
              id="contact_number"
              type="tel"
              value={profile.contact_number}
              onChange={(e) => setProfile({ ...profile, contact_number: e.target.value })}
              disabled={loadingProfile}
            />
          </div>

          <div className="form-group">
            <label htmlFor="address">Address</label>
            <textarea
              id="address"
              value={profile.address}
              onChange={(e) => setProfile({ ...profile, address: e.target.value })}
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

        {/* Password Form */}
        <form onSubmit={handlePasswordSubmit} className="password-form">
          <h3 className="subtitle">🔐 Change Password</h3>

          <div className="form-group">
            <label htmlFor="current_password">Current Password *</label>
            <input
              id="current_password"
              type="password"
              value={passwordData.current_password}
              onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
              required
              disabled={loadingPassword}
            />
          </div>

          <div className="form-group">
            <label htmlFor="new_password">New Password *</label>
            <input
              id="new_password"
              type="password"
              value={passwordData.new_password}
              onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
              required
              disabled={loadingPassword}
              minLength="8"
            />
          </div>

          <div className="form-group">
            <label htmlFor="re_new_password">Confirm New Password *</label>
            <input
              id="re_new_password"
              type="password"
              value={passwordData.re_new_password}
              onChange={(e) => setPasswordData({ ...passwordData, re_new_password: e.target.value })}
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

      {/* Alert Message */}
      {(message || errorMessage) && (
        <div className={`alert ${message ? "alert-success" : "alert-error"}`}>
          {message || errorMessage}
        </div>
      )}
    </div>
  );
};

export default UserProfile;