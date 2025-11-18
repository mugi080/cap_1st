// src/components/admin/order/OrderDetailsForm.js
import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios"; // Optional: custom styling
import LocationPicker from "../../pages/ordering/LocationPicker"; // Adjust path as needed

const OrderDetailsForm = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const { selectedItems } = location.state || {};
  const adminData = JSON.parse(localStorage.getItem("admin_data"));
  const adminToken = localStorage.getItem("admin_token");

  const [formData, setFormData] = useState({
    customerName: "",
    contactNumber: "",
    deliveryType: "Pickup",
    paymentMethod: "",
    orderStatus: "Pending",
    adminComments: "",
    address: "", // Will hold lat,lng or delivery address
  });

  const [popupMessage, setPopupMessage] = useState("");
  const [popupType, setPopupType] = useState("");

  // Store coordinates for pickup default
  const storeLocation = { lat: 14.5995, lng: 120.9842 };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLocationSelect = ({ lat, lng }) => {
    const coordinates = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    setFormData((prev) => ({
      ...prev,
      address: coordinates,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.customerName || !formData.contactNumber || !formData.paymentMethod) {
      showPopup("Please fill in all required fields.", "error");
      return;
    }

    if (formData.deliveryType === "Delivered" && !formData.address.trim()) {
      showPopup("Please select a delivery location on the map.", "error");
      return;
    }

    const orderData = {
      order_status: formData.orderStatus,
      admin_comments: formData.adminComments,
      address:
        formData.deliveryType === "Pickup"
          ? "St. Jude Street, Holy Spirit Subdivision, Lucena City"
          : formData.address,
      payment_method: formData.paymentMethod,
      delivery_type: formData.deliveryType,
      customer_name: formData.customerName,
      contact_number: formData.contactNumber,
      items: selectedItems.map((item) => ({
        beverage: item.id,
        quantity: item.quantity,
      })),
      user: adminData?.id,
    };

    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/api/orders/",
        orderData,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status === 201) {
        showPopup("✅ Order created successfully!", "success");
        setTimeout(() => navigate("/admin/orders"), 1500);
      }
    } catch (error) {
      let message = "Failed to submit order.";
      if (error.response?.data) {
        message = Object.values(error.response.data).flat().join("; ");
      }
      showPopup(`❌ ${message}`, "error");
    }
  };

  const showPopup = (message, type) => {
    setPopupMessage(message);
    setPopupType(type);
    setTimeout(() => setPopupMessage(""), 5000);
  };

  if (!selectedItems || selectedItems.length === 0) {
    return (
      <div className="no-items">
        No items selected. Please go back and select some items.
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "auto" }}>
      {/* Popup Notification */}
      {popupMessage && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            backgroundColor: popupType === "error" ? "#ff4d4d" : "#4CAF50",
            color: "white",
            padding: "12px 20px",
            borderRadius: "5px",
            boxShadow: "0 3px 6px rgba(0,0,0,0.2)",
            zIndex: 1000,
            minWidth: "200px",
            textAlign: "center",
          }}
        >
          <span>{popupMessage}</span>
          <button
            onClick={() => setPopupMessage("")}
            style={{
              marginLeft: "10px",
              background: "transparent",
              border: "none",
              fontWeight: "bold",
              cursor: "pointer",
              color: "white",
            }}
          >
            ×
          </button>
        </div>
      )}

      <h2>📝 Order Details</h2>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        {/* Customer Name */}
        <div className="form-group">
          <label style={{ fontWeight: "bold" }}>Customer Name:</label>
          <input
            type="text"
            name="customerName"
            value={formData.customerName}
            onChange={handleInputChange}
            placeholder="Enter customer name"
            required
            style={{
              width: "100%",
              padding: "8px",
              fontSize: "1rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
          />
        </div>

        {/* Contact Number */}
        <div className="form-group">
          <label style={{ fontWeight: "bold" }}>Contact Number:</label>
          <input
            type="tel"
            name="contactNumber"
            value={formData.contactNumber}
            onChange={handleInputChange}
            placeholder="e.g. 09123456789"
            pattern="[0-9]{11}"
            title="Must be 11-digit phone number"
            required
            style={{
              width: "100%",
              padding: "8px",
              fontSize: "1rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
          />
        </div>

        {/* Delivery Type */}
        <div className="form-group">
          <label style={{ fontWeight: "bold" }}>Delivery Type:</label>
          <div style={{ display: "flex", gap: "20px", marginTop: "5px" }}>
            <label>
              <input
                type="radio"
                name="deliveryType"
                value="Pickup"
                checked={formData.deliveryType === "Pickup"}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, deliveryType: "Pickup" }))
                }
              />{" "}
              Pickup
            </label>
            <label>
              <input
                type="radio"
                name="deliveryType"
                value="Delivered"
                checked={formData.deliveryType === "Delivered"}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, deliveryType: "Delivered" }))
                }
              />{" "}
              Delivered
            </label>
          </div>
        </div>

        {/* Conditional Fields Based on Delivery Type */}
        {formData.deliveryType === "Pickup" && (
          <div className="form-group">
            <label style={{ fontWeight: "bold" }}>Pickup Address:</label>
            <input
              type="text"
              value="St. Jude Street, Holy Spirit Subdivision, Lucena City"
              disabled
              style={{
                width: "100%",
                padding: "8px",
                backgroundColor: "#f9f9f9",
                fontSize: "1rem",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
            />
          </div>
        )}

        {formData.deliveryType === "Delivered" && (
          <>
            <div className="form-group">
              <label style={{ fontWeight: "bold" }}>Select Delivery Location:</label>
              <LocationPicker
                onLocationSelect={handleLocationSelect}
                pinLocation={storeLocation}
                disabled={formData.deliveryType === "Pickup"}
              />
            </div>

            <div className="form-group">
              <label style={{ fontWeight: "bold" }}>Selected Coordinates:</label>
              <input
                type="text"
                value={formData.address}
                readOnly
                style={{
                  width: "100%",
                  padding: "8px",
                  fontSize: "1rem",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                }}
              />
            </div>
          </>
        )}

        {/* Payment Method */}
        <div className="form-group">
          <label style={{ fontWeight: "bold" }}>Payment Method:</label>
          <select
            name="paymentMethod"
            value={formData.paymentMethod}
            onChange={handleInputChange}
            required
            style={{
              width: "100%",
              padding: "8px",
              fontSize: "1rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
          >
            <option value="">-- Select --</option>
            <option value="Cash">Cash</option>
            <option value="Cash on Delivery">Cash on delivery</option>
          </select>
        </div>

        {/* Order Status */}
        <div className="form-group">
          <label style={{ fontWeight: "bold" }}>Order Status:</label>
          <select
            name="orderStatus"
            value={formData.orderStatus}
            onChange={handleInputChange}
            style={{
              width: "100%",
              padding: "8px",
              fontSize: "1rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
          >
            <option value="Pending">Pending</option>
            <option value="Processing">Processing</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        {/* Admin Comments */}
        <div className="form-group">
          <label style={{ fontWeight: "bold" }}>Admin Comments:</label>
          <textarea
            name="adminComments"
            value={formData.adminComments}
            onChange={handleInputChange}
            placeholder="Add internal notes or comments..."
            style={{
              width: "100%",
              padding: "8px",
              height: "80px",
              fontSize: "1rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="btn-submit"
          style={{
            padding: "12px",
            background: "#4CAF50",
            color: "white",
            fontSize: "16px",
            fontWeight: "bold",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            alignSelf: "flex-start",
          }}
        >
          Submit Order
        </button>
      </form>
    </div>
  );
};

export default OrderDetailsForm;