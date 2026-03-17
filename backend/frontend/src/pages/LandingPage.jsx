// src/components/LandingPage.jsx
import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Home from "../pages/Home";
import About from "../pages/About";
import Reviews from "../pages/Reviews";
import Contact from "../pages/Contact";
import Products from "../pages/Products";
import Footer from "../pages/Footer";

import './css/LandingPage.css';

const LandingPage = () => {
  const location = useLocation();

  useEffect(() => {
    // Scroll to hash section after render
    if (location.hash) {
      const element = document.querySelector(location.hash);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      // If no hash, scroll to top
      window.scrollTo(0, 0);
    }
  }, [location]);

  return (
    <div className="landing-page">
      {/* Each "page" becomes a section */}
      <section id="home">
        <Home />
      </section>



      <section id="products">
        <Products />
      </section>
      
      <section id="about">
        <About />
      </section>

      <section id="reviews">
        <Reviews />
      </section>

      <section id="contact">
        <Contact />
      </section>

        <section id="contact">
        <Footer id='footer' />
      </section>
    </div>
  );
};

export default LandingPage;