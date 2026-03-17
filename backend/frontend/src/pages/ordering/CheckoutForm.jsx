// src/pages/CheckoutForm.jsx
import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import LocationPicker from "./LocationPicker";
import "./CheckoutForm.css";

const BARANGAYS = [
  "Alitap",
  "Bacag",
  "Bagong Silang",
  "Barayong",
  "Barra",
  "Bocohan",
  "Bungoy",
  "Cotta",
  "Dalahican",
  "Dapdap",
  "Del Rosario",
  "Dolores",
  "Domot",
  "Dupay",
  "Gulang-gulang",
  "Ibabang Dupay",
  "Ibabang Iyam",
  "Ibabang Talim",
  "Ilayang Dupay",
  "Ilayang Iyam",
  "Ilayang Talim",
  "Isabang",
  "Iyam",
  "Kambal Na Pulo",
  "Lalaguna",
  "Maligaya",
  "Market View",
  "Mayao Castillo",
  "Mayao Crossing",
  "Mayao Kanluran",
  "Mayao Parada",
  "Mayao Silangan",
  "Medina",
  "Pagsawitan",
  "Panayonan",
  "Pantay Kanluran",
  "Pantay Silangan",
  "Poblacion",
  "Ransohan",
  "Salinas",
  "Sanggalang",
  "Talao-talao",
  "Tayabas Bay",
  "Tayuman",
  "Urdaneta"
];

function CheckoutForm() {
  const location = useLocation();
  const navigate = useNavigate();
  const { itemsForDisplay, itemsForBackend, totalPrice } = location.state || {};

  const [formData, setFormData] = useState({
    address: "",
    barangay: "",
    paymentMethod: "",
    deliveryType: "Pickup",
    contactNumber: "",
    gcashReceipt: null,
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      gcashReceipt: e.target.files[0],
    }));
  };

  // 🆕 Updated: now receives barangay from map
  const handleLocationSelect = ({ lat, lng, address, barangay }) => {
    setFormData((prev) => ({
      ...prev,
      address: address,
      // Only auto-set barangay for delivery
      ...(prev.deliveryType === "Delivered" ? { barangay } : {}),
    }));
  };

  const calculateTotalCases = () => {
    return itemsForBackend?.reduce((sum, item) => {
      return sum + (parseFloat(item.quantity) || 0);
    }, 0) || 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.paymentMethod || !formData.contactNumber) {
      alert("Please complete all required fields.");
      return;
    }

    if (formData.deliveryType === "Delivered") {
      if (!formData.address) {
        alert("Please select a location on the map for delivery.");
        return;
      }
      if (!formData.barangay) {
        alert("Barangay could not be detected. Please ensure your location is within a known Lucena barangay.");
        return;
      }

      const totalCases = calculateTotalCases();
      if (totalCases < 10) {
        const confirmed = window.confirm(
          `Your delivery order has only ${totalCases} case(s). The minimum is 10 cases.\n\n` +
          `Would you like to go back and add more items?`
        );
        if (confirmed) {
          navigate(-1);
        }
        return;
      }
    }

    if (formData.paymentMethod === "GCash" && !formData.gcashReceipt) {
      alert("Please upload your GCash receipt.");
      return;
    }

    try {
      const payload = new FormData();
      payload.append("payment_method", formData.paymentMethod);
      payload.append("delivery_type", formData.deliveryType);
      payload.append("contact_number", formData.contactNumber);

      if (formData.deliveryType === "Delivered") {
        payload.append("address", formData.address);
        payload.append("barangay", formData.barangay); // will be auto-filled
      }

      payload.append("items", JSON.stringify(itemsForBackend));

      if (formData.gcashReceipt) {
        payload.append("gcash_receipt", formData.gcashReceipt);
      }

      const response = await fetch("http://127.0.0.1:8000/api/place_order/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access")}`,
        },
        body: payload,
      });

      const data = await response.json();

      if (response.ok) {
        alert("Order placed successfully!");
        navigate("/orders");
      } else {
        const error = data.error || data.detail || "Unknown error";
        alert("Error: " + error);
        console.error("Order error:", data);
      }
    } catch (err) {
      console.error("Network error:", err);
      alert("Network error. Please check your connection.");
    }
  };

  if (!itemsForDisplay || itemsForDisplay.length === 0) {
    return <div className="checkout-container">No items to checkout.</div>;
  }

  return (
    <div className="checkout-container">
      <h2>Checkout</h2>
      <h3>Total Price: Php {totalPrice?.toFixed(2) || "0.00"}</h3>

      <div className="order-summary">
        <h4>Order Summary</h4>
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
            {itemsForDisplay.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.casesOrdered}</td>
                <td>{item.bottles}</td>
                <td>Php {item.pricePerCase.toFixed(2)}</td>
                <td>Php {item.totalPrice.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form onSubmit={handleSubmit}>
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
          <label>Payment Method:</label>
          <select
            name="paymentMethod"
            value={formData.paymentMethod}
            onChange={handleInputChange}
            required
          >
            <option value="">Select payment method</option>
            <option value="Cash">Cash</option>
            <option value="GCash">GCash</option>
            <option value="cash_on_delivery">Cash on Delivery</option>
          </select>
        </div>

        {formData.paymentMethod === "GCash" && (
          <div className="gcash-section">
            <p><strong>GCash Name:</strong> John Dela Cruz</p>
            <p><strong>GCash Number:</strong> 09171234567</p>
            <div className="form-group">
              <label>Upload GCash Receipt:</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                required
              />
            </div>
          </div>
        )}

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

        <div className="form-group">
          <label>Select Location on Map:</label>
          <LocationPicker
            onLocationSelect={handleLocationSelect}
            deliveryType={formData.deliveryType}
          />
        </div>

        {formData.deliveryType === "Delivered" && (
          <>
            <div className="form-group">
              <label>Address (auto-filled from map):</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                readOnly
                required
              />
            </div>

            {/* Auto-detected barangay – read-only */}
            <div className="form-group">
              <label>Detected Barangay:</label>
              <input
                type="text"
                value={formData.barangay || "Not detected — please reselect on map"}
                readOnly
                style={{ backgroundColor: "#f5f5f5" }}
              />
              {/* Hidden input to submit value */}
              {formData.barangay && (
                <input type="hidden" name="barangay" value={formData.barangay} />
              )}
            </div>
          </>
        )}

        {formData.deliveryType === "Pickup" && (
          <div className="form-group">
            <label>Pickup Location:</label>
            <input
              type="text"
              value="St. Jude Street, Holy Spirit Subdivision, Lucena City"
              disabled
            />
            {/* Optional: still allow barangay selection for analytics in pickup */}
            <div className="form-group">
              <label>Barangay (optional for analytics):</label>
              <select
                name="barangay"
                value={formData.barangay}
                onChange={handleInputChange}
              >
                <option value="">Select your barangay</option>
                {BARANGAYS.map((brgy) => (
                  <option key={brgy} value={brgy}>
                    {brgy}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <button type="submit" className="btn-submit">
          Place Order
        </button>
      </form>
    </div>
  );
}

export default CheckoutForm;