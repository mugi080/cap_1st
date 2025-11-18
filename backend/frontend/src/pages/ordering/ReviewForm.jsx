import React, { useState } from "react";
import axios from "axios";

const ReviewForm = ({ orderItemId }) => {
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);

    const token = localStorage.getItem("access_token");

    if (!token) {
      alert("You must be logged in to submit a review.");
      setSubmitting(false);
      return;
    }

    const payload = {
      order_item: orderItemId,
      rating,
      comment,
    };

    console.log("Submitting review:", payload);

    try {
      const response = await axios.post(
        "http://localhost:5173/api/reviews/",
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Response status:", response.status);
      console.log("Response data:", response.data);

      if (response.status >= 200 && response.status < 300) {
        setSubmitted(true);
      } else {
        alert("Failed to submit review.");
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      alert("An error occurred while submitting the review.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return <p className="text-green-600 text-sm mt-2">Review submitted ✅</p>;
  }

  return (
    <div className="mt-2 text-sm">
      {!showForm ? (
        <button
          className="text-blue-600 underline"
          onClick={() => setShowForm(true)}
        >
          Leave a Review
        </button>
      ) : (
        <div className="space-y-2 mt-2">
          <div>
            <label className="mr-2">Rating:</label>
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="border p-1"
              required
            >
              {[1, 2, 3, 4, 5].map((r) => (
                <option key={r} value={r}>
                  {r} ★
                </option>
              ))}
            </select>
          </div>
          <div>
            <textarea
              placeholder="Write a comment... (optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full p-2 border rounded"
              rows="3"
            ></textarea>
          </div>
          <button
            onClick={handleSubmit}
            className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit Review"}
          </button>
        </div>
      )}
    </div>
  );
};

export default ReviewForm;
