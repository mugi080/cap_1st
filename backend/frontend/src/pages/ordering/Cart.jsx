// src/components/cart/Cart.jsx

// wla ata to
import React, { useEffect } from "react";
import { Link } from "react-router-dom";

const Cart = ({ selectedItems, setSelectedItems }) => {
  const totalPrice = selectedItems.reduce((total, item) => total + item.price * item.quantity, 0);

  // Sync with localStorage to persist cart items across pages
  useEffect(() => {
    localStorage.setItem("cartItems", JSON.stringify(selectedItems));
  }, [selectedItems]);

  const handleRemoveItem = (item) => {
    setSelectedItems((prev) => prev.filter((i) => i.id !== item.id));
  };

  return (
    <div className="cart-container">
      <h2>Your Cart</h2>
      {selectedItems.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <ul>
          {selectedItems.map((item) => (
            <li key={item.id}>
              {item.name} - {item.quantity}x - Php {item.price}
              <button onClick={() => handleRemoveItem(item)}>Remove</button>
            </li>
          ))}
        </ul>
      )}

      <h3>Total: Php {totalPrice.toFixed(2)}</h3>
      <div className="cart-actions">
        <Link to="/checkout">
          <button>Proceed to Checkout</button>
        </Link>
        <button onClick={() => setSelectedItems([])}>Clear Cart</button>
      </div>
    </div>
  );
};

export default Cart;
