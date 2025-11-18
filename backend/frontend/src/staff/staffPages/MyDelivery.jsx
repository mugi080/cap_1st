// src/components/MyDelivery.jsx
import React, { useEffect, useState } from "react";
import "./css/MyDelivery.css";
import { Link } from "react-router-dom";

const MyDelivery = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [toast, setToast] = useState(null);

  // Get auth data
  const staffData = JSON.parse(localStorage.getItem("staff_data"));
  const myStaffId = staffData?.id;
  const token = localStorage.getItem("staff_token") || localStorage.getItem("rider_token");

  // Fetch orders
  const fetchOrders = async () => {
    if (!token || !myStaffId) {
      setError("Authentication missing.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("http://localhost:8000/api/orders/", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to load deliveries.");

      const data = await res.json();

      // Filter: assigned to me + not completed
      const activeDeliveries = data.filter((order) => {
        let isAssignedToMe = false;
        if (typeof order.assigned_staff === 'object' && order.assigned_staff !== null) {
          isAssignedToMe = parseInt(order.assigned_staff.id) === parseInt(myStaffId);
        } else {
          isAssignedToMe = parseInt(order.assigned_staff) === parseInt(myStaffId);
        }
        return isAssignedToMe && order.status !== "Completed";
      });

      setOrders(activeDeliveries);
    } catch (err) {
      console.error("Error fetching deliveries:", err);
      setError("Failed to load your deliveries.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [myStaffId, token]);

  // Handle individual status change
  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const response = await fetch(`http://localhost:8000/api/orders/${orderId}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error("Failed to update status");

      const updatedOrder = await response.json();

      setOrders((prev) =>
        prev.map((order) => (order.id === orderId ? updatedOrder : order))
          .filter((o) => o.status !== "Completed") // Remove if completed
      );

      setToast({
        message: `✅ Order #${orderId} is now "${newStatus}"`,
        type: "success",
      });
    } catch (err) {
      setToast({
        message: `❌ Failed to update Order #${orderId}`,
        type: "error",
      });
    }
    setTimeout(() => setToast(null), 3000);
  };

  // Toggle selection of one order
  const toggleSelect = (id) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((oid) => oid !== id) : [...prev, id]
    );
  };

  // Select/Deselect All
  const toggleSelectAll = () => {
    if (selectedOrderIds.length === orders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(orders.map((o) => o.id));
    }
  };

  // Mark All Selected as "In Transit"
  const handleStartAllDeliveries = async () => {
    if (selectedOrderIds.length === 0) return;

    const confirm = window.confirm(
      `Start delivery for ${selectedOrderIds.length} order(s)?\n\nThis will mark them as "In Transit".`
    );
    if (!confirm) return;

    try {
      await Promise.all(
        selectedOrderIds.map((id) =>
          fetch(`http://localhost:8000/api/orders/${id}/`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ status: "In Transit" }),
          })
        )
      );

      // Refresh list after success
      setToast({
        message: `🚚 ${selectedOrderIds.length} order(s) marked as In Transit!`,
        type: "success",
      });
      setSelectedOrderIds([]);
      fetchOrders(); // Refetch to sync state
    } catch (err) {
      setToast({
        message: "❌ Failed to start deliveries.",
        type: "error",
      });
    }
    setTimeout(() => setToast(null), 3000);
  };

  // Status badge class helper
  const getStatusBadgeClass = (status) => {
    return `delivery-status-badge status-${status.toLowerCase().replace(' ', '-')}`;
  };

  return (
    <div className="my-delivery-container">
      {/* Toast Notification */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      )}

      <h2 className="my-delivery-title">📦 My Deliveries</h2>

      {/* Bulk Action Bar */}
      {selectedOrderIds.length > 0 && (
        <div className="bulk-action-bar">
          <span>{selectedOrderIds.length} selected</span>
          <button onClick={handleStartAllDeliveries} className="btn-bulk-start">
            🚀 Start All Deliveries
          </button>
          <button onClick={() => setSelectedOrderIds([])} className="btn-clear">
            Clear
          </button>
        </div>
      )}

      {/* Select All Checkbox */}
      {orders.length > 0 && (
        <div className="select-all-control">
          <label>
            <input
              type="checkbox"
              checked={selectedOrderIds.length > 0 && selectedOrderIds.length === orders.length}
              onChange={toggleSelectAll}
            />
            Select All
          </label>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="my-delivery-loading">
          <div className="spinner"></div>
          <p>Loading your deliveries...</p>
        </div>
      ) : error ? (
        <p className="my-delivery-error">{error}</p>
      ) : orders.length === 0 ? (
        <div className="my-delivery-empty">
          <p>No active deliveries assigned yet.</p>
        </div>
      ) : (
        <div className="delivery-list">
          {orders.map((order) => (
            <div key={order.id} className="delivery-card">
              <Link to={`/staff/order-details/${order.id}`} className="delivery-card-link">
                <div className="delivery-header">
                  <div>
                    <div className="order-id">Order #{order.id}</div>
                    <div className="customer-info">
                      👤 <strong>{order.customer_name || "Customer"}</strong>
                    </div>
                    <div className="address-info">
                      📍 {order.text_address || "Address not provided"}
                    </div>
                  </div>
                  <div className={getStatusBadgeClass(order.status)}>
                    {order.status}
                  </div>
                </div>
              </Link>

              {/* Status Update Section */}
              <div className="status-update-section">
                <label>Update Status:</label>
                <select
                  value={order.status}
                  onChange={(e) => handleStatusChange(order.id, e.target.value)}
                  disabled={order.status === "Completed"}
                  className="status-select"
                >
                  <option value="Pending">Pending</option>
                  <option value="Processing">Processing</option>
                  <option value="In Transit">In Transit</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              {/* Selection Checkbox */}
              <div className="selection-checkbox">
                <input
                  type="checkbox"
                  checked={selectedOrderIds.includes(order.id)}
                  onChange={() => toggleSelect(order.id)}
                  onClick={(e) => e.stopPropagation()} // Don't trigger link
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Back Button */}
      <button
        onClick={() => window.history.back()}
        className="back-btn"
      >
        ← Back
      </button>
    </div>
  );
};

export default MyDelivery;