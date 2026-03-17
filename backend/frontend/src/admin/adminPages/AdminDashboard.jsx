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
    completed: 0,
    todayRevenue: 0,
    totalRevenue: 0,
    activeDrivers: 0,
    outOfServiceVehicles: 0,
    totalCustomers: 0,
  });

  // Analytics
  const [analytics, setAnalytics] = useState({
    topBeverages: [],
    recentSales: [],
    revenueGrowth: 0,
  });

  // Data lists
  const [recentOrders, setRecentOrders] = useState([]);
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
          topBeveragesRes,
          salesSummaryRes,
          customersRes,
        ] = await Promise.all([
          axios.get('http://localhost:8000/api/orders/', { headers }),
          axios.get('http://localhost:8000/api/admin/staff/', { headers }),
          axios.get('http://localhost:8000/api/vehicles/', { headers }),
          axios.get('http://localhost:8000/api/analytics/top-beverages/?days=30', { headers }),
          axios.get('http://localhost:8000/api/analytics/sales-summary/?days=30', { headers }),
          axios.get('http://localhost:8000/api/admin/customers/', { headers }),
        ]);

        const orders = ordersRes.data.filter(o => o.delivery_type === "Delivered");

        // Filter: Today's orders
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const todayOrders = orders.filter(o => new Date(o.created_at) >= startOfDay);

        // Calculate total revenue from all completed orders
        const totalRevenue = orders
          .filter(o => o.status === 'Completed')
          .reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0);

        // Stats
        setStats({
          totalOrders: orders.length,
          pending: orders.filter(o => o.status === 'Pending').length,
          inTransit: orders.filter(o => o.status === 'In Transit').length,
          completed: orders.filter(o => o.status === 'Completed').length,
          todayRevenue: todayOrders.reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0),
          totalRevenue: totalRevenue,
          activeDrivers: staffRes.data.filter(s => s.is_active).length,
          outOfServiceVehicles: vehiclesRes.data.filter(v => !v.is_available).length,
          totalCustomers: customersRes.data.length,
        });

        // Analytics
        if (salesSummaryRes.data.success) {
          const salesData = salesSummaryRes.data.data;
          setAnalytics(prev => ({
            ...prev,
            revenueGrowth: salesData.total_revenue || 0,
          }));
        }

        if (topBeveragesRes.data.success) {
          setAnalytics(prev => ({
            ...prev,
            topBeverages: topBeveragesRes.data.data.slice(0, 5),
          }));
        }

        // Recent Orders (last 8)
        const sortedOrders = [...orders]
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 8);

        setRecentOrders(sortedOrders);
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
        <h1>Admin Dashboard</h1>
        <button onClick={logout} style={styles.logoutBtn}>
          Logout
        </button>
      </header>

      {error && (
        <div style={styles.alertError}>{error}</div>
      )}

      {/* Stats Grid */}
      <div style={styles.statsGrid}>
        <StatCard label="Total Orders" value={stats.totalOrders} color="#2c3e50" />
        <StatCard label="Pending" value={stats.pending} color="#7f8c8d" />
        <StatCard label="In Transit" value={stats.inTransit} color="#34495e" />
        <StatCard label="Completed" value={stats.completed} color="#27ae60" />
        <StatCard label="Today's Revenue" value={`₱${stats.todayRevenue.toFixed(2)}`} color="#2c3e50" />
        <StatCard label="Total Revenue" value={`₱${stats.totalRevenue.toFixed(2)}`} color="#27ae60" />
        <StatCard label="Total Customers" value={stats.totalCustomers} color="#34495e" />
        <StatCard label="Active Drivers" value={stats.activeDrivers} color="#7f8c8d" />
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Left Column */}
        <div style={styles.leftColumn}>
          {/* Recent Orders */}
          <Section title="Recent Orders">
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

          {/* Top Selling Products */}
          <Section title="Top Selling Products (Last 30 Days)">
            {analytics.topBeverages.length > 0 ? (
              <div style={productList}>
                {analytics.topBeverages.map((bev, index) => (
                  <div key={index} style={productItem}>
                    <div style={productRank}>#{index + 1}</div>
                    <div style={productInfo}>
                      <strong>{bev.name}</strong>
                      <span style={productStats}>
                        {bev.quantity} sold • ₱{bev.revenue.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                No sales data available
              </div>
            )}
          </Section>
        </div>

        {/* Right Column */}
        <div style={styles.rightColumn}>
          {/* Quick Actions */}
          <Section title="Quick Actions">
            <div style={quickActions}>
              <button
                onClick={() => navigate("/admin/select-items")}
                style={{ ...quickButton, backgroundColor: "#2c3e50" }}
              >
                Create Order
              </button>
              <button
                onClick={() => navigate("/admin/logistics")}
                style={{ ...quickButton, backgroundColor: "#34495e" }}
              >
                Logistics
              </button>
              <button
                onClick={() => navigate("/admin/order-history")}
                style={{ ...quickButton, backgroundColor: "#7f8c8d" }}
              >
                Order History
              </button>
              <button
                onClick={() => navigate("/admin/vehicles")}
                style={{ ...quickButton, backgroundColor: "#95a5a6" }}
              >
                Vehicle Management
              </button>
              <button
                onClick={() => navigate("/admin/analytics")}
                style={{ ...quickButton, backgroundColor: "#27ae60" }}
              >
                View Analytics
              </button>
            </div>
          </Section>

          {/* Analytics Summary */}
          <Section title="Analytics Summary">
            <div style={analyticsSummary}>
              <div style={analyticsSummaryItem}>
                <div style={analyticsSummaryLabel}>Average Order Value</div>
                <div style={analyticsSummaryValue}>
                  ₱{stats.totalOrders > 0 
                    ? (stats.totalRevenue / stats.totalOrders).toFixed(2) 
                    : '0.00'}
                </div>
              </div>
              <div style={analyticsSummaryItem}>
                <div style={analyticsSummaryLabel}>Orders per Customer</div>
                <div style={analyticsSummaryValue}>
                  {stats.totalCustomers > 0 
                    ? (stats.totalOrders / stats.totalCustomers).toFixed(1) 
                    : '0.0'}
                </div>
              </div>
              <div style={analyticsSummaryItem}>
                <div style={analyticsSummaryLabel}>Completion Rate</div>
                <div style={analyticsSummaryValue}>
                  {stats.totalOrders > 0 
                    ? ((stats.completed / stats.totalOrders) * 100).toFixed(1) 
                    : '0.0'}%
                </div>
              </div>
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
    backgroundColor: '#2c3e50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '600',
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
    fontWeight: '600',
  },
};

// Table styles
const tableStyles = {
  width: '100%',
  borderCollapse: 'collapse',
  marginTop: '8px',
  fontSize: '14px',
};

// Status pill colors
const statusPill = (status) => {
  const colors = {
    Pending: { background: '#f0f0f0', color: '#555' },
    Processing: { background: '#e8e8e8', color: '#333' },
    'In Transit': { background: '#27ae60', color: '#fff' },
    Completed: { background: '#27ae60', color: '#fff' },
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
  backgroundColor: '#2c3e50',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  fontSize: '12px',
  cursor: 'pointer',
  fontWeight: '500',
};

const productList = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
};

const productItem = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '10px',
  backgroundColor: '#f8f9fa',
  borderRadius: '6px',
  transition: 'background 0.2s',
};

const productRank = {
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  backgroundColor: '#2c3e50',
  color: 'white',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '14px',
  fontWeight: 'bold',
};

const productInfo = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
};

const productStats = {
  fontSize: '12px',
  color: '#666',
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
  fontWeight: '600',
  transition: 'all 0.2s',
};

const analyticsSummary = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const analyticsSummaryItem = {
  padding: '12px',
  backgroundColor: '#f8f9fa',
  borderRadius: '6px',
  borderLeft: '4px solid #2c3e50',
};

const analyticsSummaryLabel = {
  fontSize: '12px',
  color: '#666',
  marginBottom: '4px',
};

const analyticsSummaryValue = {
  fontSize: '20px',
  fontWeight: 'bold',
  color: '#333',
};

export default AdminDashboard;