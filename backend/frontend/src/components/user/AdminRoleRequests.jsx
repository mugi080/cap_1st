import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AdminRoleRequests = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchRequests = async () => {
            const token = localStorage.getItem('admin_token');
            if (!token) {
                // If no token, redirect to login page
                navigate('/admin/login');
                return;
            }

            try {
                // Check if the logged-in user is an admin by fetching their info
                const meResponse = await axios.get('http://localhost:8000/auth/users/me/', {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (!meResponse.data.is_staff && !meResponse.data.is_superuser) {
                    // If the user is not an admin, show access denied message
                    alert('Access Denied: You are not an admin.');
                    navigate('/admin/login');
                    return;
                }

                // If the user is authorized, proceed to fetch the role requests
                const response = await axios.get('http://localhost:8000/api/admin/role-requests/', {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                setRequests(response.data);
            } catch (error) {
                console.error('Failed to fetch role requests', error);
                setError('Failed to load role requests');
            }
            setLoading(false);
        };

        fetchRequests();
    }, [navigate]);

    const handleApprove = async (id) => {
        try {
            const token = localStorage.getItem('admin_token');
            const response = await axios.patch(
                `http://localhost:8000/api/admin/role-requests/${id}/approve/`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            alert(response.data.detail);
            // Remove approved request from the list
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
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            alert(response.data.detail);
            // Remove rejected request from the list
            setRequests(requests.filter((req) => req.id !== id));
        } catch (error) {
            console.error('Failed to reject request', error);
            alert('Failed to reject the role request');
        }
    };

    return (
        <div>
            <h2>No request for now!!</h2>
            {loading ? (
                <p>Loading...</p>
            ) : error ? (
                <p>{error}</p>
            ) : (
                <ul>
                    {requests.map((req) => (
                        <li key={req.id}>
                            <strong>{req.user.email}</strong> requested <em>{req.requested_role}</em>
                            <br />
                            Message: {req.message}
                            <div>
                                {req.status === 'pending' && (
                                    <>
                                        <button onClick={() => handleApprove(req.id)}>Approve</button>
                                        <button onClick={() => handleReject(req.id)}>Reject</button>
                                    </>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default AdminRoleRequests;
