// src/pages/admin/OrderDetails.jsx
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";

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

  // Close dropdown when clicking outside
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

      setPopup({ message: "Order updated successfully.", type: "success" });
    } catch (err) {
      console.error("Save error:", err.response?.data || err.message);
      const errorMsg =
        err.response?.data?.detail ||
        Object.keys(err.response?.data || {})
          .map((k) => `${k}: ${err.response.data[k]}`)
          .join(", ") ||
        "Failed to update order.";
      setPopup({ message: `Error: ${errorMsg}`, type: "error" });
    }

    setTimeout(() => setPopup({ message: "", type: "" }), 4000);
  };

  if (loading) return <p style={styles.loading}>Loading order details...</p>;
  if (!order) return <p style={styles.loading}>Order not found.</p>;

  return (
    <div style={styles.container}>
      {/* Toast Notification */}
      {popup.message && (
        <div style={{
          ...styles.toast,
          background: popup.type === "success" 
            ? "linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)"
            : "linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%)",
          color: popup.type === "success" ? "#155724" : "#721c24",
          border: popup.type === "success" ? "1px solid #b1dfbb" : "1px solid #f1b0b7",
        }}>
          {popup.message}
        </div>
      )}

      {/* Back Button */}
      <button onClick={() => navigate("/admin/orders")} style={styles.backButton}>
        Back to Orders
      </button>

      {/* Title */}
      <h2 style={styles.title}>Order Details #{order.id}</h2>

      {/* Order Info Table */}
      <div style={styles.card}>
        <table style={styles.table}>
          <tbody>
            <tr>
              <th style={styles.th}>Customer Name</th>
              <td style={styles.td}>
                <input
                  name="customer_name"
                  value={order.customer_name || ""}
                  onChange={handleOrderChange}
                  style={styles.input}
                />
              </td>
            </tr>
            <tr>
              <th style={styles.th}>Status</th>
              <td style={styles.td}>
                <select
                  name="status"
                  value={order.status}
                  onChange={handleOrderChange}
                  style={styles.select}
                >
                  <option value="Pending">Pending</option>
                  <option value="Processing">Processing</option>
                  <option value="In Transit">In Transit</option>
                  <option value="Completed">Completed</option>
                </select>
              </td>
            </tr>
            <tr>
              <th style={styles.th}>Payment Method</th>
              <td style={styles.td}>
                <input
                  name="payment_method"
                  value={order.payment_method || ""}
                  onChange={handleOrderChange}
                  style={styles.input}
                />
              </td>
            </tr>
            <tr>
              <th style={styles.th}>Contact Number</th>
              <td style={styles.td}>
                <input
                  name="contact_number"
                  value={order.contact_number || ""}
                  onChange={handleOrderChange}
                  style={styles.input}
                />
              </td>
            </tr>
            <tr>
              <th style={styles.th}>Address</th>
              <td style={styles.td}>
                <input
                  name="text_address"
                  value={order.text_address || ""}
                  onChange={handleOrderChange}
                  style={styles.input}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Ordered Items */}
      <h3 style={styles.subtitle}>Ordered Items</h3>
      {items.length === 0 ? (
        <p style={styles.emptyText}>No items in this order.</p>
      ) : (
        <div style={styles.card}>
          <div style={styles.tableWrapper}>
            <table style={styles.itemsTable}>
              <thead>
                <tr style={{background: "linear-gradient(135deg, #f8f9fa 0%, #f0f1f3 100%)"}}>
                  <th style={styles.itemTh}>Product</th>
                  <th style={styles.itemTh}>Quantity</th>
                  <th style={styles.itemTh}>Price/Case</th>
                  <th style={styles.itemTh}>Total</th>
                  <th style={styles.itemTh}>Stock (Cases)</th>
                  <th style={styles.itemTh}>Remove</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const beverage = getBeverageById(item.beverage);
                  const unitsPerCase = beverage?.units_per_case || 24;
                  const halfCase = Math.floor(unitsPerCase / 2);
                  const qty = parseInt(item.quantity) || 0;
                  const pricePerCase = parseFloat(beverage?.price) || 0;
                  const cases = qty / unitsPerCase;
                  const total = cases * pricePerCase;
                  const isHalfToggled = qty > 0 && qty % halfCase === 0;

                  return (
                    <tr key={index} style={{borderBottom: "1px solid #f0f0f0"}}>
                      <td style={styles.itemTd}>
                        <div 
                          ref={el => dropdownRefs.current[index] = el}
                          style={{position: "relative"}}
                        >
                          {/* Display selected beverage or placeholder */}
                          <div
                            onClick={() => toggleDropdown(index)}
                            style={styles.selectDisplay}
                          >
                            <span style={{flex: 1}}>
                              {beverage ? `${beverage.name} (₱${beverage.price})` : "Select Beverage"}
                            </span>
                            <span style={{fontSize: "10px", color: "#666"}}>▼</span>
                          </div>

                          {/* Custom Dropdown Menu */}
                          {openDropdown === index && (
                            <div style={styles.dropdownMenu}>
                              {/* Search input inside dropdown */}
                              <input
                                type="text"
                                placeholder="🔍 Search beverage..."
                                value={searchTerms[index] || ""}
                                onChange={(e) => handleSearchChange(index, e.target.value)}
                                style={styles.searchInput}
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                              />
                              
                              {/* List of filtered beverages */}
                              <div style={styles.dropdownList}>
                                {getFilteredBeverages(index).length === 0 ? (
                                  <div style={styles.dropdownItem}>No beverages found</div>
                                ) : (
                                  getFilteredBeverages(index).map((b) => (
                                    <div
                                      key={b.id}
                                      onClick={() => selectBeverage(index, b.id)}
                                      style={{
                                        ...styles.dropdownItem,
                                        background: getBeverageId(item.beverage) === b.id 
                                          ? "rgba(255, 107, 53, 0.08)" 
                                          : "white",
                                      }}
                                    >
                                      {b.name} (₱{b.price})
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={styles.itemTd}>
                        <div style={{display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap"}}>
                          <button
                            onClick={() => adjustByCase(index, -1)}
                            style={styles.adjustButton}
                            title="Remove 1 full case"
                          >
                            −1
                          </button>
                          <button
                            onClick={() => adjustByCase(index, 1)}
                            style={styles.adjustButton}
                            title="Add 1 full case"
                          >
                            +1
                          </button>
                          <button
                            onClick={() => toggleHalfCase(index)}
                            style={{
                              ...styles.adjustButton,
                              background: isHalfToggled 
                                ? "linear-gradient(135deg, #4caf50 0%, #45a049 100%)"
                                : "linear-gradient(135deg, #2196f3 0%, #1976d2 100%)"
                            }}
                            title={isHalfToggled ? "Remove half case" : "Add half case"}
                          >
                            {isHalfToggled ? "−½" : "+½"}
                          </button>
                          <div style={styles.caseDisplay}>
                            {cases.toFixed(1)} case{cases !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </td>
                      <td style={styles.itemTd}>₱{pricePerCase.toFixed(2)}</td>
                      <td style={styles.itemTd}>₱{total.toFixed(2)}</td>
                      <td style={styles.itemTd}>{beverage?.stock || 0}</td>
                      <td style={styles.itemTd}>
                        <button onClick={() => removeItem(index)} style={styles.removeButton}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{background: "linear-gradient(135deg, #f8f9fa 0%, #f0f1f3 100%)", borderTop: "2px solid #e0e0e0"}}>
                  <td colSpan="6" style={styles.totalRow}>
                    TOTAL: ₱{getTotalPrice().toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Action Buttons */}
          <div style={styles.actions}>
            <button onClick={addItemRow} style={styles.addButton}>
              Add Item
            </button>
            <button onClick={handleSave} style={styles.saveButton}>
              Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Styles Object
const styles = {
  container: {
    padding: "40px 24px",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    background: "linear-gradient(135deg, #f8f9fa 0%, #f0f1f3 100%)",
    minHeight: "100vh",
    fontSize: "14px",
  },
  toast: {
    position: "fixed",
    top: "20px",
    right: "20px",
    padding: "14px 20px",
    borderRadius: "12px",
    fontWeight: "600",
    zIndex: 1000,
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
    maxWidth: "400px",
    fontSize: "14px",
    animation: "slideIn 0.3s ease-out",
  },
  backButton: {
    padding: "10px 20px",
    border: "none",
    borderRadius: "8px",
    fontWeight: "600",
    cursor: "pointer",
    fontSize: "13px",
    background: "linear-gradient(135deg, #6c757d 0%, #5a6268 100%)",
    color: "white",
    marginBottom: "20px",
    transition: "all 0.3s ease",
  },
  title: {
    fontSize: "2rem",
    fontWeight: "700",
    background: "linear-gradient(135deg, #222 0%, #ff4757 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    marginBottom: "30px",
  },
  subtitle: {
    margin: "24px 0 16px",
    color: "#222",
    fontSize: "1.2rem",
    fontWeight: "700",
    borderBottom: "2px solid rgba(255, 71, 87, 0.2)",
    paddingBottom: "10px",
  },
  card: {
    background: "white",
    borderRadius: "12px",
    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
    marginBottom: "30px",
    border: "1px solid rgba(0, 0, 0, 0.05)",
    overflow: "hidden",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    padding: "14px 20px",
    textAlign: "left",
    fontWeight: "600",
    fontSize: "13px",
    color: "#555",
    borderBottom: "1px solid #e5e7eb",
    width: "200px",
    background: "transparent",
  },
  td: {
    padding: "14px 20px",
    borderBottom: "1px solid #f0f0f0",
    fontSize: "13px",
    color: "#333",
  },
  input: {
    width: "100%",
    padding: "10px 14px",
    border: "2px solid #e0e0e0",
    borderRadius: "8px",
    background: "white",
    fontSize: "13px",
    fontWeight: "500",
    transition: "all 0.3s ease",
    color: "#333",
    boxSizing: "border-box",
  },
  select: {
    width: "100%",
    padding: "10px 14px",
    border: "2px solid #e0e0e0",
    borderRadius: "8px",
    background: "white",
    fontSize: "13px",
    fontWeight: "500",
    transition: "all 0.3s ease",
    color: "#333",
    boxSizing: "border-box",
    cursor: "pointer",
  },
  selectDisplay: {
    width: "100%",
    padding: "10px 14px",
    border: "2px solid #e0e0e0",
    borderRadius: "8px",
    background: "white",
    fontSize: "13px",
    fontWeight: "500",
    transition: "all 0.3s ease",
    color: "#333",
    boxSizing: "border-box",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownMenu: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    background: "white",
    border: "2px solid #ff4757",
    borderRadius: "8px",
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
    zIndex: 1000,
    marginTop: "4px",
    maxHeight: "300px",
    display: "flex",
    flexDirection: "column",
  },
  searchInput: {
    width: "100%",
    padding: "10px 14px",
    border: "none",
    borderBottom: "2px solid #e0e0e0",
    fontSize: "13px",
    outline: "none",
    boxSizing: "border-box",
    flexShrink: 0,
  },
  dropdownList: {
    maxHeight: "240px",
    overflowY: "auto",
    flexGrow: 1,
  },
  dropdownItem: {
    padding: "10px 14px",
    cursor: "pointer",
    fontSize: "13px",
    borderBottom: "1px solid #f0f0f0",
    transition: "all 0.2s ease",
  },
  tableWrapper: {
    overflowX: "auto",
    padding: "28px",
  },
  itemsTable: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "900px",
  },
  itemTh: {
    padding: "14px 12px",
    textAlign: "left",
    fontWeight: "700",
    fontSize: "12px",
    color: "#222",
    textTransform: "uppercase",
    letterSpacing: "0.4px",
    borderBottom: "2px solid rgba(255, 71, 87, 0.1)",
  },
  itemTd: {
    padding: "14px 12px",
    fontSize: "13px",
    color: "#333",
    verticalAlign: "middle",
  },
  adjustButton: {
    padding: "6px 10px",
    fontSize: "11px",
    minWidth: "40px",
    background: "linear-gradient(135deg, #2196f3 0%, #1976d2 100%)",
    color: "white",
    fontWeight: "600",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "all 0.3s ease",
  },
  caseDisplay: {
    padding: "6px 10px",
    textAlign: "center",
    border: "2px solid #e0e0e0",
    borderRadius: "8px",
    background: "#f8f9fa",
    fontWeight: "600",
    fontSize: "11px",
    color: "#333",
    whiteSpace: "nowrap",
    minWidth: "90px",
  },
  removeButton: {
    padding: "6px 12px",
    border: "none",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: "600",
    cursor: "pointer",
    background: "linear-gradient(135deg, #dc3545 0%, #c82333 100%)",
    color: "white",
    transition: "all 0.3s ease",
    textTransform: "uppercase",
    letterSpacing: "0.3px",
  },
  totalRow: {
    padding: "18px 16px",
    fontWeight: "700",
    fontSize: "16px",
    color: "#222",
    textAlign: "right",
  },
  actions: {
    padding: "0 28px 28px 28px",
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },
  addButton: {
    padding: "10px 20px",
    border: "none",
    borderRadius: "8px",
    fontWeight: "600",
    cursor: "pointer",
    fontSize: "13px",
    background: "linear-gradient(135deg, #4caf50 0%, #45a049 100%)",
    color: "white",
    boxShadow: "0 4px 12px rgba(76, 175, 80, 0.2)",
    transition: "all 0.3s ease",
  },
  saveButton: {
    padding: "10px 20px",
    border: "none",
    borderRadius: "8px",
    fontWeight: "600",
    cursor: "pointer",
    fontSize: "13px",
    background: "linear-gradient(135deg, #4caf50 0%, #45a049 100%)",
    color: "white",
    boxShadow: "0 4px 12px rgba(76, 175, 80, 0.2)",
    transition: "all 0.3s ease",
  },
  loading: {
    textAlign: "center",
    padding: "60px 24px",
    color: "#999",
    fontSize: "16px",
  },
  emptyText: {
    textAlign: "center",
    padding: "20px",
    color: "#999",
    fontSize: "14px",
  },
};

export default OrderDetails;