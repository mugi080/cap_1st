// src/pages/admin/AdminRoleRequests.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './AdminRoleRequests.css'; 


const AdminRoleRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRequests = async () => {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        navigate('/admin/login');
        return;
      }

      try {
        const meResponse = await axios.get('http://localhost:8000/auth/users/me/', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!meResponse.data.is_staff && !meResponse.data.is_superuser) {
          alert('Access Denied: You are not an admin.');
          navigate('/admin/login');
          return;
        }

        const response = await axios.get('http://localhost:8000/api/admin/role-requests/', {
          headers: { Authorization: `Bearer ${token}` },
        });

        setRequests(response.data || []);
      } catch (error) {
        console.error('Failed to fetch role requests', error);
        setError('Failed to load role requests');
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [navigate]);

  const handleApprove = async (id) => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await axios.patch(
        `http://localhost:8000/api/admin/role-requests/${id}/approve/`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(response.data.detail);
      setRequests(requests.filter((req) => req.id !== id));
    } catch (error) {
      console.error('Failed to approve request', error);
      alert('Failed to approve the role request');
    }
  };

  const handleReject = async (id) => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await axios.patch(
        `http://localhost:8000/api/admin/role-requests/${id}/reject/`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(response.data.detail);
      setRequests(requests.filter((req) => req.id !== id));
    } catch (error) {
      console.error('Failed to reject request', error);
      alert('Failed to reject the role request');
    }
  };

  // ✅ Render logic: handle all states cleanly
  if (loading) {
    return (
      <div className="role-requests-container">
        <h2>Role Requests</h2>
        <p className="loading-state">Loading requests...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="role-requests-container">
        <h2>Role Requests</h2>
        <p className="error-state">{error}</p>
      </div>
    );
  }

  return (
    <div className="role-requests-container">
      <h2>Role Requests</h2>

      {requests.length === 0 ? (
        // ✅ Show "No request" ONLY when there are no requests
        <p className="empty-state">No request for now!!</p>
      ) : (
        // ✅ Show list when requests exist
        <ul className="requests-list">
          {requests.map((req) => (
            <li key={req.id} className="request-item">
              <div className="request-header">
                <strong className="user-email">{req.user.email}</strong>
                <span className="requested-role">{req.requested_role}</span>
              </div>
              <div className="message-section">
                Message: {req.message || "No message provided."}
              </div>
              {req.status === 'pending' && (
                <div className="action-buttons">
                  <button onClick={() => handleApprove(req.id)} className="btn-approve">
                    Approve
                  </button>
                  <button onClick={() => handleReject(req.id)} className="btn-reject">
                    Reject
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AdminRoleRequests;