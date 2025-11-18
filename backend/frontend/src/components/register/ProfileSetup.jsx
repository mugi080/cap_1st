// src/components/user/ProfileSetup.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./ProfileSetup.css";

const ProfileSetup = () => {
  const navigate = useNavigate();

  // Full user profile state
  const [profileData, setProfileData] = useState({
    email: "",
    first_name: "",
    middle_name: "",
    last_name: "",
    address: "",
    contact_number: "",
    role: "",
  });

  const [isLoaded, setIsLoaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("access_token");
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        const response = await axios.get("http://127.0.0.1:8000/auth/users/me/", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        console.log("✅ API Response:", response.data); // 🔥 Debug: Check if middle_name is here

        // Populate all fields — even if backend returns null
        setProfileData({
          email: response.data.email || "",
          first_name: response.data.first_name || "",
          middle_name: response.data.middle_name || "", // ✅ If API returns it, it's set
          last_name: response.data.last_name || "",
          address: response.data.address || "",
          contact_number: response.data.contact_number || "",
          role: response.data.role || "user",
        });
      } catch (err) {
        console.error("❌ Error fetching profile:", err);
        setError("Failed to load profile. Please log in again.");
        setTimeout(() => navigate("/login"), 2000);
      } finally {
        setIsLoaded(true);
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfileData({ ...profileData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("access_token");
      
      console.log("📤 Sending to API:", profileData); // 🔥 Debug: What are we sending?

      await axios.put(
        "http://127.0.0.1:8000/auth/users/me/",
        profileData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // ✅ Update localStorage with new data
      const updatedUser = { ...profileData };
      localStorage.setItem("user_data", JSON.stringify(updatedUser));

      setSuccess("Profile updated successfully!");
      setTimeout(() => navigate("/profile"), 1500);
    } catch (err) {
      console.error("❌ Update failed:", err.response?.data || err.message);
      setError(
        err.response?.data?.detail ||
        Object.values(err.response?.data || {})
          .flat()
          .join(", ") ||
        "Update failed. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="profile-setup-container">
        <div className="loading">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="profile-setup-container">
      <div className="header">
        <h1>Complete Your Profile</h1>
        <p>Fill in your details to personalize your experience</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={handleSubmit} className="profile-form">
        {/* Name Fields */}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="first_name">First Name *</label>
            <input
              id="first_name"
              name="first_name"
              type="text"
              value={profileData.first_name}
              onChange={handleChange}
              placeholder="John"
              required
            />
          </div>

          {/* ✅ Middle Name Input — Now Guaranteed Visible */}
          <div className="form-group">
            <label htmlFor="middle_name">Middle Name</label>
            <input
              id="middle_name"
              name="middle_name"
              type="text"
              value={profileData.middle_name}
              onChange={handleChange}
              placeholder="Optional"
              style={{ fontWeight: '500' }} // Make it stand out for testing
            />
          </div>

          <div className="form-group">
            <label htmlFor="last_name">Last Name *</label>
            <input
              id="last_name"
              name="last_name"
              type="text"
              value={profileData.last_name}
              onChange={handleChange}
              placeholder="Doe"
              required
            />
          </div>
        </div>

        {/* Email (Readonly) */}
        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            name="email"
            type="email"
            value={profileData.email}
            readOnly
            disabled
            className="readonly"
          />
        </div>

        {/* Contact & Address */}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="contact_number">Phone Number</label>
            <input
              id="contact_number"
              name="contact_number"
              type="tel"
              value={profileData.contact_number}
              onChange={handleChange}
              placeholder="+1 (555) 123-4567"
            />
          </div>

          <div className="form-group">
            <label htmlFor="role">Role</label>
            <input
              id="role"
              name="role"
              type="text"
              value={profileData.role}
              readOnly
              disabled
              className="readonly"
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="address">Address</label>
          <textarea
            id="address"
            name="address"
            value={profileData.address}
            onChange={handleChange}
            placeholder="123 Main St, City, State, ZIP"
            rows="3"
          />
        </div>

        <button type="submit" disabled={isSubmitting} className="btn btn-primary">
          {isSubmitting ? (
            <>
              <span className="spinner"></span>
              Saving Changes...
            </>
          ) : (
            "Save Profile"
          )}
        </button>
      </form>

      <div className="extra-links">
        <a href="/change-password">Change Password</a>
        <span> | </span>
        <a href="/forgot-password">Forgot Password?</a>
      </div>
    </div>
  );
};

export default ProfileSetup;