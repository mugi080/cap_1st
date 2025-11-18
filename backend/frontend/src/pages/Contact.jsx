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
    // Handle form submission here
    console.log('Form submitted:', formData);
    // Reset form
    setFormData({ name: '', email: '', description: '' });
  };

  return (
    <div className="contact-section">
      <div className="contact-container">
        {/* Header */}
        <div className="contact-header">
          <span className="section-label">Get In Touch</span>
          <h2 className="section-title">Contact Us</h2>
          <p className="section-subtitle">
            Stay Refreshed, Stay Connected – Reach Out to Us!
          </p>
        </div>

        {/* Main Content */}
        <div className="contact-content">
          {/* Form Section */}
          <div className="contact-form-wrapper">
            <form className="contact-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  placeholder="John Doe"
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
                  placeholder="john@example.com"
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

          {/* Contact Information Section */}
          <div className="contact-info-wrapper">
            <div className="contact-info-card">
              <div className="info-icon">📱</div>
              <h3>Phone</h3>
              <p>09XXXXXXXXX</p>
              <span className="info-label">Available 24/7</span>
            </div>

            <div className="contact-info-card">
              <div className="info-icon">👤</div>
              <h3>Contact Person</h3>
              <p>Gary Salvacion</p>
              <span className="info-label">Business Owner</span>
            </div>

            <div className="contact-info-card">
              <div className="info-icon">✉️</div>
              <h3>Email</h3>
              <p>GarySalvacion@gmail.com</p>
              <span className="info-label">Response within 24hrs</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;