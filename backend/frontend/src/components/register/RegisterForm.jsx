// src/components/RegisterForm.jsx
import React, { useState } from "react";
import { registerUser } from "../../api/Auth";
import { Link } from "react-router-dom";
import "./RegisterForm.css"; // Import the CSS file for this component

const RegisterForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [middleName, setMiddleName] = useState("");




  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      setSuccessMessage("");
      return;
    }

    setLoading(true);
    const result = await registerUser(
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
      address,
      middleName
    );
    setLoading(false);

    if (result.success) {
      setSuccessMessage(result.message);
      setErrorMessage("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setFirstName("");
      setLastName("");
      setPhoneNumber("");
      setAddress("");
      setMiddleName("");
    } else {
      setErrorMessage(result.message);
      setSuccessMessage("");
    }
  };

  return (
    <div className="register-form-container">
      <h2 className="title">Register an Account</h2>
      
      {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
      {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}

      <form onSubmit={handleSubmit} className="form">
        <div className="input-group">
          <label>First Name</label>
          <input
            type="text"
            placeholder="Enter your first name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            className="input"
          />
        </div>

        <div className="input-group">
            <label>Middle Name </label>
            <input
                type="text"
                placeholder="Enter your middle name"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                className="input"
            />
        </div>

        <div className="input-group">
          <label>Last Name</label>
          <input
            type="text"
            placeholder="Enter your last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            className="input"
          />
        </div>



        <div className="input-group">
          <label>Email Address</label>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="input"
          />
        </div>

        <div className="input-group">
          <label>Password</label>
          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="input"
          />
        </div>

        <div className="input-group">
          <label>Confirm Password</label>
          <input
            type="password"
            placeholder="Re-enter password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="input"
          />
        </div>

        <button type="submit" disabled={loading} className="form-btn">
          {loading ? "Registering..." : "Register"}
        </button>
      </form>

      <div className="link-container">
        <div className="page-link">
          <span className="sign-in-label">
            Already have an account? 
            <Link to="/login" className="sign-in-link">Login</Link>
          </span>
        </div>
      </div>
    </div>
  );
};

export default RegisterForm;
