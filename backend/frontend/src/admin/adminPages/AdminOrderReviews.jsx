import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

const AdminOrderReviews = () => {
  const [orderReviews, setOrderReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOrderReviews = async () => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      setError("You are not authorized. Please log in.");
      setLoading(false);
      return;
    }

    try {
      const res = await axios.get("http://localhost:8000/api/order-reviews/all/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrderReviews(res.data);
    } catch (err) {
      console.error("Failed to load order reviews:", err);
      setError("Failed to fetch order reviews. Please try again later.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrderReviews();
  }, []);

  const renderStars = (rating) => {
    return (
      <span style={{ color: "#f5b50a" }}>
        {"★".repeat(rating)}{"☆".repeat(5 - rating)}
      </span>
    );
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>📦 Admin Order Reviews</h2>
        <Link
          to="/admin/order-reviews"
          style={{
            padding: "8px 16px",
            backgroundColor: "#28a745",
            color: "white",
            textDecoration: "none",
            borderRadius: "4px",
            fontSize: "14px",
          }}
        >
          ➕ Go to Order Reviews
        </Link>
      </div>

      <div style={{ marginBottom: "20px", marginTop: "10px" }}>
        <Link
          to="/admin/reviews"
          style={{
            padding: "8px 16px",
            backgroundColor: "#007bff",
            color: "white",
            textDecoration: "none",
            borderRadius: "4px",
          }}
        >
          Back to Customer Reviews
        </Link>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}
      {loading ? (
        <p>Loading order reviews...</p>
      ) : orderReviews.length === 0 ? (
        <p>No order reviews found.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              borderRadius: "8px",
              minWidth: "600px",
            }}
          >
            <thead style={{ backgroundColor: "#f2f2f2" }}>
              <tr>
                <th style={tableHeaderStyle}>Order Item</th>
                <th style={tableHeaderStyle}>User</th>
                <th style={tableHeaderStyle}>Rating</th>
                <th style={tableHeaderStyle}>Review</th>
                <th style={tableHeaderStyle}>Date</th>
              </tr>
            </thead>
            <tbody>
              {orderReviews.map((review) => (
                <tr key={review.id} style={tableRowStyle}>
                  <td style={tableCellStyle}>
                    {typeof review.order_item === "string" || typeof review.order_item === "number"
                      ? review.order_item
                      : "N/A"}
                  </td>
                  <td style={tableCellStyle}>{review.user_name || "Anonymous"}</td>
                  <td style={tableCellStyle}>{renderStars(review.rating)}</td>
                  <td style={tableCellStyle}>{review.review_text || "No comment."}</td>
                  <td style={tableCellStyle}>
                    {new Date(review.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const tableHeaderStyle = {
  padding: "12px",
  textAlign: "left",
  borderBottom: "2px solid #ddd",
};

const tableCellStyle = {
  padding: "10px",
  borderBottom: "1px solid #eee",
};

const tableRowStyle = {
  transition: "background-color 0.3s ease",
};

export default AdminOrderReviews;
