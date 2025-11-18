import React from "react";
import './css/Home.css';

const Home = () => {
  return (
    <div className="home-section">
      <div className="home-content">
        <div className="home-badge">Welcome to BottleFlow</div>
        <h1 className="home-title">Where Every Bottle Finds Its Destination!</h1>


        <p className="home-subtitle">
          Refreshing Supply, Efficient Delivery!
        </p>
        <p className="home-tagline">
          Keeping Your Shelves Full, One Bottle at a Time
        </p>
        <div className="home-cta">
          <a href="#products" className="btn-primary">Explore Products</a>
          <a href="#contact" className="btn-secondary">Contact Us</a>
        </div>
      </div>
    </div>
  );
};

export default Home;