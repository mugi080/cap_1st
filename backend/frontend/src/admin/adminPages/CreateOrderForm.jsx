import React, { useState, useEffect } from "react";
import axios from "axios";
import LocationPicker from "../../pages/ordering/LocationPicker"; // Adjust path if needed
import { useNavigate } from "react-router-dom";


function CreateOrderForm() {
  const [beverages, setBeverages] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [orderStatus, setOrderStatus] = useState("Pending");
  const [adminComments, setAdminComments] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [address, setAddress] = useState(""); // Stores coordinates or text
  const [textAddress, setTextAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [deliveryType, setDeliveryType] = useState("Pickup"); // 'Pickup' or 'Delivered'
  const [loading, setLoading] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [popupType, setPopupType] = useState(""); // 'success' or 'error'
  const [contact_number, setContactNumber] = useState(""); // NEW STATE

  const adminData = JSON.parse(localStorage.getItem("admin_data"));
  const adminToken = localStorage.getItem("admin_token");

  // Fetch beverages on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await axios.get("http://127.0.0.1:8000/api/beverages/");
        setBeverages(response.data);
      } catch (error) {
        console.error("Error fetching beverages:", error);
        setPopupMessage("Failed to fetch beverages.");
        setPopupType("error");
        setTimeout(() => setPopupMessage(""), 5000);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Update case count for beverage
  const updateCaseCount = (bev, newCaseCount) => {
    if (newCaseCount < 0) return;
    setSelectedItems((prevItems) => {
      const itemIndex = prevItems.findIndex((item) => item.id === bev.id);
      if (newCaseCount === 0) {
        return prevItems.filter((item) => item.id !== bev.id);
      }
      const totalUnits = Math.round(newCaseCount * bev.units_per_case);
      if (itemIndex >= 0) {
        const updatedItems = [...prevItems];
        updatedItems[itemIndex] = {
          ...updatedItems[itemIndex],
          caseQuantity: newCaseCount,
          quantity: totalUnits,
        };
        return updatedItems;
      } else {
        return [
          ...prevItems,
          {
            ...bev,
            caseQuantity: newCaseCount,
            quantity: totalUnits,
          },
        ];
      }
    });
  };

  // Handle Half Toggle (Add/Subtract .5)
  const handleHalfToggle = (bev) => {
    const selectedItem = selectedItems.find((item) => item.id === bev.id);
    const currentQty = selectedItem?.caseQuantity || 0;
    const hasHalf = currentQty % 1 === 0.5;
    if (hasHalf) {
      updateCaseCount(bev, Math.floor(currentQty)); // Remove .5
    } else {
      updateCaseCount(bev, currentQty + 0.5); // Add .5
    }
  };

  // Handle location selection from map
  const handleLocationSelect = ({ lat, lng }) => {
    const coordinates = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    setAddress(coordinates);
  };

  // Submit order
  const handleSubmitOrder = async () => {
    if (!adminToken) {
      setPopupMessage("Unauthorized: Please login as admin.");
      setPopupType("error");
      setTimeout(() => setPopupMessage(""), 5000);
      return;
    }
    if (
      !customerName ||
      !paymentMethod ||
      !deliveryType ||
      selectedItems.length === 0 ||
      !contact_number // NEW REQUIRED FIELD
    ) {
      setPopupMessage("Please fill in required fields and add at least one item.");
      setPopupType("error");
      setTimeout(() => setPopupMessage(""), 5000);
      return;
    }
    if (deliveryType === "Delivered" && !address.trim()) {
      setPopupMessage("Please select a delivery location.");
      setPopupType("error");
      setTimeout(() => setPopupMessage(""), 5000);
      return;
    }

    let hasInsufficientStock = false;
    for (let item of selectedItems) {
      try {
        const res = await axios.get(`http://127.0.0.1:8000/api/beverages/${item.id}/`);
        const beverage = res.data;
        if (beverage.stock < item.quantity) {
          setPopupMessage(
            `❌ Not enough stock for "${beverage.name}". Available: ${beverage.stock}, Requested: ${item.quantity}`
          );
          setPopupType("error");
          hasInsufficientStock = true;
          break;
        }
      } catch (err) {
        setPopupMessage(`⚠️ Error checking stock for item ID: ${item.id}`);
        setPopupType("error");
        hasInsufficientStock = true;
        break;
      }
    }
    if (hasInsufficientStock) {
      setTimeout(() => setPopupMessage(""), 7000);
      return;
    }

    const orderData = {
      order_status: orderStatus,
      admin_comments: adminComments,
      address: address || "",
      text_address: textAddress || "",
      payment_method: paymentMethod,
      delivery_type: deliveryType,
      customer_name: customerName,
      contact_number: contact_number, // INCLUDED HERE
      items: selectedItems.map((item) => ({
        beverage: item.id,
        quantity: item.quantity,
      })),
      user: adminData.id,
    };

    setLoading(true);
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
      setPopupMessage("✅ Order submitted successfully!");
      setPopupType("success");
      setTimeout(() => setPopupMessage(""), 3000);
      setSelectedItems([]);
      setCustomerName("");
      setAddress("");
      setTextAddress("");
      setPaymentMethod("");
      setDeliveryType("Pickup");
      setOrderStatus("Pending");
      setAdminComments("");
      setContactNumber(""); // Reset contact number
    } catch (error) {
      const errorMessage =
        error.response?.data?.non_field_errors?.join("; ") ||
        error.response?.data ||
        "An unknown error occurred.";
      setPopupMessage(`❌ Failed to create order: ${errorMessage}`);
      setPopupType("error");
      setTimeout(() => setPopupMessage(""), 7000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Toast-style Popup Notification */}
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
      <h1>Create Order</h1>

      {/* Beverage Selection Cards */}
      <h3>Select Items</h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "10px",
        }}
      >
        {beverages.map((bev) => {
          const selectedItem = selectedItems.find((item) => item.id === bev.id);
          const caseQty = selectedItem?.caseQuantity || 0;
          const hasHalf = caseQty % 1 === 0.5;
          return (
            <div
              key={bev.id}
              style={{ border: "1px solid #ccc", padding: "10px" }}
            >
              <img
                src={
                  bev.image.startsWith("http")
                    ? bev.image
                    : `http://127.0.0.1:8000${bev.image}`
                }
                alt={bev.name}
                style={{
                  width: "100px",
                  height: "100px",
                  objectFit: "cover",
                }}
              />
              <h3>{bev.name}</h3>
              <p>Php{bev.price} - {bev.volume}ml</p>
              <p>Bottles per Case {bev.units_per_case}</p>
              {/* Quantity Controls */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  marginTop: "10px",
                }}
              >
                {/* Half Toggle Button */}
                <button
                  type="button"
                  onClick={() => handleHalfToggle(bev)}
                  style={{
                    fontSize: "16px",
                    padding: "4px 8px",
                    fontWeight: "bold",
                    backgroundColor: hasHalf ? "#4CAF50" : "#e0e0e0",
                    color: hasHalf ? "white" : "black",
                    border: "none",
                    borderRadius: "3px",
                  }}
                >
                  ½
                </button>
                {/* Minus Button (-1) */}
                <button
                  type="button"
                  onClick={() =>
                    updateCaseCount(bev, Math.max(0, caseQty - 1))
                  }
                  style={{ fontSize: "16px", padding: "4px 10px" }}
                >
                  -
                </button>
                {/* Number Input */}
                <input
                  type="number"
                  value={caseQty}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    updateCaseCount(bev, isNaN(val) ? 0 : val);
                  }}
                  style={{
                    width: "60px",
                    textAlign: "center",
                    padding: "4px",
                    fontSize: "14px",
                  }}
                  step="0.5"
                  min="0"
                />
                {/* Plus Button (+1) */}
                <button
                  type="button"
                  onClick={() => updateCaseCount(bev, caseQty + 1)}
                  style={{ fontSize: "16px", padding: "4px 10px" }}
                >
                  +
                </button>
              </div>
              <p style={{ textAlign: "center", marginTop: "5px" }}>
                Total Items: {Math.round(caseQty * bev.units_per_case)}
              </p>
            </div>
          );
        })}
      </div>

      {/* Order Status */}
      <h3>Order Status</h3>
      <select
        value={orderStatus}
        onChange={(e) => setOrderStatus(e.target.value)}
        style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
      >
        <option value="Pending">Pending</option>
        <option value="In Progress">In Progress</option>
        <option value="Completed">Completed</option>
      </select>

      {/* Customer Info */}
      <h3>Customer Information</h3>
      <input
        type="text"
        value={customerName}
        onChange={(e) => setCustomerName(e.target.value)}
        placeholder="Customer Name"
        style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
      />

      {/* NEW CONTACT NUMBER INPUT */}
      <input
        type="tel"
        value={contact_number}
        onChange={(e) => setContactNumber(e.target.value)}
        placeholder="Contact Number"
        style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
      />

      {/* Delivery Type Radio Buttons */}
      <h3>Delivery Type</h3>
      <div style={{ marginBottom: "10px" }}>
        <label style={{ marginRight: "15px" }}>
          <input
            type="radio"
            name="deliveryType"
            value="Pickup"
            checked={deliveryType === "Pickup"}
            onChange={() => setDeliveryType("Pickup")}
          />
          &nbsp;Pickup
        </label>
        <label>
          <input
            type="radio"
            name="deliveryType"
            value="Delivered"
            checked={deliveryType === "Delivered"}
            onChange={() => setDeliveryType("Delivered")}
          />
          &nbsp;Delivered
        </label>
      </div>

      {/* Conditional Address Fields */}
      {deliveryType === "Pickup" && (
        <div className="form-group">
          <label>Pickup Address:</label>
          <input
            type="text"
            value="St. Jude Street, Holy Spirit Subdivision, Lucena City"
            disabled
            style={{
              width: "100%",
              padding: "8px",
              marginBottom: "10px",
              backgroundColor: "#eee",
            }}
          />
        </div>
      )}

      {deliveryType === "Delivered" && (
        <>
          {/* Text Address Field */}
          <div className="form-group">
            <label>Text Address:</label>
            <input
              type="text"
              value={textAddress}
              onChange={(e) => setTextAddress(e.target.value)}
              placeholder="Enter delivery address"
              style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
            />
          </div>

          {/* Map-based Location Picker */}
          <div className="form-group">
            <label>Select Delivery Location on Map:</label>
            <LocationPicker onLocationSelect={handleLocationSelect} />
          </div>

          {/* Hidden Coordinates Field */}
          <input
            type="hidden"
            name="address"
            value={address}
            readOnly
          />
        </>
      )}

      {/* Payment Method */}
      <h3>Payment Information</h3>
      <select
        value={paymentMethod}
        onChange={(e) => setPaymentMethod(e.target.value)}
        style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
      >
        <option value="">Select Payment Method</option>
        <option value="Cash">Cash</option>
        <option value="Cash on delivery">cash on delivery</option>

      </select>

      {/* Submit Button */}
      <button
        onClick={handleSubmitOrder}
        style={{
          padding: "10px",
          background: "#4CAF50",
          color: "white",
          width: "100%",
        }}
        disabled={loading}
      >
        {loading ? "Submitting..." : "Save Order"}
      </button>
    </div>
  );
}

export default CreateOrderForm;