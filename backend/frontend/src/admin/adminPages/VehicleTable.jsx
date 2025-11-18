// src/components/admin/VehicleTable.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './css/VehicleTable.css';

const VehicleTable = () => {
  const [vehicles, setVehicles] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    plate_number: '',
    capacity: '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});

  const inputRef = useRef(null);

  const token = localStorage.getItem('admin_token');
  const headers = { Authorization: `Bearer ${token}` };

  // Fetch vehicles
  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:8000/api/vehicles/', { headers });
      setVehicles(res.data);
    } catch (err) {
      setMessage('Failed to load vehicles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  // Auto-focus on add mode
  useEffect(() => {
    if (!isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  // Validate form
  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required.';
    if (!formData.plate_number.trim()) newErrors.plate_number = 'Plate number is required.';
    if (!formData.capacity || formData.capacity <= 0) newErrors.capacity = 'Capacity must be > 0';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      name: formData.name.trim(),
      plate_number: formData.plate_number.trim().toUpperCase(),
      capacity: Number(formData.capacity),
      is_available: true,
    };

    try {
      if (isEditing) {
        await axios.put(`http://localhost:8000/api/vehicles/${editId}/`, payload, { headers });
        setMessage('Vehicle updated successfully!');
      } else {
        await axios.post('http://localhost:8000/api/vehicles/', payload, { headers });
        setMessage('New vehicle added!');
      }

      resetForm();
      fetchVehicles();
    } catch (err) {
      const errMsg =
        err.response?.data?.detail ||
        err.response?.data?.plate_number?.[0] ||
        'Save failed. Please try again.';
      setMessage(`Error: ${errMsg}`);
    }
    setTimeout(() => setMessage(''), 4000);
  };

  // Reset form
  const resetForm = () => {
    setFormData({ name: '', plate_number: '', capacity: '' });
    setIsEditing(false);
    setEditId(null);
    setErrors({});
  };

  // Edit vehicle
  const handleEdit = (vehicle) => {
    setFormData({
      name: vehicle.name,
      plate_number: vehicle.plate_number,
      capacity: vehicle.capacity.toString(),
    });
    setIsEditing(true);
    setEditId(vehicle.id);
    setMessage('');
    setErrors({});
  };

  // Delete vehicle
  const handleDelete = async (id) => {
    const vehicle = vehicles.find(v => v.id === id);
    if (!vehicle) return;

    const hasActiveAssignment = vehicles.some(order =>
      order.assigned_vehicle === id &&
      ['Pending', 'Processing', 'In Transit'].includes(order.status)
    );

    if (hasActiveAssignment) {
      setMessage('Cannot delete: Vehicle is assigned to an active delivery.');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    const confirm = window.confirm(`Delete "${vehicle.name}"? This cannot be undone.`);
    if (!confirm) return;

    try {
      await axios.delete(`http://localhost:8000/api/vehicles/${id}/`, { headers });
      setMessage(`${vehicle.name} deleted.`);
      fetchVehicles();
    } catch (err) {
      setMessage('Delete failed. It may be in use.');
    }
    setTimeout(() => setMessage(''), 4000);
  };

  // Mark unavailable
  const handleMarkUnavailable = async (vehicleId) => {
    try {
      await axios.patch(
        `http://localhost:8000/api/vehicles/${vehicleId}/`,
        { is_available: false },
        { headers }
      );
      setMessage('Vehicle marked as unavailable.');
      fetchVehicles();
    } catch (err) {
      setMessage('Failed to update status.');
    }
    setTimeout(() => setMessage(''), 2000);
  };

  // Mark available
  const handleMarkAvailable = async (vehicleId) => {
    try {
      await axios.patch(
        `http://localhost:8000/api/vehicles/${vehicleId}/`,
        { is_available: true },
        { headers }
      );
      setMessage('Vehicle is now available.');
      fetchVehicles();
    } catch (err) {
      setMessage('Failed to update status.');
    }
    setTimeout(() => setMessage(''), 2000);
  };

  return (
    <div className="vehicle-container">
      <h2>Fleet Management</h2>

      {/* Form Section */}
      <div className="form-wrapper">
        <h3>{isEditing ? 'Edit Vehicle' : 'Add New Vehicle'}</h3>
        <form onSubmit={handleSubmit} className="vehicle-form">
          <input
            ref={inputRef}
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Vehicle Name (e.g., Delivery Van #1)"
            className={errors.name ? 'error' : ''}
          />
          {errors.name && <span className="error-text">{errors.name}</span>}

          <input
            type="text"
            name="plate_number"
            value={formData.plate_number}
            onChange={handleChange}
            placeholder="Plate Number (e.g., ABC-123)"
            className={errors.plate_number ? 'error' : ''}
          />
          {errors.plate_number && <span className="error-text">{errors.plate_number}</span>}

          <input
            type="number"
            name="capacity"
            value={formData.capacity}
            onChange={handleChange}
            placeholder="Max Capacity (cases)"
            min="1"
            className={errors.capacity ? 'error' : ''}
          />
          {errors.capacity && <span className="error-text">{errors.capacity}</span>}

          <button type="submit" className="btn-primary">
            {isEditing ? 'Update Vehicle' : 'Add Vehicle'}
          </button>

          {isEditing && (
            <button type="button" onClick={resetForm} className="btn-cancel">
              Cancel
            </button>
          )}
        </form>

        {message && (
          <div className={`alert ${message.includes('Error') || message.includes('failed') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}
      </div>

      {/* Table Section */}
      <div className="table-wrapper">
        <h3>Current Fleet ({vehicles.length})</h3>
        {loading ? (
          <p className="loading">Loading vehicles...</p>
        ) : vehicles.length === 0 ? (
          <p className="empty">No vehicles registered yet.</p>
        ) : (
          <div className="table-container">
            <table className="vehicle-table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Plate</th>
                  <th>Capacity</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v) => (
                  <tr key={v.id}>
                    <td><strong>{v.name}</strong></td>
                    <td><code>{v.plate_number}</code></td>
                    <td>{v.capacity} case{v.capacity !== 1 ? 's' : ''}</td>
                    <td>
                      <span className={`status-badge ${v.is_available ? 'available' : 'unavailable'}`}>
                        {v.is_available ? 'Available' : 'Unavailable'}
                      </span>
                    </td>
                    <td>
                      {v.is_available ? (
                        <div className="action-buttons">
                          <button onClick={() => handleEdit(v)} className="btn-edit">Edit</button>
                          <button onClick={() => handleMarkUnavailable(v.id)} className="btn-unavailable">Set Unavailable</button>
                          <button onClick={() => handleDelete(v.id)} className="btn-delete">Delete</button>
                        </div>
                      ) : (
                        <button onClick={() => handleMarkAvailable(v.id)} className="btn-available">
                          Make Available
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default VehicleTable;