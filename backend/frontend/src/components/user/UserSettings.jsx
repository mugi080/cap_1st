// src/components/UserSettings.jsx
import React, { useState } from 'react';
import axios from 'axios';
import './UserSettings.css';

const UserSettings = () => {
  // Only one tab now, but sidebar stays for future expansion
  const [activeTab, setActiveTab] = useState('role'); // Default to role

  const [role, setRole] = useState('');
  const [message, setMessage] = useState('');
  const [requestStatus, setRequestStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRoleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setRequestStatus('');

    const token = localStorage.getItem('access') || localStorage.getItem('admin_token');
    if (!token) {
      setRequestStatus('❌ Please log in to submit a request.');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await axios.post(
        'http://localhost:8000/api/role-requests/',
        {
          requested_role: role,
          message: message.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 201) {
        setRequestStatus('✅ Role request submitted! An admin will review it soon.');
        setRole('');
        setMessage('');
      } else {
        setRequestStatus('❌ Failed to submit request. Please try again.');
      }
    } catch (error) {
      setRequestStatus('❌ An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ Render only Role section (sidebar remains for consistency/future)
  const renderContent = () => {
    return (
      <div className="settings-card">
        <h3>🔐 Role & Permissions</h3>
        <p>Request to change your account role. Admins will review your request.</p>
        <form onSubmit={handleRoleSubmit} className="role-request-form">
          <div className="form-group">
            <label>Requested Role:</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} required>
              <option value="">Select Role</option>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="form-group">
            <label>Message (Optional):</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Why should we grant you this role?"
              rows="3"
            />
          </div>
          <button
            type="submit"
            className="btn-edit"
            disabled={isSubmitting || !role}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>
        {requestStatus && (
          <p className={`notification ${requestStatus.includes('✅') ? 'success' : 'error'}`}>
            {requestStatus}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="user-settings-container">
      <h2 className="page-title">⚙️ Settings</h2>

      <div className="settings-layout">
        {/* ✅ SIDEBAR KEPT — ready for future tabs */}
        <aside className="settings-sidebar">
          <nav>
            <button
              className={`sidebar-link ${activeTab === 'role' ? 'active' : ''}`}
              onClick={() => setActiveTab('role')}
            >
              🔐 Role Request
            </button>
            {/* Add more buttons here later */}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="settings-main">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default UserSettings;