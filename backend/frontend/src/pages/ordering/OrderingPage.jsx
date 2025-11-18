// src/pages/OrderingPage.jsx
import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getBeverages } from "../../api/Products";
import "./css/OrderingPage.css"; 

const OrderingPage = () => {
  const location = useLocation();
  const productToBuy = location.state?.productToBuy;
  const navigate = useNavigate();

  const [beverages, setBeverages] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const productRef = useRef(null);

  // Fetch beverages
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getBeverages();
        const formatted = data.map((b) => ({
          id: b.id,
          name: b.name || "Unknown Product",
          price: parseFloat(b.price) || 0,
          volume: b.volume || "N/A",
          image: b.image,
          category: b.category || "Uncategorized",
          units_per_case: b.units_per_case || 24,
        }));
        setBeverages(formatted);

        // Pre-select product if passed
        if (productToBuy) {
          const bev = formatted.find((b) => b.id === productToBuy.id);
          if (bev) {
            setSelectedItems([
              {
                ...bev,
                caseQuantity: 1,
                quantity: bev.units_per_case,
              },
            ]);
          }
        }
      } catch (err) {
        console.error("Failed to load beverages:", err);
        alert("Could not load drinks. Please try again.");
      }
    };

    fetchData();
  }, [productToBuy]);

  // Scroll to selected product
  useEffect(() => {
    if (productToBuy && productRef.current) {
      setTimeout(() => {
        productRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    }
  }, [beverages, productToBuy]);

  // Extract categories
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

  // ✅ FIXED: Send correct format for backend
  const goToCheckout = () => {
    if (selectedItems.length === 0) {
      alert("Please select at least one item to continue.");
      return;
    }

    const itemsForBackend = selectedItems.map(item => ({
      id: item.id,
      quantity: item.caseQuantity // may be float (e.g., 1.5)
    }));

    const itemsForDisplay = selectedItems.map(item => ({
      id: item.id,
      name: item.name,
      casesOrdered: item.caseQuantity,
      bottles: Math.round(item.caseQuantity * item.units_per_case),
      pricePerCase: item.price,
      totalPrice: item.price * item.caseQuantity
    }));

    navigate("/checkout", {
      state: {
        itemsForDisplay,
        itemsForBackend,
        totalPrice: selectedItems.reduce((sum, item) => sum + item.price * item.caseQuantity, 0),
      },
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
      <header className="page-header">
        <h1>Order Beverages</h1>
        <p>Select the cases you'd like to order. You can include half-cases too!</p>
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
              const hasHalf = caseQty % 1 === 0.5;
              const totalUnits = Math.round(caseQty * bev.units_per_case);

              return (
                <div
                  key={bev.id}
                  ref={productToBuy?.id === bev.id ? productRef : null}
                  className={`beverage-card ${caseQty > 0 ? "selected" : ""}`}
                >
                  <div className="beverage-image">
                    <img
                      src={`http://localhost:8000${bev.image}`}
                      alt={bev.name}
                      onError={(e) => {
                        e.target.src = "/assets/no-image.png";
                      }}
                    />
                  </div>

                  <div className="beverage-info">
                    <h3>{bev.name}</h3>
                    <p className="price">₱{bev.price.toLocaleString()} <small>per case</small></p>
                    <p>{bev.volume}ml • {bev.units_per_case} bottles/case</p>
                  </div>

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
                    >
                      +
                    </button>
                  </div>

                  {caseQty > 0 && (
                    <div className="quantity-summary">
                      <strong>{caseQty} case(s)</strong> = {totalUnits} bottles
                    </div>
                  )}
                </div>
              );
            })
          )}

          <div className="mobile-checkout">
            <button
              onClick={goToCheckout}
              disabled={selectedItems.length === 0}
              className="btn-checkout-mobile"
            >
              🛒 Checkout (₱{totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })})
            </button>
          </div>
        </div>

        <aside className="order-summary">
          <h2>🛒 Your Order</h2>
          {selectedItems.length === 0 ? (
            <div className="empty-cart">
              <p>Your cart is empty. Start adding cases above!</p>
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
              <button onClick={goToCheckout} className="btn-checkout">
                Proceed to Checkout
              </button>
            </>
          )}
        </aside>
      </div>
    </div>
  );
};

export default OrderingPage;