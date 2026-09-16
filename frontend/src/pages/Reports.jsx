import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Loader } from '../components/Loader';
import { FilterIcon, DownloadIcon, AlertTriangleIcon, CheckCircleIcon, ClockIcon } from '../components/Icons';

const Reports = () => {
  const { apiFetch } = useAuth();
  const [agingData, setAgingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [basis, setBasis] = useState('lastMovementAt'); // lastMovementAt, lastSaleAt, lastPurchaseAt, createdAt
  const [selectedProducts, setSelectedProducts] = useState([]); // For individual product selection

  const loadData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await apiFetch(`/reports/aging?basis=${basis}`);
      if (res.success) {
        // Sort data: critical (180+ days) first, then warning (90-179 days), then healthy (<90 days)
        const sortedData = [...res.data].sort((a, b) => {
          const getPriority = (days) => {
            if (days >= 180) return 0; // Critical - highest priority
            if (days >= 90) return 1;  // Warning - medium priority  
            return 2;                 // Healthy - lowest priority
          };
          const priorityA = getPriority(a.diffDays);
          const priorityB = getPriority(b.diffDays);
          
          if (priorityA !== priorityB) return priorityA - priorityB;
          // Within same priority, sort by days (most critical first)
          return b.diffDays - a.diffDays;
        });
        setAgingData(sortedData);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to fetch aging bucket reports.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate summary statistics
  const getSummaryStats = () => {
    if (agingData.length === 0) return { total: 0, critical: 0, warning: 0, healthy: 0 };
    
    return {
      total: agingData.length,
      critical: agingData.filter(item => item.diffDays >= 180).length,
      warning: agingData.filter(item => item.diffDays >= 90 && item.diffDays < 180).length,
      healthy: agingData.filter(item => item.diffDays < 90).length
    };
  };

  useEffect(() => {
    loadData();
  }, [basis]);

  const getBucketBadgeClass = (days) => {
    if (days >= 180) return 'danger';
    if (days >= 90) return 'warning';
    return 'info';
  };

  const handleDownloadReport = () => {
    const dataToDownload = selectedProducts.length > 0 
      ? agingData.filter(item => selectedProducts.includes(item.sku))
      : agingData;
    
    if (dataToDownload.length === 0) {
      setErrorMsg('No data available to download.');
      return;
    }

    // Create CSV headers
    const headers = ['Product SKU', 'Product Name', 'Warehouse', 'Warehouse Code', 'Current Stock', 'Last Activity Date', 'Duration Inactive (Days)', 'Aging Bucket'];
    
    // Create CSV rows
    const rows = dataToDownload.map(item => [
      item.sku,
      item.productName,
      item.warehouseName,
      item.warehouseCode,
      item.quantity,
      item.compareDate ? new Date(item.compareDate).toLocaleDateString() : 'No activity recorded',
      item.diffDays,
      item.matchedBucket
    ]);

    // Combine headers and rows
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    
    // Create download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    const selectionSuffix = selectedProducts.length > 0 ? `_${selectedProducts.length}_products` : '_all';
    a.setAttribute('download', `inventory_aging_report_${basis}${selectionSuffix}_${new Date().toISOString().split('T')[0]}.csv`);
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleProductSelection = (sku) => {
    setSelectedProducts(prev => 
      prev.includes(sku) 
        ? prev.filter(id => id !== sku)
        : [...prev, sku]
    );
  };

  const handleSelectAll = () => {
    setSelectedProducts(agingData.map(item => item.sku));
  };

  const handleClearSelection = () => {
    setSelectedProducts([]);
  };

  return (
    <div>
      <div className="page-title-section">
        <div>
          <h1 className="page-title">Inventory Aging Reports</h1>
          <p className="page-subtitle">Identify slow-moving stock, dead inventory volumes, and warehouse resource allocation.</p>
        </div>
        <button 
          className="btn btn-secondary" 
          onClick={handleDownloadReport}
          disabled={agingData.length === 0}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <DownloadIcon style={{ width: '16px', height: '16px' }} />
          <span>Download Report</span>
        </button>
      </div>

      {errorMsg && <div className="alert-bar error">{errorMsg}</div>}

      {/* Summary Statistics Cards */}
      {!loading && agingData.length > 0 && (
        <div className="metrics-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-title">Total Items</span>
              <div className="metric-icon-box blue">
                <CheckCircleIcon style={{ width: '18px', height: '18px' }} />
              </div>
            </div>
            <div className="metric-value">{getSummaryStats().total}</div>
            <div className="metric-trend neutral">Products tracked</div>
          </div>
          
          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-title">Critical (180+ days)</span>
              <div className="metric-icon-box red">
                <AlertTriangleIcon style={{ width: '18px', height: '18px' }} />
              </div>
            </div>
            <div className="metric-value" style={{ color: 'var(--danger-color)' }}>{getSummaryStats().critical}</div>
            <div className="metric-trend up">Needs attention</div>
          </div>
          
          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-title">Warning (90-179 days)</span>
              <div className="metric-icon-box" style={{ backgroundColor: 'var(--warning-light)', color: '#856404' }}>
                <ClockIcon style={{ width: '18px', height: '18px' }} />
              </div>
            </div>
            <div className="metric-value" style={{ color: '#856404' }}>{getSummaryStats().warning}</div>
            <div className="metric-trend neutral">Monitor closely</div>
          </div>
          
          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-title">Healthy (&lt;90 days)</span>
              <div className="metric-icon-box" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success-color)' }}>
                <CheckCircleIcon style={{ width: '18px', height: '18px' }} />
              </div>
            </div>
            <div className="metric-value" style={{ color: 'var(--success-color)' }}>{getSummaryStats().healthy}</div>
            <div className="metric-trend up">Good turnover</div>
          </div>
        </div>
      )}

      {/* Control Filters */}
      <div className="filter-card" style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary-color)' }}>
            <FilterIcon style={{ width: '16px', height: '16px' }} />
            <label className="form-label" style={{ marginBottom: 0, fontWeight: '600', color: 'var(--text-dark)' }}>Calculate Aging Status Based On:</label>
          </div>
          <select 
            className="form-input" 
            style={{ width: '220px' }} 
            value={basis} 
            onChange={(e) => setBasis(e.target.value)}
          >
            <option value="lastMovementAt">Last Stock Movement Date</option>
            <option value="lastSaleAt">Last Customer Sale Date</option>
            <option value="lastPurchaseAt">Last Vendor Purchase Date</option>
            <option value="createdAt">Product Creation Date</option>
          </select>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <button 
          type="button" 
          className="btn btn-secondary" 
          onClick={handleSelectAll}
          disabled={agingData.length === 0}
          style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
        >
          Select All
        </button>
        <button 
          type="button" 
          className="btn btn-secondary" 
          onClick={handleClearSelection}
          disabled={selectedProducts.length === 0}
          style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
        >
          Clear Selection
        </button>
        {selectedProducts.length > 0 && (
          <span style={{ fontSize: '0.8rem', color: 'var(--primary-color)', fontWeight: '600' }}>
            {selectedProducts.length} selected
          </span>
        )}
      </div>
    </div>

      {/* Aging table list */}
      {loading ? (
        <Loader 
          message="Aggregating aging tables..." 
          subtitle="Analyzing stock dwell times, turnover velocity, and inactive product cohorts..." 
        />
      ) : agingData.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: 'var(--panel-background)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          <span style={{ color: 'var(--text-muted)' }}>No aging data records found. Make sure products are seeded.</span>
        </div>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input 
                    type="checkbox" 
                    checked={selectedProducts.length === agingData.length && agingData.length > 0}
                    onChange={(e) => e.target.checked ? handleSelectAll() : handleClearSelection()}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th>Product SKU</th>
                <th>Product Name</th>
                <th>Warehouse</th>
                <th>Current Stock</th>
                <th>Last activity Date</th>
                <th>Duration Inactive</th>
                <th>Aging Bucket</th>
              </tr>
            </thead>
            <tbody>
              {agingData.map((item, idx) => {
                const isCritical = item.diffDays >= 180;
                const isWarning = item.diffDays >= 90 && item.diffDays < 180;
                const isHealthy = item.diffDays < 90;
                
                const rowStyle = {
                  backgroundColor: isCritical ? '#fee2e2' : isWarning ? '#fef3c7' : isHealthy ? '#dcfce7' : 'inherit',
                  borderLeft: isCritical ? '4px solid #dc3545' : isWarning ? '4px solid #ffc107' : isHealthy ? '4px solid #198754' : 'none',
                  transition: 'all 0.2s ease'
                };
                
                return (
                  <tr 
                    key={idx} 
                    style={rowStyle}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateX(4px)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateX(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <td style={{ textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedProducts.includes(item.sku)}
                        onChange={() => handleProductSelection(item.sku)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ fontWeight: '700', color: 'var(--primary-color)' }}>{item.sku}</td>
                    <td style={{ fontWeight: '500' }}>{item.productName}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontWeight: '600' }}>{item.warehouseName}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', backgroundColor: 'var(--background-color)', padding: '2px 6px', borderRadius: '4px' }}>
                          {item.warehouseCode}
                        </span>
                      </div>
                    </td>
                    <td style={{ fontWeight: '700' }}>{item.quantity} units</td>
                    <td>
                      {item.compareDate 
                        ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <ClockIcon style={{ width: '14px', height: '14px', color: 'var(--text-muted)' }} />
                            <span>{new Date(item.compareDate).toLocaleDateString()}</span>
                          </div>
                        ) 
                        : (
                          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No activity recorded</span>
                        )
                      }
                    </td>
                    <td style={{ fontWeight: '700', color: isCritical ? '#dc3545' : isWarning ? '#856404' : isHealthy ? '#198754' : 'inherit' }}>
                      {item.diffDays} days ago
                    </td>
                    <td>
                      <span 
                        className={`pill ${getBucketBadgeClass(item.diffDays)}`}
                        style={{ 
                          fontWeight: '600',
                          fontSize: '0.8rem',
                          padding: '4px 12px',
                          borderRadius: '6px',
                          backgroundColor: isCritical ? '#dc3545' : isWarning ? '#ffc107' : isHealthy ? '#198754' : 'var(--info-color)',
                          color: 'white'
                        }}
                      >
                        {isCritical && <AlertTriangleIcon style={{ width: '12px', height: '12px', marginRight: '4px', display: 'inline', verticalAlign: 'middle' }} />}
                        {item.matchedBucket}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Reports;
