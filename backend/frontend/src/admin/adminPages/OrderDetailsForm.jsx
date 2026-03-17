// src/components/admin/order/OrderDetailsForm.jsx
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import "./css/OrderDetailsForm.css"; // Will use same base styles as CheckoutForm
import LocationPicker from "../../pages/ordering/LocationPicker";

const BARANGAYS = [
  "Dalahican",
  "Cotta",
  "Dupay",
  "Iyam",
  "Market View",
  "Mayao",
  "Talao-talao"
];

const OrderDetailsForm = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const { selectedItems } = location.state || {};
  const adminData = JSON.parse(localStorage.getItem("admin_data") || "{}");
  const adminToken = localStorage.getItem("admin_token");

  const [formData, setFormData] = useState({
    customerName: "",
    contactNumber: "",
    deliveryType: "Pickup",
    paymentMethod: "",
    orderStatus: "Pending",
    adminComments: "",
    address: "",
    barangay: "",
  });

  const [popupMessage, setPopupMessage] = useState("");
  const [popupType, setPopupType] = useState("");

  const storeLocation = { lat: 13.9543, lng: 121.6215 };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLocationSelect = ({ lat, lng, address }) => {
    setFormData((prev) => ({ ...prev, address: address }));
  };

  const showPopup = (message, type) => {
    setPopupMessage(message);
    setPopupType(type);
    setTimeout(() => setPopupMessage(""), 5000);
  };

  // Calculate total cases
  const calculateTotalCases = () => {
    return selectedItems?.reduce((sum, item) => sum + (parseFloat(item.caseQuantity) || 0), 0) || 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.customerName || !formData.contactNumber || !formData.paymentMethod) {
      showPopup("Please complete all required fields.", "error");
      return;
    }

    if (formData.deliveryType === "Delivered") {
      if (!formData.address) {
        showPopup("Please select a delivery location on the map.", "error");
        return;
      }
      if (!formData.barangay) {
        showPopup("Please select the barangay.", "error");
        return;
      }

      const totalCases = calculateTotalCases();
      if (totalCases < 10) {
        const confirmed = window.confirm(
          `Delivery order has only ${totalCases} case(s). Minimum is 10 cases.\n\nGo back to add more?`
        );
        if (confirmed) {
          navigate(-1);
        }
        return;
      }
    }

    const outOfStock = selectedItems.some((item) => {
      const maxCases = item.stock / item.units_per_case;
      return item.caseQuantity > maxCases;
    });

    if (outOfStock) {
      showPopup("❌ Some items exceed available stock. Please adjust quantities.", "error");
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
      ...(formData.deliveryType === "Delivered" && { barangay: formData.barangay }),
      items: selectedItems.map((item) => ({
        beverage: item.id,
        quantity: item.caseQuantity,
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

  if (!selectedItems || selectedItems.length === 0) {
    return (
      <div className="checkout-container">
        <p className="no-items-message">
          No items selected. Please go back and select some items.
        </p>
      </div>
    );
  }

  const totalPrice = selectedItems.reduce((sum, item) => sum + item.price * item.caseQuantity, 0);

  return (
    <div className="checkout-container">
      {popupMessage && (
        <div className={`popup ${popupType}`}>
          {popupMessage}
          <button className="popup-close" onClick={() => setPopupMessage("")}>
            ×
          </button>
        </div>
      )}

      <h2>Admin Order Form</h2>
      <p>Total Price: Php {totalPrice.toFixed(2)}</p>

      {/* Order Summary — reused pattern from CheckoutForm */}
      <div className="order-summary">
        <h4>Selected Items</h4>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Cases</th>
                <th>Bottles</th>
                <th>Price/Case</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {selectedItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.caseQuantity}</td>
                  <td>{Math.round(item.caseQuantity * item.units_per_case)}</td>
                  <td>Php {item.price.toFixed(2)}</td>
                  <td>Php {(item.price * item.caseQuantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Customer Name:</label>
          <input
            type="text"
            name="customerName"
            value={formData.customerName}
            onChange={handleInputChange}
            placeholder="Enter full name"
            required
          />
        </div>

        <div className="form-group">
          <label>Contact Number:</label>
          <input
            type="tel"
            name="contactNumber"
            value={formData.contactNumber}
            onChange={handleInputChange}
            placeholder="e.g. 09123456789"
            required
          />
        </div>

        <div className="form-group">
          <label>Delivery Type:</label>
          <div className="radio-group">
            <input
              type="radio"
              id="pickup"
              name="deliveryType"
              value="Pickup"
              checked={formData.deliveryType === "Pickup"}
              onChange={handleInputChange}
            />
            <label htmlFor="pickup">Pickup</label>

            <input
              type="radio"
              id="delivered"
              name="deliveryType"
              value="Delivered"
              checked={formData.deliveryType === "Delivered"}
              onChange={handleInputChange}
            />
            <label htmlFor="delivered">Delivery</label>
          </div>
        </div>

        {formData.deliveryType === "Pickup" && (
          <div className="form-group">
            <label>Pickup Location:</label>
            <input
              type="text"
              value="St. Jude Street, Holy Spirit Subdivision, Lucena City"
              disabled
            />
          </div>
        )}

        {formData.deliveryType === "Delivered" && (
          <>
            <div className="form-group">
              <label>Select Location on Map:</label>
              <LocationPicker
                onLocationSelect={handleLocationSelect}
                deliveryType="Delivered"
              />
            </div>

            <div className = "form-group">
              <label>Address (auto-filled from map):</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label>
                Barangay <span style={{ color: '#e74c3c' }}>*</span>
              </label>
              <select
                name="barangay"
                value={formData.barangay}
                onChange={handleInputChange}
                required
              >
                <option value="">Select your barangay</option>
                {BARANGAYS.map((brgy) => (
                  <option key={brgy} value={brgy}>
                    {brgy}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        <div className="form-group">
          <label>Payment Method:</label>
          <select
            name="paymentMethod"
            value={formData.paymentMethod}
            onChange={handleInputChange}
            required
          >
            <option value="">Select payment method</option>
            <option value="Cash">Cash</option>
            <option value="Cash on Delivery">Cash on Delivery</option>
          </select>
        </div>

        <div className="form-group">
          <label>Order Status:</label>
          <select
            name="orderStatus"
            value={formData.orderStatus}
            onChange={handleInputChange}
          >
            <option value="Pending">Pending</option>
            <option value="Processing">Processing</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        <div className="form-group">
          <label>Admin Comments:</label>
          <textarea
            name="adminComments"
            value={formData.adminComments}
            onChange={handleInputChange}
            placeholder="Add internal notes..."
          />
        </div>

        <button type="submit" className="btn-submit">
          Submit Order
        </button>
      </form>
    </div>
  );
};

export default OrderDetailsForm;