import React, { useEffect, useState } from "react";
import axios from "axios";
import "./css/CustomUserTable.css";

const CustomUserTable = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [newUser, setNewUser] = useState({
    first_name: "",
    last_name: "",
    role: "user",
    email: "",
  });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const token =
    localStorage.getItem("admin_token") || localStorage.getItem("access");

  // Fetch users
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

  // Filter users
  useEffect(() => {
    if (!users.length) return;
    const filtered = users.filter((user) => {
      const matchesSearch =
        user.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.id.toString().includes(searchQuery);
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
    setFilteredUsers(filtered);
  }, [searchQuery, roleFilter, users]);

  // Load on mount
  useEffect(() => {
    if (!token) {
      setMessage("Admin token not found. Please log in.");
      return;
    }
    fetchUsers();
  }, []);

  // Modal handlers
  const handleEditClick = (user) => {
    setEditingUser(user);
    setNewUser({ ...user });
    setIsEditModalOpen(true);
  };

  const closeModal = () => {
    setIsEditModalOpen(false);
    setIsNewUserModalOpen(false);
    setEditingUser(null);
    setNewUser({
      first_name: "",
      last_name: "",
      role: "user",
      email: "",
    });
  };

  // Save edit
  const handleSaveEdit = async () => {
    const url = `http://localhost:8000/api/admin/users/${editingUser.id}/`;
    try {
      const res = await axios.put(url, newUser, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === editingUser.id ? res.data : u))
      );
      setMessage(`User #${editingUser.id} updated successfully!`);
      closeModal();
    } catch (err) {
      console.error("Error saving user:", err.response?.data || err.message);
      setMessage(`Failed to update user #${editingUser.id}.`);
    }
    setTimeout(() => setMessage(""), 4000);
  };

  // Create new user
  const handleCreateUser = async () => {
    let payload = { ...newUser };
    if (!payload.email.trim()) {
      payload.email = `${Math.random()
        .toString(36)
        .substring(2, 15)}@internal.local`;
    }
    const url = `http://localhost:8000/api/admin/users/`;
    try {
      const res = await axios.post(url, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers([...users, res.data]);
      setMessage(`User "${newUser.first_name}" created successfully!`);
      closeModal();
    } catch (err) {
      console.error("Error creating user:", err.response?.data || err.message);
      setMessage("Failed to create user.");
    }
    setTimeout(() => setMessage(""), 4000);
  };

  // Unique roles
  const getUniqueRoles = () => {
    const roles = new Set(users.map((user) => user.role).filter(Boolean));
    return ["all", ...Array.from(roles)];
  };

  return (
    <div className="user-container">
      {/* Toast / Alert */}
      {message && (
        <div
          className={`alert ${
            message.toLowerCase().includes("failed") ? "error" : "success"
          }`}
        >
          {message}
        </div>
      )}

      <h2>👥 Registered Users & Staff</h2>

      {/* Controls */}
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
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </option>
          ))}
        </select>

        <button onClick={() => setIsNewUserModalOpen(true)}>
          Create New User
        </button>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="user-table">
          <thead>
            <tr>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Date Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty">
                  No users found.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>{user.first_name || "--"}</td>
                  <td>{user.last_name || "--"}</td>
                  <td>
                    <span style={{ fontWeight: "bold" }}>{user.email}</span>
                  </td>
                  <td>{user.role || "N/A"}</td>
                  <td>{new Date(user.date_joined).toLocaleDateString()}</td>
                  <td>
                    <button onClick={() => handleEditClick(user)}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>✏️ Edit User</h3>
            <label>
              First Name:
              <input
                name="first_name"
                value={newUser.first_name}
                onChange={(e) =>
                  setNewUser((prev) => ({
                    ...prev,
                    [e.target.name]: e.target.value,
                  }))
                }
                className="input-field"
              />
            </label>
            <label>
              Last Name:
              <input
                name="last_name"
                value={newUser.last_name}
                onChange={(e) =>
                  setNewUser((prev) => ({
                    ...prev,
                    [e.target.name]: e.target.value,
                  }))
                }
                className="input-field"
              />
            </label>
            <label>
              Email:
              <input
                name="email"
                type="email"
                value={newUser.email}
                onChange={(e) =>
                  setNewUser((prev) => ({
                    ...prev,
                    [e.target.name]: e.target.value,
                  }))
                }
                className="input-field"
              />
            </label>
            <label>
              Role:
              <select
                name="role"
                value={newUser.role}
                onChange={(e) =>
                  setNewUser((prev) => ({
                    ...prev,
                    role: e.target.value,
                  }))
                }
                className="select-field"
              >
                <option value="user">Customer</option>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <div className="modal-actions">
              <button onClick={handleSaveEdit}>Save</button>
              <button onClick={closeModal}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isNewUserModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>➕ Create New User</h3>
            <label>
              First Name:
              <input
                name="first_name"
                value={newUser.first_name}
                onChange={(e) =>
                  setNewUser((prev) => ({
                    ...prev,
                    [e.target.name]: e.target.value,
                  }))
                }
                className="input-field"
              />
            </label>
            <label>
              Last Name:
              <input
                name="last_name"
                value={newUser.last_name}
                onChange={(e) =>
                  setNewUser((prev) => ({
                    ...prev,
                    [e.target.name]: e.target.value,
                  }))
                }
                className="input-field"
              />
            </label>
            <label>
              Email:
              <input
                name="email"
                type="email"
                value={newUser.email}
                onChange={(e) =>
                  setNewUser((prev) => ({
                    ...prev,
                    [e.target.name]: e.target.value,
                  }))
                }
                className="input-field"
              />
            </label>
            <label>
              Role:
              <select
                name="role"
                value={newUser.role}
                onChange={(e) =>
                  setNewUser((prev) => ({
                    ...prev,
                    role: e.target.value,
                  }))
                }
                className="select-field"
              >
                <option value="user">Customer</option>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <div className="modal-actions">
              <button onClick={handleCreateUser}>Create</button>
              <button onClick={closeModal}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomUserTable;