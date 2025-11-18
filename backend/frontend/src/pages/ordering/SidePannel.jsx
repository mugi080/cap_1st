// src/components/SidePanel.jsx
import React from "react";
import { useNavigate } from "react-router-dom"; // Add this

function SidePanel({ selectedItems, setSelectedItems }) {
  const navigate = useNavigate(); // Add this

  const totalPrice = selectedItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const isLoggedIn = !!localStorage.getItem("access_token");

  const handleCheckout = () => {
    if (selectedItems.length === 0) {
      alert("Please select items to order.");
      return;
    }

    if (!isLoggedIn) {
      alert("You must login first.");
      return;
    }

    // If both OK, navigate to checkout
    navigate("/checkout", { state: { selectedItems, totalPrice } });
  };

  const handleRemoveItem = (item) => {
    setSelectedItems((prev) => prev.filter((i) => i.id !== item.id));
  };

  return (
    <div style={{ flex: 1, borderLeft: "2px solid #000", padding: "10px" }}>
      <h2>Order Summary</h2>
      <ul>
        {selectedItems.map((item) => (
          <li key={item.id} onClick={() => handleRemoveItem(item)}>
            {item.name} - {item.quantity}x - Php {item.price * item.quantity}
          </li>
        ))}
      </ul>
      <h3>Total: Php {totalPrice.toFixed(2)}</h3>
      <button onClick={handleCheckout}>Buy Now</button>
    </div>
  );
}

export default SidePanel;
