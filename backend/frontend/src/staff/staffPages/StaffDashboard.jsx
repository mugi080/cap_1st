// src/staff/staffPages/StaffDashboard.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./css/StaffDashboard.css";

const StaffDashboard = () => {
  const [staffName, setStaffName] = useState("Rider");
  const [staffId, setStaffId] = useState(null);
  const [assignedOrders, setAssignedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Fetch profile
  useEffect(() => {
    const token = localStorage.getItem("staff_token") || localStorage.getItem("rider_token");
    if (!token) {
      setError("Not logged in");
      setLoading(false);
      return;
    }

    fetch("http://localhost:8000/auth/users/me/", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Invalid session");
        return res.json();
      })
      .then((profile) => {
        setStaffName(profile.first_name || profile.email?.split("@")[0] || "Rider");
        setStaffId(profile.id);
      })
      .catch((err) => {
        console.error("Profile fetch failed:", err);
        setError("Session invalid. Please log in again.");
        setLoading(false);
      });
  }, []);

  // Fetch orders
  useEffect(() => {
    if (!staffId) return;

    const token = localStorage.getItem("staff_token") || localStorage.getItem("rider_token");

    const fetchOrders = () => {
      fetch("http://localhost:8000/api/orders/", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(async (res) => {
          if (!res.ok) throw new Error("Failed to load orders");
          return res.json();
        })
        .then((data) => {
          const riderDeliveries = data.filter(
            (order) =>
              order.delivery_type === "Delivered" &&
              order.assigned_staff === staffId
          );
          setAssignedOrders(riderDeliveries);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Orders fetch failed:", err);
          setError("Failed to load orders. Retrying...");
          setTimeout(fetchOrders, 5000);
        });
    };

    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [staffId]);

  const activeCount = assignedOrders.filter(o => o.status !== "Completed").length;
  const completedOrders = assignedOrders.filter(o => o.status === "Completed");

  const handleLogout = () => {
    localStorage.removeItem("staff_token");
    localStorage.removeItem("rider_token");
    window.location.href = "/staff/login";
  };

  return (
    <div className="staff-dashboard-root">
      {/* Header */}
      <header className="dashboard-header">
        <p className="greeting">Hello, <strong>{staffName}</strong>!</p>
        <button
          className="hamburger"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
          aria-label="Toggle menu"
        >
          ☰
        </button>

        {menuOpen && (
          <div className="dropdown-menu" onClick={() => setMenuOpen(false)}>
            <Link to="/staff/profile" className="menu-link">Profile</Link>
            <Link to="/staff/preferences" className="menu-link">Preferrence</Link>
            
            <button onClick={handleLogout} className="menu-logout">
              Logout
            </button>
          </div>
        )}
      </header>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-box pending">
          <div className="stat-number">{assignedOrders.filter(o => o.status === "Pending").length}</div>
          <div className="stat-label">New</div>
        </div>
        <div className="stat-box in-transit">
          <div className="stat-number">{assignedOrders.filter(o => o.status === "In Transit").length}</div>
          <div className="stat-label">On Way</div>
        </div>
        <div className="stat-box completed">
          <div className="stat-number">{completedOrders.length}</div>
          <div className="stat-label">Delivered</div>
        </div>
      </div>

      {/* Main Action Button */}
      <div className="primary-action">
        <Link to="/staff/deliveries" className="action-button">
          My Deliveries ({activeCount})
        </Link>
      </div>

      {/* Finished Deliveries */}
      {completedOrders.length > 0 && (
        <section className="finished-section">
          <p className="section-title">Finished Deliveries</p>
          <div className="orders-grid">
            {completedOrders.slice(0, 5).map((order) => (
              <Link key={order.id} to={`/staff/order-details/${order.id}`} className="order-tile">
                <div className="order-header-row">
                  <span className="order-id">Order #{order.id}</span>
                  <span className="status-badge completed">Completed</span>
                </div>
                <p className="customer-name">{order.customer_name}</p>
                <p className="delivery-address">
                  {order.address ? `${order.address.substring(0, 60)}...` : "N/A"}
                </p>
                <p className="contact-info">{order.contact_number || "N/A"}</p>
              </Link>
            ))}
          </div>
          <Link to="/staff/history" className="view-all-link">View All →</Link>
        </section>
      )}

      {/* Empty State */}
      {!loading && assignedOrders.length === 0 && !error && (
        <div className="empty-message">
          <p>No deliveries assigned yet.</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="retry-button">
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      )}
    </div>
  );
};

export default StaffDashboard;