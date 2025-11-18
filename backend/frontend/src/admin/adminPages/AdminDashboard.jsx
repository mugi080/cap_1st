// src/admin/adminPages/AdminDashboard.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function AdminDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem('admin_token');
  const headers = { Authorization: `Bearer ${token}` };

  // Stats
  const [stats, setStats] = useState({
    totalOrders: 0,
    pending: 0,
    inTransit: 0,
    todayRevenue: 0,
    activeDrivers: 0,
    outOfServiceVehicles: 0,
  });

  // Data lists
  const [recentOrders, setRecentOrders] = useState([]);
  const [activeDeliveries, setActiveDeliveries] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_data');
    navigate('/admin/login');
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          ordersRes,
          staffRes,
          vehiclesRes,
        ] = await Promise.all([
          axios.get('http://localhost:8000/api/orders/', { headers }),
          axios.get('http://localhost:8000/api/admin/staff/', { headers }),
          axios.get('http://localhost:8000/api/vehicles/', { headers }),
        ]);

        const orders = ordersRes.data.filter(o => o.delivery_type === "Delivered");

        // Filter: Today's orders
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const todayOrders = orders.filter(o => new Date(o.created_at) >= startOfDay);

        // Stats
        setStats({
          totalOrders: orders.length,
          pending: orders.filter(o => o.status === 'Pending').length,
          inTransit: orders.filter(o => o.status === 'In Transit').length,
          todayRevenue: todayOrders.reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0),
          activeDrivers: staffRes.data.filter(s => s.is_active).length,
          outOfServiceVehicles: vehiclesRes.data.filter(v => !v.is_available).length,
        });

        // Recent Orders (last 5)
        const sortedOrders = [...orders]
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 5);

        setRecentOrders(sortedOrders);

        // Active Deliveries (In Transit)
        const inTransitOrders = orders
          .filter(o => o.status === 'In Transit')
          .map(o => ({
            id: o.id,
            customer: o.customer_name,
            address: o.text_address || 'N/A',
            vehicle: o.assigned_vehicle ? `Vehicle #${o.assigned_vehicle}` : 'Unassigned',
            driver: o.assigned_staff ? `Staff #${o.assigned_staff}` : 'Unassigned',
            time: new Date(o.updated_at).toLocaleTimeString(),
          }))
          .slice(0, 5);

        setActiveDeliveries(inTransitOrders);
        setStaffList(staffRes.data);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
        setError("Could not load dashboard data. Please refresh.");
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchData();
    } else {
      navigate('/admin/login');
    }
  }, [navigate, token]);

  if (loading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <h1>📊 Admin Dashboard</h1>
        <button onClick={logout} style={styles.logoutBtn}>
          Logout
        </button>
      </header>

      {error && (
        <div style={styles.alertError}>{error}</div>
      )}

      {/* Stats Grid */}
      <div style={styles.statsGrid}>
        <StatCard label="Total Orders" value={stats.totalOrders} color="#3498db" />
        <StatCard label="Pending" value={stats.pending} color="#f39c12" />
        <StatCard label="In Transit" value={stats.inTransit} color="#2ecc71" />
        <StatCard label="Today's Revenue" value={`₱${stats.todayRevenue.toFixed(2)}`} color="#9b59b6" />
        <StatCard label="Active Drivers" value={stats.activeDrivers} color="#1abc9c" />
        <StatCard label="Vehicles Out of Service" value={stats.outOfServiceVehicles} color="#e74c3c" />
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Left Column */}
        <div style={styles.leftColumn}>
          {/* Recent Orders */}
          <Section title="🔔 Recent Orders">
            <table style={tableStyles}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Time</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length > 0 ? (
                  recentOrders.map(order => (
                    <tr key={order.id}>
                      <td>#{order.id}</td>
                      <td>{order.customer_name || "Anonymous"}</td>
                      <td>
                        <span style={{ ...statusPill(order.status) }}>
                          {order.status}
                        </span>
                      </td>
                      <td>{new Date(order.created_at).toLocaleTimeString()}</td>
                      <td>
                        <button
                          onClick={() => navigate(`/admin/order-details/${order.id}`)}
                          style={actionLink}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", padding: "12px" }}>
                      No recent orders
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Section>

          {/* Staff Availability */}
          <Section title="👥 Staff Status">
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {staffList.slice(0, 6).map(staff => (
                <div key={staff.id} style={staffItem}>
                  <strong>{staff.first_name} {staff.last_name}</strong>
                  <span style={{
                    fontSize: "12px",
                    color: staff.is_active ? "#27ae60" : "#e74c3c"
                  }}>
                    {staff.is_active ? "🟢 Available" : "🔴 Offline"}
                  </span>
                </div>
              ))}
              {staffList.length > 6 && (
                <div style={{ fontSize: "12px", color: "#666", fontStyle: "italic" }}>
                  +{staffList.length - 6} more staff
                </div>
              )}
            </div>
          </Section>
        </div>

        {/* Right Column */}
        <div style={styles.rightColumn}>
          {/* Active Deliveries */}
          <Section title="🚚 Active Deliveries (In Transit)">
            {activeDeliveries.length > 0 ? (
              <ul style={listStyle}>
                {activeDeliveries.map((delivery, i) => (
                  <li key={i} style={listItem}>
                    <strong>Order #{delivery.id}</strong>: {delivery.customer}<br />
                    <small>📍 {delivery.address.substring(0, 50)}...</small><br />
                    <small>🚛 {delivery.vehicle} | 👤 {delivery.driver} | ⏰ {delivery.time}</small>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No active deliveries.</p>
            )}
          </Section>

          {/* Quick Actions */}
          <Section title="⚡ Quick Actions">
            <div style={quickActions}>
              <button
                onClick={() => navigate("/admin/select-items")}
                style={{ ...quickButton, backgroundColor: "#007bff" }}
              >
                ➕ Create Order
              </button>
              <button
                onClick={() => navigate("/admin/logistics")}
                style={{ ...quickButton, backgroundColor: "#28a745" }}
              >
                🚚 Logistics
              </button>
              <button
                onClick={() => navigate("/admin/order-history")}
                style={{ ...quickButton, backgroundColor: "#ffc107", color: "#212529" }}
              >
                📜 Order History
              </button>
              <button
                onClick={() => navigate("/admin/vehicles")}
                style={{ ...quickButton, backgroundColor: "#6f42c1" }}
              >
                🚗 Fleet Management
              </button>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

// Reusable Components
const StatCard = ({ label, value, color }) => (
  <div style={{ ...styles.statCard, borderLeftColor: color }}>
    <div style={styles.statValue}>{value}</div>
    <div style={styles.statLabel}>{label}</div>
  </div>
);

const Section = ({ title, children }) => (
  <div style={styles.section}>
    <h3 style={styles.sectionTitle}>{title}</h3>
    {children}
  </div>
);

// Styles
const styles = {
  container: {
    fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    borderBottom: '1px solid #ddd',
    paddingBottom: '12px',
  },
  logoutBtn: {
    padding: '8px 16px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  alertError: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    padding: '10px',
    borderRadius: '4px',
    marginBottom: '16px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    backgroundColor: 'white',
    padding: '16px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    borderLeftWidth: '4px',
    borderLeftStyle: 'solid',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: '14px',
    color: '#666',
    marginTop: '4px',
  },
  mainContent: {
    display: 'flex',
    gap: '24px',
    flexWrap: 'wrap',
  },
  leftColumn: {
    flex: '2',
    minWidth: '300px',
  },
  rightColumn: {
    flex: '1',
    minWidth: '300px',
  },
  section: {
    backgroundColor: 'white',
    padding: '16px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '16px',
  },
  sectionTitle: {
    margin: '0 0 12px 0',
    fontSize: '18px',
    color: '#333',
    borderBottom: '1px solid #eee',
    paddingBottom: '8px',
  },
};

// Table styles
const tableStyles = {
  width: '100%',
  borderCollapse: 'collapse',
  marginTop: '8px',
};

// Status pill colors
const statusPill = (status) => {
  const colors = {
    Pending: { background: '#fff3cd', color: '#856404' },
    Processing: { background: '#cce5ff', color: '#004085' },
    'In Transit': { background: '#d4edda', color: '#155724' },
    Completed: { background: '#d1ecf1', color: '#0c5460' },
    default: { background: '#e2e3e5', color: '#495057' },
  };
  const style = colors[status] || colors.default;
  return {
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
    backgroundColor: style.background,
    color: style.color,
    display: 'inline-block',
  };
};

const actionLink = {
  padding: '4px 8px',
  backgroundColor: '#007bff',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  fontSize: '12px',
  cursor: 'pointer',
};

const staffItem = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '8px',
  backgroundColor: '#f8f9fa',
  borderRadius: '6px',
  fontSize: '14px',
};

const listStyle = {
  listStyle: 'none',
  padding: 0,
  margin: 0,
};

const listItem = {
  padding: '12px',
  backgroundColor: '#f8f9fa',
  borderRadius: '6px',
  marginBottom: '8px',
  fontSize: '13px',
  lineHeight: '1.4',
};

const quickActions = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
};

const quickButton = {
  padding: '12px',
  border: 'none',
  borderRadius: '6px',
  color: 'white',
  fontSize: '14px',
  cursor: 'pointer',
  fontWeight: '500',
};

export default AdminDashboard;