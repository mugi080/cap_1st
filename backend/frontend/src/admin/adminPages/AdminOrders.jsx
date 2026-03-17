// src/components/admin/AdminOrders.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './css/AdminOrders.css';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [deliveryFilter, setDeliveryFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All');
  const [popup, setPopup] = useState({ message: '', type: '' });
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const token = localStorage.getItem('admin_token');

  const ORDER_STATUS_CHOICES = [
    { value: 'All', label: 'All' },
    { value: 'Pending', label: 'Pending' },
    { value: 'Processing', label: 'Processing' },
    { value: 'In Transit', label: 'In Transit' },
    { value: 'Completed', label: 'Completed' },
  ];

  const DELIVERY_TYPE_CHOICES = [
    { value: 'All', label: 'All Types' },
    { value: 'Pickup', label: 'Pickup' },
    { value: 'Delivered', label: 'Delivered' },
  ];

  const DATE_FILTER_CHOICES = [
    { value: 'All', label: 'All Time' },
    { value: 'Today', label: 'Today' },
    { value: 'Last7Days', label: 'Last 7 Days' },
    { value: 'LastMonth', label: 'Last Month' },
  ];

  const fetchAllOrders = async () => {
    if (!token) {
      setError('You are not authorized. Please log in.');
      return null;
    }
    try {
      const res = await axios.get('http://localhost:8000/api/admin/orders/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    } catch (err) {
      console.error('Fetch orders error:', err);
      setError('Failed to fetch orders.');
      return null;
    }
  };

  useEffect(() => {
    const loadOrders = async () => {
      const data = await fetchAllOrders();
      if (data) {
        const nonCompleted = data.filter(order => order.status !== 'Completed');
        setOrders(nonCompleted);
        setFilteredOrders(nonCompleted);
      }
    };
    loadOrders();
  }, []);

  const filterOrders = (list, query, status, delivery, date) => {
    return list.filter(order => {
      const matchesSearch =
        (order.customer_name?.toLowerCase().includes(query)) ||
        order.id.toString().includes(query);
      const matchesStatus = status === 'All' || order.status === status;
      const matchesDelivery = delivery === 'All' || order.delivery_type === delivery;
      
      let matchesDate = true;
      if (date !== 'All') {
        const orderDate = new Date(order.created_at);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        if (date === 'Today') {
          matchesDate = orderDate >= today;
        } else if (date === 'Last7Days') {
          const sevenDaysAgo = new Date(today);
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          matchesDate = orderDate >= sevenDaysAgo;
        } else if (date === 'LastMonth') {
          const thirtyDaysAgo = new Date(today);
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          matchesDate = orderDate >= thirtyDaysAgo;
        }
      }
      
      return matchesSearch && matchesStatus && matchesDelivery && matchesDate;
    });
  };

  const handleSearchChange = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    setFilteredOrders(filterOrders(orders, query, statusFilter, deliveryFilter, dateFilter));
  };

  const handleStatusFilterChange = (e) => {
    const status = e.target.value;
    setStatusFilter(status);
    setFilteredOrders(filterOrders(orders, searchQuery, status, deliveryFilter, dateFilter));
  };

  const handleDeliveryFilterChange = (e) => {
    const delivery = e.target.value;
    setDeliveryFilter(delivery);
    setFilteredOrders(filterOrders(orders, searchQuery, statusFilter, delivery, dateFilter));
  };

  const handleDateFilterChange = (e) => {
    const date = e.target.value;
    setDateFilter(date);
    setFilteredOrders(filterOrders(orders, searchQuery, statusFilter, deliveryFilter, date));
  };

  const updateOrderField = async (orderId, field, value) => {
    try {
      await axios.patch(
        `http://localhost:8000/api/orders/${orderId}/`,
        { [field]: value },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const freshOrders = await fetchAllOrders();
      if (freshOrders) {
        const activeFresh = freshOrders.filter(o => o.status !== 'Completed');
        setOrders(activeFresh);
        setFilteredOrders(filterOrders(activeFresh, searchQuery, statusFilter, deliveryFilter, dateFilter));
      }

      if (selectedOrder && selectedOrder.id === orderId) {
        const detailRes = await axios.get(`http://localhost:8000/api/admin/orders/${orderId}/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSelectedOrder(detailRes.data);
      }

      setPopup({ message: `Order #${orderId}: ${field} updated.`, type: 'success' });
    } catch (err) {
      setPopup({ message: `Failed to update ${field}.`, type: 'error' });
    }
    setTimeout(() => setPopup({ message: '', type: '' }), 4000);
  };

  const handleStatusChange = (orderId, newStatus) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    if (newStatus === 'Completed') {
      if (order.is_paid) {
        updateOrderField(orderId, 'status', 'Completed');
      } else {
        const confirmed = window.confirm(
          `Order #${orderId} is NOT paid.\n\n` +
          `Mark as COMPLETED anyway? (Only if paid in cash just now.)`
        );
        if (confirmed) {
          updateOrderField(orderId, 'status', 'Completed');
        }
      }
    } else {
      updateOrderField(orderId, 'status', newStatus);
    }
  };

  const handleMarkAsPaid = (orderId) => {
    const confirmed = window.confirm(`Mark Order #${orderId} as PAID?`);
    if (confirmed) {
      updateOrderField(orderId, 'is_paid', true);
    }
  };

  const handleGCashDecision = async (orderId, approve = true) => {
    const url = approve
      ? `http://localhost:8000/api/admin/approve-gcash/${orderId}/`
      : `http://localhost:8000/api/admin/reject-gcash/${orderId}/`;

    try {
      await axios.post(url, {}, { headers: { Authorization: `Bearer ${token}` } });

      const freshOrders = await fetchAllOrders();
      if (freshOrders) {
        const activeFresh = freshOrders.filter(o => o.status !== 'Completed');
        setOrders(activeFresh);
        setFilteredOrders(filterOrders(activeFresh, searchQuery, statusFilter, deliveryFilter, dateFilter));
      }

      if (selectedOrder && selectedOrder.id === orderId) {
        const detailRes = await axios.get(`http://localhost:8000/api/admin/orders/${orderId}/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSelectedOrder(detailRes.data);
      }

      setPopup({
        message: approve ? '✅ GCash approved!' : '❌ GCash rejected.',
        type: 'success'
      });
    } catch (err) {
      setPopup({
        message: `GCash action failed.`,
        type: 'error'
      });
    }
    setTimeout(() => setPopup({ message: '', type: '' }), 4000);
  };

  const handleDelete = async (orderId) => {
    if (!window.confirm(`Delete order #${orderId}? This cannot be undone.`)) return;

    try {
      await axios.delete(`http://localhost:8000/api/orders/${orderId}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const updated = orders.filter(o => o.id !== orderId);
      setOrders(updated);
      setFilteredOrders(filterOrders(updated, searchQuery, statusFilter, deliveryFilter, dateFilter));

      if (selectedOrder && selectedOrder.id === orderId) {
        setIsModalOpen(false);
      }

      setPopup({ message: `🗑️ Order #${orderId} deleted.`, type: 'success' });
    } catch {
      setPopup({ message: '❌ Delete failed.', type: 'error' });
    }
    setTimeout(() => setPopup({ message: '', type: '' }), 4000);
  };

  const openModal = async (orderId) => {
    try {
      const res = await axios.get(`http://localhost:8000/api/admin/orders/${orderId}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelectedOrder(res.data);
      setIsModalOpen(true);
    } catch {
      setPopup({ message: '❌ Failed to load order.', type: 'error' });
    }
  };

  const safeParseFloat = (val) => {
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
  };

  return (
    <div className="orders-container">
      {/* Toast Notification */}
      {popup.message && (
        <div className={`toast ${popup.type === 'success' ? 'toast-success' : 'toast-error'}`}>
          {popup.message}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && selectedOrder && (
        <div className="orders-modal-overlay">
          <div className="orders-modal">
            <button className="btn-close" onClick={() => setIsModalOpen(false)}>Close</button>
            <h2>Order #{selectedOrder.id}</h2>

            <table className="modal-table">
              <tbody>
                <tr><th>Customer</th><td>{selectedOrder.customer_name || 'N/A'}</td></tr>
                <tr><th>Date</th><td>{new Date(selectedOrder.created_at).toLocaleString()}</td></tr>
                <tr>
                  <th>Payment</th>
                  <td>
                    {selectedOrder.payment_method || 'N/A'}
                    {selectedOrder.payment_method === "GCash" && (
                      <>
                        <br />
                        {selectedOrder.gcash_receipt ? (
                          <button
                            className="btn-link"
                            onClick={() => window.open(`http://localhost:8000${selectedOrder.gcash_receipt}`, "_blank")}
                          >
                            View Receipt
                          </button>
                        ) : (
                          <em>No receipt</em>
                        )}
                        {!selectedOrder.is_paid && (
                          <>
                            <button className="btn-accept" onClick={() => handleGCashDecision(selectedOrder.id, true)}>
                              Accept
                            </button>
                            <button className="btn-reject" onClick={() => handleGCashDecision(selectedOrder.id, false)}>
                              Reject
                            </button>
                          </>
                        )}
                      </>
                    )}
                    {selectedOrder.payment_method !== "GCash" && !selectedOrder.is_paid && (
                      <button
                        className="btn-mark-paid"
                        onClick={() => handleMarkAsPaid(selectedOrder.id)}
                      >
                        Mark as Paid
                      </button>
                    )}
                    {selectedOrder.is_paid && <span className="paid-badge">✅ Paid</span>}
                  </td>
                </tr>
                <tr><th>Total</th><td>₱ {safeParseFloat(selectedOrder.total_price).toFixed(2)}</td></tr>
                <tr><th>Status</th>
                  <td>
                    <select
                      value={selectedOrder.status || 'Pending'}
                      onChange={(e) => handleStatusChange(selectedOrder.id, e.target.value)}
                      disabled={selectedOrder.payment_method === 'GCash' && !selectedOrder.is_paid}
                    >
                      {ORDER_STATUS_CHOICES.filter(s => s.value !== 'All').map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                    {selectedOrder.payment_method === 'GCash' && !selectedOrder.is_paid && (
                      <small className="gcash-warning">Approve GCash first</small>
                    )}
                  </td>
                </tr>
                <tr><th>Delivery Type</th><td>{selectedOrder.delivery_type === 'Delivered' ? 'Delivered' : 'Pickup'}</td></tr>
                <tr><th>Phone</th><td>{selectedOrder.contact_number || 'N/A'}</td></tr>
                <tr><th>Address</th><td>{selectedOrder.text_address || selectedOrder.address || 'N/A'}</td></tr>
                <tr><th>Barangay</th><td>{selectedOrder.barangay || 'N/A'}</td></tr>
              </tbody>
            </table>

            <h3>Items</h3>
            {selectedOrder.items?.length > 0 ? (
              <table className="modal-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Cases</th>
                    <th>Price/Case</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items.map((item, i) => {
                    const cases = safeParseFloat(item.cases_ordered);
                    const pricePerCase = safeParseFloat(item.price_per_case || item.price || 0);
                    return (
                      <tr key={i}>
                        <td>{item.beverage_name || 'Unknown'}</td>
                        <td>{cases}</td>
                        <td>₱ {pricePerCase.toFixed(2)}</td>
                        <td>₱ {(cases * pricePerCase).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p>No items.</p>
            )}
          </div>
        </div>
      )}

      <h1>Admin Orders</h1>

      <div className="search-section">
        <input
          type="text"
          placeholder="Search by name or order ID"
          value={searchQuery}
          onChange={handleSearchChange}
        />
      </div>

      <div className="orders-actions">
        <div className="filters-group">
          <label>
            <span className="filter-label">Status</span>
            <select value={statusFilter} onChange={handleStatusFilterChange}>
              {ORDER_STATUS_CHOICES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </label>
          
          <label>
            <span className="filter-label">Type</span>
            <select value={deliveryFilter} onChange={handleDeliveryFilterChange}>
              {DELIVERY_TYPE_CHOICES.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </label>
          
          <label>
            <span className="filter-label">Date Range</span>
            <select value={dateFilter} onChange={handleDateFilterChange}>
              {DATE_FILTER_CHOICES.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </label>
        </div>
        
        <div className="orders-buttons">
          <Link to="/admin/select-items">
            <button className="btn-create">Create Order</button>
          </Link>
          <Link to="/admin/order-history">
            <button className="btn-history">Order History</button>
          </Link>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      {filteredOrders.length > 0 ? (
        <div className="table-wrapper">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Date</th>
                <th>Payment</th>
                <th>Paid?</th>
                <th>Total</th>
                <th>Status</th>
                <th>Type</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <Link
                      to={`/admin/order-details/${order.id}`}
                      className="link-btn"
                      style={{ display: 'inline', verticalAlign: 'middle' }}
                    >
                      {order.customer_name || 'Anonymous'}
                    </Link>
                  </td>
                  <td>{new Date(order.created_at).toLocaleString()}</td>
                  <td>
                    {order.payment_method}
                    {order.payment_method === "GCash" && (
                      <span className={`payment-status ${order.is_paid ? 'paid' : 'pending'}`}>
                        {order.is_paid ? 'Paid' : 'Pending'}
                      </span>
                    )}
                  </td>
                  <td>
                    {order.is_paid ? (
                      <span className="badge-paid">✅ Paid</span>
                    ) : order.payment_method !== "GCash" ? (
                      <button
                        className="inline-mark-paid"
                        onClick={() => handleMarkAsPaid(order.id)}
                      >
                        Mark as Paid
                      </button>
                    ) : (
                      <span className="badge-pending">⏳ Pending</span>
                    )}
                  </td>
                  <td>₱ {safeParseFloat(order.total_price).toFixed(2)}</td>
                  <td>
                    <div className="select-wrapper">
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        disabled={order.payment_method === 'GCash' && !order.is_paid}
                        className="status-select"
                      >
                        {ORDER_STATUS_CHOICES.filter(s => s.value !== 'All').map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                      <span className="select-arrow">▼</span>
                    </div>
                  </td>
                  <td>{order.delivery_type === 'Delivered' ? 'Delivered' : 'Pickup'}</td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-view" onClick={() => openModal(order.id)}>
                        View
                      </button>
                      <button className="btn-delete" onClick={() => handleDelete(order.id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>No orders found.</p>
      )}
    </div>
  );
};

export default AdminOrders;