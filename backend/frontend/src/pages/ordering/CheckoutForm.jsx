import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import LocationPicker from "./LocationPicker";
import "./CheckoutForm.css";

function CheckoutForm() {
  const location = useLocation();
  const navigate = useNavigate();
  // ✅ Get both display and backend data
  const { itemsForDisplay, itemsForBackend, totalPrice } = location.state || {};

  const storeLocation = { lat: 14.5995, lng: 120.9842 };

  const [formData, setFormData] = useState({
    address: "",
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

  const handleLocationSelect = ({ lat, lng }) => {
    const coordinates = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    setFormData((prev) => ({
      ...prev,
      address: coordinates,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.paymentMethod || !formData.deliveryType || !formData.contactNumber) {
      alert("Please complete all required fields.");
      return;
    }

    // ✅ NEW: Validate address for delivery orders
    if (formData.deliveryType === "Delivered" && !formData.address) {
      alert("Please select a location on the map for delivery orders.");
      return;
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

      // ✅ Only send address if delivery
      if (formData.deliveryType === "Delivered") {
        payload.append("address", formData.address);
      }

      if (formData.paymentMethod === "GCash" && formData.gcashReceipt) {
        payload.append("gcash_receipt", formData.gcashReceipt);
      }

      // ✅ Send clean backend data
      payload.append("items", JSON.stringify(itemsForBackend));

      const response = await fetch("http://127.0.0.1:8000/api/place_order/", {
        method: "POST",
        body: payload,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        alert("Order placed successfully!");
        navigate("/orders");
      } else {
        alert("Error placing order: " + (data.error || JSON.stringify(data)));
      }
    } catch (err) {
      console.error(err);
      alert("Unexpected error occurred while placing order.");
    }
  };

  if (!itemsForDisplay || itemsForDisplay.length === 0) {
    return <div>No items to checkout.</div>;
  }

  return (
    <div className="checkout-container">
      <h2>Checkout</h2>
      <h3>Total Price: Php {totalPrice?.toFixed(2) || '0.00'}</h3>

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
            pattern="[0-9]{11}"
            title="Please enter 11-digit phone number"
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
            <label htmlFor="delivered">Delivered</label>
          </div>
        </div>

        <div className="form-group">
          <label>Select Location on Map:</label>
          <LocationPicker
            onLocationSelect={handleLocationSelect}
            pinLocation={storeLocation}
            disabled={formData.deliveryType === "Pickup"}
          />
        </div>

        {formData.deliveryType === "Delivered" && (
          <div className="form-group">
            <label>Address (auto-filled from map):</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              required
            />
          </div>
        )}

        {formData.deliveryType === "Pickup" && (
          <div className="form-group">
            <label>Pickup Location:</label>
            <input
              type="text"
              value="St. Jude Street, Holy Spirit Subdivision, Lucena, Quezon"
              disabled
            />
          </div>
        )}

        <div className="form-actions">
          <button type="submit" className="btn-submit">
            Place Order
          </button>
        </div>
      </form>
    </div>
  );
}

export default CheckoutForm;