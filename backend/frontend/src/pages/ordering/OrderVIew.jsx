// src/pages/admin/OrderView.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./OrderView.css";

const Order = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const fetchOrders = async () => {
    try {
      const res = await axios.get("http://127.0.0.1:8000/api/user/orders/", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });
      return { success: true, data: res.data };
    } catch (error) {
      console.error("Fetch error:", error);
      return {
        success: false,
        message: error.response?.data?.error || "Failed to fetch orders",
      };
    }
  };

  const deleteOrder = async (orderId) => {
    try {
      await axios.delete(`http://127.0.0.1:8000/api/orders/${orderId}/delete/`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.error || "Failed to delete order",
      };
    }
  };

  // ✅ CONFIRM RECEIPT — works even if status is "In Transit" (for delivered orders)
  const confirmReceipt = async (orderId) => {
    try {
      await axios.post(
        `http://127.0.0.1:8000/api/orders/${orderId}/confirm-receipt/`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.error || "Failed to confirm receipt",
      };
    }
  };

  useEffect(() => {
    const loadOrders = async () => {
      setLoading(true);
      const fetched = await fetchOrders();
      if (fetched.success) {
        const currentOrders = fetched.data
          .filter(order => {
            const status = (order.status || "").toLowerCase();
            return status !== "completed";
          })
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        setOrders(currentOrders);
      } else {
        setError(fetched.message);
      }
      setLoading(false);
    };

    loadOrders();
  }, []);

  const canCancelOrder = (createdAt) => {
    const orderTime = new Date(createdAt).getTime();
    const now = Date.now();
    const diffMinutes = (now - orderTime) / (1000 * 60);
    return diffMinutes <= 30;
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm("Cancel this order?")) return;
    const response = await deleteOrder(orderId);
    if (response.success) {
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      alert("Order cancelled.");
    } else {
      alert(response.message);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm("Delete this order permanently?")) return;
    const response = await deleteOrder(orderId);
    if (response.success) {
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      alert("Order deleted.");
    } else {
      alert(response.message);
    }
  };

  const handleConfirmReceipt = async (orderId) => {
    if (!window.confirm("Confirm that you have received all items? This will complete your order.")) return;

    const response = await confirmReceipt(orderId);
    if (response.success) {
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      alert("✅ Order completed! Thank you!");
    } else {
      alert("❌ Error: " + response.message);
    }
  };

  const groupedOrders = orders.reduce((groups, order) => {
    const status = (order.status || "unknown").toLowerCase();
    if (!groups[status]) groups[status] = [];
    groups[status].push(order);
    return groups;
  }, {});

  // Include all non-completed statuses
  const statusOrder = [
    "pending",
    "processing",
    "in transit",
    "delivered by staff",
    "cancelled"
  ];

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);

  const formatStatus = (status) => {
    return (status || "")
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="orders-page">
      <div className="top-bar">
        <button
          onClick={() => navigate("/order-history")}
          className="view-history-btn"
        >
          ← View Full Order History
        </button>
      </div>

      <h1>🧾 Your Current Orders</h1>
      <p className="subtitle">Active and pending orders.</p>

      {loading ? (
        <div className="loading-state">Loading your orders...</div>
      ) : error ? (
        <div className="error-state">⚠️ {error}</div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          No active orders found.<br />
          Completed orders are in Order History.
        </div>
      ) : (
        <div className="orders-list">
          {statusOrder.map((statusKey) => {
            const ordersForStatus = groupedOrders[statusKey] || [];
            if (ordersForStatus.length === 0) return null;

            const displayStatus = formatStatus(statusKey);

            return (
              <div key={statusKey} className="status-section">
                <h2>{displayStatus} Orders ({ordersForStatus.length})</h2>
                <div className="order-grid">
                  {ordersForStatus.map((order) => (
                    <div key={order.id} className="order-card">
                      <div className="order-header">
                        <div className="order-id">ORDER #{order.id}</div>
                        <div className="order-date">
                          {new Date(order.created_at).toLocaleString("en-PH", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        <div className="order-actions-right">
                          {["pending", "processing"].includes(statusKey) && (
                            <>
                              {canCancelOrder(order.created_at) ? (
                                <>
                                  <button
                                    onClick={() => handleCancelOrder(order.id)}
                                    className="btn-cancel"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleDeleteOrder(order.id)}
                                    className="btn-delete"
                                  >
                                    Delete
                                  </button>
                                </>
                              ) : (
                                <span className="cancel-expired">
                                  Cancellation period expired
                                </span>
                              )}
                            </>
                          )}

                          {/* ✅ SHOW "Items Received" BUTTON FOR DELIVERED ORDERS */}
                          {order.delivery_type === "Delivered" && 
                           !["pending", "processing"].includes(statusKey) && (
                            <button
                              onClick={() => handleConfirmReceipt(order.id)}
                              className="btn-confirm-receipt"
                            >
                              Items Received
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="status-display">
                        Status: <strong>{formatStatus(order.status)}</strong>
                      </div>

                      <div className="delivery-payment-section">
                        <span className="delivery-type">{order.delivery_type}</span>
                        <span className="payment-method">{order.payment_method || "N/A"}</span>
                      </div>

                      <div className="items-section">
                        {order.items.map((item, index) => {
                          const name = item.beverage_name || 'Unknown Item';
                          const cases = parseFloat(item.cases_ordered);
                          const pricePerCase = parseFloat(item.price_per_case) || 0;
                          const totalPrice = parseFloat(item.total_price) || 0;

                          if (isNaN(cases)) {
                            return (
                              <div key={index} className="item-row">
                                <span>{name} (Invalid)</span>
                                <span>{formatCurrency(totalPrice)}</span>
                              </div>
                            );
                          }

                          let qty;
                          if (cases === Math.floor(cases)) {
                            qty = `${Math.floor(cases)} case${Math.floor(cases) !== 1 ? 's' : ''}`;
                          } else if (cases === 0.5) {
                            qty = '½ case';
                          } else if (cases === 1.5) {
                            qty = '1½ case';
                          } else {
                            qty = `${cases.toFixed(1)} case`;
                          }

                          return (
                            <div key={index} className="item-row">
                              <span>{name} ({qty}) {formatCurrency(pricePerCase)}</span>
                              <span>{formatCurrency(totalPrice)}</span>
                            </div>
                          );
                        })}
                        <div className="items-total-row">
                          <span>Total:</span>
                          <span>{formatCurrency(parseFloat(order.total_price) || 0)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Order;