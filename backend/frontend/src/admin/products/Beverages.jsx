// src/components/Beverages.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './products.css';

const Beverages = () => {
  const [beverages, setBeverages] = useState([]);
  const [archivedBeverages, setArchivedBeverages] = useState([]);
  const [filteredBeverages, setFilteredBeverages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    volume: '',
    units_per_case: '',
    unit_label: 'case',
    price: '',
    stock: '', // ✅ Now represents CASES (not pieces)
    category: '',
    image: null,
    allow_half_case: true,
  });

  const [editId, setEditId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tableCategoryFilter, setTableCategoryFilter] = useState('');
  const [halfCaseFilter, setHalfCaseFilter] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const token = localStorage.getItem('admin_token');
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    const init = async () => {
      if (!token) return alert('Admin login required');
      try {
        const me = await axios.get('http://localhost:8000/auth/users/me/', authHeader);
        if (me.data.is_staff || me.data.is_superuser) {
          setIsAdmin(true);

          const [bev, cat] = await Promise.all([
            axios.get('http://localhost:8000/api/beverages/', authHeader),
            axios.get('http://localhost:8000/api/categories/', authHeader),
          ]);

          setBeverages(bev.data);
          setFilteredBeverages(bev.data);
          setCategories(cat.data);
        } else {
          alert('Not authorized');
        }
      } catch (err) {
        console.error(err);
        alert('Failed to load data. Check console.');
      }
    };

    init();
  }, [token]);

  const handleInput = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (name === 'image') {
      const file = files[0];
      if (file) {
        const ext = file.name.split('.').pop().toLowerCase();
        const valid = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'jfif'];
        if (!valid.includes(ext)) return alert('Invalid image format!');
        setFormData({ ...formData, image: file });
      }
    } else if (name === 'allow_half_case') {
      setFormData({ ...formData, allow_half_case: checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      volume: '',
      units_per_case: '',
      unit_label: 'case',
      price: '',
      stock: '',
      category: '',
      image: null,
      allow_half_case: true,
    });
    setEditId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.category || formData.category === '') {
      return alert('Please select a category');
    }

    const units = parseFloat(formData.units_per_case);
    const stockInCases = parseFloat(formData.stock);

    if (isNaN(units) || units <= 0) return alert('Units per case must be a positive number');
    if (isNaN(stockInCases) || stockInCases < 0) return alert('Stock (in cases) must be a non-negative number');

    const data = new FormData();
    data.append('name', formData.name);
    data.append('volume', formData.volume);
    data.append('units_per_case', units);
    data.append('unit_label', formData.unit_label);
    data.append('price', formData.price);
    data.append('stock_in_cases', stockInCases); // ✅ Send cases, not pieces
    data.append('category', formData.category);
    data.append('allow_half_case', formData.allow_half_case ? 'true' : 'false');
    if (formData.image) {
      data.append('image', formData.image);
    }

    try {
      if (editId) {
        await axios.put(`http://localhost:8000/api/beverages/${editId}/`, data, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        await axios.post('http://localhost:8000/api/beverages/', data, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        });
      }

      resetForm();
      setShowModal(false);

      const res = await axios.get('http://localhost:8000/api/beverages/', authHeader);
      setBeverages(res.data);
      filterBeverages(searchQuery, tableCategoryFilter, halfCaseFilter, availabilityFilter);
    } catch (err) {
      console.error(err);
      alert('Failed to save beverage.');
    }
  };

  const archiveBeverage = (id) => {
    const item = beverages.find((b) => b.id === id);
    if (!item) return;
    setArchivedBeverages([...archivedBeverages, item]);
    const updated = beverages.filter((b) => b.id !== id);
    setBeverages(updated);
    setFilteredBeverages(updated);
    alert('Beverage archived.');
  };

  const retrieveBeverage = (id) => {
    const item = archivedBeverages.find((b) => b.id === id);
    if (!item) return;
    setBeverages([...beverages, item]);
    setFilteredBeverages([...beverages, item]);
    setArchivedBeverages(archivedBeverages.filter((b) => b.id !== id));
    alert('Beverage restored.');
  };

  const editBeverage = (b) => {
    setEditId(b.id);
    setFormData({
      name: b.name,
      volume: b.volume,
      units_per_case: b.units_per_case || 24,
      unit_label: b.unit_label || 'case',
      price: b.price,
      stock: b.stock_in_cases?.toString() || '0', // ✅ Load cases for editing
      category: String(b.category),
      image: null,
      allow_half_case: b.allow_half_case ?? true,
    });
    setShowModal(true);
  };

  const filterBeverages = (search, category, halfCase = 'all', availability = 'all') => {
    let filtered = beverages;

    if (category) {
      filtered = filtered.filter((b) => b.category === parseInt(category));
    }

    if (search) {
      filtered = filtered.filter((b) =>
        b.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (halfCase === 'yes') {
      filtered = filtered.filter(b => b.allow_half_case === true);
    } else if (halfCase === 'no') {
      filtered = filtered.filter(b => b.allow_half_case === false);
    }

    if (availability === 'available') {
      filtered = filtered.filter(b => b.stock > 0);
    } else if (availability === 'out') {
      filtered = filtered.filter(b => b.stock <= 0);
    }

    setFilteredBeverages(filtered);
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    filterBeverages(value, tableCategoryFilter, halfCaseFilter, availabilityFilter);
  };

  const handleTableCategoryFilter = (e) => {
    const value = e.target.value;
    setTableCategoryFilter(value);
    filterBeverages(searchQuery, value, halfCaseFilter, availabilityFilter);
  };

  const handleHalfCaseFilter = (e) => {
    const value = e.target.value;
    setHalfCaseFilter(value);
    filterBeverages(searchQuery, tableCategoryFilter, value, availabilityFilter);
  };

  const handleAvailabilityFilter = (e) => {
    const value = e.target.value;
    setAvailabilityFilter(value);
    filterBeverages(searchQuery, tableCategoryFilter, halfCaseFilter, value);
  };

  if (!isAdmin) return <p>Only admins can manage beverages.</p>;

  // Helper: compute available full cases (from total pieces)
  const getAvailableCases = (stockPieces, units) => {
    if (!units || units <= 0) return 0;
    return Math.floor(stockPieces / units);
  };

  return (
    <div className="products-container">
      <h2>Beverages Management</h2>

      <div className="controls">
        <input
          type="text"
          placeholder="Search by name or ID"
          value={searchQuery}
          onChange={handleSearch}
          className="input-field"
        />

        <select
          value={tableCategoryFilter}
          onChange={handleTableCategoryFilter}
          className="select-field"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <button
          className="btn-add-beverage"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          Add New Beverage
        </button>

        <button
          className="btn-archive"
          onClick={() => setShowArchived(!showArchived)}
        >
          {showArchived ? 'Show Active' : 'Show Archived'}
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="product-modal-overlay">
          <div className="product-modal">
            <h3>{editId ? 'Edit Beverage' : 'Add Beverage'}</h3>
            <form onSubmit={handleSubmit}>
              <input
                name="name"
                value={formData.name}
                onChange={handleInput}
                required
                placeholder="Name"
              />
              <input
                name="volume"
                value={formData.volume}
                onChange={handleInput}
                required
                placeholder="Volume (ml)"
              />
              <input
                name="units_per_case"
                value={formData.units_per_case}
                onChange={handleInput}
                required
                placeholder="Units per case (e.g., 24)"
              />
              
              <label style={{ display: 'block', margin: '10px 0 5px' }}>
                Display Unit Name:
              </label>
              <select
                name="unit_label"
                value={formData.unit_label}
                onChange={handleInput}
                required
                style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
              >
                <option value="case">Case</option>
                <option value="box">Box</option>
                <option value="pack">Pack</option>
                <option value="carton">Carton</option>
              </select>

              <input
                name="price"
                value={formData.price}
                onChange={handleInput}
                required
                placeholder="Price per case"
              />
              <input
                name="stock"
                value={formData.stock}
                onChange={handleInput}
                required
                placeholder="Stock (in cases, e.g., 10)"
              />
              <small style={{ display: 'block', marginBottom: '10px', color: '#666' }}>
                Enter number of full cases (e.g., 10 cases = 240 bottles if 24 per case).
              </small>
              <select
                name="category"
                value={formData.category}
                onChange={handleInput}
                required
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>

              <div className="form-checkbox">
                <label>
                  <input
                    type="checkbox"
                    name="allow_half_case"
                    checked={formData.allow_half_case}
                    onChange={handleInput}
                  />
                  Allow half-case orders
                </label>
              </div>

              <input type="file" name="image" accept="image/*" onChange={handleInput} />
              <div className="action-buttons">
                <button type="submit" className="btn-edit">
                  {editId ? 'Save Changes' : 'Add Beverage'}
                </button>
                <button
                  type="button"
                  className="btn-delete"
                  onClick={() => {
                    resetForm();
                    setShowModal(false);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <table className="products-table">
        <thead>
          <tr>
            <th>Image</th>
            <th>Name</th>
            <th>Volume</th>
            <th>Package</th>
            <th>Price</th>
            <th>Available Stock</th>
            <th>Category</th>
            <th>Half Allowed?</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {(showArchived ? archivedBeverages : filteredBeverages).map((b) => {
            const availableCases = getAvailableCases(b.stock, b.units_per_case);
            return (
              <tr key={b.id}>
                <td>
                  {b.image ? (
                    <img
                      src={b.image}
                      alt={b.name}
                      width="50"
                      height="50"
                      style={{ objectFit: 'cover' }}
                    />
                  ) : (
                    'No Image'
                  )}
                </td>
                <td>{b.name}</td>
                <td>{b.volume}ml</td>
                <td>
                  {b.units_per_case} per {b.unit_label}
                </td>
                <td>₱{b.price}</td>
                <td>
                  {availableCases} case{availableCases !== 1 ? 's' : ''}
                </td>
                <td>{categories.find((c) => c.id === b.category)?.name || 'N/A'}</td>
                <td>{b.allow_half_case ? '✅' : '❌'}</td>
                <td>
                  <div className="action-buttons">
                    <button className="btn-edit" onClick={() => editBeverage(b)}>
                      Edit
                    </button>
                    {showArchived ? (
                      <button className="btn-retrieve" onClick={() => retrieveBeverage(b.id)}>
                        Retrieve
                      </button>
                    ) : (
                      <button className="btn-archive" onClick={() => archiveBeverage(b.id)}>
                        Archive
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default Beverages;