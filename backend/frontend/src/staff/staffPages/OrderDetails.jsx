// src/components/StaffOrderDetails.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import "./css/OrderDetails.css";
import { FaUser, FaPhone, FaMapMarkerAlt, FaCreditCard } from "react-icons/fa";

const StaffOrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const token =
    localStorage.getItem("staff_token") || localStorage.getItem("rider_token");

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const fetchOrder = async () => {
      if (!id) {
        setError("Invalid order ID.");
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`http://localhost:8000/api/orders/${id}/`, { headers });
        setOrder(response.data);
      } catch (err) {
        console.error("Error loading order:", err.response?.data || err.message);
        setError("Failed to load order details.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

  const getStatusBadgeClass = (status) => {
    const map = {
      Pending: "status-pending",
      Processing: "status-processing",
      "In Transit": "status-in-transit",
      Completed: "status-completed",
    };
    return map[status] || "status-default";
  };

  const display = (value, fallback = "N/A") => {
    return value == null || value === "" ? fallback : String(value);
  };

  if (loading) {
    return (
      <div className="order-details-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="order-details-container">
        <div className="error-message">
          <p>{error || "Order not found."}</p>
          <button onClick={() => navigate(-1)} className="btn-secondary">
            ← Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="order-details-container">
      {/* Header */}
      <div className="order-header">
        <h1 className="order-title">📦 Order #{order.id}</h1>
        <span className={`status-badge ${getStatusBadgeClass(order.status)}`}>
          {order.status}
        </span>
      </div>

      {/* Customer Info */}
      <div className="info-card">
        <div className="info-row">
          <FaUser className="info-icon" />
          <div>
            <div className="info-label">Customer</div>
            <div className="info-value">{display(order.customer_name)}</div>
          </div>
        </div>

        <div className="info-row">
          <FaPhone className="info-icon" />
          <div>
            <div className="info-label">Contact</div>
            <div className="info-value">
              {order.contact_number ? (
                <a href={`tel:${order.contact_number}`} className="contact-link">
                  {order.contact_number}
                </a>
              ) : (
                "N/A"
              )}
            </div>
          </div>
        </div>

        <div className="info-row">
          <FaMapMarkerAlt className="info-icon" />
          <div>
            <div className="info-label">Delivery Address</div>
            <div className="info-value">{display(order.text_address)}</div>
          </div>
        </div>

        <div className="info-row">
          <FaCreditCard className="info-icon" />
          <div>
            <div className="info-label">Payment Method</div>
            <div className="info-value">{display(order.payment_method)}</div>
          </div>
        </div>
      </div>

      {/* Items Section */}
      <h2 className="section-title">🛍️ Ordered Items</h2>

      {order.items && Array.isArray(order.items) && order.items.length > 0 ? (
        <div className="items-list">
          {order.items.map((item, index) => {
            const name = item.beverage_name || "Unknown Product";
            const qty = item.cases_ordered ?? "?";
            const pricePerCase = parseFloat(item.price_per_case)?.toFixed(2) ?? "??";
            const totalPrice = parseFloat(item.total_price)?.toFixed(2) ?? "??";

            return (
              <div key={index} className="item-card">
                <div className="item-name">{name}</div>
                <div className="item-meta">
                  <span>Qty: {qty}</span>
                  <span>Price/Case: ₱{pricePerCase}</span>
                  <span>Total: ₱{totalPrice}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="empty-items">No items in this order.</p>
      )}

      {/* Back Button */}
      <button onClick={() => navigate(-1)} className="back-btn">
        ← Back
      </button>
    </div>
  );
};

export default StaffOrderDetails;