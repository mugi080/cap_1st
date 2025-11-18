import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './products.css'; // ✅ shared styles

const Beverages = () => {
  const [beverages, setBeverages] = useState([]);
  const [archivedBeverages, setArchivedBeverages] = useState([]);
  const [filteredBeverages, setFilteredBeverages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    volume: '',
    units_per_case: '',
    price: '',
    stock: '',
    category: '',
    image: null,
  });

  const [editId, setEditId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tableCategoryFilter, setTableCategoryFilter] = useState('');
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
      }
    };

    init();
  }, [token]);

  const handleInput = (e) => {
    const { name, value, files } = e.target;
    if (name === 'image') {
      const file = files[0];
      if (file) {
        const ext = file.name.split('.').pop().toLowerCase();
        const valid = ['jpg','jpeg','png','webp','gif','jfif'];
        if (!valid.includes(ext)) return alert('Invalid file format!');
        setFormData({ ...formData, image: file });
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      volume: '',
      units_per_case: '',
      price: '',
      stock: '',
      category: '',
      image: null,
    });
    setEditId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const data = new FormData();
    Object.entries(formData).forEach(([key, val]) => {
      if (val) data.append(key, val);
    });

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

      const bev = await axios.get('http://localhost:8000/api/beverages/', authHeader);
      setBeverages(bev.data);
      setFilteredBeverages(bev.data);
    } catch (err) {
      console.error(err);
    }
  };

  const archiveBeverage = (id) => {
    const item = beverages.find((b) => b.id === id);
    if (!item) return;

    setArchivedBeverages([...archivedBeverages, item]);
    const updated = beverages.filter((b) => b.id !== id);
    setBeverages(updated);
    setFilteredBeverages(updated);

    alert("Beverage archived.");
  };

  const retrieveBeverage = (id) => {
    const item = archivedBeverages.find((b) => b.id === id);
    if (!item) return;

    setBeverages([...beverages, item]);
    setFilteredBeverages([...beverages, item]);
    setArchivedBeverages(archivedBeverages.filter((b) => b.id !== id));

    alert("Beverage restored.");
  };

  const editBeverage = (b) => {
    setEditId(b.id);
    setFormData({
      name: b.name,
      volume: b.volume,
      units_per_case: b.units_per_case || '',
      price: b.price,
      stock: b.stock,
      category: b.category,
      image: null,
    });
    setShowModal(true);
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    filterBeverages(value, tableCategoryFilter);
  };

  const handleTableCategoryFilter = (e) => {
    const value = e.target.value;
    setTableCategoryFilter(value);
    filterBeverages(searchQuery, value);
  };

  const filterBeverages = (search, category) => {
    let filtered = beverages;

    if (category) filtered = filtered.filter((b) => b.category === parseInt(category));
    if (search) filtered = filtered.filter((b) => b.name.toLowerCase().includes(search.toLowerCase()));

    setFilteredBeverages(filtered);
  };

  if (!isAdmin) return <p>Only admins can manage beverages.</p>;

  return (
    <div className="products-container">

      <h2>Beverages Management</h2>
      <button className="btn-edit" onClick={() => { resetForm(); setShowModal(true); }}>
        Add New Beverage
      </button>

      <div style={{ marginTop: '10px', marginBottom: '10px' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearch}
          placeholder="Search by name"
        />

        <select value={tableCategoryFilter} onChange={handleTableCategoryFilter}>
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <button className="btn-archive" onClick={() => setShowArchived(!showArchived)}>
          {showArchived ? "Show Active" : "Show Archived"}
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="product-modal-overlay">
          <div className="product-modal">
            <h3>{editId ? "Edit Beverage" : "Add Beverage"}</h3>

            <form onSubmit={handleSubmit}>

              <input name="name" value={formData.name} onChange={handleInput} required placeholder="Name" />
              <input name="volume" value={formData.volume} onChange={handleInput} required placeholder="Volume" />
              <input name="units_per_case" value={formData.units_per_case} onChange={handleInput} required placeholder="Units per case" />
              <input name="price" value={formData.price} onChange={handleInput} required placeholder="Price" />
              <input name="stock" value={formData.stock} onChange={handleInput} required placeholder="Stock" />

              <select name="category" value={formData.category} onChange={handleInput} required>
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <input type="file" name="image" accept="image/*" onChange={handleInput} />

              <div className="action-buttons">
                <button type="submit" className="btn-edit">
                  {editId ? "Save Changes" : "Add Beverage"}
                </button>

                <button type="button" className="btn-delete" onClick={() => { resetForm(); setShowModal(false); }}>
                  Cancel
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <table className="products-table">
        <thead>
          <tr>
            <th>Image</th>
            <th>Name</th>
            <th>Volume</th>
            <th>Unit</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Available</th>
            <th>Category</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {(showArchived ? archivedBeverages : filteredBeverages).map((b) => (
            <tr key={b.id}>
              <td>{b.image ? <img src={b.image} alt={b.name} width="50" height="50" style={{ objectFit: 'cover' }} /> : 'No Image'}</td>
              <td>{b.name}</td>
              <td>{b.volume}</td>
              <td>{b.units_per_case || '-'}</td>
              <td>{b.price}</td>
              <td>{b.stock}</td>
              <td>{b.stock > 0 ? "Yes" : "No"}</td>
              <td>{categories.find((c) => c.id === b.category)?.name || 'N/A'}</td>

              <td>
                <div className="action-buttons">
                  <button className="btn-edit" onClick={() => editBeverage(b)}>Edit</button>

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
          ))}
        </tbody>
      </table>

    </div>
  );
};

export default Beverages;
