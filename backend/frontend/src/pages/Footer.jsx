import React from 'react';
import './css/Footer.css';

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-content">
        <p className="footer-text">
          &copy; {currentYear} BottleFlow. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export default Footer;