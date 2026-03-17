// src/pages/admin/OrderDetails.jsx
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import "./css/OrderDetails.css";

const BARANGAYS = [
  "Dalahican",
  "Cotta",
  "Dupay",
  "Iyam",
  "Market View",
  "Mayao",
  "Talao-talao"
];

const OrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [beverages, setBeverages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [popup, setPopup] = useState({ message: "", type: "" });
  const [searchTerms, setSearchTerms] = useState({});
  const [openDropdown, setOpenDropdown] = useState(null);
  const dropdownRefs = useRef({});

  const token = localStorage.getItem("admin_token") || localStorage.getItem("access");
  const headers = { Authorization: `Bearer ${token}` };

  const getBeverageId = (bev) => {
    return typeof bev === "object" ? parseInt(bev.id) : parseInt(bev);
  };

  const getBeverageById = (id) => {
    const beverageId = typeof id === "object" ? parseInt(id.id) : parseInt(id);
    return beverages.find((b) => parseInt(b.id) === beverageId);
  };

  useEffect(() => {
    const loadOrderAndBeverages = async () => {
      if (!token) {
        setPopup({ message: "Authentication required.", type: "error" });
        setLoading(false);
        return;
      }

      try {
        const [orderRes, beverageRes] = await Promise.all([
          axios.get(`http://localhost:8000/api/admin/orders/${id}/`, { headers }),
          axios.get(`http://localhost:8000/api/beverages/`, { headers }),
        ]);

        const orderData = orderRes.data;
        const beverageList = beverageRes.data;

        setBeverages(beverageList);
        setOrder(orderData);

        const rawItems = orderData.items.map((item) => {
          const beverage = beverageList.find(b => b.id === getBeverageId(item.beverage));
          const unitsPerCase = beverage?.units_per_case || 24;
          const bottles = (parseFloat(item.cases_ordered) || 0) * unitsPerCase;
          return {
            id: item.id,
            beverage: getBeverageId(item.beverage),
            quantity: Math.round(bottles),
            price: beverage?.price || 0,
          };
        });

        setItems(rawItems);
      } catch (err) {
        console.error("Error loading data:", err.response?.data || err.message);
        const errorMsg = err.response?.data?.detail || "Failed to load order.";
        setPopup({ message: errorMsg, type: "error" });
      } finally {
        setLoading(false);
      }
    };

    loadOrderAndBeverages();
  }, [id, token]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openDropdown !== null && dropdownRefs.current[openDropdown]) {
        if (!dropdownRefs.current[openDropdown].contains(event.target)) {
          setOpenDropdown(null);
          setSearchTerms(prev => ({ ...prev, [openDropdown]: "" }));
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  const handleOrderChange = (e) => {
    const { name, value } = e.target;
    setOrder((prev) => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    if (field === "beverage") {
      const beverageId = parseInt(value);
      const selected = getBeverageById(beverageId);
      updated[index].beverage = beverageId;
      updated[index].price = selected?.price || 0;
    } else {
      updated[index][field] = parseInt(value) || 0;
    }
    setItems(updated);
  };

  const addItemRow = () => {
    setItems([...items, { beverage: "", quantity: 0, price: 0 }]);
  };

  const removeItem = (index) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
    const newSearchTerms = { ...searchTerms };
    delete newSearchTerms[index];
    const reindexed = {};
    Object.keys(newSearchTerms).forEach(key => {
      const idx = parseInt(key);
      if (idx > index) {
        reindexed[idx - 1] = newSearchTerms[key];
      } else {
        reindexed[key] = newSearchTerms[key];
      }
    });
    setSearchTerms(reindexed);
  };

  const handleSearchChange = (index, value) => {
    setSearchTerms(prev => ({ ...prev, [index]: value }));
  };

  const getFilteredBeverages = (index) => {
    const searchTerm = searchTerms[index] || "";
    if (!searchTerm.trim()) return beverages;
    
    return beverages.filter(b => 
      b.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const toggleDropdown = (index) => {
    if (openDropdown === index) {
      setOpenDropdown(null);
      setSearchTerms(prev => ({ ...prev, [index]: "" }));
    } else {
      setOpenDropdown(index);
      setSearchTerms(prev => ({ ...prev, [index]: "" }));
    }
  };

  const selectBeverage = (index, beverageId) => {
    handleItemChange(index, "beverage", beverageId);
    setOpenDropdown(null);
    setSearchTerms(prev => ({ ...prev, [index]: "" }));
  };

  const adjustByCase = (index, multiplier) => {
    const item = items[index];
    const beverage = getBeverageById(item.beverage);
    const unitsPerCase = beverage?.units_per_case || 24;
    const newQty = Math.max(0, item.quantity + multiplier * unitsPerCase);
    handleItemChange(index, "quantity", newQty);
  };

  const toggleHalfCase = (index) => {
    const item = items[index];
    const beverage = getBeverageById(item.beverage);
    
    // Check if half case is allowed
    if (!beverage || beverage.allow_half_case === false) {
      return;
    }

    const unitsPerCase = beverage?.units_per_case || 24;
    const halfCase = Math.floor(unitsPerCase / 2);
    const currentQty = item.quantity;
    const isCurrentlyHalfCase = currentQty > 0 && currentQty % halfCase === 0;

    const newQty = isCurrentlyHalfCase
      ? Math.max(0, currentQty - halfCase)
      : currentQty + halfCase;

    handleItemChange(index, "quantity", newQty);
  };

  const getTotalPrice = () => {
    return items.reduce((sum, item) => {
      const qty = parseInt(item.quantity) || 0;
      const beverage = getBeverageById(item.beverage);
      const unitsPerCase = beverage?.units_per_case || 24;
      const pricePerCase = parseFloat(beverage?.price) || 0;
      const cases = qty / unitsPerCase;
      return sum + cases * pricePerCase;
    }, 0);
  };

  const handleSave = async () => {
    if (!token) {
      setPopup({ message: "Login required.", type: "error" });
      setTimeout(() => setPopup({ message: "", type: "" }), 4000);
      return;
    }

    for (const item of items) {
      const beverageId = getBeverageId(item.beverage);
      const quantityBottles = parseInt(item.quantity) || 0;
      if (quantityBottles === 0) continue;

      const beverage = getBeverageById(beverageId);
      if (!beverage) {
        setPopup({ message: "Invalid beverage selected.", type: "error" });
        setTimeout(() => setPopup({ message: "", type: "" }), 4000);
        return;
      }

      const casesNeeded = quantityBottles / (beverage.units_per_case || 24);
      if (parseFloat(beverage.stock) < casesNeeded) {
        setPopup({
          message: `Not enough stock for "${beverage.name}". Only ${beverage.stock} cases available.`,
          type: "error",
        });
        setTimeout(() => setPopup({ message: "", type: "" }), 4000);
        return;
      }
    }

    const payload = {
      customer_name: order.customer_name,
      status: order.status,
      delivery_type: order.delivery_type,
      payment_method: order.payment_method,
      contact_number: order.contact_number,
      text_address: order.text_address,
      barangay: order.barangay,
      items: items
        .filter((item) => getBeverageId(item.beverage) && item.quantity > 0)
        .map((item) => {
          const beverage = getBeverageById(item.beverage);
          const unitsPerCase = beverage?.units_per_case || 24;
          const cases = (parseInt(item.quantity) || 0) / unitsPerCase;
          return {
            id: item.id || undefined,
            beverage: getBeverageId(item.beverage),
            quantity: cases,
          };
        }),
    };

    try {
      const res = await axios.patch(`http://localhost:8000/api/orders/${id}/`, payload, {
        headers,
      });

      setOrder(res.data);
      const normalizedItems = res.data.items.map((i) => {
        const bev = beverages.find(b => b.id === getBeverageId(i.beverage));
        const units = bev?.units_per_case || 24;
        return {
          id: i.id,
          beverage: getBeverageId(i.beverage),
          quantity: Math.round(parseFloat(i.cases_ordered) * units),
          price: bev?.price || 0,
        };
      });
      setItems(normalizedItems);

      setPopup({ message: "✅ Order updated successfully!", type: "success" });
    } catch (err) {
      console.error("Save error:", err.response?.data || err.message);
      const errorMsg =
        err.response?.data?.detail ||
        Object.keys(err.response?.data || {})
          .map((k) => `${k}: ${err.response.data[k]}`)
          .join(", ") ||
        "Failed to update order.";
      setPopup({ message: `❌ Error: ${errorMsg}`, type: "error" });
    }

    setTimeout(() => setPopup({ message: "", type: "" }), 4000);
  };

  if (loading) {
    return (
      <div className="order-details-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="order-details-page">
        <div className="error-state">
          <p>❌ Order not found.</p>
          <button onClick={() => navigate("/admin/orders")} className="btn-back">
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="order-details-page">
      {popup.message && (
        <div className={`toast ${popup.type}`}>
          {popup.message}
        </div>
      )}

      <div className="page-header-details">
        <button onClick={() => navigate("/admin/orders")} className="btn-back">
          ← Back to Orders
        </button>
        <h1 className="page-title"> Order #{order.id}</h1>
      </div>

      <div className="info-card">
        <h2 className="section-title"> Order Information</h2>
        <div className="info-grid">
          <div className="info-field">
            <label>Customer Name</label>
            <input
              type="text"
              name="customer_name"
              value={order.customer_name || ""}
              onChange={handleOrderChange}
              className="input-field"
            />
          </div>

          <div className="info-field">
            <label>Status</label>
            <select
              name="status"
              value={order.status}
              onChange={handleOrderChange}
              className="select-field"
            >
              <option value="Pending"> Pending</option>
              <option value="Processing"> Processing</option>
              <option value="In Transit"> In Transit</option>
              <option value="Completed"> Completed</option>
            </select>
          </div>

          <div className="info-field">
            <label>Delivery Type</label>
            <input
              type="text"
              name="delivery_type"
              value={order.delivery_type || ""}
              readOnly
              className="input-field"
              style={{ background: '#f8f9fa', cursor: 'not-allowed' }}
            />
          </div>

          <div className="info-field">
            <label>Payment Method</label>
            <input
              type="text"
              name="payment_method"
              value={order.payment_method || ""}
              onChange={handleOrderChange}
              className="input-field"
            />
          </div>

          <div className="info-field">
            <label>Contact Number</label>
            <input
              type="text"
              name="contact_number"
              value={order.contact_number || ""}
              onChange={handleOrderChange}
              className="input-field"
            />
          </div>

          <div className="info-field full-width">
            <label>Delivery Address (Geocoded)</label>
            <input
              type="text"
              name="text_address"
              value={order.text_address || ""}
              onChange={handleOrderChange}
              className="input-field"
              placeholder="e.g., Barangay Dalahican, Lucena City"
            />
          </div>

          {order.delivery_type === "Delivered" && (
            <div className="info-field">
              <label>Barangay</label>
              <select
                name="barangay"
                value={order.barangay || ""}
                onChange={handleOrderChange}
                className="select-field"
              >
                <option value="">Select Barangay</option>
                {BARANGAYS.map((brgy) => (
                  <option key={brgy} value={brgy}>
                    {brgy}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="items-card">
        <div className="items-header">
          <h2 className="section-title"> Order Items</h2>
          <button onClick={addItemRow} className="btn-add-item">
            + Add Item
          </button>
        </div>

        {items.length === 0 ? (
          <div className="empty-items">
            <p>No items in this order yet.</p>
            <button onClick={addItemRow} className="btn-add-first">
              Add First Item
            </button>
          </div>
        ) : (
          <>
            <div className="items-list">
              {items.map((item, index) => {
                const beverage = getBeverageById(item.beverage);
                const unitsPerCase = beverage?.units_per_case || 24;
                const halfCase = Math.floor(unitsPerCase / 2);
                const qty = parseInt(item.quantity) || 0;
                const pricePerCase = parseFloat(beverage?.price) || 0;
                const cases = qty / unitsPerCase;
                const total = cases * pricePerCase;
                const isHalfToggled = qty > 0 && qty % halfCase === 0;
                const allowHalfCase = beverage?.allow_half_case !== false;

                return (
                  <div key={index} className="item-row">
                    <div className="item-main">
                      <div className="item-section product-section">
                        <label className="item-label">Product</label>
                        <div 
                          ref={el => dropdownRefs.current[index] = el}
                          className="dropdown-container"
                        >
                          <div
                            onClick={() => toggleDropdown(index)}
                            className="select-display"
                          >
                            <span className="select-text">
                              {beverage ? beverage.name : "Select Product"}
                            </span>
                            {beverage && (
                              <span className="select-price">₱{beverage.price}</span>
                            )}
                            <span className="select-arrow">▼</span>
                          </div>

                          {openDropdown === index && (
                            <div className="dropdown-menu">
                              <input
                                type="text"
                                placeholder="🔍 Search products..."
                                value={searchTerms[index] || ""}
                                onChange={(e) => handleSearchChange(index, e.target.value)}
                                className="dropdown-search"
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="dropdown-list">
                                {getFilteredBeverages(index).length === 0 ? (
                                  <div className="dropdown-item empty">No products found</div>
                                ) : (
                                  getFilteredBeverages(index).map((b) => (
                                    <div
                                      key={b.id}
                                      onClick={() => selectBeverage(index, b.id)}
                                      className={`dropdown-item ${getBeverageId(item.beverage) === b.id ? 'selected' : ''}`}
                                    >
                                      <span className="dropdown-item-name">{b.name}</span>
                                      <span className="dropdown-item-price">₱{b.price}</span>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="item-section quantity-section">
                        <label className="item-label">Quantity</label>
                        <div className="quantity-controls">
                          <button
                            onClick={() => adjustByCase(index, -1)}
                            className="qty-btn minus"
                            title="Remove 1 case"
                          >
                            −1
                          </button>
                          <button
                            onClick={() => adjustByCase(index, 1)}
                            className="qty-btn plus"
                            title="Add 1 case"
                          >
                            +1
                          </button>
                          {allowHalfCase ? (
                            <button
                              onClick={() => toggleHalfCase(index)}
                              className={`qty-btn half ${isHalfToggled ? 'active' : ''}`}
                              title={isHalfToggled ? "Remove half case" : "Add half case"}
                            >
                              ½
                            </button>
                          ) : (
                            <div className="whole-cases-only" title="Whole cases only">
                              🚫½
                            </div>
                          )}
                          <div className="qty-display">
                            {cases.toFixed(1)} {cases === 1 ? 'case' : 'cases'}
                          </div>
                        </div>
                      </div>

                      <div className="item-section price-section">
                        <label className="item-label">Price</label>
                        <div className="price-info">
                          <div className="price-per-case">₱{pricePerCase.toFixed(2)}/case</div>
                          <div className="price-total">₱{total.toFixed(2)}</div>
                        </div>
                      </div>

                      <div className="item-section stock-section">
                        <label className="item-label">Stock</label>
                        <div className="stock-info">
                          {beverage ? (
                            <>
                              <div className="stock-bottles">{beverage.stock} bottles</div>
                              <div className="stock-cases">
                                ({Math.floor(beverage.stock / unitsPerCase)} cases)
                              </div>
                            </>
                          ) : (
                            <div className="stock-empty">—</div>
                          )}
                        </div>
                      </div>

                      <div className="item-section remove-section">
                        <button
                          onClick={() => removeItem(index)}
                          className="btn-remove-item"
                          title="Remove item"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="items-footer">
              <div className="order-total-box">
                <span className="total-label">Total Amount:</span>
                <span className="total-amount">₱{getTotalPrice().toFixed(2)}</span>
              </div>
              <button onClick={handleSave} className="btn-save">
                 Save Changes
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OrderDetails;