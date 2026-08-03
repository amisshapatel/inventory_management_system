import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const Reports = () => {
  const { apiFetch } = useAuth();
  const [agingData, setAgingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [basis, setBasis] = useState('lastMovementAt'); // lastMovementAt, lastSaleAt, lastPurchaseAt, createdAt

  const loadData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await apiFetch(`/reports/aging?basis=${basis}`);
      if (res.success) {
        setAgingData(res.data);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to fetch aging bucket reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [basis]);

  const getBucketBadgeClass = (days) => {
    if (days >= 180) return 'danger';
    if (days >= 90) return 'warning';
    return 'info';
  };

  return (
    <div>
      <div className="page-title-section">
        <div>
          <h1 className="page-title">Inventory Aging Reports</h1>
          <p className="page-subtitle">Identify slow-moving stock, dead inventory volumes, and warehouse resource allocation.</p>
        </div>
      </div>

      {errorMsg && <div className="alert-bar error">{errorMsg}</div>}

      {/* Control Filters */}
      <div className="filter-card" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <label className="form-label" style={{ marginBottom: 0, fontWeight: '600' }}>Calculate Aging Status Based On:</label>
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

      {/* Aging table list */}
      {loading ? (
        <div className="loading-state">Aggregating aging tables and stock lifetimes...</div>
      ) : agingData.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: 'var(--panel-background)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          <span style={{ color: 'var(--text-muted)' }}>No aging data records found. Make sure products are seeded.</span>
        </div>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
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
              {agingData.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: '700' }}>{item.sku}</td>
                  <td style={{ fontWeight: '500' }}>{item.productName}</td>
                  <td>{item.warehouseName} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({item.warehouseCode})</span></td>
                  <td style={{ fontWeight: '600' }}>{item.quantity} units</td>
                  <td>
                    {item.compareDate 
                      ? new Date(item.compareDate).toLocaleDateString() 
                      : 'No activity recorded'
                    }
                  </td>
                  <td style={{ fontWeight: '600' }}>
                    {item.diffDays} days ago
                  </td>
                  <td>
                    <span className={`pill ${getBucketBadgeClass(item.diffDays)}`}>
                      {item.matchedBucket}
                    </span>
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

export default Reports;
