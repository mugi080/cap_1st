// src/components/navbar/NavBar.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/logo.png";
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
    <>
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
          <img src={logo} alt="BottleFlow Logo" />
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
                <span
                  className="user-icon"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  👤
                </span>
                {dropdownOpen && (
                  <div className="dropdown-menu desktop-dropdown">
                    <button onClick={() => handleNavClick("/profile")}>
                      <span className="dropdown-icon">👤</span>
                      Profile
                    </button>
                    <button onClick={() => handleNavClick("/settings")}>
                      <span className="dropdown-icon">⚙️</span>
                      Settings
                    </button>
                    <button onClick={() => handleNavClick("/orders")}>
                      <span className="dropdown-icon">📦</span>
                      My Orders
                    </button>
                    <hr />
                    <button onClick={handleLogout} className="logout-btn">
                      <span className="dropdown-icon">🚪</span>
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
                      <span className="dropdown-icon">👤</span>
                      Profile
                    </button>
                    <button onClick={() => handleNavClick("/settings")}>
                      <span className="dropdown-icon">⚙️</span>
                      Settings
                    </button>
                    <button onClick={() => handleNavClick("/orders")}>
                      <span className="dropdown-icon">📦</span>
                      My Orders
                    </button>
                    <hr />
                    <button onClick={handleLogout} className="logout-btn">
                      <span className="dropdown-icon">🚪</span>
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
    </>
  );
};

export default NavBar;