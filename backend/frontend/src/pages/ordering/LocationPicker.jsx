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
import "./css/LocationPicker.css";

import logo from "../../assets/logo.png";
import locationPin from "../../assets/location-pin.png";

const storeLocation = { lat: 13.93299, lng: 121.62603 };

const locationPinIcon = new L.Icon({
  iconUrl: locationPin,
  iconSize: [40, 50],
  iconAnchor: [20, 50],
  popupAnchor: [0, -40],
});

const storeIcon = new L.Icon({
  iconUrl: logo,
  iconSize: [50, 50],
  iconAnchor: [25, 50],
  popupAnchor: [0, -40],
});

// Reverse geocode to get readable address
const getAddressFromLatLng = (lat, lng, onSelect) => {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
  fetch(url)
    .then((res) => res.json())
    .then((data) => {
      const address = data?.address || {};
      const addressParts = [];

      if (address.house_number) addressParts.push(address.house_number);
      if (address.road) addressParts.push(address.road);
      if (address.suburb) addressParts.push(address.suburb);
      if (address.neighbourhood) addressParts.push(address.neighbourhood);
      if (address.city) addressParts.push(address.city);
      if (address.town) addressParts.push(address.town);
      if (address.municipality) addressParts.push(address.municipality);
      if (address.postcode) addressParts.push(address.postcode);
      if (address.state) addressParts.push(address.state);
      if (address.province) addressParts.push(address.province);
      if (address.country) addressParts.push(address.country);

      const formatted =
        addressParts.length > 0
          ? addressParts.join(", ")
          : data.display_name || "Address not found";

      onSelect({ lat, lng, address: formatted });
    })
    .catch((err) => {
      console.error("Error fetching address:", err);
      onSelect({ lat, lng, address: "Unable to fetch address" });
    });
};

// When user clicks the map to select a location
const LocationMarker = ({ onSelect }) => {
  const [position, setPosition] = useState(null);

  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setPosition({ lat, lng });
      onSelect({ lat, lng });
    },
  });

  return position ? <Marker position={position} icon={locationPinIcon} /> : null;
};

// Search bar control
const SearchControl = () => {
  const map = useMap();
  useEffect(() => {
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
  }, [map]);
  return null;
};

// Map controller for external map control
const MapController = ({ onMapReady }) => {
  const map = useMap();
  useEffect(() => {
    if (map && onMapReady) {
      onMapReady(map);
    }
  }, [map, onMapReady]);
  return null;
};

const LocationPicker = forwardRef(({ onLocationSelect }, ref) => {
  const [selectedLocation, setSelectedLocation] = useState({
    lat: storeLocation.lat,
    lng: storeLocation.lng,
    address: "Store Location",
  });
  const [gpsStatus, setGpsStatus] = useState("detecting"); // "detecting", "enabled", "disabled"
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (navigator.geolocation) {
      setGpsStatus("detecting");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          console.log(`User location detected: ${latitude}, ${longitude} (±${accuracy}m)`);
          const newLocation = { lat: latitude, lng: longitude };
          setGpsStatus("enabled");

          // Center map to user's approximate area
          if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo(newLocation, 15, { duration: 1.5 });
          }
        },
        (err) => {
          console.warn("Location error:", err);
          setGpsStatus("disabled");

          // Fallback to store location if GPS fails
          if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo(storeLocation, 17, { duration: 1.5 });
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      setGpsStatus("disabled");
    }
  }, []);

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

  const handleLocationSelect = ({ lat, lng, address }) => {
    setSelectedLocation({ lat, lng, address });
    onLocationSelect({ lat, lng, address });
  };

  const handleGoToStore = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(storeLocation, 17, { duration: 1.5 });
    }
  };

  return (
    <div className="map-wrapper">
      {/* NAVIGATION BUTTON - Store Only */}
      <div className="map-navigation-buttons">
        <button
          type="button"
          onClick={handleGoToStore}
          className="map-nav-btn store-btn"
          title="Go to Store Location"
        >
          <img src={logo} alt="Store" className="store-logo" />
          <span>Store Location</span>
        </button>
      </div>

      <div className="map-container">
        <MapContainer
          center={storeLocation}
          zoom={16}
          scrollWheelZoom
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=NNcVxYSaKi8OQg76l6Am"
            attribution="&copy; <a href='https://www.maptiler.com/'>MapTiler</a> & OpenStreetMap"
          />

          <SearchControl />
          <MapController onMapReady={handleMapReady} />

          <Marker position={storeLocation} icon={storeIcon}>
            <Tooltip permanent>Salvacion Garat BottledDrink Distributor</Tooltip>
          </Marker>

          <LocationMarker
            onSelect={({ lat, lng }) => {
              getAddressFromLatLng(lat, lng, handleLocationSelect);
            }}
          />
        </MapContainer>

        <div className="location-info">
          <p>
            <strong>Lat:</strong> {selectedLocation.lat.toFixed(5)}
          </p>
          <p>
            <strong>Lng:</strong> {selectedLocation.lng.toFixed(5)}
          </p>
          <p>
            <strong>Address:</strong> {selectedLocation.address}
          </p>
        </div>
      </div>
    </div>
  );
});

LocationPicker.displayName = "LocationPicker";

export default LocationPicker;
