// src/pages/ProductDetail.jsx
import React, { useEffect, useState } from "react";
import { getBeverageById, getBeverages } from "../api/Products";
import { useParams, useNavigate } from "react-router-dom";
import "./ProductDetails.css";

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    const fetchProductAndRelated = async () => {
      try {
        const productData = await getBeverageById(id);
        setProduct(productData);

        const allProducts = await getBeverages();
        const related = allProducts
          .filter(p => p.category?.id === productData.category?.id && p.id !== productData.id)
          .slice(0, 4);
        setRelatedProducts(related);
      } catch (err) {
        setError("Failed to load product details");
      } finally {
        setLoading(false);
      }
    };

    fetchProductAndRelated();
  }, [id]);

  const handleBuyNow = () => {
    const isLoggedIn = !!localStorage.getItem("access_token");
    if (isLoggedIn) {
      navigate("/shop_now", { state: { productToBuy: product } });
    } else {
      setShowLoginModal(true);
    }
  };

  const handleConfirmLogin = () => {
    const returnPath = `/shop_now`;
    const productState = btoa(JSON.stringify(product));
    navigate(`/login?next=${encodeURIComponent(returnPath)}&product=${encodeURIComponent(productState)}`);
    setShowLoginModal(false);
  };

  const handleCancelLogin = () => {
    setShowLoginModal(false);
  };

  const handleGoBack = () => {
    navigate('/#products');
  };

  if (loading) return <div className="product-detail-loading">Loading...</div>;
  if (error) return <div className="product-detail-error">⚠️ {error}</div>;
  if (!product) return <div className="product-detail-error">Product not found</div>;

  return (
    <div className="product-detail-page">
      {/* Back Arrow */}
      <button className="product-detail-back-arrow" onClick={handleGoBack}>
        ←
      </button>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="product-detail-modal-overlay" onClick={handleCancelLogin}>
          <div className="product-detail-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Login Required</h3>
            <p>You must be logged in to place an order.</p>
            <div className="product-detail-modal-actions">
              <button className="product-detail-modal-btn cancel" onClick={handleCancelLogin}>
                Cancel
              </button>
              <button className="product-detail-modal-btn confirm" onClick={handleConfirmLogin}>
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Product Card */}
      <div className="product-detail-card">
        <div className="product-detail-image-section">
          <img
            src={`http://127.0.0.1:8000${product.image}`}
            alt={product.name}
            className="product-detail-image"
            onError={(e) => e.target.src = "/assets/no-image.png"}
          />
        </div>

        <div className="product-detail-info">
          <h1 className="product-detail-name">{product.name}</h1>
          <div className="product-detail-meta">
            <span className="product-detail-category">{product.category?.name || "Beverage"}</span>
            <span className="product-detail-volume">{product.volume}ml • {product.units_per_case} bottles/case</span>
          </div>

          <div className="product-detail-price">₱{Number(product.price).toLocaleString()}</div>

          <div className="product-detail-stock">
            {product.is_available ? (
              <span className="product-detail-in-stock">✓ In Stock ({product.stock} cases)</span>
            ) : (
              <span className="product-detail-out-of-stock">✗ Out of Stock</span>
            )}
          </div>

          <button
            className={`product-detail-buy-btn ${!product.is_available ? 'disabled' : ''}`}
            onClick={handleBuyNow}
            disabled={!product.is_available}
          >
            {product.is_available ? "Buy Now" : "Out of Stock"}
          </button>
        </div>
      </div>

      {/* ✅ FULLY FUNCTIONAL RELATED PRODUCTS */}
      {relatedProducts.length > 0 && (
        <div className="product-detail-related-section">
          <h2>You May Also Like</h2>
          <div className="product-detail-related-grid">
            {relatedProducts.map((prod) => (
              <div
                key={prod.id}
                className="product-detail-related-item"
                onClick={() => navigate(`/product-detail/${prod.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    navigate(`/product/${prod.id}`);
                  }
                }}
              >
                <img
                  src={`http://127.0.0.1:8000${prod.image}`}
                  alt={prod.name}
                  className="product-detail-related-image"
                  onError={(e) => e.target.src = "/assets/no-image.png"}
                />
                <div className="product-detail-related-info">
                  <h3 className="product-detail-related-name">{prod.name}</h3>
                  <div className="product-detail-related-price">₱{Number(prod.price).toLocaleString()}</div>
                  <div className="product-detail-related-meta">
                    {prod.volume}ml • {prod.units_per_case}/case
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductDetail;