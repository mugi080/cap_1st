// src/pages/AdminOrderHistory.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const AdminOrderHistory = () => {
  const [historyOrders, setHistoryOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');

  // Modal State
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const token = localStorage.getItem('admin_token');

  // Fetch completed orders (order history)
  const fetchHistory = async () => {
    if (!token) {
      setError('Not authorized. Please log in.');
      return;
    }

    try {
      const res = await axios.get('http://localhost:8000/api/order-history/', {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Sort by updated_at descending (newest first)
      const sorted = res.data.sort(
        (a, b) => new Date(b.updated_at) - new Date(a.updated_at)
      );

      setHistoryOrders(sorted);
      setFilteredOrders(sorted);
    } catch (err) {
      console.error("Failed to load order history:", err);
      setError('Failed to load order history.');
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Handle search filtering
  useEffect(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) {
      setFilteredOrders(historyOrders);
      return;
    }

    const results = historyOrders.filter((order) =>
      order.id.toString().includes(query) ||
      (order.customer_name && order.customer_name.toLowerCase().includes(query)) ||
      (order.payment_method && order.payment_method.toLowerCase().includes(query)) ||
      (order.delivery_type && order.delivery_type.toLowerCase().includes(query))
    );
    setFilteredOrders(results);
  }, [searchQuery, historyOrders]);

  // Open Modal with Full Order Details
  const openModal = async (orderId) => {
    try {
      const res = await axios.get(`http://localhost:8000/api/admin/orders/${orderId}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelectedOrder(res.data);
      setIsModalOpen(true);
    } catch (err) {
      alert('Failed to load order details.');
    }
  };

  // Close Modal
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedOrder(null);
  };

  return (
    <div className="admin-order-history">
      <h2>📋 Order History (Completed Orders)</h2>

      {error && <p className="error-message">{error}</p>}

      {/* Search Bar */}
      <input
        type="text"
        placeholder="Search by ID, customer, payment, or delivery..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="search-input"
      />

      {/* No Results Message */}
      {filteredOrders.length === 0 ? (
        <p className="no-orders">
          {searchQuery ? 'No matching orders found.' : 'No completed orders yet.'}
        </p>
      ) : (
        <>
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Delivery</th>
                <th>Paid?</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td>#{order.id}</td>
                  <td>{order.customer_name || 'Anonymous'}</td>
                  <td>
                    <span className="date-only">{new Date(order.created_at).toLocaleDateString()}</span>
                    <br />
                    <small>{new Date(order.created_at).toLocaleTimeString()}</small>
                  </td>
                  <td className="total-price">₱{parseFloat(order.total_price).toFixed(2)}</td>
                  <td>
                    <span className={`badge payment-${order.payment_method?.toLowerCase()}`}>
                      {order.payment_method}
                    </span>
                  </td>
                  <td>
                    <span className={`badge delivery-${order.delivery_type?.toLowerCase()}`}>
                      {order.delivery_type}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${order.is_paid ? 'paid' : 'unpaid'}`}>
                      {order.is_paid ? '✅ Paid' : '🔴 Not Paid'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn-view"
                      onClick={() => openModal(order.id)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="results-count">
            Showing <strong>{filteredOrders.length}</strong> completed order(s)
          </p>
        </>
      )}

      {/* Reusable Modal */}
      {isModalOpen && selectedOrder && (
        <div className="orders-modal-overlay" onClick={closeModal}>
          <div className="orders-modal" onClick={(e) => e.stopPropagation()}>
            <button className="btn-close" onClick={closeModal}>✕</button>
            <h2>Order #{selectedOrder.id}</h2>

            <table className="modal-table">
              <tbody>
                <tr><th>Customer</th><td>{selectedOrder.customer_name || 'N/A'}</td></tr>
                <tr><th>Date</th><td>{new Date(selectedOrder.created_at).toLocaleString()}</td></tr>
                <tr><th>Payment Method</th><td>{selectedOrder.payment_method || 'N/A'}</td></tr>
                <tr><th>Total</th><td>₱ {parseFloat(selectedOrder.total_price).toFixed(2)}</td></tr>
                <tr><th>Status</th><td><span className="badge">Completed</span></td></tr>
                <tr><th>Delivery Type</th><td>{selectedOrder.delivery_type || 'N/A'}</td></tr>
                <tr><th>Contact</th><td>{selectedOrder.contact_number || 'N/A'}</td></tr>
                <tr><th>Address</th><td>{selectedOrder.text_address || selectedOrder.address || 'Pickup'}</td></tr>
              </tbody>
            </table>

            <h3>Items</h3>
            {selectedOrder.items?.length > 0 ? (
              <table className="modal-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Qty (Cases)</th>
                    <th>Price/Case</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items.map((item, i) => {
                    const cases = parseFloat(item.cases_ordered) || 0;
                    const pricePerCase = parseFloat(item.price_per_case || item.price) || 0;
                    const total = (cases * pricePerCase).toFixed(2);
                    return (
                      <tr key={i}>
                        <td>{item.beverage_name || 'Unknown'}</td>
                        <td>{cases}</td>
                        <td>₱ {pricePerCase.toFixed(2)}</td>
                        <td>₱ {total}</td>
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
    </div>
  );
};

export default AdminOrderHistory;