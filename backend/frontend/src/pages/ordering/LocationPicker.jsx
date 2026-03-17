// src/pages/LocationPicker.jsx
import React, { useEffect, useState, forwardRef, useImperativeHandle, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-geosearch/dist/geosearch.css";
import { GeoSearchControl, OpenStreetMapProvider } from "leaflet-geosearch";

const storeLocation = { lat: 13.93299, lng: 121.62603 };

// Known barangays for validation & matching
const BARANGAYS = [
  "Alitap",
  "Bacag",
  "Bagong Silang",
  "Barayong",
  "Barra",
  "Bocohan",
  "Bungoy",
  "Cotta",
  "Dalahican",
  "Dapdap",
  "Del Rosario",
  "Dolores",
  "Domot",
  "Dupay",
  "Gulang-gulang",
  "Ibabang Dupay",
  "Ibabang Iyam",
  "Ibabang Talim",
  "Ilayang Dupay",
  "Ilayang Iyam",
  "Ilayang Talim",
  "Isabang",
  "Iyam",
  "Kambal Na Pulo",
  "Lalaguna",
  "Maligaya",
  "Market View",
  "Mayao Castillo",
  "Mayao Crossing",
  "Mayao Kanluran",
  "Mayao Parada",
  "Mayao Silangan",
  "Medina",
  "Pagsawitan",
  "Panayonan",
  "Pantay Kanluran",
  "Pantay Silangan",
  "Poblacion",
  "Ransohan",
  "Salinas",
  "Sanggalang",
  "Talao-talao",
  "Tayabas Bay",
  "Tayuman",
  "Urdaneta"
];

const locationPinIcon = new L.Icon({
  iconUrl: "/assets/location-pin.png",
  iconSize: [40, 50],
  iconAnchor: [20, 50],
  popupAnchor: [0, -40],
});

const storeIcon = new L.Icon({
  iconUrl: "/assets/logo.png",
  iconSize: [50, 50],
  iconAnchor: [25, 50],
  popupAnchor: [0, -40],
});

const getAddressFromLatLng = (lat, lng, onSelect) => {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&countrycodes=ph`;
  fetch(url)
    .then((res) => res.json())
    .then((data) => {
      const fullAddress = data?.display_name || "Address not found";
      const addr = data?.address || {};

      // Try common Philippine address fields
      let detectedBarangay =
        addr.barangay ||
        addr.suburb ||
        addr.village ||
        addr.neighbourhood ||
        "";

      detectedBarangay = detectedBarangay.trim();

      // Match against known barangays (case-insensitive)
      const matchedBarangay = BARANGAYS.find(
        (b) => b.toLowerCase() === detectedBarangay.toLowerCase()
      ) || "";

      onSelect({ lat, lng, address: fullAddress, barangay: matchedBarangay });
    })
    .catch((err) => {
      console.error("Error fetching address:", err);
      onSelect({ lat, lng, address: "Unable to fetch address", barangay: "" });
    });
};

const LocationMarker = ({ onSelect, isDelivery }) => {
  const [position, setPosition] = useState(null);

  useMapEvents({
    click(e) {
      if (!isDelivery) return;

      const { lat, lng } = e.latlng;
      const inLucena = lat >= 13.89 && lat <= 13.98 && lng >= 121.58 && lng <= 121.67;

      if (!inLucena) {
        alert("Please select a location within Lucena City.");
        return;
      }

      setPosition({ lat, lng });
      onSelect({ lat, lng });
    },
  });

  if (!isDelivery) return null;
  return position ? <Marker position={position} icon={locationPinIcon} /> : null;
};

const SearchControl = ({ isDelivery }) => {
  const map = useMap();
  useEffect(() => {
    if (!isDelivery) return;
    const provider = new OpenStreetMapProvider();
    const searchControl = new GeoSearchControl({
      provider,
      style: "bar",
      showMarker: true,
      autoClose: true,
      retainZoomLevel: false,
      animateZoom: true,
      keepResult: true,
    });
    map.addControl(searchControl);
    return () => map.removeControl(searchControl);
  }, [map, isDelivery]);
  return null;
};

const MapController = ({ onMapReady }) => {
  const map = useMap();
  useEffect(() => {
    if (map && onMapReady) {
      onMapReady(map);
    }
  }, [map, onMapReady]);
  return null;
};

const LocationPicker = forwardRef(({ onLocationSelect, deliveryType }, ref) => {
  const [selectedLocation, setSelectedLocation] = useState({
    lat: storeLocation.lat,
    lng: storeLocation.lng,
    address: "Store Location",
  });
  const mapInstanceRef = useRef(null);
  const isDelivery = deliveryType === "Delivered";

  const handleMapReady = (map) => {
    mapInstanceRef.current = map;
  };

  useImperativeHandle(ref, () => ({
    flyToStore: () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo(storeLocation, 17, { duration: 1.5 });
      }
    },
  }));

  const handleLocationSelect = ({ lat, lng, address, barangay }) => {
    setSelectedLocation({ lat, lng, address });
    onLocationSelect({ lat, lng, address, barangay }); // 👈 include barangay
  };

  const handleGoToStore = (e) => {
    e.preventDefault();
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(storeLocation, 17, { duration: 1.5 });
    }
  };

  return (
    <div className="map-wrapper">
      <div className="map-navigation-buttons">
        <button type="button" onClick={handleGoToStore} className="store-btn">
          Store Location
        </button>
      </div>

      <div className="map-container">
        <MapContainer
          center={storeLocation}
          zoom={16}
          scrollWheelZoom
          style={{ height: "300px", width: "100%" }}
        >
          <TileLayer
            url="https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=NNcVxYSaKi8OQg76l6Am"
            attribution='&copy; <a href="https://www.maptiler.com/">MapTiler</a> & OpenStreetMap'
          />
          <SearchControl isDelivery={isDelivery} />
          <MapController onMapReady={handleMapReady} />

          <Marker position={storeLocation} icon={storeIcon}>
            <Tooltip permanent>Salvacion Garat BottledDrink Distributor</Tooltip>
          </Marker>

          <LocationMarker
            isDelivery={isDelivery}
            onSelect={({ lat, lng }) => {
              getAddressFromLatLng(lat, lng, handleLocationSelect);
            }}
          />
        </MapContainer>

        <div className="location-info">
          <p><strong>Lat:</strong> {selectedLocation.lat.toFixed(5)}</p>
          <p><strong>Lng:</strong> {selectedLocation.lng.toFixed(5)}</p>
          <p><strong>Address:</strong> {selectedLocation.address}</p>
        </div>
      </div>
    </div>
  );
});

LocationPicker.displayName = "LocationPicker";
export default LocationPicker;