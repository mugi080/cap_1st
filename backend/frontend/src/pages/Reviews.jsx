import React, { useEffect, useState } from "react";
import axios from "axios";
import "./css/Reviews.css";

const Reviews = () => {
  const [editing, setEditing] = useState(false);
  const [reviewText, setReviewText] = useState("");
  const [rating, setRating] = useState(5);
  const [allReviews, setAllReviews] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Fetch all reviews (includes current user's if exists)
  const fetchAllReviews = async () => {
    try {
      const res = await axios.get("/api/reviews/all/");
      return res.data || [];
    } catch (err) {
      console.error("Failed to load reviews:", err);
      return [];
    }
  };

  useEffect(() => {
    const loadData = async () => {
      const token = localStorage.getItem("access_token");
      const reviews = await fetchAllReviews();
      setAllReviews(reviews);

      // If user is logged in, check if they already have a review
      if (token) {
        const myReview = reviews.find((r) => r.is_current_user);
        if (myReview) {
          setReviewText(myReview.review_text || "");
          setRating(myReview.rating || 5);
        }
        // If no review, leave fields empty (user can write new one)
      }

      setLoading(false);
    };

    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!reviewText.trim() || rating < 1 || rating > 5) {
      setError("Please provide a valid review and rating between 1–5.");
      window.scrollTo(0, 0);
      return;
    }

    const token = localStorage.getItem("access_token");
    if (!token) {
      setError("You must be logged in to submit a review.");
      window.scrollTo(0, 0);
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const payload = { review_text: reviewText, rating };
      await axios.post("/api/reviews/", payload, { headers });

      // Reset form
      setEditing(false);
      setError("");

      // Refresh reviews to reflect changes
      const updatedReviews = await fetchAllReviews();
      setAllReviews(updatedReviews);

      // Re-apply user's review in case it was updated
      const myUpdatedReview = updatedReviews.find((r) => r.is_current_user);
      if (myUpdatedReview) {
        setReviewText(myUpdatedReview.review_text || "");
        setRating(myUpdatedReview.rating || 5);
      }
    } catch (err) {
      console.error("Failed to submit review:", err);
      setError("Failed to submit review. Please try again.");
      window.scrollTo(0, 0);
    }
  };

  const averageRating = allReviews.length
    ? allReviews.reduce((acc, r) => acc + r.rating, 0) / allReviews.length
    : 0;

  const ratingCounts = [0, 0, 0, 0, 0];
  allReviews.forEach((r) => {
    if (r.rating >= 1 && r.rating <= 5) {
      ratingCounts[r.rating - 1]++;
    }
  });
  const maxCount = Math.max(...ratingCounts, 1);

  if (loading) {
    return <div className="loading">Loading reviews...</div>;
  }

  return (
    <div className="reviews-container">
      {error && <div className="top-error-message">{error}</div>}

      <h2>Customer Reviews</h2>

      {/* Rating Summary */}
      <div className="rating-summary">
        <div className="rating-box">
          <div className="average-rating">{averageRating.toFixed(1)}</div>
          <div className="stars">
            {"★".repeat(Math.round(averageRating))}
            {"☆".repeat(5 - Math.round(averageRating))}
          </div>
          <p>{allReviews.length} review{allReviews.length !== 1 ? "s" : ""}</p>
        </div>

        <div className="distribution-bar">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = ratingCounts[star - 1];
            const percent = (count / maxCount) * 100;
            return (
              <div key={star} className="rating-row">
                <span className="star-label">{star} ★</span>
                <div className="bar-container">
                  <div className="bar-fill" style={{ width: `${percent}%` }}></div>
                </div>
                <span className="rating-count">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* User Review Section */}
      <div className="user-review-section">
        {!localStorage.getItem("access_token") ? (
          <p className="login-prompt">Log in to leave a review.</p>
        ) : editing ? (
          <form onSubmit={handleSubmit} className="review-form">
            <label htmlFor="review-text">
              <strong>Your Review:</strong>
            </label>
            <textarea
              id="review-text"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Write your honest feedback..."
              rows={5}
              required
            />
            <div className="rating-picker">
              <strong>Rating:</strong>
              <div className="star-buttons">
                {[1, 2, 3, 4, 5].map((num) => (
                  <span
                    key={num}
                    onClick={() => setRating(num)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Rate ${num} stars`}
                    className={`star ${num <= rating ? "filled" : ""}`}
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>
            <div className="form-actions">
              <button type="submit">Submit Feedback</button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setError("");
                }}
                className="secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button className="write-review-btn" onClick={() => setEditing(true)}>
            {allReviews.some(r => r.is_current_user)
              ? "Edit Your Review"
              : "Give us a feedback!"}
          </button>
        )}
      </div>

      {/* All Reviews List */}
      <div className="all-reviews">
        <h3>All Reviews</h3>
        {allReviews.length === 0 ? (
          <p>No reviews yet.</p>
        ) : (
          allReviews.map((r) => (
            <div key={r.id} className="review-card">
              <div className="review-header">
                <div className="review-stars">
                  {"★".repeat(r.rating)}
                  {"☆".repeat(5 - r.rating)}
                </div>
                <small className="review-author">
                  By {r.user_name || "Anonymous"} on{" "}
                  {new Date(r.created_at).toLocaleDateString()}
                </small>
              </div>
              <p className="review-text">"{r.review_text}"</p>
              {r.is_current_user && (
                <small className="your-review">(Your Review)</small>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Reviews;