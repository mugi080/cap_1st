import React, { useEffect, useState } from "react";
import axios from "axios";

const API_ROOT = "http://localhost:8000";

const OrderReview = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showOnlyReviewed, setShowOnlyReviewed] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem("admin_token");
        if (!token) {
          setError("Admin token missing. Please log in.");
          setLoading(false);
          return;
        }

        const res = await axios.get(`${API_ROOT}/api/orders/`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const sortedOrders = res.data.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
        setOrders(sortedOrders);
      } catch (err) {
        console.error("Failed to fetch orders:", err);
        setError(
          err.response?.data?.detail ||
            "Failed to load orders. Please try again later."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const renderStars = (rating) => {
    if (rating == null || rating === 0) return "No rating";
    const numRating = Math.round(rating);
    const fullStars = "★".repeat(Math.min(5, numRating));
    const emptyStars = "☆".repeat(5 - Math.min(5, numRating));
    return <span className="text-yellow-600 font-bold">{fullStars}{emptyStars}</span>;
  };

  const filteredOrders = showOnlyReviewed
    ? orders.filter((order) => order.review_rating != null)
    : orders;

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <p className="text-lg">Loading orders...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <p className="text-red-600 bg-red-50 p-4 rounded-md">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <p className="text-gray-500">No orders found.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-semibold mb-6">Order Reviews</h1>

      <label className="inline-flex items-center mb-6 cursor-pointer select-none">
        <input
          type="checkbox"
          className="mr-2 h-4 w-4"
          checked={showOnlyReviewed}
          onChange={() => setShowOnlyReviewed(!showOnlyReviewed)}
        />
        <span>Show only orders with reviews</span>
      </label>

      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-300 rounded-lg overflow-hidden shadow-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-300 p-3 text-left">Order ID</th>
              <th className="border border-gray-300 p-3 text-left">Status</th>
              <th className="border border-gray-300 p-3 text-left">Total Price</th>
              <th className="border border-gray-300 p-3 text-left">Review Rating</th>
              <th className="border border-gray-300 p-3 text-left">Review Comment</th>
              <th className="border border-gray-300 p-3 text-left">Details</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 && showOnlyReviewed ? (
              <tr>
                <td colSpan="6" className="text-center py-4 text-gray-500">
                  No reviewed orders found.
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <React.Fragment key={order.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="border border-gray-300 p-3 font-medium">#{order.id}</td>
                    <td className="border border-gray-300 p-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          order.status === "Completed"
                            ? "bg-green-100 text-green-800"
                            : order.status === "Pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="border border-gray-300 p-3">
                      ₱{(order.total_price || 0).toFixed(2)}
                    </td>
                    <td className="border border-gray-300 p-3">
                      {renderStars(order.review_rating)}
                    </td>
                    <td
                      className="border border-gray-300 p-3 max-w-xs truncate"
                      title={order.review_comment || ""}
                    >
                      {order.review_comment || "No feedback yet"}
                    </td>
                    <td className="border border-gray-300 p-3">
                      <button
                        onClick={() =>
                          setExpandedOrderId(expandedOrderId === order.id ? null : order.id)
                        }
                        className="text-blue-600 font-medium hover:underline focus:outline-none"
                      >
                        {expandedOrderId === order.id ? "Hide Details ▲" : "View Details ▼"}
                      </button>
                    </td>
                  </tr>

                  {expandedOrderId === order.id && (
                    <tr>
                      <td colSpan="6" className="bg-gray-50 p-0 border-t-0">
                        <div className="p-6">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Customer Info */}
                            <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
                              <h3 className="text-xl font-semibold mb-4 pb-2 border-b">
                                Customer Information
                              </h3>
                              <table className="w-full text-sm">
                                <tbody>
                                  <tr>
                                    <td className="font-semibold py-1 w-1/3">Name:</td>
                                    <td className="py-1">{order.customer_name || "N/A"}</td>
                                  </tr>
                                  <tr>
                                    <td className="font-semibold py-1">Contact Number:</td>
                                    <td className="py-1">{order.contact_number || "N/A"}</td>
                                  </tr>
                                  <tr>
                                    <td className="font-semibold py-1">Payment Method:</td>
                                    <td className="py-1">{order.payment_method || "N/A"}</td>
                                  </tr>
                                  <tr>
                                    <td className="font-semibold py-1">Delivery Type:</td>
                                    <td className="py-1">{order.delivery_type || "N/A"}</td>
                                  </tr>
                                  <tr>
                                    <td className="font-semibold py-1">Status:</td>
                                    <td className="py-1">{order.status || "N/A"}</td>
                                  </tr>
                                  {order.assigned_staff?.full_name && (
                                    <tr>
                                      <td className="font-semibold py-1">Assigned Staff:</td>
                                      <td className="py-1">{order.assigned_staff.full_name}</td>
                                    </tr>
                                  )}
                                  {order.assigned_vehicle?.name && (
                                    <tr>
                                      <td className="font-semibold py-1">Assigned Vehicle:</td>
                                      <td className="py-1">{order.assigned_vehicle.name}</td>
                                    </tr>
                                  )}
                                  {order.delivered_by?.full_name && (
                                    <tr>
                                      <td className="font-semibold py-1">Delivered By:</td>
                                      <td className="py-1">{order.delivered_by.full_name}</td>
                                    </tr>
                                  )}
                                  <tr>
                                    <td className="font-semibold py-1">Order Created:</td>
                                    <td className="py-1">
                                      {order.created_at
                                        ? new Date(order.created_at).toLocaleString()
                                        : "N/A"}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>

                            {/* Beverage List */}
                            <div className="bg-white rounded-lg shadow p-4 border border-gray-200 overflow-x-auto">
                              <h3 className="text-xl font-semibold mb-4 pb-2 border-b">
                                Ordered Items
                              </h3>
                              <table className="w-full text-sm border-collapse border border-gray-300">
                                <thead>
                                  <tr className="bg-gray-100">
                                    <th className="border border-gray-300 p-2 text-left">Product</th>
                                    <th className="border border-gray-300 p-2 text-left">Vol (ml)</th>
                                    <th className="border border-gray-300 p-2 text-left">Qty</th>
                                    <th className="border border-gray-300 p-2 text-left">Price/Case</th>
                                    <th className="border border-gray-300 p-2 text-left">Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {order.items && order.items.length > 0 ? (
                                    order.items.map((item, idx) => (
                                      <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                        <td className="border border-gray-300 p-2">
                                          {item.beverage_name || `Beverage #${item.beverage || 'N/A'}`}
                                        </td>
                                        <td className="border border-gray-300 p-2">
                                          {item.beverage_volume ? `${item.beverage_volume} ml` : "N/A"}
                                        </td>
                                        <td className="border border-gray-300 p-2">
                                          {item.quantity || 0}
                                        </td>
                                        <td className="border border-gray-300 p-2">
                                          ₱{(item.price_per_case || 0).toFixed(2)}
                                        </td>
                                        <td className="border border-gray-300 p-2">
                                          ₱{(item.total_price || 0).toFixed(2)}
                                        </td>
                                      </tr>
                                    ))
                                  ) : (
                                    <tr>
                                      <td colSpan="5" className="p-2 text-center text-gray-500">
                                        No items
                                      </td>
                                    </tr>
                                  )}
                                  <tr className="font-bold bg-gray-100">
                                    <td colSpan="4" className="text-right p-2">Order Total:</td>
                                    <td className="p-2">₱{(order.total_price || 0).toFixed(2)}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrderReview;