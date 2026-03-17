// src/components/navbar/NavBar.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./NavBar.css";

const NavBar = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("access_token"));
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const checkLoginStatus = () => {
      const token = localStorage.getItem("access_token");
      setIsLoggedIn(!!token);
    };

    checkLoginStatus();
    window.addEventListener("storage", checkLoginStatus);

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("storage", checkLoginStatus);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.setItem("logout", Date.now());
    setIsLoggedIn(false);
    setDropdownOpen(false);
    setMobileMenuOpen(false);
    navigate("/login");
  };

  const handleNavClick = (path) => {
    navigate(path);
    setMobileMenuOpen(false);
    setDropdownOpen(false);
  };

  return (
    <div className="bottleflow-navbar-wrapper">
      <nav className="navbar">
        {/* Hamburger - Mobile Only */}
        <div
          className={`hamburger ${mobileMenuOpen ? "open" : ""}`}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <span></span>
          <span></span>
          <span></span>
        </div>

        {/* Logo */}
        <div className="logo" onClick={() => handleNavClick("/")}>
          <img 
            src="/assets/logo.png" 
            alt="BottleFlow Logo" 
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        </div>

        {/* Desktop Menu */}
        <div className="menu">
          <button onClick={() => handleNavClick("/#home")} className="nav-link">
            Home
          </button>
          <button onClick={() => handleNavClick("/#products")} className="nav-link">
            Products
          </button>
          <button onClick={() => handleNavClick("/#about")} className="nav-link">
            About
          </button>
          <button onClick={() => handleNavClick("/#reviews")} className="nav-link">
            Reviews
          </button>
          <button onClick={() => handleNavClick("/#contact")} className="nav-link">
            Contact
          </button>

          {isLoggedIn && (
            <>
              <button onClick={() => handleNavClick("/shop_now")} className="nav-button">
                Shop Now
              </button>
              <button onClick={() => handleNavClick("/orders")} className="nav-button">
                Orders
              </button>
            </>
          )}
        </div>

        {/* Auth & Profile */}
        <div className="login_btn" ref={dropdownRef}>
          {/* Desktop Auth/User */}
          <div className="auth-buttons">
            {isLoggedIn ? (
              <>
                <span className="user-icon" onClick={() => setDropdownOpen(!dropdownOpen)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 12C14.2091 12 16 10.2091 16 8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8C8 10.2091 9.79086 12 12 12Z" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M4 20V19C4 16.7909 5.79086 15 8 15H16C18.2091 15 20 16.7909 20 19V20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </span>
                {dropdownOpen && (
                  <div className="dropdown-menu desktop-dropdown">
                    <button onClick={() => handleNavClick("/profile")}>
                      <span className="dropdown-icon"></span>
                      Profile
                    </button>
                    <button onClick={() => handleNavClick("/user-settings")}>
                      <span className="dropdown-icon"></span>
                      Settings
                    </button>
                    <button onClick={() => handleNavClick("/orders")}>
                      <span className="dropdown-icon"></span>
                      My Orders
                    </button>
                    <hr />
                    <button onClick={handleLogout} className="logout-btn">
                      <span className="dropdown-icon"></span>
                      Logout
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={() => handleNavClick("/login")}
                  className="auth-button sign-in"
                >
                  Sign In
                </button>
                <button
                  onClick={() => handleNavClick("/register")}
                  className="auth-button sign-up"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>

          {/* Mobile Auth/User Toggle */}
          <div className="mobile-auth-toggle">
            {isLoggedIn ? (
              <>
                <span
                  className="user-icon"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  👤
                </span>
                {dropdownOpen && (
                  <div className="dropdown-menu mobile-dropdown">
                    <button onClick={() => handleNavClick("/profile")}>
                      <span className="dropdown-icon"></span>
                      Profile
                    </button>
                    <button onClick={() => handleNavClick("/user-settings")}>
                      <span className="dropdown-icon"></span>
                      Settings
                    </button>
                    <button onClick={() => handleNavClick("/orders")}>
                      <span className="dropdown-icon"></span>
                      My Orders
                    </button>
                    <hr />
                    <button onClick={handleLogout} className="logout-btn">
                      <span className="dropdown-icon"></span>
                      Logout
                    </button>
                  </div>
                )}
              </>
            ) : (
              <button
                onClick={() => handleNavClick("/login")}
                className="auth-button sign-in"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Overlay Menu */}
      <div className={`mobile-overlay ${mobileMenuOpen ? "active" : ""}`}>
        <div className="mobile-nav-links">
          <button onClick={() => handleNavClick("/#home")}>Home</button>
          <button onClick={() => handleNavClick("/#products")}>Products</button>
          <button onClick={() => handleNavClick("/#about")}>About</button>
          <button onClick={() => handleNavClick("/#reviews")}>Reviews</button>
          <button onClick={() => handleNavClick("/#contact")}>Contact</button>

          {isLoggedIn && (
            <>
              <button onClick={() => handleNavClick("/shop_now")}>Shop Now</button>
              <button onClick={() => handleNavClick("/orders")}>Orders</button>
            </>
          )}
        </div>

        {!isLoggedIn && (
          <div className="mobile-auth">
            <button
              className="auth-button sign-in"
              onClick={() => handleNavClick("/login")}
            >
              Sign In
            </button>
            <button
              className="auth-button sign-up"
              onClick={() => handleNavClick("/register")}
            >
              Sign Up
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NavBar;