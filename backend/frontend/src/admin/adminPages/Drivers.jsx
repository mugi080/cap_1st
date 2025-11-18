// src/components/admin/Drivers.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './css/Drivers.css';

const Drivers = () => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('admin_token');

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const fetchDriversData = async () => {
      if (!token) {
        console.error("No admin token");
        setLoading(false);
        return;
      }

      try {
        // Step 1: Get all users
        const userRes = await axios.get('http://localhost:8000/api/admin/users/', { headers });
        const staffList = userRes.data.filter(user => user.is_staff);

        if (staffList.length === 0) {
          setDrivers([]);
          setLoading(false);
          return;
        }

        // Step 2: Get all orders to check assignments
        const orderRes = await axios.get('http://localhost:8000/api/orders/', { headers });
        const activeOrders = orderRes.data.filter(order =>
          ['Processing', 'In Transit'].includes(order.status)
        );

        // Step 3: Map each driver and count active deliveries
        const driversWithStatus = staffList.map(staff => {
          const activeDeliveries = activeOrders.filter(
            order => order.assigned_staff?.id === staff.id || order.assigned_staff === staff.id
          );

          let status = 'Available';
          if (activeDeliveries.some(o => o.status === 'In Transit')) {
            status = 'On Delivery';
          } else if (activeDeliveries.length > 0) {
            status = 'Preparing';
          }

          return {
            ...staff,
            activeDeliveries: activeDeliveries.length,
            deliveryStatus: status,
          };
        });

        setDrivers(driversWithStatus);
      } catch (err) {
        console.error("Failed to load drivers:", err);
        setDrivers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDriversData();
  }, [token]);

  if (loading) {
    return (
      <div className="drivers-container">
        <h2>🚚 Driver Status</h2>
        <p>Loading driver information...</p>
      </div>
    );
  }

  return (
    <div className="drivers-container">
      <h2>🚚 Driver Status</h2>

      {drivers.length === 0 ? (
        <p className="empty-state">No drivers found.</p>
      ) : (
        <div className="table-wrapper">
          <table className="drivers-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Contact</th>
                <th>Active Deliveries</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((d) => (
                <tr key={d.id}>
                  <td><strong>{d.first_name} {d.last_name}</strong></td>
                  <td>{d.email}</td>
                  <td>{d.contact_number || 'N/A'}</td>
                  <td>{d.activeDeliveries}</td>
                  <td>
                    <span className={`status-badge status-${d.deliveryStatus.toLowerCase().replace(' ', '-')}`}>
                      {d.deliveryStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Drivers;