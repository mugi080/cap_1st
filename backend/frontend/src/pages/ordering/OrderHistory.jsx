// src/pages/ordering/OrderHistory.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import "./css/OrderHistory.css";

const API_ROOT = "http://localhost:8000";

const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [feedbackState, setFeedbackState] = useState({});
  const [hoverRating, setHoverRating] = useState({});
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("access");

  const fetchCompletedOrders = async () => {
    if (!token) {
      alert("Please log in to view order history.");
      setLoading(false);
      return;
    }

    try {
      const res = await axios.get(`${API_ROOT}/api/order-history/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const completed = res.data.filter(
        (order) => order.status?.toLowerCase() === "completed"
      );
      setOrders(completed);
    } catch (error) {
      console.error("Fetch error", error);
      alert("Failed to load order history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompletedOrders();
  }, []);

  const formatCases = (cases) => {
    const num = Number(cases);
    if (isNaN(num) || num <= 0) return "0 cases";
    if (num === 1) return "1 case";
    if (Number.isInteger(num)) return `${num} cases`;

    const whole = Math.floor(num);
    const fraction = num - whole;

    if (Math.abs(fraction - 0.5) < 0.01) {
      return whole === 0 ? "½ case" : `${whole}½ cases`;
    }

    return `${num.toFixed(1)} cases`;
  };

  const handleStarHover = (orderId, rating) => {
    setHoverRating((prev) => ({ ...prev, [orderId]: rating }));
  };

  const handleStarClick = (orderId, rating) => {
    setFeedbackState((prev) => ({
      ...prev,
      [orderId]: { ...prev[orderId], rating },
    }));
  };

  const handleFeedbackChange = (orderId, value) => {
    setFeedbackState((prev) => ({
      ...prev,
      [orderId]: { ...prev[orderId], comment: value },
    }));
  };

  const submitFeedback = async (e, orderId) => {
    e.preventDefault();
    const data = feedbackState[orderId];
    if (!data?.comment || !data?.rating) {
      alert("Please fill out both comment and rating.");
      return;
    }

    try {
      await axios.post(
        `${API_ROOT}/api/orders/${orderId}/feedback/`,
        {
          review_comment: data.comment,
          review_rating: data.rating,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Feedback submitted!");
      fetchCompletedOrders();
    } catch (err) {
      alert("Error submitting feedback.");
    }
  };

  // ✅ Opens YOUR receipt page (not the API PDF)
  const downloadReceipt = (orderId) => {
    const token = localStorage.getItem("access");
    window.open(`/receipt?orderId=${orderId}&token=${token}`, "_blank");
  };

  const renderStars = (orderId) => {
    const hover = hoverRating[orderId] || 0;
    const selected = feedbackState[orderId]?.rating || 0;
    return (
      <div className="star-rating">
        {[...Array(5)].map((_, i) => (
          <span
            key={i}
            className={`star ${hover > i || selected > i ? "filled" : ""}`}
            onMouseEnter={() => handleStarHover(orderId, i + 1)}
            onMouseLeave={() => handleStarHover(orderId, 0)}
            onClick={() => handleStarClick(orderId, i + 1)}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="order-history-page">
        <h1>📜 Order History</h1>
        <p className="loading">Loading your order history...</p>
      </div>
    );
  }

  return (
    <div className="order-history-page">
      <h1>📜 Order History</h1>

      {orders.length === 0 ? (
        <div className="empty-state">
          <p>🍹 No completed orders found.</p>
          <p>Complete an order to leave feedback!</p>
        </div>
      ) : (
        orders.map((order) => (
          <div key={order.id} className="order-history-card">
            <div className="order-header">
              <strong>Order #{order.id}</strong>
              <button onClick={() => downloadReceipt(order.id)} className="download-receipt-btn">
                📄 Download Receipt
              </button>
            </div>

            <div className="order-details">
              <p className="order-date">{new Date(order.created_at).toLocaleString()}</p>
              <div className="detail-row">
                <span>Total:</span>
                <span className="order-total">₱{parseFloat(order.total_price).toFixed(2)}</span>
              </div>
              <div className="detail-row">
                <span>Payment:</span>
                <strong>{order.payment_method || "N/A"}</strong>
              </div>
              <div className="detail-row">
                <span>Status:</span>
                <span className="status-completed">Completed</span>
              </div>
            </div>

            <div className="order-items">
              <strong>Items Ordered:</strong>
              <ul>
                {order.items.map((item, i) => (
                  <li key={i}>
                    <span>
                      {formatCases(item.cases_ordered)} {item.beverage_name || `Beverage #${item.beverage}`}
                    </span>
                    <span>₱{parseFloat(item.total_price).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            </div>

            {order.review_comment ? (
              <div className="feedback-submitted">
                <p>✅ Feedback Submitted</p>
                <p>
                  Rating:{" "}
                  <span className="feedback-rating">
                    {"★".repeat(order.review_rating)}
                    {"☆".repeat(5 - order.review_rating)}
                  </span>
                </p>
                <p className="feedback-comment">"{order.review_comment}"</p>
              </div>
            ) : (
              <form onSubmit={(e) => submitFeedback(e, order.id)} className="feedback-form">
                <label>Your Feedback:</label>
                <textarea
                  required
                  rows="3"
                  placeholder="How was your order? Share your experience..."
                  value={feedbackState[order.id]?.comment || ""}
                  onChange={(e) => handleFeedbackChange(order.id, e.target.value)}
                />
                <div className="star-rating-container">
                  <label>Rating:</label>
                  {renderStars(order.id)}
                </div>
                <button type="submit" className="submit-feedback-btn">
                  Submit Feedback
                </button>
              </form>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default OrderHistory;