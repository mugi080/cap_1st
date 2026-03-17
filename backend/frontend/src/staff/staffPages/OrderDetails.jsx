// src/staff/staffPages/OrderDetails.jsx
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import "./css/OrderDetails.css";

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet marker icon in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const STORE_LAT = 13.93299;
const STORE_LNG = 121.62603;
const ORS_API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjhmNDU2NjMwYWUwNjRkODY5MDQzOTgyNGY5N2YyODA1IiwiaCI6Im11cm11cjY0In0=";

const OrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const mapContainer = useRef(null);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [routeError, setRouteError] = useState(false);
  const [startLocation, setStartLocation] = useState({ lat: STORE_LAT, lng: STORE_LNG });

  const token = localStorage.getItem("staff_token") || localStorage.getItem("rider_token");
  const headers = { Authorization: `Bearer ${token}` };

  // Fetch order
  useEffect(() => {
    const fetchOrder = async () => {
      if (!id) {
        setError("Invalid order ID.");
        setLoading(false);
        return;
      }
      try {
        const res = await axios.get(`http://localhost:8000/api/orders/${id}/`, { headers });
        setOrder(res.data);
      } catch (err) {
        setError("Failed to load order.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  // Get rider's current location
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          if (latitude >= 13.89 && latitude <= 13.98 && longitude >= 121.58 && longitude <= 121.67) {
            setStartLocation({ lat: latitude, lng: longitude });
          }
        },
        () => {},
        { timeout: 10000 }
      );
    }
  }, []);

  // Initialize map + real route
    useEffect(() => {
    // Guard: only proceed if order and map container exist
    if (!order || !order.latitude || !order.longitude || !mapContainer.current) {
        return;
    }

    let isMounted = true; // 🛡️ Guard against state update on unmounted component

    const map = L.map(mapContainer.current).setView([startLocation.lat, startLocation.lng], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    L.marker([startLocation.lat, startLocation.lng]).addTo(map).bindPopup("You are here");
    L.marker([order.latitude, order.longitude]).addTo(map).bindPopup("Delivery Address");

    const fetchRoute = async () => {
        try {
        const start = `${startLocation.lng},${startLocation.lat}`;
        const end = `${order.longitude},${order.latitude}`;
        const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_API_KEY}&start=${start}&end=${end}`;

        const response = await fetch(url);

        // 🛡️ Abort if component unmounted during fetch
        if (!isMounted) return;

        const data = await response.json();

        if (!isMounted) return;

        const coords = data?.features?.[0]?.geometry?.coordinates;
        if (!coords || coords.length < 2) throw new Error("No route");

        const coordinates = coords.map(([lng, lat]) => [lat, lng]);

        // 🛡️ Only draw if still mounted
        if (isMounted) {
            L.polyline(coordinates, {
            color: "#000",
            weight: 5,
            opacity: 0.85
            }).addTo(map);

            map.fitBounds(L.latLngBounds(coordinates).pad(0.15));
        }
        } catch (err) {
        if (!isMounted) return;
        console.warn("Routing failed", err);
        setRouteError(true);
        const line = L.polyline(
            [[startLocation.lat, startLocation.lng], [order.latitude, order.longitude]],
            { color: "#000", weight: 3, dashArray: "6, 4" }
        ).addTo(map);
        map.fitBounds(line.getBounds().pad(0.15));
        }
    };

    fetchRoute();

    // Cleanup
    return () => {
        isMounted = false;
        if (map) {
        try {
            map.remove();
        } catch (e) {
            // Silent fail if already removed
        }
        }
    };
    }, [order, startLocation]);

  const updateOrderField = async (field, value) => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      await axios.patch(
        `http://localhost:8000/api/orders/${id}/`,
        { [field]: value },
        { headers }
      );
      setOrder(prev => ({ ...prev, [field]: value }));
    } catch (err) {
      alert("Update failed.");
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const display = (val, fallback = "N/A") => val ?? fallback;

  if (loading) {
    return (
      <div className="order-details-container">
        <div className="loading">Loading order details...</div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="order-details-container">
        <p className="error">{error || "Order not found."}</p>
        <button onClick={() => navigate(-1)} className="back-btn-simple">Back</button>
      </div>
    );
  }

  return (
    <div className="order-details-container">
      <div className="order-header">
        <h1>Order #{order.id}</h1>
        <p className="route-from">From: {startLocation.lng === STORE_LNG ? "Store" : "Your Location"}</p>
      </div>

      {/* Status with ▼ */}
      <div className="field-group">
        <label>Status</label>
        <div className="select-wrapper">
          <select
            value={order.status}
            onChange={(e) => updateOrderField('status', e.target.value)}
            disabled={isUpdating}
          >

            <option value="In Transit">In Transit</option>
            <option value="Completed">Completed</option>
          </select>
          <span className="select-indicator">▼</span>
        </div>
      </div>

      {/* Payment */}
      {order.is_paid ? (
        <div className="payment-status paid">Paid</div>
      ) : order.payment_method === "GCash" ? (
        <div className="payment-status pending">Payment Pending (GCash – Admin only)</div>
      ) : (
        <button
          className="mark-paid-btn"
          onClick={() => {
            if (window.confirm(`Mark order #${order.id} as paid?`)) {
              updateOrderField('is_paid', true);
            }
          }}
          disabled={isUpdating}
        >
          Mark Cash as Paid
        </button>
      )}

      {/* Customer Info — FULL ADDRESS from order.address */}
      <div className="info-card">
        <div className="info-row">
          <div>
            <div className="label">Customer</div>
            <div className="value">{display(order.customer_name)}</div>
          </div>
        </div>
        <div className="info-row">
          <div>
            <div className="label">Contact</div>
            <div className="value">
              {order.contact_number ? (
                <a href={`tel:${order.contact_number}`} className="contact-link">
                  {order.contact_number}
                </a>
              ) : "N/A"}
            </div>
          </div>
        </div>
        <div className="info-row">
          <div>
            <div className="label">Full Address</div>
            <div className="value full-address">{display(order.address)}</div> {/* ✅ FULL ADDRESS */}
          </div>
        </div>
      </div>

      {/* Map */}
      {(order.latitude && order.longitude) && (
        <div className="map-section">
          <h2>Navigation Route</h2>
          {routeError && (
            <p className="route-note">Direct route shown. Real navigation requires valid location.</p>
          )}
          <div ref={mapContainer} className="map"></div>
        </div>
      )}

      {/* Receipt-Style Items */}
      <div className="items-section">
        <strong>ORDERED ITEMS</strong>
        {order.items?.length > 0 ? (
          order.items.map((item, i) => (
            <div key={i} className="item-row">
              <span>{item.cases_ordered}× {item.beverage_name}</span>
              <span>₱{parseFloat(item.total_price).toFixed(2)}</span>
            </div>
          ))
        ) : (
          <div className="item-row">
            <span>No items</span>
            <span>₱0.00</span>
          </div>
        )}
        <div className="items-total-row">
          <span><strong>TOTAL</strong></span>
          <span><strong>₱{order.total_price?.toFixed(2) || "0.00"}</strong></span>
        </div>
      </div>

      {/* Back Button */}
      <button 
        onClick={() => navigate(-1)} 
        className="back-btn"
        aria-label="Go back"
      >
        ←
      </button>
    </div>
  );
};

export default OrderDetails;