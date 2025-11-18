// src/components/user/ResetPasswordConfirm.jsx
import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const ResetPasswordConfirm = () => {
  const { uid, token } = useParams();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [rePassword, setRePassword] = useState("");
  const [message, setMessage] = useState("");

  const handleReset = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      await axios.post("http://127.0.0.1:8000/auth/users/reset_password_confirm/", {
        uid,
        token,
        new_password: newPassword,
        re_new_password: rePassword,
      });

      setMessage("Password reset successful! Redirecting to login...");
      setTimeout(() => navigate("/login"), 2000);
    } catch (error) {
      const msg = error.response?.data?.new_password?.[0] ||
                  error.response?.data?.token ||
                  error.response?.data?.uid ||
                  "Password reset failed.";
      setMessage(msg);
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "auto", padding: "1rem" }}>
      <h2>Reset Your Password</h2>
      {message && <p>{message}</p>}
      <form onSubmit={handleReset}>
        <input
          type="password"
          placeholder="New Password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          style={{ display: "block", width: "100%", marginBottom: "10px" }}
        />
        <input
          type="password"
          placeholder="Confirm New Password"
          value={rePassword}
          onChange={(e) => setRePassword(e.target.value)}
          required
          style={{ display: "block", width: "100%", marginBottom: "10px" }}
        />
        <button type="submit" style={{ width: "100%" }}>Reset Password</button>
      </form>
    </div>
  );
};

export default ResetPasswordConfirm;
