import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './StaffLogin.css';  // Import the custom CSS for this component

function StaffLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const loginHandler = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');  // Reset message on each attempt

    try {
      const response = await axios.post(
        'http://localhost:8000/auth/jwt/create/',
        { email, password },
        { headers: { 'Content-Type': 'application/json' } }
      );

      const access = response.data.access;
      localStorage.setItem('staff_token', access);

      const me = await axios.get('http://localhost:8000/auth/users/me/', {
        headers: { Authorization: `Bearer ${access}` },
      });

      if (me.data.is_staff) {
        localStorage.setItem('staff_data', JSON.stringify(me.data));
        navigate('/staff/dashboard');  // Redirect to staff dashboard
      } else {
        alert('Access Denied: You are not a staff member.');
      }
    } catch (err) {
      setLoading(false);
      if (err.response && err.response.status === 401) {
        setMessage('Invalid email or password');
      } else {
        setMessage('Login failed! Please try again later.');
      }
    }
  };

  return (
    <div className="staff-login-container">
      <form className="staff-login-form" onSubmit={loginHandler}>
        <h2 className="title">Staff Panel Login</h2>

        {message && <p style={{ color: 'red' }}>{message}</p>}

        <div className="input-group">
          <input
            type="email"
            placeholder="Staff Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="input-group">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="form-btn" disabled={loading}>
          {loading ? 'Logging in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}

export default StaffLogin;
