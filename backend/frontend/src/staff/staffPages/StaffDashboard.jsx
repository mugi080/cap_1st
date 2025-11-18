// src/staff/staffPages/StaffDashboard.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./css/StaffDashboard.css";

const StaffDashboard = () => {
  const [staffName, setStaffName] = useState("Rider");
  const [staffId, setStaffId] = useState(null);
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMenu, setShowMenu] = useState(false);

  // Fetch staff profile
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

  // Fetch all orders assigned to this rider
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
          const filtered = data.filter(
            (order) =>
              order.delivery_type === "Delivered" &&
              order.assigned_staff === staffId
          );
          setAllOrders(filtered);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Orders fetch failed:", err);
          setError("Failed to load orders. Retrying...");
          setTimeout(fetchOrders, 5000);
        });
    };

    fetchOrders();
    const interval = setInterval(fetchOrders, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [staffId]);

  // Calculate counts
  const counts = {
    pending: allOrders.filter((o) => o.status === "Pending").length,
    processing: allOrders.filter((o) => o.status === "Processing").length,
    inTransit: allOrders.filter((o) => o.status === "In Transit").length,
    completed: allOrders.filter((o) => o.status === "Completed").length,
  };

  // Get only COMPLETED orders for history
  const completedOrders = allOrders.filter((o) => o.status === "Completed");

  const handleLogout = () => {
    localStorage.removeItem("staff_token");
    localStorage.removeItem("rider_token");
    window.location.href = "/staff/login";
  };

  return (
    <div className="rider-dashboard">
      {/* Header */}
      <header className="rider-header">
        <h1>Hello, {staffName}!</h1>
        <button
          className="menu-btn"
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
        >
          ☰
        </button>

        {showMenu && (
          <div className="compact-dropdown-menu">
            <Link to="/staff/profile" className="dropdown-item">
              👤 Profile
            </Link>
            <Link to="/staff/settings" className="dropdown-item">
              ⚙️ Settings
            </Link>
            <button onClick={handleLogout} className="dropdown-item logout-item">
              🔐 Logout
            </button>
          </div>
        )}
      </header>

      {/* Stats Row - All 4 in one line */}
      <div className="stats-row">
        <div className="stat-item stat-pending">
          <div className="stat-value">{counts.pending}</div>
          <div className="stat-label">New</div>
        </div>
        <div className="stat-item stat-processing">
          <div className="stat-value">{counts.processing}</div>
          <div className="stat-label">Ready</div>
        </div>
        <div className="stat-item stat-intransit">
          <div className="stat-value">{counts.inTransit}</div>
          <div className="stat-label">On Way</div>
        </div>
        <div className="stat-item stat-completed">
          <div className="stat-value">{counts.completed}</div>
          <div className="stat-label">Delivered</div>
        </div>
      </div>

      {/* Action Button */}
      <div className="action-buttons">
        <Link to="/staff/deliveries" className="btn btn-primary">
          📦 My Deliveries ({allOrders.length - counts.completed})
        </Link>
      </div>

      {/* Order History */}
      {completedOrders.length > 0 && (
        <div className="recent-section">
          <h2>Order History</h2>
          <div className="order-list">
            {completedOrders.slice(0, 5).map((order) => (
              <div key={order.id} className="order-card">
                <div className="order-header">
                  <strong>#{order.id}</strong>
                  <span className="status-tag status-completed">{order.status}</span>
                </div>
                <div className="order-customer">{order.customer_name}</div>
                <div className="order-address">
                  {order.text_address ? `${order.text_address.substring(0, 60)}...` : "N/A"}
                </div>
                <div className="order-contact">📞 {order.contact_number || "N/A"}</div>
              </div>
            ))}
          </div>
          <Link to="/staff/history" className="view-all">
            View All →
          </Link>
        </div>
      )}

      {/* Empty State */}
      {!loading && allOrders.length === 0 && !error && (
        <div className="empty-state">
          <p>📭 No deliveries yet.</p>
          <p>You'll see your delivery list once assigned.</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="error-box">
          <p>⚠️ {error}</p>
          <button onClick={() => window.location.reload()} className="retry-btn">
            Retry
          </button>
        </div>
      )}

      {/* Loading Spinner */}
      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading your deliveries...</p>
        </div>
      )}
    </div>
  );
};

export default StaffDashboard;