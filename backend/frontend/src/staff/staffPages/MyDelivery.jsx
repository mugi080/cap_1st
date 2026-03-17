// src/components/MyDelivery.jsx
import React, { useEffect, useState } from "react";
import "./css/MyDelivery.css";
import { Link, useNavigate } from "react-router-dom";

const MyDelivery = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [toast, setToast] = useState(null);

  const staffData = JSON.parse(localStorage.getItem("staff_data"));
  const myStaffId = staffData?.id;
  const token = localStorage.getItem("staff_token") || localStorage.getItem("rider_token");
  const navigate = useNavigate();

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

  // ✅ Helper: Calculate total cases for an order
  const getTotalCases = (order) => {
    return order.items.reduce((sum, item) => {
      return sum + parseFloat(item.cases_ordered || 0);
    }, 0);
  };

  // ✅ Mark as delivered (not completed!)
  const handleMarkDelivered = async (orderId) => {
    try {
      const response = await fetch(`http://localhost:8000/api/orders/${orderId}/mark-delivered/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to mark as delivered");
      }

      const updatedOrder = await response.json();

      setOrders((prev) =>
        prev.map((order) => (order.id === orderId ? { ...order, status: "Delivered by Staff" } : order))
          .filter((o) => o.status !== "Completed")
      );

      setToast({
        message: `✅ Order #${orderId} marked as delivered!`,
        type: "success",
      });
    } catch (err) {
      setToast({
        message: `❌ ${err.message || "Failed to mark delivered"}`,
        type: "error",
      });
    }
    setTimeout(() => setToast(null), 3000);
  };

  const handleStatusChange = async (orderId, newStatus) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    // Prevent direct "Completed" for delivered orders
    if (order.delivery_type === "Delivered" && newStatus === "Completed") {
      alert("Delivered orders must be marked as 'Delivered' first. Customer will confirm receipt.");
      return;
    }

    // ✅ Enforce 30-case minimum for "In Transit" (delivered orders only)
    if (order.delivery_type === "Delivered" && newStatus === "In Transit") {
      const totalCases = getTotalCases(order);
      if (totalCases < 30) {
        alert(`Order #${orderId} has only ${totalCases} case(s). Minimum 30 cases required for delivery dispatch.`);
        return;
      }
    }

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
          .filter((o) => o.status !== "Completed")
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

  const toggleSelect = (id) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((oid) => oid !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedOrderIds.length === orders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(orders.map((o) => o.id));
    }
  };

  const handleStartAllDeliveries = async () => {
    if (selectedOrderIds.length === 0) return;

    // ✅ Check each selected order for 30-case minimum
    const insufficientOrders = [];
    for (const id of selectedOrderIds) {
      const order = orders.find(o => o.id === id);
      if (order && order.delivery_type === "Delivered") {
        const totalCases = getTotalCases(order);
        if (totalCases < 30) {
          insufficientOrders.push({ id, cases: totalCases });
        }
      }
    }

    if (insufficientOrders.length > 0) {
      const messages = insufficientOrders.map(o => `Order #${o.id}: ${o.cases} cases`);
      alert(
        `The following orders do not meet the 30-case minimum for delivery:\n\n` +
        messages.join('\n') +
        `\n\nPlease add more items or remove these orders.`
      );
      return;
    }

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

      setToast({
        message: `🚚 ${selectedOrderIds.length} order(s) marked as In Transit!`,
        type: "success",
      });
      setSelectedOrderIds([]);
      fetchOrders();
    } catch (err) {
      setToast({
        message: "❌ Failed to start deliveries.",
        type: "error",
      });
    }
    setTimeout(() => setToast(null), 3000);
  };

  const getStatusBadgeClass = (status) => {
    const map = {
      Pending: "status-pending",
      Processing: "status-processing",
      "In Transit": "status-in-transit",
      "Delivered by Staff": "status-delivered",
      Completed: "status-completed",
    };
    return map[status] || "status-default";
  };

  return (
    <div className="my-delivery-container">
      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}

      <h2 className="my-delivery-title">My Deliveries</h2>

      {selectedOrderIds.length > 0 && (
        <div className="bulk-action-bar">
          <span>{selectedOrderIds.length} selected</span>
          <button onClick={handleStartAllDeliveries} className="btn-bulk-start">
            Start All Deliveries
          </button>
          <button onClick={() => setSelectedOrderIds([])} className="btn-clear">
            Clear
          </button>
        </div>
      )}

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
                      <strong>{order.customer_name || "Customer"}</strong>
                    </div>
                    <div className="address-info">
                      {order.address || "Address not provided"}
                    </div>
                    <div className="delivery-type">
                      <span className="type-label">{order.delivery_type}</span>
                    </div>
                    {/* ✅ Show total cases for transparency */}
                    <div className="order-cases">
                      Total Cases: {getTotalCases(order).toFixed(1)}
                    </div>
                  </div>
                  <span className={`status-badge ${getStatusBadgeClass(order.status)}`}>
                    {order.status}
                  </span>
                </div>
              </Link>

              <div className="status-update-section">
                <label>Update Status</label>
                <div className="select-wrapper">
                  <select
                    value={order.status}
                    onChange={(e) => handleStatusChange(order.id, e.target.value)}
                    disabled={order.status === "Completed" || order.status === "Delivered by Staff"}
                    className="status-select"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Processing">Processing</option>
                    <option value="In Transit">In Transit</option>
                    {/* ✅ Only allow Completed for Pickup */}
                    {order.delivery_type === "Pickup" && (
                      <option value="Completed">Completed</option>
                    )}
                  </select>
                  <span className="select-indicator">▼</span>
                </div>

                {/* ✅ Show "Mark as Delivered" only for delivered orders in transit */}
                {order.delivery_type === "Delivered" && order.status === "In Transit" && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleMarkDelivered(order.id);
                    }}
                    className="btn-mark-delivered"
                  >
                    Mark as Delivered
                  </button>
                )}
              </div>

              <div className="selection-checkbox">
                <input
                  type="checkbox"
                  checked={selectedOrderIds.includes(order.id)}
                  onChange={() => toggleSelect(order.id)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <button onClick={() => navigate(-1)} className="back-btn" aria-label="Go back">
        ←
      </button>
    </div>
  );
};

export default MyDelivery;