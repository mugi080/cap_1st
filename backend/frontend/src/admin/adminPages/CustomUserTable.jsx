// src/pages/admin/CustomUserTable.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./css/CustomUserTable.css";

const CustomUserTable = () => {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const token = localStorage.getItem("admin_token") || localStorage.getItem("access");

  // Form state — default role is "staff" for new hires
  const [formData, setFormData] = useState({
    email: "",
    first_name: "",
    middle_name: "",
    last_name: "",
    role: "staff", // 👈 Default to staff (not admin)
    password: "",
    contact_number: "",
    address: ""
  });

  const fetchUsers = async () => {
    try {
      const res = await axios.get("http://localhost:8000/api/admin/users/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data);
      setFilteredUsers(res.data);
    } catch (err) {
      console.error("Error fetching users:", err.response?.data || err.message);
      setMessage("Failed to load users.");
    }
  };

  useEffect(() => {
    if (!users.length) return;
    const filtered = users.filter((user) => {
      const matchesSearch =
        user.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.middle_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.id.toString().includes(searchQuery);
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
    setFilteredUsers(filtered);
  }, [searchQuery, roleFilter, users]);

  useEffect(() => {
    if (!token) {
      setMessage("Admin token not found. Please log in.");
      return;
    }
    fetchUsers();
  }, []);

  const getUniqueRoles = () => {
    const roles = new Set(users.map((user) => user.role).filter(Boolean));
    return ["all", ...Array.from(roles)];
  };

  const getFullName = (user) => {
    const parts = [user.first_name, user.middle_name, user.last_name].filter(Boolean);
    return parts.length ? parts.join(" ") : "--";
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!formData.email || !formData.password) {
      setMessage("Email and password are required.");
      return;
    }

    // 🔒 Prevent admin creation via UI
    if (formData.role === "admin") {
      setMessage("Admin accounts cannot be created here. Use Django Admin instead.");
      return;
    }

    try {
      const res = await axios.post(
        "http://localhost:8000/api/admin/users/",
        formData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setMessage("User created successfully!");
      setShowCreateModal(false);
      setFormData({
        email: "",
        first_name: "",
        middle_name: "",
        last_name: "",
        role: "staff",
        password: "",
        contact_number: "",
        address: ""
      });
      fetchUsers();
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.detail || "Failed to create user.";
      console.error("Create user error:", err.response?.data || err.message);
      setMessage(`Error: ${errorMsg}`);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="user-container">
      {message && (
        <div className={`alert ${message.toLowerCase().includes("error") || message.toLowerCase().includes("failed") ? "error" : "success"}`}>
          {message}
        </div>
      )}

      <h2>User Accounts</h2>

      {/* Controls Bar — NO ROLE REQUESTS */}
      <div className="controls">
        <input
          type="text"
          placeholder="Search by name or ID"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input-field"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="select-field"
        >
          {getUniqueRoles().map((role) => (
            <option key={role} value={role}>
              {role === "all" ? "All Roles" : role.charAt(0).toUpperCase() + role.slice(1)}
            </option>
          ))}
        </select>

        {/* ✅ CREATE USER BUTTON — no role requests */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-create-user"
        >
          + Create User
        </button>
      </div>

      <div className="table-wrapper">
        <table className="user-table">
          <thead>
            <tr>
              <th>Full Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="4" className="empty">No users found.</td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td><strong>{getFullName(user)}</strong></td>
                  <td>{user.email || "—"} </td>
                  <td>
                    <span className={`role-badge role-${user.role || "user"}`}>
                      {user.role?.charAt(0).toUpperCase() + user.role?.slice(1) || "User"}
                    </span>
                  </td>
                  <td>{user.date_joined ? new Date(user.date_joined).toLocaleDateString() : "—"} </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ✅ CREATE USER MODAL — NO ADMIN OPTION */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Create New User</h3>
            <form onSubmit={handleCreateUser}>
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>Middle Name</label>
                <input
                  type="text"
                  name="middle_name"
                  value={formData.middle_name}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                >
                  {/* ❌ REMOVED "admin" option */}
                  <option value="user">Customer</option>
                  <option value="staff">Staff</option>
                </select>
              </div>
              <div className="form-group">
                <label>Password *</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Contact Number</label>
                <input
                  type="text"
                  name="contact_number"
                  value={formData.contact_number}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>Address</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows="2"
                />
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-cancel">
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomUserTable;