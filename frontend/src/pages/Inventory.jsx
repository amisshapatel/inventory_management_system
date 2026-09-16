import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { SearchIcon, RefreshCwIcon, AdjustIcon, CheckIcon, XIcon, LowStockIcon } from '../components/Icons';
import { Loader } from '../components/Loader';
import Modal from '../components/Modal';

const Inventory = () => {
  const { apiFetch, hasPermission } = useAuth();
  const [balances, setBalances] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filtering
  const [search, setSearch] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');

  // Manual Adjustment Modal State
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [selectedBalance, setSelectedBalance] = useState(null);
  const [adjustType, setAdjustType] = useState('Increase'); // 'Increase' or 'Decrease'
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('Stock count correction');
  const [adjustNotes, setAdjustNotes] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      // Get warehouses
      const whRes = await apiFetch('/warehouses');
      if (whRes.success) {
        setWarehouses(whRes.data);
      }

      // Build balance query without pagination
      let queryStr = `/inventory`;
      if (selectedWarehouseId) queryStr += `?warehouseId=${selectedWarehouseId}`;
      if (search) queryStr += `${selectedWarehouseId ? '&' : '?'}search=${encodeURIComponent(search)}`;

      const balRes = await apiFetch(queryStr);
      if (balRes.success) {
        setBalances(balRes.data);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to load inventory balances.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedWarehouseId]);

  const handleWarehouseChange = (e) => {
    setSelectedWarehouseId(e.target.value);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  const handleOpenAdjustModal = (balance) => {
    setSelectedBalance(balance);
    setAdjustType('Increase');
    setAdjustQty('');
    setAdjustReason('Stock count correction');
    setAdjustNotes('');
    setIsAdjustOpen(true);
  };

  const handleSaveAdjustment = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!adjustQty || Number(adjustQty) <= 0) {
      setErrorMsg('Please enter a valid positive quantity to adjust.');
      return;
    }

    const qtyChange = adjustType === 'Increase' ? Number(adjustQty) : -Number(adjustQty);
    const finalReason = adjustNotes ? `${adjustReason}: ${adjustNotes}` : adjustReason;

    try {
      const res = await apiFetch('/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify({
          productId: selectedBalance.productId._id,
          warehouseId: selectedBalance.warehouseId._id,
          quantity: qtyChange,
          reason: finalReason
        })
      });

      if (res.success) {
        setSuccessMsg('Stock adjustment completed successfully.');
        setIsAdjustOpen(false);
        loadData();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to complete adjustment.');
    }
  };

  return (
    <div>
      {/* Title section */}
      <div className="page-title-section">
        <div>
          <h1 className="page-title">Inventory Control</h1>
          <p className="page-subtitle">Real-time stock levels across global warehouses.</p>
        </div>
        <button 
          className="btn btn-secondary action-btn-with-icon" 
          onClick={loadData}
          disabled={loading}
          title="Refresh Stock Records"
        >
          <RefreshCwIcon style={{ width: '15px', height: '15px' }} className={loading ? 'spinner-icon' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {successMsg && <div className="alert-bar success">{successMsg}</div>}
      {errorMsg && <div className="alert-bar error">{errorMsg}</div>}

      {/* Filters block */}
      <div className="filter-card">
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '1rem', width: '100%', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search by product name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="form-group" style={{ width: '220px', marginBottom: 0 }}>
            <select 
              className="form-input" 
              value={selectedWarehouseId} 
              onChange={handleWarehouseChange}
            >
              <option value="">All Locations / Warehouses</option>
              {warehouses.map(w => (
                <option key={w._id} value={w._id}>{w.name} ({w.code})</option>
              ))}
            </select>
          </div>

          <button type="submit" className="btn btn-secondary action-btn-with-icon">
            <SearchIcon style={{ width: '15px', height: '15px' }} />
            <span>Search</span>
          </button>
        </form>
      </div>

      {/* Balances List Table */}
      {loading ? (
        <Loader 
          message="Querying inventory stock levels..." 
          subtitle="Reconciling multi-warehouse quantities and active stock thresholds..." 
        />
      ) : balances.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: 'var(--panel-background)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          <span style={{ color: 'var(--text-muted)' }}>No stock balances found. Add opening stock, create purchases, or check filters.</span>
        </div>
      ) : (
        <>
          <div className="table-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product SKU</th>
                  <th>Product Name</th>
                  <th>Warehouse</th>
                  <th>On Hand Qty</th>
                  <th>Min. Stock</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {balances.map((bal) => {
                  const isLow = bal.productId && bal.quantity <= bal.productId.minimumStock;
                  return (
                    <tr key={bal._id} className={isLow ? 'low-stock-row' : ''}>
                      <td style={{ fontWeight: '600', color: 'var(--primary-color)' }}>{bal.productId?.sku || 'N/A'}</td>
                      <td style={{ fontWeight: '500' }}>{bal.productId?.name || 'N/A'}</td>
                      <td>
                        <span style={{ fontWeight: '600' }}>{bal.warehouseId?.name}</span>{' '}
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({bal.warehouseId?.code})</span>
                      </td>
                      <td style={{ fontWeight: '700' }}>{bal.quantity} {bal.productId?.unit}</td>
                      <td>{bal.productId?.minimumStock || 0}</td>
                      <td>
                        <span className={`pill ${isLow ? 'danger' : 'success'}`}>
                          {isLow && <LowStockIcon />}
                          {isLow ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>
                      <td>
                        <div className="action-btn-group">
                          {hasPermission('stock.adjust') && (
                            <button 
                              className="btn-action btn-action-adjust" 
                              onClick={() => handleOpenAdjustModal(bal)}
                              title="Adjust stock balance"
                            >
                              <AdjustIcon />
                              <span>Adjust Stock</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Results Count */}
          <div className="pagination-bar">
            <span>Showing {balances.length} inventory items</span>
          </div>
        </>
      )}

      {/* ADJUSTMENT MODAL */}
      <Modal isOpen={isAdjustOpen} onClose={() => setIsAdjustOpen(false)} title="Manual Stock Adjustment">
        {selectedBalance && (
          <form onSubmit={handleSaveAdjustment} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', backgroundColor: 'var(--background-color)', padding: '1rem', borderRadius: '8px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Product</span>
                <span style={{ fontWeight: '600' }}>{selectedBalance.productId?.name}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>SKU: {selectedBalance.productId?.sku}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Warehouse Location</span>
                <span style={{ fontWeight: '600' }}>{selectedBalance.warehouseId?.name}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Current Stock: {selectedBalance.quantity} {selectedBalance.productId?.unit}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Adjustment Type *</label>
                <select
                  className="form-input"
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value)}
                >
                  <option value="Increase">Increase Stock (+)</option>
                  <option value="Decrease">Decrease Stock (-)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Quantity to Adjust *</label>
                <input
                  type="number"
                  className="form-input"
                  min="1"
                  placeholder="e.g. 10"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Reason Category *</label>
              <select
                className="form-input"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
              >
                <option value="Stock count correction">Stock count correction</option>
                <option value="Damaged stock">Damaged stock</option>
                <option value="Missing stock">Missing stock</option>
                <option value="Opening stock correction">Opening stock correction</option>
                <option value="Wrong previous entry correction">Wrong previous entry correction</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Optional Notes / Details</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Recounted box on shelf C-12"
                value={adjustNotes}
                onChange={(e) => setAdjustNotes(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsAdjustOpen(false)}>
                <XIcon style={{ width: '14px', height: '14px' }} />
                <span>Cancel</span>
              </button>
              <button type="submit" className="btn btn-primary">
                <CheckIcon style={{ width: '15px', height: '15px' }} />
                <span>Apply Correction</span>
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default Inventory;
