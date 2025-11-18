import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './products.css'; // ✅ shared styles

const Category = () => {
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [editCategory, setEditCategory] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const token = localStorage.getItem('admin_token');

  useEffect(() => {
    const fetchData = async () => {
      if (!token) return alert("Admin token missing");

      try {
        const user = await axios.get("http://localhost:8000/auth/users/me/", {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!user.data.is_staff && !user.data.is_superuser) {
          return alert("Not authorized");
        }

        setIsAdmin(true);

        const cats = await axios.get("http://localhost:8000/api/categories/", {
          headers: { Authorization: `Bearer ${token}` }
        });

        setCategories(cats.data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchData();
  }, [token]);

  const addCategory = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post("http://localhost:8000/api/categories/", 
        { name: newCategory },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setCategories([...categories, res.data]);
      setNewCategory('');
    } catch (err) {
      console.error("Add category failed:", err);
    }
  };

  const deleteCategory = async (id) => {
    if (!window.confirm("Delete this category?")) return;

    try {
      await axios.delete(`http://localhost:8000/api/categories/${id}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setCategories(categories.filter((c) => c.id !== id));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const editCategoryHandler = (category) => {
    setEditCategory(category);
    setNewCategory(category.name);
  };

  const updateCategory = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.put(`http://localhost:8000/api/categories/${editCategory.id}/`,
        { name: newCategory },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setCategories(categories.map(cat => 
        cat.id === editCategory.id ? res.data : cat
      ));

      setEditCategory(null);
      setNewCategory('');
    } catch (err) {
      console.error("Update category failed:", err);
    }
  };

  if (!isAdmin) return <p>Only admins can manage categories.</p>;

  return (
    <div className="products-container">

      <h2>{editCategory ? "Edit Category" : "Add Category"}</h2>

      <form onSubmit={editCategory ? updateCategory : addCategory}>
        <input
          type="text"
          placeholder="Category name"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          required
        />

        <button 
          className={editCategory ? "btn-edit" : "btn-edit"} 
          type="submit"
        >
          {editCategory ? "Update" : "Add"}
        </button>
      </form>

      <h3>Category List</h3>

      <table className="products-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {categories.map((cat) => (
            <tr key={cat.id}>
              <td>{cat.name}</td>

              <td>
                <div className="action-buttons">
                  <button className="btn-edit" onClick={() => editCategoryHandler(cat)}>
                    Edit
                  </button>

                  <button className="btn-delete" onClick={() => deleteCategory(cat.id)}>
                    Delete
                  </button>
                </div>
              </td>

            </tr>
          ))}
        </tbody>

      </table>
    </div>
  );
};

export default Category;
