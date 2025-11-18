import React from "react";
import logo from "../assets/logo.png";
import './css/About.css';

const About = () => {
  return (
    <div className="about-section">
      <div className="about-container">
        {/* Header */}
        <div className="about-header">
          <span className="section-label">Who We Are</span>
          <h2 className="section-title">About Us</h2>
          <p className="section-subtitle">
            Your trusted partner in beverage distribution
          </p>
        </div>

        {/* Main Content */}
        <div className="about-content">
          <div className="about-story">
            <div className="story-text">
              <h3>Our Story</h3>
              <p>
                At <strong>Salvacion Garay Bottled Drink Distributor</strong>, 
                we believe that every sip should be refreshing, high-quality, 
                and made with care. We have been committed to providing a 
                diverse range of beverages, including bottled, canned, and 
                plastic-packaged drinks, to quench every thirst and fit every lifestyle.
              </p>
            </div>
            <div className="story-image">
              <img src={logo} alt="BottleFlow Logo" />
            </div>
          </div>

          {/* Mission Section */}
          <div className="mission-section">
            <div className="mission-card">
              <div className="mission-icon">🎯</div>
              <h3>Our Mission</h3>
              <p>
                We focus on delivering beverages that are accessible, convenient, 
                and well-packaged for easy distribution. Our goal is to ensure a 
                smooth and reliable supply of bottled, canned, and plastic-packaged 
                drinks to retailers, businesses, and consumers.
              </p>
            </div>

            <div className="mission-card">
              <div className="mission-icon">⚡</div>
              <h3>Our Commitment</h3>
              <p>
                We prioritize efficient service, timely deliveries, and customer 
                satisfaction while maintaining responsible packaging practices. 
                Every order is handled with care to ensure freshness and quality.
              </p>
            </div>

            <div className="mission-card">
              <div className="mission-icon">🌟</div>
              <h3>Our Values</h3>
              <p>
                Quality, reliability, and customer satisfaction are at the heart 
                of everything we do. We build lasting relationships with our 
                clients through transparency and exceptional service.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;