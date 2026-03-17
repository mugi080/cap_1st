// src/components/user/UserProfile.jsx
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import LocationPicker from "../../pages/ordering/LocationPicker"; // Adjust path as needed
import "./UserProfile.css";

const UserProfile = () => {
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    address: "",
    contact_number: "",
    profile_picture: null,
  });

  const [profileImage, setProfileImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);

  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    re_new_password: "",
  });

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);

  const token = localStorage.getItem("access_token");

  useEffect(() => {
    if (!token) {
      setErrorMessage("Authentication required.");
      return;
    }

    axios
      .get("http://localhost:8000/auth/users/me/", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const data = res.data;
        setProfile({
          first_name: data.first_name || "",
          middle_name: data.middle_name || "",
          last_name: data.last_name || "",
          address: data.address || "",
          contact_number: data.contact_number || "",
        });
        setProfileImage(data.profile_picture || null);
      })
      .catch(() => {
        setErrorMessage("Failed to load profile.");
      });
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => setProfileImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleLocationSelect = (location) => {
    setSelectedLocation(location);
    setProfile((prev) => ({ ...prev, address: location.address }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoadingProfile(true);
    setMessage("");
    setErrorMessage("");

    try {
      const formData = new FormData();
      Object.entries(profile).forEach(([key, value]) => {
        if (value !== "") formData.append(key, value);
      });
      if (imageFile) formData.append("profile_picture", imageFile);

      await axios.patch("http://localhost:8000/api/profile/update/", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      setMessage("✅ Profile updated successfully.");
      const updatedUser = JSON.parse(localStorage.getItem("user_data") || "{}");
      localStorage.setItem("user_data", JSON.stringify({ ...updatedUser, ...profile }));
    } catch (err) {
      console.error("Error:", err);
      setErrorMessage("❌ Failed to update profile.");
    } finally {
      setLoadingProfile(false);
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordData.new_password !== passwordData.re_new_password) {
      setErrorMessage("⚠️ Passwords do not match.");
      return;
    }
    setLoadingPassword(true);
    setMessage("");
    setErrorMessage("");

    axios
      .post("http://localhost:8000/auth/users/set_password/", passwordData, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(() => {
        setMessage("✅ Password changed successfully.");
        setPasswordData({ current_password: "", new_password: "", re_new_password: "" });
      })
      .catch(() => {
        setErrorMessage("❌ Failed to change password.");
      })
      .finally(() => setLoadingPassword(false));
  };

  return (
    <div className="user-profile-container">
      <h2 className="title">👤 Account Settings</h2>

      {message && <div className="alert alert-success">{message}</div>}
      {errorMessage && <div className="alert alert-error">{errorMessage}</div>}

      <div className="forms-container">
        {/* Profile Section */}
        <div className="profile-section">
          <h3 className="subtitle">Edit Profile</h3>

          {/* Profile Picture */}
          <div className="profile-picture-section">
            <div
              className="profile-picture-preview"
              onClick={triggerFileInput}
              style={{
                backgroundImage: profileImage ? `url(${profileImage})` : "none",
                backgroundColor: profileImage ? "transparent" : "#f0f0f0",
              }}
            >
              {!profileImage && <span>👤</span>}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/jpeg,image/png"
              style={{ display: "none" }}
            />
            <p className="photo-hint">Click to change photo</p>
          </div>

          <form onSubmit={handleProfileSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>First Name *</label>
                <input
                  value={profile.first_name}
                  onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Middle Name</label>
                <input
                  value={profile.middle_name}
                  onChange={(e) => setProfile({ ...profile, middle_name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Last Name *</label>
                <input
                  value={profile.last_name}
                  onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input
                value={profile.contact_number}
                onChange={(e) => setProfile({ ...profile, contact_number: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Address (Select on Map)</label>
              <LocationPicker onLocationSelect={handleLocationSelect} />
              {profile.address && (
                <input
                  type="text"
                  value={profile.address}
                  readOnly
                  className="readonly"
                  style={{ marginTop: "10px" }}
                />
              )}
            </div>

            <button type="submit" disabled={loadingProfile} className="btn btn-primary">
              {loadingProfile ? "Saving..." : "Save Profile"}
            </button>
          </form>
        </div>

        {/* Password Section */}
        <div className="password-section">
          <h3 className="subtitle">🔐 Change Password</h3>
          <form onSubmit={handlePasswordSubmit}>
            <div className="form-group">
              <label>Current Password *</label>
              <input
                type="password"
                value={passwordData.current_password}
                onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>New Password *</label>
              <input
                type="password"
                value={passwordData.new_password}
                onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                required
                minLength="8"
              />
            </div>
            <div className="form-group">
              <label>Confirm New Password *</label>
              <input
                type="password"
                value={passwordData.re_new_password}
                onChange={(e) => setPasswordData({ ...passwordData, re_new_password: e.target.value })}
                required
              />
            </div>
            <button type="submit" disabled={loadingPassword} className="btn btn-secondary">
              {loadingPassword ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;