import React, { useEffect, useState } from 'react';
import axios from 'axios';

function StaffTable() {
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState({
    id: null,
    first_name: '',
    last_name: '',
    contact_number: '',
    address: '',
  });

  const token = localStorage.getItem('admin_token');
  const headers = {
    Authorization: `Bearer ${token}`,
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/admin/staff/', { headers });
      setStaff(response.data);
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (form.id) {
        // Update
        await axios.put(`http://localhost:8000/api/admin/staff/${form.id}/`, form, { headers });
        alert('Staff updated!');
      } else {
        // Create
        await axios.post('http://localhost:8000/api/admin/staff/', form, { headers });
        alert('Staff created!');
      }

      setForm({
        id: null,
        first_name: '',
        last_name: '',
        contact_number: '',
        address: '',
      });

      fetchStaff();
    } catch (error) {
      console.error('Error saving staff:', error.response?.data || error.message);
    }
  };

  const handleEdit = (member) => {
    setForm({
      ...member,
    });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this staff member?')) {
      try {
        await axios.delete(`http://localhost:8000/api/admin/staff/${id}/`, { headers });
        fetchStaff();
      } catch (error) {
        console.error('Error deleting staff:', error);
      }
    }
  };

  return (
    <div>
      <h2>Staff List</h2>

      {/* Button to go to role-request page in upper-right corner */}
      <button 
        style={{
          position: 'absolute', 
          top: '10px', 
          right: '10px', 
          padding: '10px 20px', 
          backgroundColor: '#4CAF50', 
          color: 'white', 
          border: 'none', 
          borderRadius: '5px', 
          cursor: 'pointer'
        }}
        onClick={() => window.location.href = '/admin/role-request'}
      >
        Role Request
      </button>

      {/* Staff Form */}
      <form onSubmit={handleSubmit}>
        <input type="text" name="first_name" placeholder="First Name" value={form.first_name} onChange={handleChange} required />
        <input type="text" name="last_name" placeholder="Last Name" value={form.last_name} onChange={handleChange} required />
        <input type="text" name="contact_number" placeholder="Contact Number" value={form.contact_number} onChange={handleChange} />
        <input type="text" name="address" placeholder="Address" value={form.address} onChange={handleChange} />
        <button type="submit">{form.id ? 'Update' : 'Add'} Staff</button>
      </form>

      <table border="1" cellPadding="8">
        <thead>
          <tr>
            <th>Name</th>
            <th>Contact</th>
            <th>Address</th>
            <th>Joined</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {staff.map((member) => (
            <tr key={member.id}>
              <td>{member.first_name} {member.last_name}</td>
              <td>{member.contact_number || 'N/A'}</td>
              <td>{member.address || 'N/A'}</td>
              <td>{new Date(member.date_joined).toLocaleDateString()}</td>
              <td>
                <button onClick={() => handleEdit(member)}>Edit</button>
                <button onClick={() => handleDelete(member.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default StaffTable;
