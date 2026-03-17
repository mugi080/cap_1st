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
  const [unitLabelFilter, setUnitLabelFilter] = useState("All"); // ✅ NEW: unit label filter
  const [previousOrders, setPreviousOrders] = useState([]);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [hideHelpButton, setHideHelpBeverage] = useState(
    localStorage.getItem("hide_order_help") === "true"
  );
  const productRef = useRef(null);

  const permanentlyHideHelp = () => {
    setHideHelpBeverage(true);
    localStorage.setItem("hide_order_help", "true");
  };

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
          category_name: b.category_name || "Uncategorized",
          units_per_case: b.units_per_case || 24,
          unit_label: b.unit_label || "case",
          allow_half_case: b.allow_half_case !== undefined ? b.allow_half_case : true,
          stock: b.stock || 0, // ✅ needed for stock validation
        }));
        setBeverages(formatted);

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

  // Scroll to pre-selected product
  useEffect(() => {
    if (productToBuy && productRef.current) {
      setTimeout(() => {
        productRef.current?.scrollIntoView({ behavsior: "smooth", block: "center" });
      }, 30); // reduced delay
    }
  }, [beverages, productToBuy]);

  // Fetch previous orders
  useEffect(() => {
    const fetchPreviousOrders = async () => {
      try {
        const token = localStorage.getItem("access");
        if (!token) return;

        const res = await fetch("http://127.0.0.1:8000/api/user/orders/", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const orders = await res.json();
          const completed = orders.filter(order => order.status === "Completed");
          setPreviousOrders(completed.slice(0, 3));
        }
      } catch (err) {
        console.error("Failed to load previous orders:", err);
      }
    };

    fetchPreviousOrders();
  }, []);

  const categories = ["All", ...new Set(beverages.map(b => b.category_name).filter(Boolean))];
  const unitLabels = ["All", ...new Set(beverages.map(b => b.unit_label).filter(Boolean))]; // ✅

  // ✅ Updated: Respect allow_half_case AND stock limit
  const updateCaseQuantity = (bev, rawValue) => {
    let value = parseFloat(rawValue);
    if (isNaN(value) || value < 0) value = 0;

    // Enforce half-case rule
    if (!bev.allow_half_case) {
      value = Math.round(value);
    } else {
      value = Math.round(value * 2) / 2;
    }

    // Enforce stock limit (in cases)
    const maxCases = bev.stock / bev.units_per_case;
    if (value > maxCases) {
      value = maxCases;
      // Round down to nearest allowed increment
      if (!bev.allow_half_case) {
        value = Math.floor(value);
      } else {
        value = Math.floor(value * 2) / 2;
      }
    }

    const totalUnits = Math.round(value * bev.units_per_case);

    setSelectedItems((prev) => {
      const itemIndex = prev.findIndex((item) => item.id === bev.id);
      if (value === 0) {
        return prev.filter((item) => item.id !== bev.id);
      }
      if (itemIndex > -1) {
        const updated = [...prev];
        updated[itemIndex] = { ...bev, caseQuantity: value, quantity: totalUnits };
        return updated;
      }
      return [...prev, { ...bev, caseQuantity: value, quantity: totalUnits }];
    });
  };

  const removeItem = (bev) => updateCaseQuantity(bev, 0);

  const goToCheckout = () => {
    if (selectedItems.length === 0) {
      alert("Please select at least one item to continue.");
      return;
    }

    const itemsForBackend = selectedItems.map((item) => ({
      id: item.id,
      quantity: item.caseQuantity,
    }));

    const itemsForDisplay = selectedItems.map((item) => ({
      id: item.id,
      name: item.name,
      casesOrdered: item.caseQuantity,
      bottles: Math.round(item.caseQuantity * item.units_per_case),
      pricePerCase: item.price,
      totalPrice: item.price * item.caseQuantity,
    }));

    navigate("/checkout", {
      state: {
        itemsForDisplay,
        itemsForBackend,
        totalPrice: selectedItems.reduce((sum, item) => sum + item.price * item.caseQuantity, 0),
      },
    });
  };

  const filteredBeverages = beverages.filter((bev) => {
    const matchesSearch = bev.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "All" || bev.category_name === categoryFilter;
    const matchesUnitLabel = unitLabelFilter === "All" || bev.unit_label === unitLabelFilter;
    return matchesSearch && matchesCategory && matchesUnitLabel;
  });

  const totalPrice = selectedItems.reduce((sum, item) => sum + item.price * item.caseQuantity, 0);

  // Helper: pluralize unit label
  const getUnitLabelPlural = (label, count) => {
    if (count === 1) return label;
    if (label === 'box') return 'boxes';
    return label + 's';
  };

  // ✅ Helper: check if adding 1 more case is allowed
  const canAddMore = (bev, currentQty) => {
    const maxCases = bev.stock / bev.units_per_case;
    const nextQty = currentQty + 1;
    if (!bev.allow_half_case) {
      return nextQty <= maxCases;
    } else {
      // Allow half, so check if even 0.5 more is possible
      return nextQty <= maxCases;
    }
  };

  return (
    <div className="ordering-page">
      <header className="page-header">
        <h1>Order Beverages</h1>
      </header>

      <div className="delivery-reminder">
        💡 <strong>Delivery orders require a minimum of 10 {getUnitLabelPlural('case', 10)}.</strong> Pickup has no minimum.
      </div>

      {previousOrders.length > 0 && (
        <section className="previous-orders-section">
          <h2>Previous Order</h2>
          <div className="previous-orders-list">
            {previousOrders.map((order) => (
              <div key={order.id} className="previous-order-card">
                <div>
                  <strong>Order #{order.id}</strong> • {order.created_at.split("T")[0]}
                  <br />
                  <small>{order.items.length} item(s) • ₱{order.total_price}</small>
                </div>
                <button
                  onClick={() => {
                    const reusedItems = order.items.map((item) => {
                      const bev = beverages.find(b => b.id === item.beverage);
                      if (!bev) return null;
                      return {
                        ...bev,
                        caseQuantity: parseFloat(item.cases_ordered),
                        quantity: Math.round(parseFloat(item.cases_ordered) * bev.units_per_case),
                      };
                    }).filter(Boolean);

                    if (reusedItems.length > 0) {
                      setSelectedItems(reusedItems);
                      alert("Order items loaded! Scroll down to review and checkout.");
                    }
                  }}
                  className="btn-reorder"
                >
                  Reorder
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ✅ NEW: Unit Label Filter ABOVE category */}
      <div className="filter-bar">
        <input
          type="text"
          placeholder="🔍 Search drinks..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />

        {/* Unit Label Filter */}
        <select
          value={unitLabelFilter}
          onChange={(e) => setUnitLabelFilter(e.target.value)}
          className="unit-label-filter"
          aria-label="Filter by unit type"
        >
          {unitLabels.map((label) => (
            <option key={label} value={label}>
              {label === "All" ? "All Types" : label.charAt(0).toUpperCase() + label.slice(1)}
            </option>
          ))}
        </select>

        {/* Category Filter */}
        <div className="category-buttons">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`category-btn ${categoryFilter === cat ? "active" : ""}`}
              onClick={() => setCategoryFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
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
              const totalUnits = Math.round(caseQty * bev.units_per_case);
              const unitLabel = bev.unit_label || "case";
              const displayUnit = getUnitLabelPlural(unitLabel, caseQty);
              const maxCases = bev.stock / bev.units_per_case;
              const isOutOfStock = maxCases <= 0;

              return (
                <div
                  key={bev.id}
                  ref={productToBuy?.id === bev.id ? productRef : null}
                  className={`beverage-card ${caseQty > 0 ? "selected" : ""} ${isOutOfStock ? "out-of-stock" : ""}`}
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
                    <p className="price">
                      ₱{bev.price.toLocaleString()} <small>per {unitLabel}</small>
                    </p>
                    <p>{bev.volume}ml • {bev.units_per_case} pcs / {unitLabel}</p>
                    {!bev.allow_half_case && (
                      <p className="whole-only-hint">Whole {unitLabel}s only</p>
                    )}
                    {isOutOfStock && (
                      <p className="out-of-stock-label">Out of Stock</p>
                    )}
                  </div>

                  <div className="quantity-controls">
                    {bev.allow_half_case && !isOutOfStock && (
                      <button
                        onClick={() => {
                          const hasHalf = caseQty % 1 === 0.5;
                          const newQty = hasHalf 
                            ? Math.floor(caseQty) 
                            : Math.floor(caseQty) + 0.5;
                          updateCaseQuantity(bev, newQty);
                        }}
                        className={`btn-half ${caseQty % 1 === 0.5 ? "active" : ""}`}
                        aria-label="Toggle half unit"
                        disabled={isOutOfStock}
                      >
                        ½
                      </button>
                    )}

                    <button
                      onClick={() => updateCaseQuantity(bev, caseQty - 1)}
                      className="btn-action minus"
                      disabled={caseQty <= 0 || isOutOfStock}
                    >
                      −
                    </button>
                    <span className="quantity-value">
                      {caseQty} {displayUnit}
                    </span>
                    <button
                      onClick={() => {
                        if (canAddMore(bev, caseQty)) {
                          updateCaseQuantity(bev, caseQty + 1);
                        }
                      }}
                      className="btn-action plus"
                      disabled={isOutOfStock || !canAddMore(bev, caseQty)}
                      aria-label={isOutOfStock ? "Out of stock" : "Add one more"}
                    >
                      +
                    </button>
                  </div>

                  {caseQty > 0 && (
                    <div className="quantity-summary">
                      = {totalUnits} pcs
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <aside className="ordering-order-summary">
          <h2>🛒 Your Order</h2>
          {selectedItems.length === 0 ? (
            <div className="empty-cart">
              <p>Your cart is empty. Start adding {getUnitLabelPlural('case', 1)} above!</p>
            </div>
          ) : (
            <>
              <ul className="summary-items">
                {selectedItems.map((item) => {
                  const unitLabel = item.unit_label || "case";
                  const displayUnit = getUnitLabelPlural(unitLabel, item.caseQuantity);
                  return (
                    <li key={item.id} className="summary-item">
                      <div>
                        <strong className="item-name">{item.name}</strong>
                        <div className="item-details">
                          {item.caseQuantity} {displayUnit} × ₱{item.price} = ₱{(item.price * item.caseQuantity).toFixed(2)}
                          <br />
                          <small>{Math.round(item.quantity)} pcs</small>
                        </div>
                      </div>
                      <button onClick={() => removeItem(item)} className="btn-remove">
                        ✕
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div 
                className="order-totals"
                style={{
                    backgroundColor: '#f9f9f9',
                    color: '#222',
                    fontWeight: 'bold',
                    fontSize: '20px',
                    textAlign: 'center',
                    padding: '20px 0',
                    borderTop: '2px solid #ddd',
                    marginBottom: '20px',
                    borderRadius: '10px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                }}
              >
                Total: ₱{totalPrice.toFixed(2)}
              </div>
              <button onClick={goToCheckout} className="btn-checkout">
                Proceed to Checkout
              </button>
            </>
          )}
        </aside>
      </div>

      {!hideHelpButton && (
        <button
          className="help-button"
          onClick={() => setShowHelpModal(true)}
          aria-label="How to order?"
        >
          ?
        </button>
      )}

      {showHelpModal && (
        <div className="modal-overlay" onClick={() => setShowHelpModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>How to Order</h3>
              <button className="modal-close" onClick={() => setShowHelpModal(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <ol>
                <li>Select drinks using the <strong>“+”</strong> buttons.</li>
                <li>
                  Some drinks allow <strong>half-units (½)</strong>, others require <strong>whole units only</strong>.
                </li>
                <li>For <strong>Delivery</strong>: Total must be <strong>at least 10 units</strong> (e.g., cases, boxes).</li>
                <li>Review your order and click <strong>“Proceed to Checkout”</strong>.</li>
                <li><strong>Grayed-out “+”</strong> means item is out of stock or you’ve reached max available.</li>
              </ol>
            </div>
            <div className="modal-footer">
              <label className="dismiss-checkbox">
                <input
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) {
                      permanentlyHideHelp();
                      setShowHelpModal(false);
                    }
                  }}
                />
                Don’t show this again
              </label>
              <button onClick={() => setShowHelpModal(false)}>Got it</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderingPage;