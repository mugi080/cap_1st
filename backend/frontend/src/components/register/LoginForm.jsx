// src/components/LoginForm.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { loginUser } from "../../api/Auth";
import "./LoginForm.css";

const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // ✅ NEW: Add login-page class to body to enable fixed positioning & prevent scroll
  useEffect(() => {
    document.body.classList.add('login-page');
    window.scrollTo(0, 0); // Reset scroll just in case

    return () => {
      document.body.classList.remove('login-page');
    };
  }, []);

  // Parse query params on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const next = urlParams.get("next");
    if (next) {
      console.log(`You will be redirected to ${next} after login`);
    }
  }, [location]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const result = await loginUser(email, password);
    setLoading(false);

    if (result.success) {
      localStorage.setItem("access_token", result.token);
      localStorage.setItem("refresh_token", result.refresh_token);
      window.dispatchEvent(new Event("storage"));

      const urlParams = new URLSearchParams(location.search);
      const next = urlParams.get("next");
      let productData = null;

      try {
        const productStr = urlParams.get("product");
        if (productStr) {
          productData = JSON.parse(atob(decodeURIComponent(productStr)));
        }
      } catch (err) {
        console.warn("Failed to parse product data", err);
      }

      if (next) {
        navigate(next, { state: productData ? { productToBuy: productData } : {} });
      } else {
        navigate("/");
      }
    } else {
      setMessage(result.message);
    }
  };

  return (
    <div className="form-container">
      <h2 className="title">Login</h2>

      {message && <p className="error-text">{message}</p>}

      <form onSubmit={handleLogin} className="form">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="input"
          disabled={loading}
          // ⚠️ No autoFocus — this prevents scroll jump!
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="input"
          disabled={loading}
        />
        <button type="submit" disabled={loading} className="form-btn">
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      <div className="buttons-container">
        <div className="page-link">
          <Link to="/forgot-password" className="page-link-label">
            Forgot Password?
          </Link>
        </div>

        <div className="page-link">
          <span className="sign-up-label">
            Don't have an account?{" "}
            <Link to="/register" className="sign-up-link">
              Register
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;