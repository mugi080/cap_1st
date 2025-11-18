import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { TrendingUp, DollarSign, ShoppingCart, Package, MapPin, Calendar, RefreshCw, AlertCircle } from 'lucide-react';
import './css/TryAnalytics.css';

// Base API configuration
const API_BASE_URL = 'http://localhost:8000/api';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('admin_token');
  if (!token) throw new Error('Authentication token not found. Please login again.');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

// Helper function to handle API responses
const handleApiResponse = async (response, errorMessage) => {
  if (!response.ok) {
    let errorDetail = errorMessage;
    try {
      const errorData = await response.json();
      errorDetail = errorData.detail || errorData.message || errorMessage;
    } catch (e) {
      errorDetail = `${errorMessage} (${response.status}: ${response.statusText})`;
    }
    throw new Error(errorDetail);
  }
  return await response.json();
};

// 🔁 Real API functions that connect to your Django backend
const realAPI = {
  fetchMonthlySalesData: async (year = new Date().getFullYear()) => {
    try {
      const response = await fetch(`${API_BASE_URL}/analytics/monthly-sales/?year=${year}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      const data = await handleApiResponse(response, 'Failed to fetch monthly sales data');
      if (!data.success || !Array.isArray(data.data)) {
        throw new Error('Invalid response format from server');
      }
      return {
        success: true,
        data: data.data,
        year: data.year,
        metadata: {
          totalMonths: data.data.length,
          totalSales: data.data.reduce((sum, month) => sum + month.sales, 0),
          totalOrders: data.data.reduce((sum, month) => sum + month.orders, 0),
        }
      };
    } catch (error) {
      console.error('Error fetching monthly sales data:', error);
      return {
        success: false,
        data: [],
        error: error.message,
        year: year
      };
    }
  },

  fetchBeverageByBarangay: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/analytics/beverage-by-barangay/`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      const data = await handleApiResponse(response, 'Failed to fetch beverage by barangay data');
      if (!data.success || !Array.isArray(data.data)) {
        throw new Error('Invalid response format from server');
      }
      return {
        success: true,
        data: data.data,
        metadata: {
          totalBarangays: data.data.length,
          totalOrders: data.data.reduce((sum, barangay) => sum + barangay.total_orders, 0),
          totalItems: data.data.reduce((sum, barangay) => sum + barangay.total_items, 0),
        }
      };
    } catch (error) {
      console.error('Error fetching beverage by barangay:', error);
      return {
        success: false,
        data: [],
        error: error.message
      };
    }
  },

  fetchTopBeverages: async (days = 30) => {
    try {
      const response = await fetch(`${API_BASE_URL}/analytics/top-beverages/?days=${days}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      const data = await handleApiResponse(response, 'Failed to fetch top beverages data');
      if (!data.success || !Array.isArray(data.data)) {
        throw new Error('Invalid response format from server');
      }
      return {
        success: true,
        data: data.data,
        period: data.period,
        metadata: {
          totalBeverages: data.data.length,
          totalQuantity: data.data.reduce((sum, bev) => sum + bev.quantity, 0),
          totalRevenue: data.data.reduce((sum, bev) => sum + bev.revenue, 0),
          topBeverage: data.data[0] || null,
        }
      };
    } catch (error) {
      console.error('Error fetching top beverages:', error);
      return {
        success: false,
        data: [],
        error: error.message,
        period: `Last ${days} days`
      };
    }
  },

  fetchSalesSummary: async (days = 30) => {
    try {
      const response = await fetch(`${API_BASE_URL}/analytics/sales-summary/?days=${days}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      const data = await handleApiResponse(response, 'Failed to fetch sales summary');
      if (!data.success) {
        throw new Error('Invalid response format from server');
      }
      return {
        success: true,
        data: data.data,
        period: `Last ${days} days`
      };
    } catch (error) {
      console.error('Error fetching sales summary:', error);
      return {
        success: false,
        data: null,
        error: error.message,
        period: `Last ${days} days`
      };
    }
  }
};

// Formatting helpers
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2
  }).format(amount);
};

const formatNumber = (number) => {
  return new Intl.NumberFormat('en-PH').format(number);
};

// UI Components
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

const LoadingSpinner = () => (
  <div className="loading-state">
    <RefreshCw />
    <span>Loading...</span>
  </div>
);

const ErrorMessage = ({ message, onRetry }) => (
  <div className="error-state">
    <AlertCircle />
    <p>{message}</p>
    {onRetry && (
      <button onClick={onRetry}>Try Again</button>
    )}
  </div>
);

const TryAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    monthlySales: { success: false, data: [] },
    beverageByBarangay: { success: false, data: [] },
    topBeverages: { success: false, data: [] },
    salesSummary: { success: false, data: null }
  });

  const [filters, setFilters] = useState({
    year: new Date().getFullYear(),
    days: 30
  });

  const [activeTab, setActiveTab] = useState('overview');

  // 📡 Load Data from Real API
  const loadData = async () => {
    setLoading(true);
    try {
      const [monthlySales, beverageByBarangay, topBeverages, salesSummary] = await Promise.all([
        realAPI.fetchMonthlySalesData(filters.year),
        realAPI.fetchBeverageByBarangay(),
        realAPI.fetchTopBeverages(filters.days),
        realAPI.fetchSalesSummary(filters.days)
      ]);

      setData({
        monthlySales,
        beverageByBarangay,
        topBeverages,
        salesSummary
      });
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'sales', label: 'Sales Trends', icon: DollarSign },
    { id: 'products', label: 'Top Products', icon: Package },
    { id: 'locations', label: 'By Location', icon: MapPin }
  ];

  return (
    <div className="analytics-container">
      {/* Header */}
      <div className="analytics-header">
        <h1>📊 Analytics Dashboard</h1>
        <p>Track your business performance and insights</p>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <select
            value={filters.year}
            onChange={(e) => handleFilterChange('year', parseInt(e.target.value))}
            className="filter-select"
          >
            <option value={2024}>2024</option>
            <option value={2025}>2025</option>
          </select>
        </div>
        <div className="filter-group">
          <select
            value={filters.days}
            onChange={(e) => handleFilterChange('days', parseInt(e.target.value))}
            className="filter-select"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            >
              <Icon />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="tab-content">
          <div className="charts-grid">
            {/* Monthly Sales Trend */}
            <div className="chart-card">
              <div className="chart-header">
                <h3>Monthly Sales Trend</h3>
                <div className="chart-period">{filters.year}</div>
              </div>
              {data.monthlySales.success ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.monthlySales.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value) => [formatCurrency(value), 'Sales']}
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="sales" 
                      stroke="#3B82F6" 
                      strokeWidth={3}
                      dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <ErrorMessage message={data.monthlySales.error || 'Failed to load monthly sales data'} onRetry={loadData} />
              )}
            </div>

            {/* Top Beverages */}
            <div className="chart-card">
              <div className="chart-header">
                <h3>Top Selling Beverages</h3>
                <div className="chart-period">Last {filters.days} days</div>
              </div>
              {data.topBeverages.success ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.topBeverages.data.slice(0, 5)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value) => [formatNumber(value), 'Quantity']}
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Bar dataKey="quantity" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ErrorMessage message={data.topBeverages.error || 'Failed to load top beverages data'} onRetry={loadData} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sales Trends Tab */}
      {activeTab === 'sales' && (
        <div className="tab-content">
          <div className="chart-card">
            <div className="chart-header">
              <h3>Monthly Sales & Orders</h3>
              <div className="chart-period">Year {filters.year}</div>
            </div>
            {data.monthlySales.success ? (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={data.monthlySales.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value, name) =>
                      [name === 'sales' ? formatCurrency(value) : formatNumber(value), name === 'sales' ? 'Sales' : 'Orders']
                    }
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend />
                  <Line 
                    yAxisId="left" 
                    type="monotone" 
                    dataKey="sales" 
                    stroke="#3B82F6" 
                    strokeWidth={3} 
                    name="Sales"
                    dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                  />
                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="orders" 
                    stroke="#10B981" 
                    strokeWidth={3} 
                    name="Orders"
                    dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <ErrorMessage message={data.monthlySales.error || 'Failed to load sales data'} onRetry={loadData} />
            )}
          </div>
        </div>
      )}

      {/* Top Products Tab */}
      {activeTab === 'products' && (
        <div className="tab-content">
          <div className="charts-grid">
            {/* Bar Chart */}
            <div className="chart-card">
              <h3>Top Products by Quantity</h3>
              {data.topBeverages.success ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={data.topBeverages.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value) => [formatNumber(value), 'Quantity']}
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Bar dataKey="quantity" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ErrorMessage message={data.topBeverages.error || 'Failed to load products data'} onRetry={loadData} />
              )}
            </div>

            {/* Revenue Distribution */}
            <div className="chart-card">
              <h3>Revenue Distribution</h3>
              {data.topBeverages.success ? (
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={data.topBeverages.data.slice(0, 6)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="revenue"
                    >
                      {data.topBeverages.data.slice(0, 6).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [formatCurrency(value), 'Revenue']}
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <ErrorMessage message={data.topBeverages.error || 'Failed to load revenue data'} onRetry={loadData} />
              )}
            </div>
          </div>

          {/* Product Table */}
          {data.topBeverages.success && (
            <div className="product-table-card">
              <h3>Detailed Product Performance</h3>
              <div className="table-wrapper">
                <table className="product-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Revenue</th>
                      <th>Orders</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topBeverages.data.map((product, index) => (
                      <tr key={index}>
                        <td>{product.name}</td>
                        <td>{formatNumber(product.quantity)}</td>
                        <td>{formatCurrency(product.revenue)}</td>
                        <td>{formatNumber(product.orders)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* By Location Tab */}
      {activeTab === 'locations' && (
        <div className="tab-content">
          {data.beverageByBarangay.success ? (
            data.beverageByBarangay.data.map((barangay, index) => (
              <div key={index} className="location-card">
                <div className="location-header">
                  <h3>{barangay.barangay}</h3>
                  <div className="location-stats">
                    <div className="location-stat">
                      <div className="location-stat-value blue">{formatNumber(barangay.total_orders)}</div>
                      <div className="location-stat-label">Orders</div>
                    </div>
                    <div className="location-stat">
                      <div className="location-stat-value green">{formatNumber(barangay.total_items)}</div>
                      <div className="location-stat-label">Items</div>
                    </div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barangay.beverages}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value) => [formatNumber(value), 'Quantity']}
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Bar dataKey="quantity" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ))
          ) : (
            <div className="chart-card">
              <ErrorMessage message={data.beverageByBarangay.error || 'Failed to load location data'} onRetry={loadData} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TryAnalytics;