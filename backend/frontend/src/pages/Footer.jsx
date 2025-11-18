import React from 'react';
import './css/Footer.css';

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-content">
        {/* Column 1: About */}
        <div className="footer-section">
          <h3 className="footer-title">About Us</h3>
          <p className="footer-text">
            We provide premium quality products and exceptional customer service. 
            Our mission is to deliver excellence in every transaction.
          </p>
          <div className="footer-social">
            <a href="#" className="social-link" aria-label="Facebook">
              <i className="fab fa-facebook-f"></i>
            </a>
            <a href="#" className="social-link" aria-label="Twitter">
              <i className="fab fa-twitter"></i>
            </a>
            <a href="#" className="social-link" aria-label="Instagram">
              <i className="fab fa-instagram"></i>
            </a>
            <a href="#" className="social-link" aria-label="LinkedIn">
              <i className="fab fa-linkedin-in"></i>
            </a>
          </div>
        </div>

        {/* Column 2: Quick Links */}
        <div className="footer-section">
          <h3 className="footer-title">Quick Links</h3>
          <ul className="footer-links">
            <li><a href="/">Home</a></li>
            <li><a href="/products">Products</a></li>
            <li><a href="/about">About</a></li>
            <li><a href="/contact">Contact</a></li>
            <li><a href="/faq">FAQ</a></li>
          </ul>
        </div>

        {/* Column 3: Customer Service */}
        <div className="footer-section">
          <h3 className="footer-title">Customer Service</h3>
          <ul className="footer-links">
            <li><a href="#">Shipping Info</a></li>
            <li><a href="#">Returns</a></li>
            <li><a href="#">Privacy Policy</a></li>
            <li><a href="#">Terms & Conditions</a></li>
            <li><a href="#">Support</a></li>
          </ul>
        </div>

        {/* Column 4: Contact Info */}
        <div className="footer-section">
          <h3 className="footer-title">Contact Info</h3>
          <div className="footer-contact">
            <p>
              <strong>Email:</strong> <a href="mailto:info@company.com">info@company.com</a>
            </p>
            <p>
              <strong>Phone:</strong> <a href="tel:+1234567890">+1 (234) 567-890</a>
            </p>
            <p>
              <strong>Address:</strong><br />
              123 Business Street<br />
              City, State 12345<br />
              Country
            </p>
          </div>
        </div>
      </div>

      {/* Footer Bottom */}
      <div className="footer-bottom">
        <div className="footer-bottom-content">
          <p className="footer-copyright">
            &copy; {currentYear} Your Company Name. All rights reserved.
          </p>
          <div className="footer-bottom-links">
            <a href="#privacy">Privacy Policy</a>
            <span>•</span>
            <a href="#terms">Terms of Service</a>
            <span>•</span>
            <a href="#cookies">Cookie Settings</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;