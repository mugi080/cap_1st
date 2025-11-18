// src/components/admin/Logistics.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import "./css/Logistics.css";

const Logistics = () => {
  const [orders, setOrders] = useState([]);
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterLocation, setFilterLocation] = useState("All");
  const [loading, setLoading] = useState(false);
  const [editOrders, setEditOrders] = useState({});
  const [notification, setNotification] = useState({ show: false, message: "", type: "" });
  const [staffList, setStaffList] = useState([]);
  const [vehicleList, setVehicleList] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Bulk selection
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [bulkStaff, setBulkStaff] = useState("");
  const [bulkVehicle, setBulkVehicle] = useState("");
  const [locationList, setLocationList] = useState(["All"]);

  const token = localStorage.getItem("admin_token");
  const headers = { Authorization: `Bearer ${token}` };

  const ORDER_STATUS_CHOICES = [
    { value: 'All', label: 'All' },
    { value: 'Pending', label: 'Pending' },
    { value: 'Processing', label: 'Processing' },
    { value: 'In Transit', label: 'In Transit' },
    { value: 'Completed', label: 'Completed' },
  ];

  const extractLocation = (address) => {
    if (!address || address === "N/A") return "Unknown";
    const clean = address.trim();
    const barangayFullMatch = clean.match(/(?:Barangay|Brgy\.?)\s+[^,]+/i);
    if (barangayFullMatch) {
      return barangayFullMatch[0].trim();
    }
    return clean.split(',')[0].trim() || "Unknown";
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await axios.get("http://localhost:8000/api/orders/", { headers });

      let allActiveOrders = response.data
        .filter(order => order.delivery_type === "Delivered")
        .filter(order => order.status !== "Completed");

      if (filterStatus !== "All") {
        allActiveOrders = allActiveOrders.filter(order => order.status === filterStatus);
      }
      if (filterLocation !== "All") {
        allActiveOrders = allActiveOrders.filter(order => {
          const loc = extractLocation(order.text_address);
          return loc === filterLocation;
        });
      }

      setOrders(allActiveOrders);

      const allOrdersForLocations = response.data
        .filter(order => order.delivery_type === "Delivered")
        .filter(order => order.status !== "Completed");

      const locations = new Set();
      allOrdersForLocations.forEach(order => {
        const loc = extractLocation(order.text_address);
        locations.add(loc);
      });
      setLocationList(["All", ...Array.from(locations).sort()]);
    } catch (error) {
      console.error("Error fetching orders:", error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const res = await axios.get("http://localhost:8000/api/admin/staff/", { headers });
      setStaffList(res.data);
    } catch (err) {
      console.error("Error fetching staff:", err);
    }
  };

  const fetchVehicles = async () => {
    try {
      const res = await axios.get("http://localhost:8000/api/vehicles/", { headers });
      const availableVehicles = res.data.filter(v => v.is_available === true);
      setVehicleList(availableVehicles);
    } catch (err) {
      console.error("Error fetching vehicles:", err);
      setVehicleList([]);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchStaff();
    fetchVehicles();
  }, [filterStatus, filterLocation]);

  const handleBulkAssign = async () => {
    if (!bulkStaff && !bulkVehicle) {
      setNotification({
        show: true,
        message: "⚠️ Please select a staff or vehicle.",
        type: "error",
      });
      setTimeout(() => setNotification(n => ({ ...n, show: false })), 2000);
      return;
    }

    const updates = selectedOrderIds.map(id => {
      const order = orders.find(o => o.id === id);
      if (!order || order.delivery_type !== "Delivered") {
        return Promise.resolve();
      }

      return axios.patch(
        `http://localhost:8000/api/orders/${id}/`,
        {
          assigned_staff: bulkStaff ? parseInt(bulkStaff, 10) : null,
          assigned_vehicle: bulkVehicle ? parseInt(bulkVehicle, 10) : null,
        },
        { headers }
      );
    }).filter(Boolean);

    try {
      await Promise.all(updates);
      setNotification({
        show: true,
        message: `✅ ${selectedOrderIds.length} orders updated!`,
        type: "success",
      });
      setSelectedOrderIds([]);
      setBulkStaff("");
      setBulkVehicle("");
      fetchOrders();
    } catch (error) {
      console.error("Bulk update failed:", error);
      const errorMessage = error.response?.data?.detail || error.response?.data?.non_field_errors?.[0] || "Bulk assignment failed.";
      setNotification({
        show: true,
        message: `❌ ${errorMessage}`,
        type: "error",
      });
    }
    setTimeout(() => setNotification(n => ({ ...n, show: false })), 3000);
  };

  const handleEditChange = (orderId, field, value) => {
    setEditOrders((prev) => ({
      ...prev,
      [orderId]: {
        ...prev[orderId],
        [field]: value === "" ? null : value,
      },
    }));
  };

  const handleSave = async (orderId) => {
    const editedData = editOrders[orderId];
    if (!editedData) return;
    const originalOrder = orders.find((o) => o.id === orderId);
    if (!originalOrder) return;

    const newStatus = editedData.status !== undefined ? editedData.status : originalOrder.status;
    if (newStatus === "Completed" && !window.confirm("Mark as Completed?")) return;

    const dataToUpdate = {
      status: newStatus,
      assigned_staff: editedData.assigned_staff !== undefined
        ? parseInt(editedData.assigned_staff, 10)
        : originalOrder.assigned_staff
          ? parseInt(originalOrder.assigned_staff, 10)
          : null,
      assigned_vehicle: editedData.assigned_vehicle !== undefined
        ? parseInt(editedData.assigned_vehicle, 10)
        : originalOrder.assigned_vehicle
          ? parseInt(originalOrder.assigned_vehicle, 10)
          : null,
    };

    try {
      const response = await axios.patch(
        `http://localhost:8000/api/orders/${orderId}/`,
        dataToUpdate,
        { headers }
      );

      const updatedOrder = response.data;
      if (updatedOrder.status === "Completed") {
        setOrders((prev) => prev.filter((order) => order.id !== orderId));
      } else {
        setOrders((prev) =>
          prev.map((order) => (order.id === orderId ? updatedOrder : order))
        );
      }

      setEditOrders((prev) => {
        const newEdits = { ...prev };
        delete newEdits[orderId];
        return newEdits;
      });

      setNotification({
        show: true,
        message: `✅ Order #${orderId} saved successfully.`,
        type: "success",
      });

      fetchOrders();
      fetchStaff();
      fetchVehicles();

    } catch (error) {
      console.error("Error saving order changes:", error);
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.non_field_errors?.[0] || 
                          `Failed to save changes for Order #${orderId}.`;
      setNotification({
        show: true,
        message: `❌ ${errorMessage}`,
        type: "error",
      });
    }
    setTimeout(() => setNotification(n => ({ ...n, show: false })), 3000);
  };

  const handleDelete = async (orderId) => {
    if (!window.confirm("Delete this order?")) return;
    try {
      await axios.delete(`http://localhost:8000/api/orders/${orderId}/`, { headers });
      setOrders((prev) => prev.filter((order) => order.id !== orderId));
      setEditOrders((prev) => {
        const newEdits = { ...prev };
        delete newEdits[orderId];
        return newEdits;
      });
      setNotification({
        show: true,
        message: `🗑️ Order #${orderId} deleted.`,
        type: "success",
      });
    } catch (error) {
      console.error("Delete failed:", error);
      setNotification({
        show: true,
        message: `❌ Delete failed for #${orderId}.`,
        type: "error",
      });
    }
    setTimeout(() => setNotification(n => ({ ...n, show: false })), 3000);
  };

  const openModal = async (orderId) => {
    try {
      const res = await axios.get(`http://localhost:8000/api/admin/orders/${orderId}/`, { headers });
      setSelectedOrder(res.data);
      setIsModalOpen(true);
    } catch (err) {
      console.error("Failed to load order details:", err);
      setNotification({
        show: true,
        message: "Failed to load order details.",
        type: "error",
      });
      setTimeout(() => setNotification(n => ({ ...n, show: false })), 2000);
    }
  };

  const toggleSelectAll = () => {
    setSelectedOrderIds(prev =>
      prev.length === orders.length ? [] : orders.map(o => o.id)
    );
  };

  const toggleSelectOne = (id) => {
    setSelectedOrderIds(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id]
    );
  };

  return (
    <div className="logistics-container">
      {/* Notification */}
      {notification.show && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && selectedOrder && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button onClick={() => setIsModalOpen(false)} className="modal-close-btn">
              ✕
            </button>

            <h2 className="modal-header">📦 Order Details #{selectedOrder.id}</h2>
            
            <table className="modal-table">
              <tbody>
                <tr>
                  <th>Customer Name</th>
                  <td>{selectedOrder.customer_name || 'N/A'}</td>
                </tr>
                <tr>
                  <th>Order Date</th>
                  <td>{new Date(selectedOrder.created_at).toLocaleString()}</td>
                </tr>
                <tr>
                  <th>Payment Method</th>
                  <td>{selectedOrder.payment_method || 'N/A'}</td>
                </tr>
                <tr>
                  <th>Total Amount</th>
                  <td>Php {selectedOrder.total_price?.toFixed(2) || '0.00'}</td>
                </tr>
                <tr>
                  <th>Status</th>
                  <td>{selectedOrder.status}</td>
                </tr>
                <tr>
                  <th>Phone</th>
                  <td>{selectedOrder.contact_number || 'N/A'}</td>
                </tr>
                <tr>
                  <th>Address</th>
                  <td>{selectedOrder.text_address || 'N/A'}</td>
                </tr>
                <tr>
                  <th>Location</th>
                  <td>{extractLocation(selectedOrder.text_address)}</td>
                </tr>
              </tbody>
            </table>

            {selectedOrder.items && selectedOrder.items.length > 0 ? (
              <>
                <h3 className="modal-section-header">🛍️ Ordered Items</h3>
                <table className="items-table">
                  <thead>
                    <tr>
                      <th>Product Name</th>
                      <th>Quantity</th>
                      <th>Price per Case</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map((item, index) => (
                      <tr key={index}>
                        <td>
                          {item.beverage_name || `Beverage ID: ${item.beverage || 'N/A'}`}
                        </td>
                        <td>{item.quantity}</td>
                        <td>Php {parseFloat(item.price_per_case).toFixed(2)}</td>
                        <td>Php {parseFloat(item.total_price).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              <p className="empty-state">No items found.</p>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="logistics-header">
        <h2>🚚 Logistics Dashboard</h2>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Status</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="filter-select">
            {ORDER_STATUS_CHOICES.map((status) => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Location</label>
          <select value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} className="filter-select">
            {locationList.map((loc) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedOrderIds.length > 0 && (
        <div className="bulk-actions-bar">
          <strong>{selectedOrderIds.length} selected</strong>
          <select value={bulkStaff} onChange={(e) => setBulkStaff(e.target.value)} className="bulk-select">
            <option value="">Assign Staff</option>
            {staffList.map((staff) => (
              <option key={staff.id} value={staff.id}>
                {staff.first_name} {staff.last_name}
              </option>
            ))}
          </select>
          <select value={bulkVehicle} onChange={(e) => setBulkVehicle(e.target.value)} className="bulk-select">
            <option value="">Assign Vehicle</option>
            {vehicleList.length === 0 ? (
              <option disabled>No available vehicles</option>
            ) : (
              vehicleList.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.name} ({vehicle.plate_number})
                </option>
              ))
            )}
          </select>
          <button onClick={handleBulkAssign} className="bulk-btn bulk-btn-apply">
            Apply Assignment
          </button>
          <button onClick={() => setSelectedOrderIds([])} className="bulk-btn bulk-btn-clear">
            Clear
          </button>
        </div>
      )}

      {loading ? (
        <div className="loading-state">
          <p>⏳ Loading orders...</p>
        </div>
      ) : (
        <div className="table-container">
          <div className="table-wrapper">
            <table className="logistics-table">
              <thead>
                <tr>
                  <th>
                    <input 
                      type="checkbox" 
                      checked={selectedOrderIds.length > 0 && selectedOrderIds.length === orders.length} 
                      onChange={toggleSelectAll} 
                    />
                  </th>
                  <th>Customer</th>
                  <th>Contact</th>
                  <th>Staff</th>
                  <th>Vehicle</th>
                  <th>Address</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="empty-state">
                      No orders found.
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => {
                    const edited = editOrders[order.id] || {};
                    const assignedStaffId = edited.assigned_staff !== undefined
                      ? parseInt(edited.assigned_staff, 10)
                      : order.assigned_staff ? parseInt(order.assigned_staff, 10) : "";
                    const assignedVehicleId = edited.assigned_vehicle !== undefined
                      ? parseInt(edited.assigned_vehicle, 10)
                      : order.assigned_vehicle ? parseInt(order.assigned_vehicle, 10) : "";

                    const hasEdits = !!editOrders[order.id];

                    return (
                      <tr key={order.id}>
                        <td>
                          <input 
                            type="checkbox" 
                            checked={selectedOrderIds.includes(order.id)} 
                            onChange={() => toggleSelectOne(order.id)} 
                          />
                        </td>
                        <td>
                          <Link to={`/admin/order-details/${order.id}`} className="customer-link">
                            {order.customer_name || "View"}
                          </Link>
                        </td>
                        <td>{order.contact_number || "N/A"}</td>
                        <td>
                          <select 
                            value={assignedStaffId || ""} 
                            onChange={(e) => handleEditChange(order.id, "assigned_staff", e.target.value ? parseInt(e.target.value, 10) : "")} 
                            className="table-dropdown"
                          >
                            <option value="">Unassigned</option>
                            {staffList.map(s => (
                              <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select 
                            value={assignedVehicleId || ""} 
                            onChange={(e) => handleEditChange(order.id, "assigned_vehicle", e.target.value ? parseInt(e.target.value, 10) : "")} 
                            className="table-dropdown"
                          >
                            <option value="">Unassigned</option>
                            {vehicleList.length === 0 ? (
                              <option disabled>No vehicles</option>
                            ) : (
                              vehicleList.map(v => (
                                <option key={v.id} value={v.id}>{v.name}</option>
                              ))
                            )}
                          </select>
                        </td>
                        <td>{order.text_address || "N/A"}</td>
                        <td>
                          <div className="action-buttons">
                            {hasEdits && (
                              <>
                                <button onClick={() => handleSave(order.id)} className="action-btn action-btn-save">
                                  Save
                                </button>
                                <button 
                                  onClick={() => {
                                    setEditOrders(prev => {
                                      const newEdits = { ...prev };
                                      delete newEdits[order.id];
                                      return newEdits;
                                    });
                                  }} 
                                  className="action-btn action-btn-cancel"
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                            <button onClick={() => openModal(order.id)} className="action-btn action-btn-view">
                              View
                            </button>
                            <button onClick={() => handleDelete(order.id)} className="action-btn action-btn-delete">
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Logistics;