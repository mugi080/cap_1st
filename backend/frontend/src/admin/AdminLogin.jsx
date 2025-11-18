import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AdminLogin.css';

function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const loginHandler = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await axios.post(
        'http://localhost:8000/auth/jwt/create/',
        { email, password },
        { headers: { 'Content-Type': 'application/json' } }
      );

      const access = response.data.access;
      localStorage.setItem('admin_token', access);

      const me = await axios.get('http://localhost:8000/auth/users/me/', {
        headers: { Authorization: `Bearer ${access}` },
      });

      if (me.data.is_staff || me.data.is_superuser) {
        localStorage.setItem('admin_data', JSON.stringify(me.data));
        navigate('/admin/dashboard');
      } else {
        setMessage('Access Denied: You are not an admin.');
      }
    } catch (err) {
      setLoading(false);
      if (err.response && err.response.status === 401) {
        setMessage('Invalid email or password');
      } else {
        setMessage('Login failed! Please check your credentials or try again later.');
      }
    }
  };

  return (
    <div className="form-container">
      <h2 className="title">Admin Login</h2>

      {message && <p style={{ color: 'red' }}>{message}</p>}

      <form onSubmit={loginHandler} className="form">
        <input
          type="email"
          placeholder="Admin Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="input"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="input"
        />
        <button type="submit" disabled={loading} className="form-btn">
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}

export default AdminLogin;
