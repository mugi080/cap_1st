import React, { useState } from 'react';
import Category from '../products/Category';
import Beverages from '../products/Beverages';
import './css/Inventory.css';

const Inventory = () => {
  const [tab, setTab] = useState('beverage');

  return (
    <div className="inventory-container">
      <h1>Inventory Management</h1>

      <div className="inventory-tabs">
        <button
          className={`inventory-tab-btn ${tab === 'category' ? 'active' : ''}`}
          onClick={() => setTab('category')}
        >
          Manage Categories
        </button>

        <button
          className={`inventory-tab-btn ${tab === 'beverage' ? 'active' : ''}`}
          onClick={() => setTab('beverage')}
        >
          Manage Beverages
        </button>
      </div>

      <div className="inventory-content">
        {tab === 'category' && <Category />}
        {tab === 'beverage' && <Beverages />}
      </div>
    </div>
  );
};

export default Inventory;
