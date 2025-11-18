import React, { useEffect, useState } from "react";
import { getBeverages, getCategories } from "../api/Products";
import { Link } from "react-router-dom";
import "./css/Products.css";

function Products() {
  const [beverages, setBeverages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [displayCount, setDisplayCount] = useState(8);
  const [itemsPerPage, setItemsPerPage] = useState(8);

  // Set items per page based on screen size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1200) {
        setItemsPerPage(16);
        setDisplayCount(16);
      } else if (window.innerWidth >= 768) {
        setItemsPerPage(8);
        setDisplayCount(8);
      } else {
        setItemsPerPage(4);
        setDisplayCount(4);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fetch data from backend
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const [beveragesData, categoriesData] = await Promise.all([
          getBeverages(),
          getCategories(),
        ]);

        if (isMounted) {
          setBeverages(beveragesData);
          setCategories(categoriesData);
          setError(null);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        if (isMounted) {
          setError("Failed to load products. Please try again later.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter beverages based on selected category
  const filteredBeverages = selectedCategory
    ? beverages.filter((bev) => bev.category === parseInt(selectedCategory))
    : beverages;

  // Display only the initial count of beverages
  const displayedBeverages = filteredBeverages.slice(0, displayCount);
  const hasMore = displayCount < filteredBeverages.length;

  // Handle "See More" button
  const handleSeeMore = () => {
    setDisplayCount((prev) => prev + itemsPerPage);
  };

  // Handle category change
  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
    setDisplayCount(itemsPerPage); // Reset to initial count
  };

  if (loading) {
    return (
      <div className="products-container">
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <p style={{ fontSize: "18px", color: "#666" }}>
            Loading products...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="products-container">
      <div className="products-header">
        <div className="products-badge">Premium Collection</div>
        <h1 className="products-title">Our Products</h1>
        <p className="products-subtitle">
          Discover our finest selection of quality beverages
        </p>
      </div>

      {error && <div className="error">{error}</div>}

      {/* Filter Container */}
      <div className="filter-container">
        <label htmlFor="category-select">Filter by Category:</label>
        <select
          id="category-select"
          onChange={handleCategoryChange}
          value={selectedCategory}
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Products Grid */}
      {displayedBeverages.length > 0 ? (
        <>
          <div className="products-grid">
            {displayedBeverages.map((bev) => (
              <Link
                to={`/product-detail/${bev.id}`}
                key={bev.id}
                className="product-card"
              >
                <div className="image-wrapper">
                  {bev.image && (
                    <img
                      src={`http://127.0.0.1:8000${bev.image}`}
                      alt={bev.name}
                      onError={(e) => {
                        e.target.src =
                          "https://via.placeholder.com/200?text=Product";
                      }}
                    />
                  )}
                </div>
                <div className="product-content">
                  <h2>{bev.name}</h2>
                  <p className="product-info">{bev.volume}ml</p>
                  <p className="price">₱{bev.price}</p>
                </div>
              </Link>
            ))}
          </div>

          {/* See More Button */}
          {hasMore && (
            <div className="see-more-container">
              <button onClick={handleSeeMore} className="see-more-btn">
                See More Products
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="no-products">No beverages found.</div>
      )}
    </div>
  );
}

export default Products;