// src/components/admin/DownloadReports.jsx
import React, { useState } from 'react';
import {
  Download,
  Calendar,
  Eye,
  FileText,
  TableIcon,
  BarChart3,
  Coffee,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  List,
  Sun,
  Clock,
} from 'lucide-react';

const DownloadReports = () => {
  const [activeTab, setActiveTab] = useState('monthly_sales');
  const [frequency, setFrequency] = useState('monthly'); // daily, weekly, monthly
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [previewData, setPreviewData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [exportStatus, setExportStatus] = useState('');

  const token = localStorage.getItem("admin_token");
  const headers = { Authorization: `Bearer ${token}` };

  const reportTabs = [
    { id: 'monthly_sales', label: 'Monthly Sales', icon: BarChart3, description: 'Revenue and sales metrics by period' },
    { id: 'beverage_report', label: 'Beverage Report', icon: Coffee, description: 'Sales and inventory data by beverage' },
  ];

  const isValidRange = startDate && endDate && new Date(startDate) <= new Date(endDate);

  const fetchReportData = async () => {
    const endpoint =
      activeTab === 'monthly_sales'
        ? '/api/admin/monthly-sales/'
        : '/api/admin/beverage-report/';

    const res = await fetch(
      `http://localhost:8000${endpoint}?start=${startDate}&end=${endDate}&freq=${frequency}`,
      { headers }
    );

    if (!res.ok) throw new Error('Failed to fetch data');
    return await res.json();
  };

  const handlePreview = async () => {
    if (!isValidRange) return;
    setPreviewLoading(true);
    setShowPreview(false);
    try {
      const data = await fetchReportData();
      setPreviewData(data || []);
      setShowPreview(true);
    } catch (err) {
      console.error("Preview failed:", err);
      setPreviewData([]);
      setShowPreview(true);
    }
    setPreviewLoading(false);
  };

  const exportToCSV = (data, filename) => {
    if (!data.length) return;
    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).map(v => `"${v || ''}"`).join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToExcel = (data, filename) => {
    // For simplicity, reuse CSV with .xlsx extension
    // Use SheetJS later for true Excel
    exportToCSV(data, filename);
  };

  const handleExport = async (format) => {
    if (!isValidRange) return;
    setLoading(true);
    setExportStatus('');
    try {
      const data = await fetchReportData();
      if (!data.length) {
        setExportStatus('no-data');
        setLoading(false);
        return;
      }

      const startLabel = startDate.split('-').slice(1).join('');
      const endLabel = endDate.split('-').slice(1).join('');
      const baseName =
        activeTab === 'monthly_sales' ? 'Sales_Report' : 'Beverage_Report';
      const freqLabel = frequency.charAt(0).toUpperCase() + frequency.slice(1);
      const filename = `${baseName}_${freqLabel}_${startLabel}_to_${endLabel}`;

      if (format === 'csv') exportToCSV(data, filename);
      else if (format === 'xlsx') exportToExcel(data, filename);

      setExportStatus('success');
    } catch (err) {
      console.error("Export failed:", err);
      setExportStatus('error');
    }
    setLoading(false);
  };

  const renderDataPreview = () => {
    if (!previewData.length) {
      return <p className="report-preview-empty">No data found for this range.</p>;
    }

    const keys = Object.keys(previewData[0]);
    const previewRows = previewData.slice(0, 10);

    return (
      <div className="report-preview-container">
        <div className="report-preview-header">
          <h3 className="report-preview-title">
            <TableIcon className="icon-sm" />
            Data Preview ({previewData.length} records)
          </h3>
          <span className="report-preview-subtitle">First 10 rows</span>
        </div>

        <div className="report-preview-table-wrapper">
          <table className="report-preview-table">
            <thead>
              <tr>
                {keys.map(key => (
                  <th key={key}>{key.replace(/_/g, ' ').toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, idx) => (
                <tr key={idx}>
                  {keys.map(key => (
                    <td key={key}>{row[key] ?? '-'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {previewData.length > 10 && (
          <p className="report-preview-more">... {previewData.length - 10} more records</p>
        )}
      </div>
    );
  };

  return (
    <div className="report-page">
      <div className="report-container">

        {/* Header */}
        <div className="report-header">
          <div className="report-icon">
            <Download />
          </div>
          <div className="report-title-section">
            <h1 className="report-title">Download Reports</h1>
            <p className="report-subtitle">Generate daily, weekly, or monthly reports</p>
          </div>
        </div>

        {/* Filters */}
        <div className="report-filters">
          <div className="form-row">
            <div className="form-group wide">
              <label>
                <Calendar className="icon-xs" /> Date Range
              </label>
              <div className="date-pickers">
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="date-input"
                />
                <span className="date-separator">→</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="date-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Frequency</label>
              <select value={frequency} onChange={e => setFrequency(e.target.value)}>
                <option value="daily">
                  <Sun /> Daily
                </option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div className="form-actions">
              <button
                disabled={!isValidRange || previewLoading}
                onClick={handlePreview}
                className="btn btn-preview"
              >
                {previewLoading ? <Loader2 className="icon-spin" /> : <Eye />}
                Preview
              </button>
            </div>
          </div>

          {!isValidRange && (
            <div className="alert alert-error">
              <AlertCircle /> End date must not be before start date.
            </div>
          )}
        </div>

        {/* Report Type & Export */}
        <div className="report-section">
          <h2 className="section-title">Select Report Type</h2>
          <div className="tab-group">
            {reportTabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setShowPreview(false);
                  }}
                  className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
                >
                  <div className="tab-header">
                    <Icon className="icon-md" />
                    <h3>{tab.label}</h3>
                  </div>
                  <p className="tab-description">{tab.description}</p>
                </button>
              );
            })}
          </div>

          <div className="export-section">
            <h3 className="export-title">Export Options</h3>
            <div className="export-buttons">
              <button
                disabled={!isValidRange || loading}
                onClick={() => handleExport('csv')}
                className="btn btn-csv"
              >
                {loading ? <Loader2 className="icon-spin" /> : <FileText />}
                Export CSV
              </button>
              <button
                disabled={!isValidRange || loading}
                onClick={() => handleExport('xlsx')}
                className="btn btn-excel"
              >
                {loading ? <Loader2 className="icon-spin" /> : <TableIcon />}
                Export Excel
              </button>
            </div>

            {/* Status Messages */}
            {exportStatus === 'success' && (
              <div className="alert alert-success">
                <CheckCircle /> Export successful!
                <button onClick={() => setExportStatus('')} className="alert-close"><X /></button>
              </div>
            )}

            {exportStatus === 'error' && (
              <div className="alert alert-error">
                <AlertCircle /> Export failed.
                <button onClick={() => setExportStatus('')} className="alert-close"><X /></button>
              </div>
            )}

            {exportStatus === 'no-data' && (
              <div className="alert alert-warning">
                <AlertCircle /> No data found for this range.
                <button onClick={() => setExportStatus('')} className="alert-close"><X /></button>
              </div>
            )}
          </div>
        </div>

        {/* Data Preview */}
        {showPreview && <div className="report-preview">{renderDataPreview()}</div>}
      </div>

      {/* 💡 CSS — Clean, Responsive, Mobile-Friendly */}
      <style jsx>{`
        .report-page {
          min-height: 100vh;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(135deg, #f8f9fa, #e9ecef);
          padding: 16px;
        }

        .report-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        /* Header */
        .report-header {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 24px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          margin-bottom: 24px;
        }

        .report-icon {
          padding: 12px;
          background: linear-gradient(135deg, #4361ee, #3a0ca3);
          border-radius: 12px;
          color: white;
        }

        .report-icon svg {
          width: 32px;
          height: 32px;
        }

        .report-title-section h1 {
          font-size: 28px;
          font-weight: 700;
          color: #1a1a1a;
          margin: 0;
        }

        .report-subtitle {
          color: #666;
          margin: 4px 0 0 0;
        }

        /* Filters */
        .report-filters {
          background: white;
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.06);
          margin-bottom: 24px;
        }

        .form-row {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          align-items: end;
        }

        .form-group {
          flex: 1;
          min-width: 200px;
        }

        .form-group.wide {
          flex: 2;
          min-width: 300px;
        }

        .form-group label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #333;
          margin-bottom: 8px;
        }

        .form-group .icon-xs {
          width: 14px;
          height: 14px;
          vertical-align: middle;
          margin-right: 4px;
        }

        .date-pickers {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .date-input {
          flex: 1;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 15px;
        }

        .date-separator {
          color: #aaa;
          font-weight: bold;
        }

        select {
          width: 100%;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 15px;
          background: #fff;
        }

        .form-actions .btn-preview {
          padding: 12px 20px;
          font-weight: 600;
          border: none;
          border-radius: 8px;
          background: #5a67d8;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .form-actions .btn-preview:disabled {
          background: #e2e8f0;
          color: #94a3b8;
          cursor: not-allowed;
        }

        /* Alert */
        .alert {
          margin-top: 16px;
          padding: 12px 16px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }

        .alert-error {
          background: #fee2e2;
          color: #b91c1c;
          border: 1px solid #fecaca;
        }

        .alert-success {
          background: #dcfce7;
          color: #166534;
          border: 1px solid #bbf7d0;
        }

        .alert-warning {
          background: #fff7ed;
          color: #9a3412;
          border: 1px solid #fbdd9e;
        }

        .alert-close {
          margin-left: auto;
          background: none;
          border: none;
          cursor: pointer;
          color: inherit;
        }

        /* Report Section */
        .report-section {
          background: white;
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.06);
          margin-bottom: 24px;
        }

        .section-title {
          font-size: 18px;
          font-weight: 700;
          color: #2d3748;
          margin-bottom: 20px;
        }

        .tab-group {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .tab-item {
          border: 1px solid #e2e8f0;
          padding: 16px;
          border-radius: 12px;
          text-align: left;
          background: #f8fafc;
          cursor: pointer;
          transition: all 0.2s;
        }

        .tab-item.active {
          border-color: #5a67d8;
          background: #ebf4ff;
        }

        .tab-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }

        .tab-header h3 {
          font-weight: 600;
          color: #2d3748;
          margin: 0;
        }

        .tab-description {
          font-size: 14px;
          color: #666;
          margin: 0;
        }

        .export-title {
          font-size: 15px;
          font-weight: 600;
          color: #2d3748;
          margin-bottom: 12px;
          padding-top: 16px;
          border-top: 1px solid #eee;
        }

        .export-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 16px;
        }

        .btn {
          padding: 10px 16px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .btn-csv {
          background: #10b981;
          color: white;
        }

        .btn-excel {
          background: #3b82f6;
          color: white;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .icon-spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .icon-sm { width: 18px; height: 18px; }
        .icon-md { width: 24px; height: 24px; }

        /* Preview */
        .report-preview {
          background: white;
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.06);
        }

        .report-preview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .report-preview-title {
          font-size: 18px;
          font-weight: 600;
          color: #2d3748;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .report-preview-subtitle {
          font-size: 14px;
          color: #666;
        }

        .report-preview-table-wrapper {
          overflow-x: auto;
        }

        .report-preview-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        .report-preview-table th,
        .report-preview-table td {
          padding: 10px 12px;
          text-align: left;
          border-bottom: 1px solid #eee;
        }

        .report-preview-table th {
          background: #f1f5f9;
          font-weight: 600;
          color: #4a5568;
          text-transform: uppercase;
          font-size: 12px;
        }

        .report-preview-table tr:hover td {
          background: #f8fafc;
        }

        .report-preview-empty {
          text-align: center;
          color: #999;
          font-style: italic;
          padding: 20px;
        }

        .report-preview-more {
          font-size: 12px;
          color: #777;
          text-align: center;
          margin-top: 8px;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .date-pickers {
            flex-direction: column;
            gap: 8px;
          }

          .form-row {
            flex-direction: column;
          }

          .form-group, .form-group.wide {
            min-width: 100%;
          }

          .export-buttons {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default DownloadReports;