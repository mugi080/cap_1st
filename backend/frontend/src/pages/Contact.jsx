// src/pages/Contact.jsx
import React, { useState } from 'react';
import './css/Contact.css';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    description: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    setFormData({ name: '', email: '', description: '' });
  };

  return (
    <div className="contact-section">
      {/* ✅ ONLY ONE CONTAINER — matches About exactly */}
      <div className="section-container">
        <div className="contact-header">
          <span className="section-label">Get In Touch</span>
          <h2 className="section-title">Contact Us</h2>
          <p className="section-subtitle">
            Stay Refreshed, Stay Connected – Reach Out to Us!
          </p>
        </div>

        <div className="contact-content">
          <div className="contact-form-wrapper">
            <form className="contact-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Message</label>
                <textarea
                  id="description"
                  name="description"
                  placeholder="Tell us how we can help you..."
                  rows="5"
                  value={formData.description}
                  onChange={handleChange}
                  required
                ></textarea>
              </div>

              <button type="submit" className="submit-btn">
                Send Message
                <span className="btn-icon">📧</span>
              </button>
            </form>
          </div>

          <div className="contact-info-wrapper">
            <div className="contact-info-card">
              <h3>Phone</h3>
              <p>09255120738</p>
              <span className="info-label">Available 24/7</span>
            </div>

            <div className="contact-info-card">
              <h3>Contact Person</h3>
              <p>Garay Salvacion</p>
              <span className="info-label">Business Owner</span>
            </div>

            <div className="contact-info-card">
              <h3>Email</h3>
              <p>GaraySalvacion@gmail.com</p>
              <span className="info-label">Response within 24hrs</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;