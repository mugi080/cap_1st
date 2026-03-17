// src/staff/staffPages/OrderHistory.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./css/OrderHistory.css";

const StaffOrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("staff_token") || localStorage.getItem("rider_token");
    if (!token) {
      navigate("/staff/login");
      return;
    }

    const fetchProfileAndOrders = async () => {
      try {
        const profileRes = await fetch("http://localhost:8000/auth/users/me/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!profileRes.ok) throw new Error("Profile fetch failed");
        const profile = await profileRes.json();
        const staffId = profile.id;

        const ordersRes = await fetch("http://localhost:8000/api/orders/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!ordersRes.ok) throw new Error("Orders fetch failed");
        const data = await ordersRes.json();

        const completedDeliveries = data.filter(
          (order) =>
            order.delivery_type === "Delivered" &&
            order.assigned_staff === staffId &&
            order.status === "Completed"
        ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        setOrders(completedDeliveries);
        setLoading(false);
      } catch (err) {
        console.error("Failed to load history:", err);
        setError("Failed to load delivery history.");
        setLoading(false);
      }
    };

    fetchProfileAndOrders();
  }, [navigate]);

  const formatDate = (isoStr) => {
    const d = new Date(isoStr);
    return d.toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatAddress = (addr) => {
    return addr && addr.length > 60 ? `${addr.substring(0, 60)}...` : addr || "N/A";
  };

  return (
    <div className="order-history-root">
      {/* Header — matches StaffDashboard style */}
      <div className="dashboard-header">
        <button onClick={() => navigate(-1)} className="back-btn" aria-label="Go back">
          ←
        </button>
        <p className="greeting">Finished Deliveries</p>
      </div>

      {loading ? (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>Loading completed deliveries...</p>
        </div>
      ) : error ? (
        <div className="error-message">
          <p>{error}</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="empty-message">
          <p>No completed deliveries yet.</p>
        </div>
      ) : (
        <div className="orders-grid">
          {orders.map((order) => (
            <Link key={order.id} to={`/staff/order-details/${order.id}`} className="order-tile">
              <div className="order-header-row">
                <span className="order-id">Order #{order.id}</span>
                <span className="status-badge completed">Completed</span>
              </div>
              <p className="customer-name">{order.customer_name}</p>
              <p className="delivery-address">{formatAddress(order.address)}</p>
              <p className="delivery-date">{formatDate(order.delivered_at || order.created_at)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default StaffOrderHistory;