// src/pages/admin/SelectedItems.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./css/SelectedItems.css";

const SelectedItems = () => {
  const navigate = useNavigate();
  const [beverages, setBeverages] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  useEffect(() => {
    const fetchBeverages = async () => {
      try {
        const res = await axios.get("http://127.0.0.1:8000/api/beverages/");
        const formatted = res.data.map((b) => ({
          id: b.id,
          name: b.name || "Unknown Product",
          price: parseFloat(b.price) || 0,
          volume: b.volume || "N/A",
          image: b.image,
          category_name: b.category_name || "Uncategorized",
          units_per_case: b.units_per_case || 24,
          stock: b.stock || 0,
          allow_half_case: b.allow_half_case !== undefined ? b.allow_half_case : true,
        }));
        setBeverages(formatted);
      } catch (err) {
        console.error("Failed to load beverages:", err);
        alert("Could not load drinks. Please try again.");
      }
    };

    fetchBeverages();
  }, []);

  const categories = ["All", ...new Set(beverages.map((b) => b.category_name).filter(Boolean))];

  const updateCaseQuantity = (bev, rawValue) => {
    let value = parseFloat(rawValue);
    if (isNaN(value) || value < 0) value = 0;

    if (!bev.allow_half_case) {
      value = Math.round(value);
    } else {
      value = Math.round(value * 2) / 2;
    }

    const maxCases = bev.stock / bev.units_per_case;
    if (value > maxCases) return;

    setSelectedItems((prev) => {
      const itemIndex = prev.findIndex((item) => item.id === bev.id);
      if (value === 0) {
        return prev.filter((item) => item.id !== bev.id);
      }
      if (itemIndex > -1) {
        const updated = [...prev];
        updated[itemIndex] = { ...bev, caseQuantity: value };
        return updated;
      }
      return [...prev, { ...bev, caseQuantity: value }];
    });
  };

  const removeItem = (bev) => updateCaseQuantity(bev, 0);

  const goToNextStep = () => {
    if (selectedItems.length === 0) {
      alert("Please select at least one item.");
      return;
    }

    const outOfStockItems = selectedItems.filter((item) => {
      const maxCases = item.stock / item.units_per_case;
      return item.caseQuantity > maxCases;
    });

    if (outOfStockItems.length > 0) {
      const message = outOfStockItems
        .map((item) => `${item.name}: max ${Math.floor(item.stock / item.units_per_case)} cases`)
        .join("\n");
      alert(`❌ Stock limit exceeded:\n\n${message}`);
      return;
    }

    navigate("/admin/order-details", {
      state: { selectedItems },
    });
  };

  const filteredBeverages = beverages.filter((bev) => {
    const matchesSearch = bev.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "All" || bev.category_name === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalPrice = selectedItems.reduce((sum, item) => sum + item.price * item.caseQuantity, 0);

  return (
    <div className="ordering-page">
      <header className="page-header">
        <h1>Create Admin Order</h1>
      </header>

      <div className="filter-bar">
        <input
          type="text"
          placeholder="🔍 Search drinks..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="category-select"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div className="main-content">
        <div className="beverage-grid">
          {filteredBeverages.length === 0 ? (
            <div className="no-results">
              <p>❌ No drinks match your search.</p>
            </div>
          ) : (
            filteredBeverages.map((bev) => {
              const selectedItem = selectedItems.find((item) => item.id === bev.id);
              const caseQty = selectedItem?.caseQuantity || 0;
              const totalBottles = Math.round(caseQty * bev.units_per_case);
              const maxCases = bev.stock / bev.units_per_case;

              return (
                <div
                  key={bev.id}
                  className={`beverage-card ${caseQty > 0 ? "selected" : ""}`}
                >
                  <div className="beverage-image">
                    {bev.image ? (
                      <img
                        src={bev.image.startsWith("http")
                          ? bev.image
                          : `http://127.0.0.1:8000${bev.image}`}
                        alt={bev.name}
                        onError={(e) => {
                          e.target.src = "/assets/no-image.png";
                        }}
                      />
                    ) : (
                      <div className="no-image-placeholder">📷</div>
                    )}
                  </div>

                  <div className="beverage-info">
                    <h3>{bev.name}</h3>
                    <p className="price">
                      ₱{bev.price.toLocaleString()} <small>per case</small>
                    </p>
                    <p>{bev.volume}ml • {bev.units_per_case} bottles/case</p>
                    {!bev.allow_half_case && (
                      <p className="whole-only-hint">Whole cases only</p>
                    )}
                  </div>

                  {/* Stock Indicator */}
                  <div className="stock-indicator">
                    {bev.stock === 0
                      ? "❌ Out of stock"
                      : `In stock: ${bev.stock} bottles (${Math.floor(maxCases)} cases)`}
                  </div>

                  <div className="quantity-controls">
                    {bev.allow_half_case && (
                      <button
                        onClick={() => {
                          const hasHalf = caseQty % 1 === 0.5;
                          const newQty = hasHalf
                            ? Math.floor(caseQty)
                            : Math.floor(caseQty) + 0.5;
                          updateCaseQuantity(bev, newQty);
                        }}
                        className={`btn-half ${caseQty % 1 === 0.5 ? "active" : ""}`}
                        aria-label="Toggle half case"
                      >
                        ½
                      </button>
                    )}

                    <button
                      onClick={() => updateCaseQuantity(bev, caseQty - 1)}
                      className="btn-action minus"
                      disabled={caseQty <= 0}
                    >
                      −
                    </button>
                    <span className="quantity-value">
                      {caseQty} {caseQty === 1 ? "case" : "cases"}
                    </span>
                    <button
                      onClick={() => {
                        if (caseQty < maxCases) updateCaseQuantity(bev, caseQty + 1);
                      }}
                      className="btn-action plus"
                      disabled={caseQty >= maxCases}
                    >
                      +
                    </button>
                  </div>

                  {caseQty > 0 && (
                    <div className="quantity-summary">
                      = {totalBottles} bottles
                    </div>
                  )}
                </div>
              );
            })
          )}

          <div className="mobile-checkout">
            <button
              onClick={goToNextStep}
              disabled={selectedItems.length === 0}
              className="btn-checkout-mobile"
            >
              ➡️ Next: Fill Details (₱{totalPrice.toFixed(2)})
            </button>
          </div>
        </div>

        <aside className="ordering-order-summary">
          <h2>🛒 Selected Items</h2>
          {selectedItems.length === 0 ? (
            <div className="empty-cart">
              <p>Add drinks above to build the order.</p>
            </div>
          ) : (
            <>
              <ul className="summary-items">
                {selectedItems.map((item) => (
                  <li key={item.id} className="summary-item">
                    <div>
                      <strong className="item-name">{item.name}</strong>
                      <div className="item-details">
                        {item.caseQuantity} × ₱{item.price} = ₱{(item.price * item.caseQuantity).toFixed(2)}
                        <br />
                        <small>{Math.round(item.caseQuantity * item.units_per_case)} bottles</small>
                      </div>
                    </div>
                    <button onClick={() => removeItem(item)} className="btn-remove">
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
              <div className="order-total">
                Total: ₱{totalPrice.toFixed(2)}
              </div>
              <button onClick={goToNextStep} className="btn-checkout">
                Next: Fill Order Details
              </button>
            </>
          )}
        </aside>
      </div>
    </div>
  );
};

export default SelectedItems;