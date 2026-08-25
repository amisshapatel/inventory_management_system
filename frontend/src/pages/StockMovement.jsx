import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const StockMovement = () => {
  const { apiFetch } = useAuth();
  const [movements, setMovements] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [selectedMovementType, setSelectedMovementType] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      // Get warehouses
      const whRes = await apiFetch('/warehouses');
      if (whRes.success) {
        setWarehouses(whRes.data);
      }

      // Build movement query
      let queryStr = `/inventory/movements?page=${page}&limit=20`;
      if (search) queryStr += `&search=${encodeURIComponent(search)}`;
      if (selectedWarehouseId) queryStr += `&warehouseId=${selectedWarehouseId}`;
      if (selectedMovementType) queryStr += `&movementType=${selectedMovementType}`;

      const movRes = await apiFetch(queryStr);
      if (movRes.success) {
        setMovements(movRes.data);
        setTotalPages(movRes.pages);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to load stock movements history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, selectedWarehouseId, selectedMovementType]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  // Helper to format movement badge style
  const getMovementBadgeClass = (type) => {
    if (type.includes('IN') || type.includes('INCREASE')) return 'success';
    if (type.includes('OUT') || type.includes('DECREASE')) return 'danger';
    return 'info';
  };

  return (
    <div>
      {/* Title section */}
      <div className="page-title-section">
        <div>
          <h1 className="page-title">Stock Movement History</h1>
          <p className="page-subtitle">Detailed ledger of every quantity change, adjustment, transfer, and sale.</p>
        </div>
      </div>

      {errorMsg && <div className="alert-bar error">{errorMsg}</div>}

      {/* Filters block */}
      <div className="filter-card">
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '1rem', width: '100%', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '180px', marginBottom: 0 }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search by product name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ width: '180px', marginBottom: 0 }}>
            <select
              className="form-input"
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
            >
              <option value="">All Warehouses</option>
              {warehouses.map(w => (
                <option key={w._id} value={w._id}>{w.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ width: '180px', marginBottom: 0 }}>
            <select
              className="form-input"
              value={selectedMovementType}
              onChange={(e) => setSelectedMovementType(e.target.value)}
            >
              <option value="">All Movement Types</option>
              <option value="OPENING_STOCK">OPENING_STOCK</option>
              <option value="PURCHASE_IN">PURCHASE_IN</option>
              <option value="SALE_OUT">SALE_OUT</option>
              <option value="MANUAL_INCREASE">MANUAL_INCREASE</option>
              <option value="MANUAL_DECREASE">MANUAL_DECREASE</option>
              <option value="TRANSFER_IN">TRANSFER_IN</option>
              <option value="TRANSFER_OUT">TRANSFER_OUT</option>
              <option value="ADJUSTMENT">ADJUSTMENT</option>
              <option value="IMPORT_OPENING_STOCK">IMPORT_OPENING_STOCK</option>
            </select>
          </div>

          <button type="submit" className="btn btn-secondary">Search</button>
        </form>
      </div>

      {/* Movements Table */}
      {loading ? (
        <div className="loading-state">Loading stock movement logs...</div>
      ) : movements.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: 'var(--panel-background)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          <span style={{ color: 'var(--text-muted)' }}>No stock movement records found.</span>
        </div>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Product SKU</th>
                <th>Product Name</th>
                <th>Warehouse</th>
                <th>Movement Type</th>
                <th>Qty Change</th>
                <th>Prev Stock</th>
                <th>New Stock</th>
                <th>Ref Type</th>
                <th>Ref No.</th>
                <th>Done By</th>
                <th>Reason / Notes</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((mv) => (
                <tr key={mv._id}>
                  <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                    {new Date(mv.createdAt).toLocaleDateString()}{' '}
                    <span style={{ color: 'var(--text-muted)' }}>
                      {new Date(mv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </td>
                  <td style={{ fontWeight: '600' }}>{mv.productId?.sku || 'Deleted SKU'}</td>
                  <td>{mv.productId?.name || 'Deleted Product'}</td>
                  <td>
                    <span style={{ fontWeight: '500' }}>{mv.warehouseId?.name || 'Deleted WH'}</span>
                  </td>
                  <td>
                    <span className={`pill ${getMovementBadgeClass(mv.movementType)}`} style={{ fontSize: '0.7rem' }}>
                      {mv.movementType}
                    </span>
                  </td>
                  <td style={{ fontWeight: '700', color: mv.quantity >= 0 ? 'var(--success-color)' : 'var(--danger-color)' }}>
                    {mv.quantity >= 0 ? `+${mv.quantity}` : mv.quantity}
                  </td>
                  <td>{mv.previousStock}</td>
                  <td style={{ fontWeight: '600' }}>{mv.newStock}</td>
                  <td>{mv.referenceType}</td>
                  <td style={{ fontSize: '0.8rem', fontWeight: '500' }}>{mv.referenceNumber || '-'}</td>
                  <td>{mv.createdBy?.name || 'System'}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }} title={mv.reason}>
                    {mv.reason || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="pagination-bar">
            <span>Showing Page {page} of {totalPages}</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button 
                className="btn btn-secondary btn-pagination" 
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                disabled={page === 1}
              >
                &larr; Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .map((p, idx, arr) => {
                  const items = [];
                  if (idx > 0 && p - arr[idx - 1] > 1) {
                    items.push(<span key={`ellipsis-${p}`} style={{ padding: '0 4px', color: 'var(--text-muted)' }}>...</span>);
                  }
                  items.push(
                    <button
                      key={p}
                      className={`btn-pagination-number ${page === p ? 'active' : ''}`}
                      onClick={() => setPage(p)}
                      style={{
                        minWidth: '34px',
                        height: '34px',
                        padding: '0',
                        justifyContent: 'center',
                      }}
                    >
                      {p}
                    </button>
                  );
                  return items;
                })}
              <button 
                className="btn btn-secondary btn-pagination" 
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
              >
                Next &rarr;
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockMovement;
