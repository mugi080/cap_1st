// src/pages/Products.jsx
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
  const [searchQuery, setSearchQuery] = useState("");
  const [displayCount, setDisplayCount] = useState(8);
  const [itemsPerPage, setItemsPerPage] = useState(8);

  // Adjust items per page based on screen size
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

  // Fetch data
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

  // Filter beverages: by category AND search query
  const filteredBeverages = beverages.filter((bev) => {
    const matchesCategory = selectedCategory
      ? bev.category === parseInt(selectedCategory)
      : true;
    const matchesSearch = bev.name
      .toLowerCase()
      .includes(searchQuery.trim().toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Paginated display
  const displayedBeverages = filteredBeverages.slice(0, displayCount);
  const hasMore = displayCount < filteredBeverages.length;

  const handleSeeMore = () => {
    setDisplayCount((prev) => prev + itemsPerPage);
  };

  const handleClearFilters = () => {
    setSelectedCategory("");
    setSearchQuery("");
    setDisplayCount(itemsPerPage);
  };

  if (loading) {
    return (
      <div className="products-section">
        <div className="section-container">
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <p style={{ fontSize: "18px", color: "#666" }}>
              Loading products...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="products-section">
      {/* ✅ Same container class as About */}
      <div className="section-container">
        {/* ✅ Reuse global header classes */}
        <div className="products-header">
          <h1 className="section-title">Our Products</h1>
          <p className="section-subtitle">
            The availbale beverages in our store
          </p>
        </div>

        {error && <div className="error">{error}</div>}

        {/* Filter Section */}
        <div className="filter-section">
          <div className="search-bar">
            <input
              type="text"
              placeholder="🔍 Search beverages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="category-buttons">
            <button
              className={`category-btn ${selectedCategory === "" ? "active" : ""}`}
              onClick={() => {
                setSelectedCategory("");
                setDisplayCount(itemsPerPage);
              }}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                className={`category-btn ${selectedCategory === String(cat.id) ? "active" : ""}`}
                onClick={() => {
                  setSelectedCategory(String(cat.id));
                  setDisplayCount(itemsPerPage);
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {(selectedCategory || searchQuery.trim()) && (
            <button onClick={handleClearFilters} className="clear-filters-btn">
              Clear Filters
            </button>
          )}
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
                    {bev.image ? (
                      <img
                        src={`http://127.0.0.1:8000${bev.image}`}
                        alt={bev.name}
                        onError={(e) => {
                          e.target.src =
                            "https://via.placeholder.com/200?text=Product";
                        }}
                      />
                    ) : (
                      <img
                        src="https://via.placeholder.com/200?text=Product"
                        alt={bev.name}
                      />
                    )}
                  </div>
                  <div className="product-content">
                    <p className="product-name">{bev.name}</p>
                    <p className="product-info">{bev.volume}ml</p>
                    <p className="price">₱{bev.price}</p>
                  </div>
                </Link>
              ))}
            </div>

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
    </div>
  );
}

export default Products;