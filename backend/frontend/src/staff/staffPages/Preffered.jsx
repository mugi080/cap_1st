// src/staff/staffPages/Preferred.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./css/Preferred.css";

const LUCENA_BARANGAYS = [
  "Alitap", "Bacag", "Bagong Silang", "Barayong", "Barra", "Bocohan", "Bungoy",
  "Cotta", "Dalahican", "Dapdap", "Del Rosario", "Dolores", "Domot", "Dupay",
  "Gulang-gulang", "Ibabang Dupay", "Ibabang Iyam", "Ibabang Talim",
  "Ilayang Dupay", "Ilayang Iyam", "Ilayang Talim", "Isabang", "Iyam",
  "Kambal Na Pulo", "Lalaguna", "Maligaya", "Market View", "Mayao Castillo",
  "Mayao Crossing", "Mayao Kanluran", "Mayao Parada", "Mayao Silangan", "Medina",
  "Pagsawitan", "Panayonan", "Pantay Kanluran", "Pantay Silangan", "Poblacion",
  "Ransohan", "Salinas", "Sanggalang", "Talao-talao", "Tayabas Bay", "Tayuman", "Urdaneta"
];

const Preferred = () => {
  const navigate = useNavigate();

  const [preferred_vehicle, setPreferredVehicle] = useState("");
  const [familiar_barangays, setFamiliarBarangays] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("staff_token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!token) {
      alert("Please log in as staff.");
      navigate("/staff/login");
      return;
    }

    const fetchData = async () => {
      try {
        // ✅ Fetch preferences from CORRECT endpoint
        const prefRes = await axios.get("http://localhost:8000/api/staff/preferences/", { headers });
        setPreferredVehicle(prefRes.data.preferred_vehicle || "");
        setFamiliarBarangays(Array.isArray(prefRes.data.familiar_barangays) ? prefRes.data.familiar_barangays : []);

        // Fetch vehicles
        const vehicleRes = await axios.get("http://localhost:8000/api/vehicles/", { headers });
        setVehicles(vehicleRes.data);
      } catch (err) {
        console.error("Load error:", err);
        alert("Failed to load preferences.");
      }
    };

    fetchData();
  }, [navigate, token]);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const payload = {
        preferred_vehicle: preferred_vehicle || null,
        familiar_barangays: familiar_barangays
      };

      // ✅ PATCH to preference endpoint, NOT /users/me/
      await axios.patch("http://localhost:8000/api/staff/preferences/", payload, { headers });

      setMessage("✅ Preferences saved successfully!");
    } catch (err) {
      console.error("Save error:", err.response?.data);
      alert("❌ Failed to save preferences. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  const handleBarangayChange = (e) => {
    const options = Array.from(e.target.selectedOptions, opt => opt.value);
    setFamiliarBarangays(options);
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="preferred-container">
      <button 
        type="button" 
        onClick={handleBack} 
        className="back-button"
        aria-label="Go back"
      >
        ←
      </button>

      <h2 className="title"> Staff Preferences</h2>

      {message && <div className="alert alert-success">{message}</div>}

      <form onSubmit={handleSave} className="preferences-form">
        <div className="form-group">
          <label>Preferred Vehicle</label>
          <select
            value={preferred_vehicle}
            onChange={(e) => setPreferredVehicle(e.target.value)}
            disabled={loading}
          >
            <option value="">-- Select Vehicle --</option>
            {vehicles.map(vehicle => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.name} ({vehicle.plate_number})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Familiar Barangays </label>
          <select
            multiple
            value={familiar_barangays}
            onChange={handleBarangayChange}
            disabled={loading}
            className="barangay-select"
          >
            {LUCENA_BARANGAYS.map(brgy => (
              <option key={brgy} value={brgy}>{brgy}</option>
            ))}
          </select>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="btn-save"
        >
          {loading ? "Saving..." : "Save Preferences"}
        </button>
      </form>
    </div>
  );
};

export default Preferred;