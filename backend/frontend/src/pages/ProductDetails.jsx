// ProductDetail.jsx
import React, { useEffect, useState } from "react";
import { getBeverageById } from "../api/Products";
import { useParams, useNavigate } from "react-router-dom";
import "./ProductDetails.css";

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false); // Modal visibility

  useEffect(() => {
    const fetchProductDetails = async () => {
      try {
        const productData = await getBeverageById(id);
        setProduct(productData);
      } catch (err) {
        setError("Failed to fetch product details");
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetails();
  }, [id]);

  const handleBuyNow = () => {
    const isLoggedIn = !!localStorage.getItem("access_token");

    if (isLoggedIn) {
      // ✅ Logged in → go to shop_now with product
      navigate("/shop_now", { state: { productToBuy: product } });
    } else {
      // ❌ Not logged in → show modal
      setShowLoginModal(true);
    }
  };

  const handleConfirmLogin = () => {
    const returnPath = `/shop_now`;
    const productState = btoa(JSON.stringify(product)); // Base64 encode
    navigate(`/login?next=${encodeURIComponent(returnPath)}&product=${encodeURIComponent(productState)}`);
    setShowLoginModal(false);
  };

  const handleCancelLogin = () => {
    setShowLoginModal(false);
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!product) return <div className="error">Product not found</div>;

  return (
    <div className="product-detail-container">
      {/* Modal */}
      {showLoginModal && (
        <div className="modal-overlay" onClick={handleCancelLogin}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Continue to Login?</h3>
            <p>You need to log in to place an order.</p>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={handleCancelLogin}>
                Cancel
              </button>
              <button className="modal-btn confirm" onClick={handleConfirmLogin}>
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="product-detail-header">
        <h1>{product.name}</h1>
      </div>

      <div className="product-detail-body">
        <div className="product-image">
          <img
            src={`http://127.0.0.1:8000${product.image}`}
            alt={product.name}
            className="product-image-img"
          />
        </div>

        <div className="product-info">
          <p className="category">
            <strong>Category:</strong> {product.category.name}
          </p>
          <p className="volume">
            <strong>Volume:</strong> {product.volume} ml
          </p>
          <p className="price">
            <strong>Price:</strong> Php {product.price}
          </p>
          <p className="stock">
            <strong>Stock:</strong> {product.stock}
          </p>
          <p className="availability">
            <strong>Availability:</strong>{" "}
            {product.is_available ? "In Stock ✅" : "Out of Stock ❌"}
          </p>

          <div className="cta-buttons">
            <button className="buy-now-btn" onClick={handleBuyNow}>
              Buy Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductDetail;