import React, { useEffect, useState } from "react";
import axios from "axios";
import "./css/OrderHistory.css";

const API_ROOT = "http://localhost:8000";

const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [feedbackState, setFeedbackState] = useState({});
  const [hoverRating, setHoverRating] = useState({});

  const fetchCompletedOrders = async () => {
    try {
      const res = await axios.get(`${API_ROOT}/api/order-history/`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      console.log("Raw Orders:", res.data);

      const completed = res.data.filter(
        (order) => order.status?.toLowerCase() === "completed"
      );

      console.log("Filtered Completed Orders:", completed);

      setOrders(completed);
    } catch (error) {
      console.error("Fetch error", error);
    }
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
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );
      alert("Feedback submitted!");
      fetchCompletedOrders();
    } catch (err) {
      alert("Error submitting feedback.");
    }
  };

  const downloadReceipt = (orderId) => {
    const token = localStorage.getItem("access_token");
    const receiptUrl = `${API_ROOT}/api/orders/${orderId}/receipt/`;

    const link = document.createElement("a");
    link.href = receiptUrl;
    link.download = `Order_${orderId}_receipt.pdf`;
    link.click();
  };

  useEffect(() => {
    fetchCompletedOrders();
  }, []);

  const renderStars = (orderId) => {
    const hover = hoverRating[orderId] || 0;
    const selected = feedbackState[orderId]?.rating || 0;

    return (
      <div className="star-rating">
        {[...Array(5)].map((_, i) => {
          const filled = (hover || selected) > i;
          return (
            <span
              key={i}
              className={`star ${filled ? "filled" : ""}`}
              onMouseEnter={() => handleStarHover(orderId, i + 1)}
              onMouseLeave={() => handleStarHover(orderId, 0)}
              onClick={() => handleStarClick(orderId, i + 1)}
            >
              ★
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="order-history-page">
      <h1>📜 Order History</h1>

      {orders.length === 0 ? (
        <p>🍹 No completed orders found. Complete an order to leave feedback!</p>
      ) : (
        orders.map((order) => (
          <div key={order.id} className="order-history-card">
            <div className="order-header">
              <strong>Order #{order.id}</strong>
              <button
                type="button"
                onClick={() => downloadReceipt(order.id)}
                className="download-receipt-btn"
              >
                📄 Download Receipt
              </button>
            </div>

            <div className="order-details">
              <p>{new Date(order.created_at).toLocaleString()}</p>
              <div>
                <span>Total:</span>
                <span className="order-total">₱{order.total_price.toFixed(2)}</span>
              </div>
              <div>
                <span>Payment:</span>
                <strong>{order.payment_method}</strong>
              </div>
            </div>

            <div className="order-items">
              <strong>Items Ordered:</strong>
              <ul>
                {order.items.map((item, i) => (
                  <li key={i}>
                    <span>
                      {item.quantity}x {item.beverage.name}
                    </span>
                    <span>₱{item.total_price.toFixed(2)}</span>
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
                  rows="4"
                  placeholder="Share your experience with this order..."
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