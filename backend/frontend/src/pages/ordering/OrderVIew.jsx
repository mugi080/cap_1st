// src/pages/admin/OrderView.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./OrderView.css";

const Order = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const fetchOrders = async () => {
    try {
      const res = await axios.get("/api/orders/", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });
      return { success: true, data: res.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.error || "Failed to fetch orders",
      };
    }
  };

  const deleteOrder = async (orderId) => {
    try {
      await axios.delete(`/api/orders/${orderId}/`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.error || "Failed to delete order",
      };
    }
  };

  useEffect(() => {
    const loadOrders = async () => {
      setLoading(true);
      const fetched = await fetchOrders();
      if (fetched.success) {
        const activeOrders = fetched.data
          .filter((order) => order.status.toLowerCase() !== "completed")
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        setOrders(activeOrders);
      } else {
        setError(fetched.message);
      }
      setLoading(false);
    };

    loadOrders();
  }, []);

  const canCancelOrder = (createdAt) => {
    const orderTime = new Date(createdAt).getTime();
    const now = Date.now();
    const diffMinutes = (now - orderTime) / (1000 * 60);
    return diffMinutes <= 30;
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm("Cancel this order?")) return;
    const response = await deleteOrder(orderId);
    if (response.success) {
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      alert("Order cancelled.");
    } else {
      alert(response.message);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm("Delete this order permanently?")) return;
    const response = await deleteOrder(orderId);
    if (response.success) {
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      alert("Order deleted.");
    } else {
      alert(response.message);
    }
  };

  const groupedOrders = orders.reduce((groups, order) => {
    const status = order.status.toLowerCase().trim();
    if (!groups[status]) groups[status] = [];
    groups[status].push(order);
    return groups;
  }, {});

  const statusOrder = ["pending", "processing", "in transit", "cancelled"];

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);

  return (
    <div className="orders-page p-6 max-w-4xl mx-auto bg-gray-50 min-h-screen">
      <h1 className="text-4xl font-bold text-center text-gray-800 mb-2">
        🧾 Your Current Orders
      </h1>
      <p className="text-center text-gray-600 mb-8">
        Review and manage your pending orders.
      </p>

      <div className="flex justify-center mb-10">
        <button
          onClick={() => navigate("/order-history")}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-medium shadow-lg transition-all duration-200 transform hover:scale-105"
        >
          View Full Order History
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your orders...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <div className="text-red-500 text-xl font-medium">⚠️ Error</div>
          <p className="text-gray-600 mt-2">{error}</p>
        </div>
      ) : (
        <div className="space-y-10">
          {statusOrder.map((status) => {
            const ordersForStatus = groupedOrders[status] || [];
            if (ordersForStatus.length === 0) return null;

            return (
              <div key={status} className="bg-white rounded-2xl shadow-xl p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3 border-gray-200 capitalize">
                  {status} Orders ({ordersForStatus.length})
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {ordersForStatus.map((order) => (
                    <div
                      key={order.id}
                      className="border border-gray-200 rounded-xl p-6 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-white max-w-md mx-auto"
                    >
                      <div className="text-center mb-6">
                        <h3 className="text-xl font-bold text-gray-800">Order #{order.id}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {new Date(order.created_at).toLocaleString("en-PH", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium mt-2 inline-block ${
                            status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : status === "processing"
                              ? "bg-blue-100 text-blue-800"
                              : status === "in transit"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>

                      <div className="text-center mb-6">
                        <p className="text-sm text-gray-600">Total Amount</p>
                        <p className="text-2xl font-bold text-gray-800">
                          {formatCurrency(parseFloat(order.total_price) || 0)}
                        </p>
                      </div>

                      <div className="mb-6 p-4 bg-gray-50 rounded-lg border-l-4 border-green-500 font-mono text-sm">
                        {order.items.map((item, index) => {
                          const name = item.beverage_name || 'Unknown Item';
                          // ✅ FIX: Convert string to number
                          const cases = parseFloat(item.cases_ordered);
                          const pricePerCase = parseFloat(item.price_per_case) || 0;
                          const totalPrice = parseFloat(item.total_price) || 0;

                          // ✅ Handle invalid cases
                          if (isNaN(cases)) {
                            return (
                              <div key={index} className="flex justify-between items-center mb-1">
                                <span>{name} (Invalid)</span>
                                <span className="font-bold">{formatCurrency(totalPrice)}</span>
                              </div>
                            );
                          }

                          let qty;
                          if (cases === Math.floor(cases)) {
                            qty = `${Math.floor(cases)} case${Math.floor(cases) !== 1 ? 's' : ''}`;
                          } else if (cases === 0.5) {
                            qty = '½ case';
                          } else if (cases === 1.5) {
                            qty = '1½ case';
                          } else {
                            qty = `${cases.toFixed(1)} case`;
                          }

                          return (
                            <div key={index} className="flex justify-between items-center mb-1">
                              <span>{name} ({qty}) @ {formatCurrency(pricePerCase)}</span>
                              <span className="font-bold">{formatCurrency(totalPrice)}</span>
                            </div>
                          );
                        })}
                        <div className="border-t border-gray-300 mt-2 pt-2 flex justify-between font-bold">
                          <span>Total:</span>
                          <span>{formatCurrency(parseFloat(order.total_price) || 0)}</span>
                        </div>
                      </div>

                      <div className="text-center pt-4 border-t border-gray-200">
                        <p className="text-sm text-gray-600">
                          💰 Payment: {order.payment_method || 'N/A'}
                        </p>
                      </div>

                      <div className="mt-6 flex flex-col gap-2">
                        {!["cancelled"].includes(status) && (
                          <>
                            {canCancelOrder(order.created_at) ? (
                              <>
                                <button
                                  onClick={() => handleCancelOrder(order.id)}
                                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-colors duration-200 shadow-sm"
                                >
                                  Cancel Order
                                </button>
                                <button
                                  onClick={() => handleDeleteOrder(order.id)}
                                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors duration-200 shadow-sm"
                                >
                                  Delete Order
                                </button>
                              </>
                            ) : (
                              <p className="text-xs text-gray-400 italic text-center">
                                Cancellation period expired
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Order;