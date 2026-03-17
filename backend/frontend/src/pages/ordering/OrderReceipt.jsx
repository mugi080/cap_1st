// src/pages/ordering/OrderReceipt.jsx
import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import html2pdf from 'html2pdf.js'; // 👈 ADD THIS

const API_ROOT = "http://localhost:8000";

const OrderReceipt = () => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const orderId = params.get("orderId");
    const token = params.get("token");

    if (!orderId || !token) {
      setError("Missing order ID or token.");
      setLoading(false);
      return;
    }

    const fetchOrder = async () => {
      try {
        const res = await axios.get(`${API_ROOT}/api/user/orders/`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const found = res.data.find(o => String(o.id) === String(orderId));
        if (!found) {
          setError("Order not found.");
          setLoading(false);
          return;
        }
        if (found.status?.toLowerCase() !== "completed") {
          setError("Receipt available only for completed orders.");
          setLoading(false);
          return;
        }
        setOrder(found);
      } catch (err) {
        console.error("Error loading receipt:", err);
        setError("Failed to load receipt. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [location.search]);

  const formatCases = (cases) => {
    const num = Number(cases);
    if (isNaN(num) || num <= 0) return "0 cases";
    if (num === 1) return "1 case";
    if (Number.isInteger(num)) return `${num} cases`;
    const whole = Math.floor(num);
    const fraction = num - whole;
    if (Math.abs(fraction - 0.5) < 0.01) {
      return whole === 0 ? "½ case" : `${whole}½ cases`;
    }
    return `${num.toFixed(1)} cases`;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  // ✅ DOWNLOAD AS PDF FUNCTION
  const handleDownloadPDF = () => {
    const element = document.getElementById('receipt-to-print');
    const opt = {
      margin: 10,
      filename: `receipt-order-${order.id}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().from(element).set(opt).save();
  };

  if (loading) {
    return (
      <div style={{ 
        marginTop: "80px", // 👈 PUSH BELOW NAVBAR
        padding: "32px", 
        textAlign: "center", 
        fontFamily: "'Courier New', monospace" 
      }}>
        Loading receipt...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        marginTop: "80px", // 👈
        padding: "32px", 
        textAlign: "center", 
        color: "#000" 
      }}>
        <h2>⚠️ Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div 
      style={{ 
        marginTop: "80px", // 👈 CRITICAL: prevents navbar overlap
        padding: "24px", 
        display: "flex", 
        flexDirection: "column",
        alignItems: "center",
        backgroundColor: "#fff", 
        minHeight: "100vh" 
      }}
    >
      {/* ✅ DOWNLOAD BUTTON */}
      <button
        onClick={handleDownloadPDF}
        style={{
          marginBottom: "24px",
          padding: "12px 24px",
          backgroundColor: "#000",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          fontSize: "1rem",
          fontWeight: "bold",
          cursor: "pointer",
          boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
        }}
      >
        📥 Download Receipt as PDF
      </button>

      {/* ✅ RECEIPT CONTENT (wrapped for PDF capture) */}
      <div 
        id="receipt-to-print"
        style={{
          width: "100%",
          maxWidth: "600px",
          fontFamily: "'Courier New', monospace",
          border: "2px solid #000",
          padding: "32px",
          backgroundColor: "#ffffff",
          boxSizing: "border-box"
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", borderBottom: "3px double #000", paddingBottom: "16px", marginBottom: "24px" }}>
          <h1 style={{ margin: "0", fontSize: "2rem", letterSpacing: "1px" }}>
            Garay Salvacion Bottled drink Distributor
          </h1>
          <p style={{ margin: "10px 0 0", fontWeight: "bold", fontSize: "1.25rem" }}>
            ORDER #{order.id}
          </p>
        </div>

        {/* Order Info */}
        <div style={{ marginBottom: "20px", paddingBottom: "12px", borderBottom: "1px dashed #000" }}>
          <p><strong>Date:</strong> {new Date(order.created_at).toLocaleString("en-PH")}</p>
          <p><strong>Payment:</strong> {order.payment_method || "N/A"}</p>
          {order.delivery_type === "delivery" && order.address && (
            <p><strong>Deliver To:</strong> {order.address}</p>
          )}
          {order.delivery_type === "pickup" && (
            <p><strong>Order Type:</strong> Pickup</p>
          )}
        </div>

        {/* Items */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 0.7fr 0.9fr 1fr",
            gap: "10px",
            fontWeight: "bold",
            paddingBottom: "8px",
            borderBottom: "2px solid #000",
            marginBottom: "10px"
          }}>
            <span>Item</span>
            <span>Qty</span>
            <span>Price</span>
            <span>Total</span>
          </div>
          {order.items.map((item, i) => (
            <div key={i} style={{
              display: "grid",
              gridTemplateColumns: "1fr 0.7fr 0.9fr 1fr",
              gap: "10px",
              padding: "8px 0"
            }}>
              <span>{item.beverage_name || `Beverage`}</span>
              <span>{formatCases(item.cases_ordered)}</span>
              <span>{formatCurrency(parseFloat(item.price_per_case) || 0)}</span>
              <span style={{ color: "#cc0000", fontWeight: "bold" }}>
                {formatCurrency(parseFloat(item.total_price) || 0)}
              </span>
            </div>
          ))}
        </div>

        {/* Total */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          paddingTop: "16px",
          borderTop: "3px double #000",
          fontSize: "1.25rem",
          fontWeight: "bold"
        }}>
          <span>TOTAL:</span>
          <span style={{ color: "#cc0000" }}>{formatCurrency(parseFloat(order.total_price) || 0)}</span>
        </div>

        {/* Footer */}
        <div style={{
          textAlign: "center",
          marginTop: "24px",
          paddingTop: "16px",
          borderTop: "1px dashed #000",
          fontStyle: "italic",
          fontSize: "0.95rem"
        }}>
          <p>Thank you for your order!</p>
          <p>— Bernie Conception, Mayao Crossing, Lucena</p>
        </div>
      </div>
    </div>
  );
};

export default OrderReceipt;