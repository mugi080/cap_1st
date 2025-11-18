// src/components/user/ForgotPassword.jsx
import React, { useState } from "react";
import { sendPasswordResetEmail } from "../../api/Auth";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    try {
      const result = await sendPasswordResetEmail(email);
      setMessage(result.message || "Reset link sent.");
      setIsSuccess(true);
    } catch (error) {
      setMessage("Something went wrong. Please try again.");
      setIsSuccess(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: "400px",
        margin: "60px auto",
        padding: "1.5rem",
        borderRadius: "10px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        fontFamily: "'Segoe UI', sans-serif",
        backgroundColor: "#f9fafb",
      }}
    >
      <h2 style={{ textAlign: "center", marginBottom: "1rem", fontSize: "1.6rem" }}>
        Forgot Password
      </h2>

      {message && (
        <p
          role="alert"
          style={{
            marginBottom: "1rem",
            textAlign: "center",
            color: isSuccess ? "#16a34a" : "#dc2626",
            fontWeight: 600,
          }}
        >
          {message}
        </p>
      )}

      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isSubmitting}
          style={{
            display: "block",
            width: "100%",
            padding: "12px",
            fontSize: "1rem",
            marginBottom: "1rem",
            borderRadius: "8px",
            border: "1px solid #d1d5db",
            outline: "none",
          }}
        />

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            width: "100%",
            padding: "12px",
            fontSize: "1rem",
            fontWeight: "600",
            backgroundColor: isSubmitting ? "#93c5fd" : "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: isSubmitting ? "not-allowed" : "pointer",
            transition: "background-color 0.3s ease",
          }}
        >
          {isSubmitting ? "Sending..." : "Send Reset Link"}
        </button>
      </form>
    </div>
  );
};

export default ForgotPassword;
