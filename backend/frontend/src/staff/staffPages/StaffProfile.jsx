// src/staff/staffPages/StaffProfile.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom"; // 👈 Add this
import "./css/StaffProfile.css";

const StaffProfile = () => {
  const navigate = useNavigate(); // 👈 Initialize navigate

  const [profile, setProfile] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    address: "",
    contact_number: ""
  });

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("staff_token");

  // Load profile on mount
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
          middle_name: middle_name || "",
          last_name: last_name || "",
          address: address || "",
          contact_number: contact_number || ""
        });
      })
      .catch(() => {
        setErrorMessage("Failed to load profile.");
      });
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!token) {
      setErrorMessage("You must be logged in.");
      return;
    }

    if (!profile.first_name.trim() || !profile.last_name.trim()) {
      setErrorMessage("First Name and Last Name are required.");
      return;
    }

    setLoading(true);
    setMessage("");
    setErrorMessage("");

    try {
      const response = await axios.put(
        "http://localhost:8000/auth/users/me/",
        profile,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          }
        }
      );

      setProfile({
        first_name: response.data.first_name || "",
        middle_name: response.data.middle_name || "",
        last_name: response.data.last_name || "",
        address: response.data.address || "",
        contact_number: response.data.contact_number || ""
      });

      setMessage("✅ Profile updated successfully!");
      setIsEditing(false);

      const staffData = localStorage.getItem("staff_token");
      if (staffData) {
        try {
          const parsed = JSON.parse(staffData);
          localStorage.setItem("staff_token", JSON.stringify({ ...parsed, ...profile }));
        } catch (e) {
          console.warn("Failed to update staff_token in localStorage");
        }
      }
    } catch (err) {
      console.error("Error updating profile:", err.response?.data || err.message);
      setErrorMessage("❌ Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    axios
      .get("http://localhost:8000/auth/users/me/", {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then((res) => {
        const { first_name, last_name, middle_name, address, contact_number } = res.data;
        setProfile({
          first_name: first_name || "",
          middle_name: middle_name || "",
          last_name: last_name || "",
          address: address || "",
          contact_number: contact_number || ""
        });
        setIsEditing(false);
      })
      .catch(() => {
        setErrorMessage("Failed to reload profile.");
      });
  };

  const handleLogout = () => {
    localStorage.removeItem("staff_token");
    navigate("/staff/login");
  };

  // 👇 Handle back navigation
  const handleBack = () => {
    navigate(-1); // Go back to previous page
  };

  return (
    <div className="staff-profile-container">
      {/* Back Button - Bottom Left */}
      <button 
        onClick={handleBack}
        className="back-button"
        aria-label="Go back"
      >
        ←
      </button>

      <h2 className="title">👤 Staff Profile</h2>

      {(message || errorMessage) && (
        <div className={`alert ${message ? "alert-success" : "alert-error"}`}>
          {message || errorMessage}
        </div>
      )}

      <div className="profile-card">
        <form onSubmit={handleSave}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="first_name">First Name *</label>
              <input
                id="first_name"
                type="text"
                name="first_name"
                value={profile.first_name}
                onChange={handleInputChange}
                required
                disabled={!isEditing || loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="middle_name">Middle Name</label>
              <input
                id="middle_name"
                type="text"
                name="middle_name"
                value={profile.middle_name}
                onChange={handleInputChange}
                disabled={!isEditing || loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="last_name">Last Name *</label>
              <input
                id="last_name"
                type="text"
                name="last_name"
                value={profile.last_name}
                onChange={handleInputChange}
                required
                disabled={!isEditing || loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="contact_number">Phone Number</label>
            <input
              id="contact_number"
              type="tel"
              name="contact_number"
              value={profile.contact_number}
              onChange={handleInputChange}
              disabled={!isEditing || loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="address">Address</label>
            <textarea
              id="address"
              name="address"
              value={profile.address}
              onChange={handleInputChange}
              disabled={!isEditing || loading}
              rows="3"
            />
          </div>

          <div className="button-group">
            {isEditing ? (
              <>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="btn btn-secondary"
                  disabled={loading}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="btn btn-edit"
              >
                Edit Profile
              </button>
            )}
          </div>
        </form>

        <div className="logout-section">
          <button onClick={handleLogout} className="btn btn-logout">
            🔒 Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default StaffProfile;