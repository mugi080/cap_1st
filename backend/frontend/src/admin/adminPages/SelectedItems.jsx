// src/pages/admin/SelectedItems.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const SelectedItems = () => {
  const navigate = useNavigate();
  const [beverages, setBeverages] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const productRef = useRef(null);

  // Fetch beverages and categories
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
          category: b.category || "Uncategorized", // 👈 Now a string! No .name needed
          units_per_case: b.units_per_case || 24,
          stock: b.stock || 0, // 👈 Critical: Add stock from backend
        }));
        setBeverages(formatted);
      } catch (err) {
        console.error("Failed to load beverages:", err);
        alert("Could not load drinks. Please try again.");
      }
    };

    const fetchCategories = async () => {
      try {
        const res = await axios.get("http://127.0.0.1:8000/api/custom-categories/");
        const categoryNames = res.data.map((cat) => cat.name);
        setCategories(["All", ...new Set(categoryNames)]);
      } catch (err) {
        console.error("Failed to load categories:", err);
        setCategories(["All"]);
      }
    };

    fetchBeverages();
    fetchCategories();
  }, []);

  // Extract categories from beverages
  const categories = ["All", ...new Set(beverages.map((b) => b.category))];

  // Update case quantity
  const updateCaseQuantity = (bev, newCaseQty) => {
    const caseQty = Math.max(0, Number(newCaseQty) || 0);
    const totalUnits = Math.round(caseQty * bev.units_per_case);

    setSelectedItems((prev) => {
      const itemIndex = prev.findIndex((item) => item.id === bev.id);
      if (caseQty === 0) {
        return prev.filter((item) => item.id !== bev.id);
      }
      if (itemIndex > -1) {
        const updated = [...prev];
        updated[itemIndex] = { ...bev, caseQuantity: caseQty, quantity: totalUnits };
        return updated;
      }
      return [...prev, { ...bev, caseQuantity: caseQty, quantity: totalUnits }];
    });
  };

  // Toggle half-case
  const toggleHalfCase = (bev) => {
    const selectedItem = selectedItems.find((item) => item.id === bev.id);
    const current = selectedItem?.caseQuantity || 0;
    const next = Math.round((current + 0.5) * 2) / 2;
    updateCaseQuantity(bev, next);
  };

  // Remove item
  const removeItem = (bev) => updateCaseQuantity(bev, 0);

  // Go to order details — WITH STOCK VALIDATION
  const goToNextStep = () => {
    if (selectedItems.length === 0) {
      alert("Please select at least one item.");
      return;
    }

    // Check for any items exceeding available stock
    const outOfStockItems = selectedItems.filter(
      (item) => item.caseQuantity > item.stock
    );

    if (outOfStockItems.length > 0) {
      const message = outOfStockItems
        .map(
          (item) =>
            `${item.name}: requested ${item.caseQuantity}, available ${item.stock}`
        )
        .join("\n");
      alert(`❌ Not enough stock for the following items:\n\n${message}\n\nPlease reduce quantities.`);
      return;
    }

    // All good → proceed
    navigate("/admin/order-details", {
      state: { selectedItems },
    });
  };

  // Filtered beverages
  const filteredBeverages = beverages.filter((bev) => {
    const matchesSearch = bev.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "All" || bev.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Total price
  const totalPrice = selectedItems.reduce((sum, item) => sum + item.price * item.caseQuantity, 0);

  return (
    <div className="ordering-page">
      {/* Header */}
      <header className="page-header">
        <h1>📦 Create Order</h1>
        <p>Select cases and half-cases to add to this order.</p>
      </header>

      {/* Filters */}
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

      {/* Main Content */}
      <div className="main-content">
        {/* Left: Beverage Grid */}
        <div className="beverage-grid">
          {filteredBeverages.length === 0 ? (
            <div className="no-results">
              <p>❌ No drinks match your search.</p>
            </div>
          ) : (
            filteredBeverages.map((bev) => {
              const selectedItem = selectedItems.find((item) => item.id === bev.id);
              const caseQty = selectedItem?.caseQuantity || 0;
              const hasHalf = caseQty % 1 === 0.5;
              const totalUnits = Math.round(caseQty * bev.units_per_case);

              // Image handling
              const imageUrl = bev.image
                ? bev.image.startsWith("http")
                  ? bev.image
                  : `http://127.0.0.1:8000${bev.image}`
                : null;

              return (
                <div
                  key={bev.id}
                  ref={productRef}
                  className={`beverage-card ${caseQty > 0 ? "selected" : ""}`}
                >
                  {/* Image */}
                  <div className="beverage-image">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={bev.name}
                        style={{
                          maxWidth: "80%",
                          maxHeight: "100%",
                          objectFit: "contain",
                        }}
                        onError={(e) => {
                          e.target.src = "https://via.placeholder.com/150?text=No+Image";
                        }}
                      />
                    ) : (
                      <div style={{ color: "#999", fontSize: "14px" }}>📷 No Image</div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="beverage-info">
                    <h3>{bev.name}</h3>
                    <p className="price">₱{bev.price.toLocaleString()} <small>per case</small></p>
                    <p>{bev.volume}ml • {bev.units_per_case} bottles/case</p>
                  </div>

                  {/* Quantity Controls */}
                  <div className="quantity-controls">
                    <button
                      onClick={() => toggleHalfCase(bev)}
                      className={`btn-half ${hasHalf ? "active" : ""}`}
                      aria-label="Toggle half case"
                    >
                      ½
                    </button>
                    <button
                      onClick={() => updateCaseQuantity(bev, caseQty - 1)}
                      className="btn-action minus"
                      disabled={caseQty <= 0}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={caseQty}
                      onChange={(e) => updateCaseQuantity(bev, e.target.value)}
                      className="quantity-input"
                      aria-label="Case quantity"
                    />
                    <button
                      onClick={() => updateCaseQuantity(bev, caseQty + 1)}
                      className="btn-action plus"
                      disabled={caseQty >= bev.stock} // 👈 Disable if max stock reached
                      title={caseQty >= bev.stock ? `Max stock: ${bev.stock} cases` : ""}
                    >
                      +
                    </button>
                  </div>

                  {/* Stock Indicator */}
                  {bev.stock > 0 && (
                    <div className={`stock-indicator ${caseQty > bev.stock ? 'out-of-stock' : ''}`}>
                      {caseQty > bev.stock
                        ? `Only ${bev.stock} available`
                        : `${bev.stock} in stock`}
                    </div>
                  )}

                  {/* Summary */}
                  {caseQty > 0 && (
                    <div className="quantity-summary">
                      <strong>{caseQty} case(s)</strong> = {totalUnits} bottles
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Sticky Next Button on Mobile */}
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

        {/* Right: Order Summary */}
        <aside className="order-summary">
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
                      <strong>{item.name}</strong>
                      <div className="item-details">
                        {item.caseQuantity} × ₱{item.price} = ₱{(item.price * item.caseQuantity).toFixed(2)}
                        <br />
                        <small>{Math.round(item.quantity)} bottles</small>
                      </div>
                    </div>
                    <button onClick={() => removeItem(item)} className="btn-remove">
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
              <div className="order-total">
                <strong>Total: ₱{totalPrice.toFixed(2)}</strong>
              </div>
              <button onClick={goToNextStep} className="btn-checkout">
                Next: Fill Order Details
              </button>
            </>
          )}
        </aside>
      </div>

      {/* CSS - Updated with stock indicators and hover tooltips */}
      <style jsx>{`
        .ordering-page {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: #f7f9fc;
          color: #333;
        }

        /* Header */
        .page-header {
          text-align: center;
          padding: 20px 16px;
          background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
          color: white;
          border-bottom: 1px solid #ddd;
        }

        .page-header h1 {
          margin: 0 0 8px 0;
          font-size: 24px;
          font-weight: 700;
        }

        .page-header p {
          margin: 0;
          font-size: 14px;
          opacity: 0.9;
        }

        /* Filters */
        .filter-bar {
          display: flex;
          gap: 12px;
          padding: 16px;
          background: white;
          border-bottom: 1px solid #eee;
          flex-wrap: wrap;
        }

        .search-input,
        .category-select {
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 15px;
        }

        .search-input {
          flex: 1;
          min-width: 200px;
        }

        .category-select {
          min-width: 140px;
        }

        /* Main Layout */
        .main-content {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        .beverage-grid {
          flex: 3;
          padding: 16px;
          overflow-y: auto;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px;
          position: relative;
        }

        .order-summary {
          flex: 1;
          padding: 20px;
          background: white;
          border-left: 1px solid #eee;
          overflow-y: auto;
        }

        /* Beverage Card */
        .beverage-card {
          background: white;
          border: 1px solid #eee;
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          transition: all 0.2s ease;
          position: relative; /* Needed for stock badge */
        }

        .beverage-card.selected {
          border-color: #007bff;
          box-shadow: 0 0 0 2px #007bff30;
        }

        .beverage-image {
          width: 100%;
          height: 140px;
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 12px;
        }

        .beverage-image img {
          max-width: 80%;
          max-height: 100%;
          object-fit: contain;
        }

        .beverage-info h3 {
          margin: 0 0 6px 0;
          font-size: 16px;
          font-weight: 600;
          color: #111;
        }

        .price {
          font-size: 18px;
          color: #d9534f;
          font-weight: 700;
          margin: 4px 0;
        }

        .price small {
          font-size: 12px;
          color: #666;
          font-weight: normal;
        }

        .beverage-info p {
          font-size: 13px;
          color: #555;
          margin: 2px 0;
        }

        /* Quantity Controls */
        .quantity-controls {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin: 12px 0;
        }

        .btn-half {
          width: 36px;
          height: 36px;
          font-weight: bold;
          background: #e9ecef;
          color: #495057;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
        }

        .btn-half.active {
          background: #28a745;
          color: white;
        }

        .btn-action {
          width: 40px;
          height: 40px;
          font-size: 20px;
          border: none;
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          cursor: pointer;
        }

        .btn-action:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .quantity-input {
          width: 60px;
          text-align: center;
          padding: 6px;
          border: 1px solid #aaa;
          border-radius: 6px;
          font-size: 15px;
          height: 40px;
        }

        .quantity-summary {
          text-align: center;
          font-size: 13px;
          color: #007bff;
          font-weight: 500;
          margin-top: auto;
        }

        /* Stock Indicator */
        .stock-indicator {
          font-size: 12px;
          margin-top: 6px;
          text-align: center;
          color: #666;
        }

        .stock-indicator.out-of-stock {
          color: #dc3545;
          font-weight: bold;
          animation: pulse 1s infinite;
        }

        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.7; }
          100% { opacity: 1; }
        }

        /* Order Summary */
        .order-summary h2 {
          margin: 0 0 16px 0;
          font-size: 18px;
          color: #333;
        }

        .summary-items {
          list-style: none;
          padding: 0;
          margin: 0 0 16px 0;
        }

        .summary-item {
          display: flex;
          justify-content: space-between;
          align-items: start;
          padding: 12px 0;
          border-bottom: 1px dashed #eee;
        }

        .item-details {
          font-size: 13px;
          color: #666;
          margin-top: 4px;
        }

        .btn-remove {
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          color: #dc3545;
        }

        .order-total {
          font-size: 18px;
          font-weight: bold;
          text-align: center;
          padding: 16px 0;
          border-top: 1px solid #eee;
          margin-bottom: 16px;
        }

        .btn-checkout {
          width: 100%;
          padding: 14px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-checkout:hover:not(:disabled) {
          background: #0056b3;
        }

        .btn-checkout:disabled {
          background: #ccc;
          color: #666;
          cursor: not-allowed;
        }

        /* Empty & No Results */
        .no-results, .empty-cart {
          grid-column: 1 / -1;
          text-align: center;
          padding: 40px 16px;
          color: #888;
          font-style: italic;
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .main-content {
            flex-direction: column;
          }

          .order-summary {
            border-left: none;
            border-top: 1px solid #eee;
            max-height: 50vh;
          }

          .mobile-checkout {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: white;
            padding: 12px 16px;
            box-shadow: 0 -4px 10px rgba(0,0,0,0.1);
            z-index: 100;
          }

          .btn-checkout-mobile {
            width: 100%;
            padding: 14px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
          }

          .beverage-grid {
            padding-bottom: 80px;
          }

          .page-header h1 {
            font-size: 20px;
          }

          .page-header p {
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  );
};

export default SelectedItems;