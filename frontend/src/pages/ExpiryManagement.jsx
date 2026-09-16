import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Loader } from '../components/Loader';
import { FilterIcon, ClockIcon, DownloadIcon, AlertTriangleIcon, CheckCircleIcon, AlertCircleIcon } from '../components/Icons';

const ExpiryManagement = () => {
  const { apiFetch } = useAuth();
  const [expiryItems, setExpiryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]); // For individual product selection
  
  // Filters
  const [daysThreshold, setDaysThreshold] = useState(30); // Show items expiring in 30 days
  const [filterType, setFilterType] = useState('all'); // 'all', 'expired', 'expiring_soon'

  const loadData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      // 1. Fetch balances to get quantities and warehouses
      const balRes = await apiFetch('/inventory');
      
      if (balRes.success) {
        const balances = balRes.data;
        const now = new Date();
        const thresholdDate = new Date();
        thresholdDate.setDate(now.getDate() + Number(daysThreshold));

        const processed = [];

        balances.forEach((bal) => {
          const product = bal.productId;
          if (!product || !product.customFields) return;

          // Check if product has an expiryDate custom attribute
          const expVal = product.customFields.expiryDate;
          if (!expVal) return;

          const expDate = new Date(expVal);
          const diffTime = expDate.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          const status = diffDays < 0 
            ? 'Expired' 
            : diffDays <= 7 
              ? 'Critical (7 Days)' 
              : 'Expiring Soon';

          // Filter by logic
          if (filterType === 'expired' && diffDays >= 0) return;
          if (filterType === 'expiring_soon' && (diffDays < 0 || diffDays > Number(daysThreshold))) return;

          processed.push({
            id: bal._id,
            sku: product.sku,
            name: product.name,
            warehouseName: bal.warehouseId?.name,
            warehouseCode: bal.warehouseId?.code,
            quantity: bal.quantity,
            unit: product.unit,
            expiryDate: expDate,
            daysLeft: diffDays,
            status
          });
        });

        // Sort: expired first, then critical (≤7 days), then warning (8-30 days), then healthy (>30 days)
        processed.sort((a, b) => {
          const getPriority = (days) => {
            if (days < 0) return 0; // Expired - highest priority
            if (days <= 7) return 1; // Critical - urgent priority
            if (days <= 30) return 2; // Warning - medium priority
            return 3; // Healthy - lowest priority
          };
          const priorityA = getPriority(a.daysLeft);
          const priorityB = getPriority(b.daysLeft);
          
          if (priorityA !== priorityB) return priorityA - priorityB;
          // Within same priority, sort by days (most urgent first)
          return a.daysLeft - b.daysLeft;
        });
        setExpiryItems(processed);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to query expiry management information.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [daysThreshold, filterType]);

  // Calculate summary statistics
  const getSummaryStats = () => {
    if (expiryItems.length === 0) return { total: 0, expired: 0, critical: 0, warning: 0 };
    
    return {
      total: expiryItems.length,
      expired: expiryItems.filter(item => item.daysLeft < 0).length,
      critical: expiryItems.filter(item => item.daysLeft >= 0 && item.daysLeft <= 7).length,
      warning: expiryItems.filter(item => item.daysLeft > 7 && item.daysLeft <= Number(daysThreshold)).length
    };
  };

  const handleDownloadReport = () => {
    const dataToDownload = selectedProducts.length > 0 
      ? expiryItems.filter(item => selectedProducts.includes(item.sku))
      : expiryItems;
    
    if (dataToDownload.length === 0) {
      setErrorMsg('No data available to download.');
      return;
    }

    // Create CSV headers
    const headers = ['Product SKU', 'Product Name', 'Warehouse', 'Warehouse Code', 'Quantity On Hand', 'Unit', 'Expiry Date', 'Shelf Status', 'Lifespan Remaining (Days)'];
    
    // Create CSV rows
    const rows = dataToDownload.map(item => [
      item.sku,
      item.name,
      item.warehouseName,
      item.warehouseCode,
      item.quantity,
      item.unit,
      item.expiryDate.toLocaleDateString(),
      item.status,
      item.daysLeft < 0 ? `Expired by ${Math.abs(item.daysLeft)} days` : `${item.daysLeft} days remaining`
    ]);

    // Combine headers and rows
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    
    // Create download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    const selectionSuffix = selectedProducts.length > 0 ? `_${selectedProducts.length}_products` : '_all';
    a.setAttribute('download', `expiry_management_report_${filterType}${selectionSuffix}_${new Date().toISOString().split('T')[0]}.csv`);
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
    setSelectedProducts(expiryItems.map(item => item.sku));
  };

  const handleClearSelection = () => {
    setSelectedProducts([]);
  };

  return (
    <div>
      <div className="page-title-section">
        <div>
          <h1 className="page-title">Expiry Management</h1>
          <p className="page-subtitle">Track perishable inventory items, check batch lifespans, and prevent product wastage.</p>
        </div>
        <button 
          className="btn btn-secondary" 
          onClick={handleDownloadReport}
          disabled={expiryItems.length === 0}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <DownloadIcon style={{ width: '16px', height: '16px' }} />
          <span>Download Report</span>
        </button>
      </div>

      {errorMsg && <div className="alert-bar error">{errorMsg}</div>}

      {/* Summary Statistics Cards */}
      {!loading && expiryItems.length > 0 && (
        <div className="metrics-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-title">Total Tracked</span>
              <div className="metric-icon-box blue">
                <CheckCircleIcon style={{ width: '18px', height: '18px' }} />
              </div>
            </div>
            <div className="metric-value">{getSummaryStats().total}</div>
            <div className="metric-trend neutral">Items with expiry dates</div>
          </div>
          
          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-title">Already Expired</span>
              <div className="metric-icon-box red">
                <AlertCircleIcon style={{ width: '18px', height: '18px' }} />
              </div>
            </div>
            <div className="metric-value" style={{ color: 'var(--danger-color)' }}>{getSummaryStats().expired}</div>
            <div className="metric-trend up">Immediate action needed</div>
          </div>
          
          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-title">Critical (≤7 days)</span>
              <div className="metric-icon-box" style={{ backgroundColor: 'var(--warning-light)', color: '#856404' }}>
                <AlertTriangleIcon style={{ width: '18px', height: '18px' }} />
              </div>
            </div>
            <div className="metric-value" style={{ color: '#856404' }}>{getSummaryStats().critical}</div>
            <div className="metric-trend up">Urgent attention</div>
          </div>
          
          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-title">Expiring Soon</span>
              <div className="metric-icon-box" style={{ backgroundColor: 'var(--info-light)', color: '#0c5460' }}>
                <ClockIcon style={{ width: '18px', height: '18px' }} />
              </div>
            </div>
            <div className="metric-value" style={{ color: '#0c5460' }}>{getSummaryStats().warning}</div>
            <div className="metric-trend neutral">Plan accordingly</div>
          </div>
        </div>
      )}

      {/* Filter Options */}
      <div className="filter-card" style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary-color)' }}>
            <FilterIcon style={{ width: '15px', height: '15px' }} />
            <label className="form-label" style={{ marginBottom: 0, color: 'var(--text-dark)' }}>Filter Status:</label>
          </div>
          <select 
            className="form-input" 
            style={{ width: '160px' }} 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">All Tracked Items</option>
            <option value="expired">Expired Only</option>
            <option value="expiring_soon">Expiring Soon Only</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary-color)' }}>
            <ClockIcon style={{ width: '15px', height: '15px' }} />
            <label className="form-label" style={{ marginBottom: 0, color: 'var(--text-dark)' }}>Expiry Threshold Days:</label>
          </div>
          <input 
            type="number" 
            className="form-input" 
            style={{ width: '80px' }} 
            value={daysThreshold} 
            onChange={(e) => setDaysThreshold(e.target.value)}
            min="1"
          />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>days</span>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <button 
          type="button" 
          className="btn btn-secondary" 
          onClick={handleSelectAll}
          disabled={expiryItems.length === 0}
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

      {/* List Table */}
      {loading ? (
        <Loader 
          message="Scanning batch records for expiries..." 
          subtitle="Evaluating item expiration dates, batch numbers, and shelf-life thresholds..." 
        />
      ) : expiryItems.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: 'var(--panel-background)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          <span style={{ color: 'var(--text-muted)' }}>No expiring inventory found matching the filters.</span>
        </div>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input 
                    type="checkbox" 
                    checked={selectedProducts.length === expiryItems.length && expiryItems.length > 0}
                    onChange={(e) => e.target.checked ? handleSelectAll() : handleClearSelection()}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th>Product SKU</th>
                <th>Product Name</th>
                <th>Warehouse Location</th>
                <th>Quantity On Hand</th>
                <th>Expiry Date</th>
                <th>Shelf Status</th>
                <th>Lifespan Remaining</th>
              </tr>
            </thead>
            <tbody>
              {expiryItems.map((item) => {
                const isExpired = item.daysLeft < 0;
                const isCritical = item.daysLeft >= 0 && item.daysLeft <= 7;
                const isWarning = item.daysLeft > 7 && item.daysLeft <= Number(daysThreshold);
                const isHealthy = item.daysLeft > Number(daysThreshold);
                
                const rowStyle = {
                  backgroundColor: isExpired ? '#fee2e2' : isCritical ? '#fef3c7' : isWarning ? '#e0f2fe' : isHealthy ? '#dcfce7' : 'inherit',
                  borderLeft: isExpired ? '4px solid #dc3545' : isCritical ? '4px solid #ffc107' : isWarning ? '4px solid #0dcaf0' : isHealthy ? '4px solid #198754' : 'none',
                  transition: 'all 0.2s ease'
                };
                
                return (
                  <tr 
                    key={item.id}
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
                    <td style={{ fontWeight: '500' }}>{item.name}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontWeight: '600' }}>{item.warehouseName}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', backgroundColor: 'var(--background-color)', padding: '2px 6px', borderRadius: '4px' }}>
                          {item.warehouseCode}
                        </span>
                      </div>
                    </td>
                    <td style={{ fontWeight: '700' }}>{item.quantity} {item.unit}</td>
                    <td style={{ fontWeight: '600', color: isExpired ? '#dc3545' : isCritical ? '#856404' : isWarning ? '#0c5460' : 'inherit' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <ClockIcon style={{ width: '14px', height: '14px' }} />
                        <span>{item.expiryDate.toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td>
                      <span 
                        className={`pill ${item.daysLeft < 0 ? 'danger' : item.daysLeft <= 7 ? 'warning' : 'info'}`}
                        style={{ 
                          fontWeight: '600',
                          fontSize: '0.8rem',
                          padding: '4px 12px',
                          borderRadius: '6px',
                          backgroundColor: isExpired ? '#dc3545' : isCritical ? '#ffc107' : isWarning ? '#0dcaf0' : isHealthy ? '#198754' : 'var(--info-color)',
                          color: 'white'
                        }}
                      >
                        {isExpired && <AlertCircleIcon style={{ width: '12px', height: '12px', marginRight: '4px', display: 'inline', verticalAlign: 'middle' }} />}
                        {isCritical && <AlertTriangleIcon style={{ width: '12px', height: '12px', marginRight: '4px', display: 'inline', verticalAlign: 'middle' }} />}
                        {item.status}
                      </span>
                    </td>
                    <td style={{ fontWeight: '700', color: isExpired ? '#dc3545' : isCritical ? '#856404' : isWarning ? '#0c5460' : 'inherit' }}>
                      {item.daysLeft < 0 
                        ? `Expired by ${Math.abs(item.daysLeft)} days` 
                        : `${item.daysLeft} days remaining`
                    }
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

export default ExpiryManagement;
