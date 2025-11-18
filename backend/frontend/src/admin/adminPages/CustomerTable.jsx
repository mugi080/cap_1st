import React, { useEffect, useState } from 'react';
import axios from 'axios';

function CustomerTable() {
  const [customers, setCustomers] = useState([]);
  const [editCustomer, setEditCustomer] = useState(null);
  const [newCustomer, setNewCustomer] = useState({
    first_name: '',
    last_name: '',
    contact_number: '',
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Fetch customers
  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await axios.get('http://localhost:8000/api/admin/customers/', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  // Create a new customer
  const handleCreateCustomer = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await axios.post(
        'http://localhost:8000/api/admin/customers/',
        newCustomer,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setCustomers([...customers, response.data]);
      setNewCustomer({ first_name: '', last_name: '', contact_number: '' });
    } catch (error) {
      console.error('Error creating customer:', error);
    }
  };

  // Update an existing customer
  const handleEditCustomer = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await axios.put(
        `http://localhost:8000/api/admin/customers/${editCustomer.id}/`,
        editCustomer,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setCustomers(customers.map((customer) => (customer.id === editCustomer.id ? response.data : customer)));
      setEditCustomer(null);
    } catch (error) {
      console.error('Error updating customer:', error);
    }
  };

  // Delete a customer
  const handleDeleteCustomer = async (id) => {
    try {
      const token = localStorage.getItem('admin_token');
      await axios.delete(`http://localhost:8000/api/admin/customers/${id}/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setCustomers(customers.filter((customer) => customer.id !== id));
    } catch (error) {
      console.error('Error deleting customer:', error);
    }
  };

  return (
    <div>
      <h2>Registered Customers</h2>

      {/* Create Customer Form */}
      <h3>Create Customer</h3>
      <input
        type="text"
        placeholder="First Name"
        value={newCustomer.first_name}
        onChange={(e) => setNewCustomer({ ...newCustomer, first_name: e.target.value })}
      />
      <input
        type="text"
        placeholder="Last Name"
        value={newCustomer.last_name}
        onChange={(e) => setNewCustomer({ ...newCustomer, last_name: e.target.value })}
      />
      <input
        type="text"
        placeholder="Contact Number"
        value={newCustomer.contact_number}
        onChange={(e) => setNewCustomer({ ...newCustomer, contact_number: e.target.value })}
      />
      <button onClick={handleCreateCustomer}>Create</button>

      {/* Edit Customer Form */}
      {editCustomer && (
        <div>
          <h3>Edit Customer</h3>
          <input
            type="text"
            placeholder="First Name"
            value={editCustomer.first_name}
            onChange={(e) => setEditCustomer({ ...editCustomer, first_name: e.target.value })}
          />
          <input
            type="text"
            placeholder="Last Name"
            value={editCustomer.last_name}
            onChange={(e) => setEditCustomer({ ...editCustomer, last_name: e.target.value })}
          />
          <input
            type="text"
            placeholder="Contact Number"
            value={editCustomer.contact_number}
            onChange={(e) => setEditCustomer({ ...editCustomer, contact_number: e.target.value })}
          />
          <button onClick={handleEditCustomer}>Update</button>
        </div>
      )}

      <table>
        <thead>
          <tr>
            <th>First Name</th>
            <th>Last Name</th>
            <th>Contact</th>
            <th>Date Joined</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((user) => (
            <tr key={user.id}>
              <td>{user.first_name}</td>
              <td>{user.last_name}</td>
              <td>{user.contact_number || 'N/A'}</td>
              <td>{new Date(user.date_joined).toLocaleDateString()}</td>
              <td>
                <button onClick={() => setEditCustomer(user)}>Edit</button>
                <button onClick={() => handleDeleteCustomer(user.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default CustomerTable;
