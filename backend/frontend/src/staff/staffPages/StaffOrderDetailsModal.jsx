import React from "react";

const StaffOrderDetailsModal = ({ order, onClose }) => {
  return (
    <div className="order-details-modal">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <span className="close-btn" onClick={onClose}>&times;</span>
        <h3>Order Details</h3>
        <p><strong>Customer:</strong> {order.customer_name}</p>
        <p><strong>Contact:</strong> {order.contact_number || "N/A"}</p>
        <p><strong>Status:</strong> {order.status}</p>
        <p><strong>Payment Method:</strong> {order.payment_method}</p>
        <p><strong>Delivery Type:</strong> {order.delivery_type}</p>
        <p><strong>Delivery Address:</strong> {order.Address}</p>
        <p><strong>Total:</strong> Php {order.total_price?.toFixed(2)}</p>
        <h4>Items</h4>
        <ul>
          {order.items.map((item, idx) => (
            <li key={idx}>
              {item.beverage.name} x{item.quantity} - Php {(item.price * item.quantity).toFixed(2)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default StaffOrderDetailsModal;