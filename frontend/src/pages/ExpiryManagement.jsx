import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Loader } from '../components/Loader';
import { FilterIcon, ClockIcon } from '../components/Icons';

const ExpiryManagement = () => {
  const { apiFetch } = useAuth();
  const [expiryItems, setExpiryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
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

        // Sort: expired first, then closest expiry
        processed.sort((a, b) => a.daysLeft - b.daysLeft);
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

  return (
    <div>
      <div className="page-title-section">
        <div>
          <h1 className="page-title">Expiry Management</h1>
          <p className="page-subtitle">Track perishable inventory items, check batch lifespans, and prevent product wastage.</p>
        </div>
      </div>

      {errorMsg && <div className="alert-bar error">{errorMsg}</div>}

      {/* Filter Options */}
      <div className="filter-card" style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
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
              {expiryItems.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: '700' }}>{item.sku}</td>
                  <td style={{ fontWeight: '500' }}>{item.name}</td>
                  <td>{item.warehouseName} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({item.warehouseCode})</span></td>
                  <td style={{ fontWeight: '600' }}>{item.quantity} {item.unit}</td>
                  <td style={{ fontWeight: '600', color: item.daysLeft < 0 ? 'var(--danger-color)' : 'inherit' }}>
                    {item.expiryDate.toLocaleDateString()}
                  </td>
                  <td>
                    <span className={`pill ${item.daysLeft < 0 ? 'danger' : item.daysLeft <= 7 ? 'warning' : 'info'}`}>
                      {item.status}
                    </span>
                  </td>
                  <td style={{ fontWeight: '700', color: item.daysLeft < 0 ? 'var(--danger-color)' : item.daysLeft <= 7 ? 'var(--warning-color)' : 'inherit' }}>
                    {item.daysLeft < 0 
                      ? `Expired by ${Math.abs(item.daysLeft)} days` 
                      : `${item.daysLeft} days remaining`
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ExpiryManagement;
