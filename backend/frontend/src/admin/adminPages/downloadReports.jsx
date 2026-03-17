// src/components/admin/DownloadReports.jsx
import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  Calendar,
  FileText,
  Package,
  BarChart3,
  MapPin,
  Users,
  TrendingUp,
  Filter,
  Eye,
  Printer,
  AlertCircle,
  CheckCircle,
  X,
  Loader2,
  ChevronDown
} from 'lucide-react';

const DownloadReports = () => {
  const [activeTab, setActiveTab] = useState('sales');
  const [showFilters, setShowFilters] = useState(true);
  
  // Date filters
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Advanced filters
  const [selectedBeverages, setSelectedBeverages] = useState([]);
  const [selectedBarangays, setSelectedBarangays] = useState([]);
  const [deliveryType, setDeliveryType] = useState('all');
  const [paymentMethod, setPaymentMethod] = useState('all'); // ✅ CHANGED: payment_method
  
  // Report data
  const [previewData, setPreviewData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [exportStatus, setExportStatus] = useState('');
  const [availableFilters, setAvailableFilters] = useState({
    beverages: [],
    barangays: []
  });
  
  const printRef = useRef();
  const token = localStorage.getItem("admin_token");
  const API_BASE = 'http://localhost:8000/api';

  // Report configurations
  const reportTabs = [
    { 
      id: 'sales', 
      label: 'Sales Report', 
      icon: BarChart3,
      description: 'Complete order details with customer and product information',
      endpoint: '/reports/sales/',
      requiresDateRange: true,
      filters: ['beverages', 'barangays', 'deliveryType', 'paymentMethod'] // ✅ updated
    },
    { 
      id: 'inventory', 
      label: 'Inventory Report', 
      icon: Package,
      description: 'Current stock levels with sales velocity and reorder recommendations',
      endpoint: '/reports/inventory/',
      requiresDateRange: false,
      filters: ['beverages']
    },
  ];

  // Fetch available filter options
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [beveragesRes, barangaysRes] = await Promise.all([
          fetch(`${API_BASE}/beverages/`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${API_BASE}/barangays/`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        
        if (!beveragesRes.ok || !barangaysRes.ok) {
          throw new Error('Failed to fetch filter options');
        }

        const beveragesData = await beveragesRes.json();
        const barangaysData = await barangaysRes.json();

        const beverages = Array.isArray(beveragesData)
          ? beveragesData.map(b => b.name)
          : (beveragesData.results || []).map(b => b.name);

        const barangays = Array.isArray(barangaysData)
          ? barangaysData
          : [];

        setAvailableFilters({
          beverages: [...new Set(beverages)].sort(),
          barangays: [...new Set(barangays)].sort()
        });
      } catch (error) {
        console.error('Failed to fetch filter options:', error);
        setAvailableFilters({
          beverages: ['Coca-Cola Regular', 'Kasalo', 'Mismo', 'Swakto'],
          barangays: ['Mayao Crossing', 'Poblacion']
        });
      }
    };
    
    fetchFilters();
  }, [token]);

  const currentTab = reportTabs.find(t => t.id === activeTab);
  const isValidRange = startDate && endDate && new Date(startDate) <= new Date(endDate);

  const buildQueryParams = () => {
    const params = new URLSearchParams();
    
    if (currentTab.requiresDateRange) {
      params.append('start', startDate);
      params.append('end', endDate);
    }
    
    selectedBeverages.forEach(bev => params.append('beverages', bev));
    selectedBarangays.forEach(bar => params.append('barangays', bar));
    
    if (deliveryType !== 'all') {
      params.append('delivery_type', deliveryType);
    }
    
    // ✅ SEND payment_method instead of payment_status
    if (paymentMethod !== 'all') {
      params.append('payment_method', paymentMethod);
    }
    
    params.append('format', 'json');
    return params;
  };

  const fetchReportData = async () => {
    const url = new URL(`${API_BASE}${currentTab.endpoint}`);
    url.search = buildQueryParams().toString();

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errorText}`);
    }
    return await res.json();
  };

  const handlePreview = async () => {
    if (currentTab.requiresDateRange && !isValidRange) return;
    setPreviewLoading(true);
    setShowPreview(false);
    setExportStatus('');
    try {
      const data = await fetchReportData();
      setPreviewData(data.data || []);
      setShowPreview(true);
    } catch (err) {
      console.error("Preview failed:", err);
      setPreviewData([]);
      setShowPreview(true);
      setExportStatus('error');
    }
    setPreviewLoading(false);
  };

  const exportFile = async (format) => {
    if (currentTab.requiresDateRange && !isValidRange) return;
    setLoading(true);
    setExportStatus('');
    
    try {
      const url = new URL(`${API_BASE}${currentTab.endpoint}`);
      const params = buildQueryParams();
      params.set('format', format);
      url.search = params.toString();

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const filename = `${currentTab.label.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.${format}`;
      const blob = await response.blob();
      const urlObj = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = urlObj;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(urlObj);
      document.body.removeChild(a);

      setExportStatus('success');
    } catch (err) {
      console.error("Export failed:", err);
      setExportStatus('error');
    }
    setLoading(false);
  };

  const printReport = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${currentTab.label} - ${startDate} to ${endDate}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            h1 { color: #222; }
            .header { margin-bottom: 20px; }
            .date-range { color: #555; font-style: italic; }
            .filters { background: #f9f9f9; padding: 12px; border-radius: 6px; margin: 12px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${currentTab.label.toUpperCase()}</h1>
            <div class="date-range">Generated on: ${new Date().toLocaleString()}</div>
            ${currentTab.requiresDateRange ? `<div class="date-range">Period: ${startDate} to ${endDate}</div>` : ''}
            <div class="filters">
              <strong>Applied Filters:</strong>
              ${selectedBeverages.length > 0 ? `<div>Beverages: ${selectedBeverages.join(', ')}</div>` : ''}
              ${selectedBarangays.length > 0 ? `<div>Barangays: ${selectedBarangays.join(', ')}</div>` : ''}
              ${deliveryType !== 'all' ? `<div>Delivery: ${deliveryType}</div>` : ''}
              ${paymentMethod !== 'all' ? `<div>Payment: ${paymentMethod}</div>` : ''}
            </div>
          </div>
          ${printRef.current?.innerHTML || ''}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const renderPreviewTable = () => {
    if (!previewData.length) {
      return (
        <div className="preview-empty">
          <AlertCircle size={48} className="empty-icon" />
          <p>No data found for the selected criteria</p>
        </div>
      );
    }

    const headers = Object.keys(previewData[0]);
    const rows = previewData.slice(0, 50);

    return (
      <div ref={printRef} className="preview-table-container">
        <table className="preview-table">
          <thead>
            <tr>
              {headers.map((header, idx) => (
                <th key={idx}>
                  {header.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {headers.map((header, colIndex) => (
                  <td key={colIndex}>
                    {typeof row[header] === 'boolean' 
                      ? row[header] ? 'Yes' : 'No'
                      : row[header] ?? '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {previewData.length > 50 && (
          <div className="preview-footer">
            Showing first 50 of {previewData.length} records
          </div>
        )}
      </div>
    );
  };

  const toggleFilter = (filterType, value) => {
    if (filterType === 'beverages') {
      setSelectedBeverages(prev => 
        prev.includes(value) 
          ? prev.filter(b => b !== value)
          : [...prev, value]
      );
    } else if (filterType === 'barangays') {
      setSelectedBarangays(prev => 
        prev.includes(value) 
          ? prev.filter(b => b !== value)
          : [...prev, value]
      );
    }
  };

  const clearAllFilters = () => {
    setSelectedBeverages([]);
    setSelectedBarangays([]);
    setDeliveryType('all');
    setPaymentMethod('all'); // ✅ updated
    setShowPreview(false);
  };

  return (
    <div className="report-page">
      <div className="report-container">
        {/* Header */}
        <div className="report-header">
          <Download size={28} />
          <div>
            <h1>Download Reports</h1>
            <p>Create customized reports with advanced filtering and export options</p>
          </div>
        </div>

        {/* Toggle Filters Button */}
        <div className="toggle-filters">
          <button onClick={() => setShowFilters(!showFilters)}>
            <Filter size={18} />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
            <ChevronDown size={16} className={showFilters ? 'rotate-180' : ''} />
          </button>
        </div>

        {/* Filters Section */}
        {showFilters && (
          <div className="report-filters">
            <div className="filter-grid">
              {/* Date Range */}
              {currentTab.requiresDateRange && (
                <div className="filter-card">
                  <label><Calendar size={16} /> Date Range</label>
                  <div className="date-inputs">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                    <span>to</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Beverage Filter */}
              {currentTab.filters.includes('beverages') && (
                <div className="filter-card">
                  <label><Package size={16} /> Beverages</label>
                  <div className="filter-options">
                    {availableFilters.beverages.map(beverage => (
                      <label key={beverage} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={selectedBeverages.includes(beverage)}
                          onChange={() => toggleFilter('beverages', beverage)}
                        />
                        {beverage}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Barangay Filter */}
              {currentTab.filters.includes('barangays') && (
                <div className="filter-card">
                  <label><MapPin size={16} /> Barangays</label>
                  <div className="filter-options">
                    {availableFilters.barangays.map(barangay => (
                      <label key={barangay} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={selectedBarangays.includes(barangay)}
                          onChange={() => toggleFilter('barangays', barangay)}
                        />
                        {barangay}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Delivery Type */}
              {currentTab.filters.includes('deliveryType') && (
                <div className="filter-card">
                  <label>Delivery Type</label>
                  <select value={deliveryType} onChange={(e) => setDeliveryType(e.target.value)}>
                    <option value="all">All Types</option>
                    <option value="Pickup">Pickup</option>
                    <option value="Delivered">Delivered</option>
                  </select>
                </div>
              )}

              {/* Payment Method ✅ */}
              {currentTab.filters.includes('paymentMethod') && (
                <div className="filter-card">
                  <label>Payment Method</label>
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                    <option value="all">All Methods</option>
                    <option value="Cash">Cash</option>
                    <option value="GCash">GCash</option>
                    <option value="cash_on_delivery">Cash on Delivery</option>
                  </select>
                </div>
              )}
            </div>

            {/* Filter Actions */}
            <div className="filter-actions">
              <button onClick={clearAllFilters} className="btn-clear">
                Clear All Filters
              </button>
              <button 
                onClick={handlePreview}
                disabled={previewLoading || (currentTab.requiresDateRange && !isValidRange)}
                className="btn-preview"
              >
                {previewLoading ? <Loader2 className="spin" /> : <Eye size={18} />}
                Preview Data
              </button>
            </div>

            {!isValidRange && currentTab.requiresDateRange && (
              <div className="error-message">
                <AlertCircle size={16} />
                Please select a valid date range
              </div>
            )}
          </div>
        )}

        {/* Report Tabs */}
        <div className="report-tabs">
          {reportTabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab(tab.id);
                  setShowPreview(false);
                  clearAllFilters();
                }}
              >
                <Icon size={20} />
                <div>
                  <div className="tab-title">{tab.label}</div>
                  <div className="tab-desc">{tab.description}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Export Actions */}
        <div className="export-actions">
          <div className="export-buttons">
            <button 
              onClick={() => exportFile('csv')}
              disabled={loading}
              className="btn-csv"
            >
              <FileText size={18} />
              Export CSV
            </button>
            
            <button 
              onClick={printReport}
              disabled={!showPreview}
              className="btn-print"
            >
              <Printer size={18} />
              Print Report
            </button>
          </div>

          {/* Status Messages */}
          {exportStatus === 'success' && (
            <div className="status success">
              <CheckCircle size={16} />
              Report downloaded successfully!
              <button onClick={() => setExportStatus('')} className="close-btn">
                <X size={16} />
              </button>
            </div>
          )}
          
          {exportStatus === 'error' && (
            <div className="status error">
              <AlertCircle size={16} />
              Failed to generate report. Please check your filters.
              <button onClick={() => setExportStatus('')} className="close-btn">
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Preview */}
        {showPreview && (
          <div className="preview-section">
            <div className="preview-header">
              <h2>{currentTab.label} Preview</h2>
              <span>{previewData.length} records</span>
            </div>
            {renderPreviewTable()}
          </div>
        )}
                {/* ✅ INSERTED: Your CSS */}
        <style jsx>{`
          .report-page {
            padding: 0 24px;
            background: #f5f7fa;
            min-height: 100vh;
          }
          
          .report-container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.08);
            overflow: hidden;
          }
          
          .report-header {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 24px;
            background: #ffffff;
            border-bottom: 1px solid #eaeaea;
          }
          
          .report-header h1 {
            margin: 0;
            font-size: 24px;
            color: #222;
            font-weight: 700;
          }
          
          .report-header p {
            margin: 4px 0 0 0;
            color: #555;
            font-size: 14px;
          }
          
          .toggle-filters {
            padding: 16px 24px;
            background: #fafafa;
            border-bottom: 1px solid #eee;
          }
          
          .toggle-filters button {
            background: white;
            border: 1px solid #ccc;
            padding: 8px 16px;
            border-radius: 8px;
            font-weight: 600;
            color: #222;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s ease;
          }
          
          .toggle-filters button:hover {
            background: #f5f5f5;
            border-color: #999;
          }
          
          .rotate-180 {
            transform: rotate(180deg);
            transition: transform 0.2s;
          }
          
          .report-filters {
            padding: 24px;
            border-bottom: 1px solid #eee;
            background: #fafafa;
          }
          
          .filter-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
          }
          
          .filter-card {
            background: white;
            padding: 16px;
            border-radius: 10px;
            border: 1px solid #ddd;
          }
          
          .filter-card label {
            display: block;
            font-weight: 600;
            color: #222;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          
          .date-inputs {
            display: flex;
            gap: 10px;
            align-items: center;
            flex-wrap: wrap;
          }

          .date-inputs input {
            padding: 8px 10px;
            border: 1px solid #ccc;
            border-radius: 6px;
            font-size: 14px;
            min-width: 120px;
            flex: 1;
          }
          
          .range-inputs span {
            color: #555;
            font-weight: 600;
          }
          
          select {
            width: 100%;
            padding: 8px 10px;
            border: 1px solid #ccc;
            border-radius: 6px;
            font-size: 14px;
            background: white;
            color: #222;
          }
          
          .filter-options {
            max-height: 180px;
            overflow-y: auto;
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
            gap: 8px;
          }
          
          .checkbox-label {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
            cursor: pointer;
            color: #222;
          }
          
          .checkbox-label input {
            margin: 0;
          }
          
          .filter-actions {
            display: flex;
            gap: 16px;
            justify-content: flex-end;
            margin-top: 16px;
          }
          
          .btn-clear {
            padding: 8px 16px;
            background: #f0f0f0;
            color: #222;
            border: 1px solid #ccc;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
          }
          
          .btn-preview {
            padding: 8px 20px;
            background: #222;
            color: white;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          
          .btn-preview:hover:not(:disabled) {
            background: #000;
          }
          
          .btn-preview:disabled {
            background: #ccc;
            cursor: not-allowed;
          }
          
          .error-message {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #d32f2f;
            margin-top: 16px;
            font-size: 14px;
            padding: 12px;
            background: #ffebee;
            border-radius: 8px;
            border-left: 3px solid #f44336;
          }
          
          .report-tabs {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 16px;
            padding: 24px;
            border-bottom: 1px solid #eee;
          }
          
          .tab-btn {
            display: flex;
            gap: 16px;
            padding: 16px;
            border: 1px solid #ddd;
            border-radius: 10px;
            background: white;
            cursor: pointer;
            transition: all 0.2s;
            text-align: left;
            color: #222;
          }
          
          .tab-btn:hover {
            border-color: #222;
            background: #f9f9f9;
          }
          
          .tab-btn.active {
            border-color: #222;
            background: #f0f0f0;
            font-weight: 600;
          }
          
          .tab-title {
            font-weight: 600;
            color: #222;
            margin-bottom: 4px;
          }
          
          .tab-desc {
            color: #555;
            font-size: 13px;
            line-height: 1.4;
          }
          
          .export-actions {
            padding: 24px;
          }
          
          .export-buttons {
            display: flex;
            gap: 16px;
            margin-bottom: 16px;
          }
          
          .btn-csv, .btn-print {
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            color: white;
          }
          
          .btn-csv {
            background: #2e7d32;
          }
          
          .btn-csv:hover:not(:disabled) {
            background: #1b5e20;
          }
          
          .btn-print {
            background: #1976d2;
          }
          
          .btn-print:hover:not(:disabled) {
            background: #0d47a1;
          }
          
          .btn-print:disabled {
            background: #ccc;
            cursor: not-allowed;
          }
          
          .status {
            padding: 12px 16px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 14px;
            position: relative;
          }
          
          .status.success {
            background: #e8f5e9;
            color: #2e7d32;
            border-left: 3px solid #4caf50;
          }
          
          .status.error {
            background: #ffebee;
            color: #d32f2f;
            border-left: 3px solid #f44336;
          }
          
          .close-btn {
            margin-left: auto;
            background: none;
            border: none;
            cursor: pointer;
            color: inherit;
            opacity: 0.7;
          }
          
          .close-btn:hover {
            opacity: 1;
          }
          
          .preview-section {
            padding: 24px;
            border-top: 1px solid #eee;
          }
          
          .preview-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
          }
          
          .preview-header h2 {
            margin: 0;
            color: #222;
            font-size: 20px;
          }
          
          .preview-empty {
            text-align: center;
            padding: 40px;
            color: #666;
          }
          
          .empty-icon {
            margin-bottom: 16px;
            opacity: 0.6;
          }
          
          .preview-table-container {
            overflow-x: auto;
            border: 1px solid #ddd;
            border-radius: 8px;
          }
          
          .preview-table {
            width: 100%;
            border-collapse: collapse;
            min-width: 800px;
          }
          
          .preview-table th,
          .preview-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #eee;
            color: #222;
          }
          
          .preview-table th {
            background: #f9f9f9;
            font-weight: 600;
            color: #222;
          }
          
          .preview-table tr:last-child td {
            border-bottom: none;
          }
          
          .preview-table tr:hover td {
            background: #fcfcfc;
          }
          
          .preview-footer {
            text-align: center;
            padding: 12px;
            color: #666;
            font-style: italic;
            border-top: 1px solid #eee;
            font-size: 13px;
          }
          
          .spin {
            animation: spin 1s linear infinite;
          }
          
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          
          @media (max-width: 768px) {
            .report-page {
              padding: 0 16px;
            }
            
            .filter-grid {
              grid-template-columns: 1fr;
            }
            
            .date-inputs, .range-inputs {
              flex-direction: column;
              align-items: stretch;
              gap: 8px;
            }
            
            .date-inputs span, .range-inputs span {
              text-align: center;
              color: #555;
            }
            
            .filter-actions {
              flex-direction: column;
            }
            
            .btn-preview, .btn-clear {
              width: 100%;
              justify-content: center;
            }
            
            .export-buttons {
              flex-direction: column;
            }
            
            .report-tabs {
              grid-template-columns: 1fr;
            }
          }
          
          @media (max-width: 480px) {
            .report-header {
              padding: 16px;
            }
            
            .report-header h1 {
              font-size: 20px;
            }
            
            .filter-card label {
              font-size: 14px;
            }
            
            .tab-title {
              font-size: 15px;
            }
            
            .tab-desc {
              font-size: 12px;
            }
          }
        `}</style>


        
      </div>
    </div>

    

  );
};

export default DownloadReports;