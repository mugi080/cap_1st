import React from "react";

const SidePanel = ({ selectedItems }) => {
  const totalPrice = selectedItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );



  return (
    <div
      style={{
        borderLeft: "2px solid #ccc",
        paddingLeft: "15px",
        height: "100%",
      }}
    >
      <h3>Order Summary</h3>
      {selectedItems.length === 0 && (
        <p>No items selected yet.</p>
      )}

      <ul style={{ listStyle: "none", paddingLeft: 0 }}>
        {selectedItems.map((item) => (
          <li key={item.id} style={{ marginBottom: "10px" }}>
            <strong>{item.name}</strong> - {item.quantity} x Php{item.price} ={" "}
            <span style={{ fontWeight: "bold", color: "#2c3e50" }}>
              Php{(item.price * item.quantity).toFixed(2)}
            </span>
          </li>
        ))}
      </ul>

      <hr />

      <h4>Total: Php{totalPrice.toFixed(2)}</h4>

    </div>
  );
};

export default SidePanel;