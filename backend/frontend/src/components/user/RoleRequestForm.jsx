import React, { useState } from 'react';
import axios from 'axios';

const RoleRequestForm = () => {
    const [role, setRole] = useState('');
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const token = localStorage.getItem('access');  // Get the JWT token from localStorage

        if (!token) {
            setStatus('Please log in first.');
            setIsSubmitting(false);
            return;
        }

        try {
            const response = await axios.post(
                'http://localhost:8000/api/role-requests/',
                {
                    requested_role: role,
                    message: message,
                },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,  // Include token in the Authorization header
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (response.status === 201) {
                setStatus('Role request submitted successfully.');
            } else {
                setStatus('Error submitting request.');
            }
        } catch (error) {
            setStatus('Error submitting request. Please try again.');
        }

        setIsSubmitting(false);
    };

    return (
        <div>
            <h2>Submit Role Request</h2>
            <form onSubmit={handleSubmit}>
                <div>
                    <label>Requested Role:</label>
                    <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        required
                    >
                        <option value="">Select Role</option>
                        <option value="staff">Staff</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                <div>
                    <label>Message:</label>
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Why do you want this role?"
                    />
                </div>
                <button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
            </form>
            {status && <p>{status}</p>}
        </div>
    );
};

export default RoleRequestForm;
