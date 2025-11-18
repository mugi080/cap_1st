import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./css/AdminReviews.css";

const AdminReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =========================
  // 🔧 Backend Logic
  // =========================

  useEffect(() => {
    const fetchReviews = async () => {
      const token = localStorage.getItem("admin_token");
      if (!token) {
        setError("You are not authorized. Please log in.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("http://localhost:8000/api/reviews/all/", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

        const data = await res.json();
        setReviews(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch reviews:", err);
        setError(
          err.message.includes("network")
            ? "Failed to connect to server. Please check your connection."
            : "Failed to load reviews. Please try again later."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, []);

  // Star Rating Renderer
  const renderStars = (rating) => {
    return (
      <div className="review-stars" title={`${rating} out of 5 stars`}>
        {"★".repeat(rating)}
        {"☆".repeat(5 - rating)}
      </div>
    );
  };

  // =========================
  // 🎨 Frontend UI
  // =========================

  return (
    <div className="reviews-page">
      {/* Header */}
      <div className="reviews-header">
        <h2 className="reviews-title">⭐ Webpage Reviews</h2>
        <Link to="/admin/order-reviews" className="btn btn-secondary">
          View Order Reviews
        </Link>
      </div>

      {/* Error */}
      {error && <div className="alert-error">{error}</div>}

      {/* Loading */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading reviews...</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="empty-state">
          <p>No reviews found.</p>
        </div>
      ) : (
        <div className="reviews-table-container">
          <table className="reviews-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Rating</th>
                <th>Review Text</th>
                <th>Submitted At</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r) => (
                <tr key={r.id} className="reviews-table-row">
                  <td>{r.user_name || "Anonymous"}</td>
                  <td>{renderStars(r.rating)}</td>
                  <td className="review-text-cell">{r.review_text}</td>
                  <td>{new Date(r.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminReviews;