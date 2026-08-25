import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PlusIcon } from '../components/Icons';
import Modal from '../components/Modal';
import { addNotification } from '../utils/notifications';

const Transfers = () => {
  const { apiFetch, hasPermission } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [transfers, setTransfers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState(null);

  // Form fields
  const [sourceWarehouseId, setSourceWarehouseId] = useState('');
  const [destinationWarehouseId, setDestinationWarehouseId] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('Draft');
  const [items, setItems] = useState([{ productId: '', quantity: 1 }]);

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

  const loadData = async () => {
    setLoading(true);
    try {
      const whRes = await apiFetch('/warehouses');
      if (whRes.success) setWarehouses(whRes.data.filter(w => w.status === 'Active'));

      const prodRes = await apiFetch('/products?limit=1000');
      if (prodRes.success) setProducts(prodRes.data.filter(p => p.status === 'Active'));

      const trfRes = await apiFetch(`/transfers?page=${page}&limit=15`);
      if (trfRes.success) {
        setTransfers(trfRes.data);
        setTotalPages(trfRes.pages);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to load stock transfers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page]);

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'add' && hasPermission('stock.transfer')) {
      handleOpenAddModal();
    }
  }, [searchParams]);

  const handleOpenAddModal = () => {
    if (warehouses.length < 2) {
      setErrorMsg('Stock transfers require at least two active warehouses.');
      return;
    }
    setSourceWarehouseId(warehouses[0]?._id || '');
    setDestinationWarehouseId(warehouses[1]?._id || '');
    setNotes('');
    setStatus('Draft');
    setItems([{ productId: '', quantity: 1 }]);
    setIsAddOpen(true);
  };

  const handleViewTransfer = async (transferId) => {
    try {
      const res = await apiFetch(`/transfers/${transferId}`);
      if (res.success) {
        setSelectedTransfer(res.data);
        setIsDetailOpen(true);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to retrieve transfer details.');
    }
  };

  const handleAddItemRow = () => {
    setItems([...items, { productId: '', quantity: 1 }]);
  };

  const handleRemoveItemRow = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index, field, value) => {
    setItems(items.map((item, idx) => {
      if (idx === index) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleSaveTransfer = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!sourceWarehouseId || !destinationWarehouseId) {
      setErrorMsg('Please select both source and destination warehouses.');
      return;
    }

    if (sourceWarehouseId === destinationWarehouseId) {
      setErrorMsg('Source and Destination warehouses cannot be the same.');
      return;
    }

    const filteredItems = items.filter(i => i.productId && i.quantity > 0);
    if (filteredItems.length === 0) {
      setErrorMsg('Please add at least one product with quantity > 0.');
      return;
    }

    const payload = {
      sourceWarehouseId,
      destinationWarehouseId,
      notes,
      status,
      items: filteredItems.map(i => ({
        productId: i.productId,
        quantity: Number(i.quantity)
      }))
    };

    try {
      const res = await apiFetch('/transfers', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res.success) {
        setSuccessMsg(`Stock transfer ${res.data.transferNumber} successfully created.`);
        addNotification('Transfer Created', `Stock transfer ${res.data.transferNumber} has been created successfully.`);
        setIsAddOpen(false);
        loadData();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to request stock transfer.');
    }
  };

  const handleUpdateStatus = async (transferId, newStatus) => {
    if (!window.confirm(`Are you sure you want to mark this transfer as ${newStatus}? This cannot be undone.`)) return;
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await apiFetch(`/transfers/${transferId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      if (res.success) {
        setSuccessMsg(`Transfer status updated to ${newStatus}. Warehouse stock rebalanced.`);
        addNotification('Transfer Status Updated', `Transfer status has been updated to ${newStatus}. Warehouse stock rebalanced.`);
        if (isDetailOpen) setIsDetailOpen(false);
        loadData();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update status.');
    }
  };

  // WhatsApp Share trigger helper
  const handleWhatsAppShare = (transfer) => {
    const pdfLink = `${BACKEND_URL}${transfer.pdfUrl}`;
    const textMsg = `Stock Transfer PDF\nTransfer No: ${transfer.transferNumber}\nFrom: ${transfer.sourceWarehouseId?.name}\nTo: ${transfer.destinationWarehouseId?.name}\nPDF: ${pdfLink}`;
    const encodedMsg = encodeURIComponent(textMsg);
    const waUrl = `https://api.whatsapp.com/send?text=${encodedMsg}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div>
      <div className="page-title-section">
        <div>
          <h1 className="page-title">Stock Transfers</h1>
          <p className="page-subtitle">Reallocate stock balances between warehouse locations.</p>
        </div>
        {hasPermission('stock.transfer') && (
          <button 
            className="btn btn-primary" 
            onClick={handleOpenAddModal}
            disabled={warehouses.length < 2}
            title={warehouses.length < 2 ? "Requires at least 2 active warehouses" : ""}
            style={warehouses.length < 2 ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
          >
            <PlusIcon style={{ width: '16px', marginRight: '6px' }} />
            Create Stock Transfer
          </button>
        )}
      </div>

      {!loading && warehouses.length < 2 && (
        <div className="alert-bar warning" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <span>
            <strong>Required:</strong> Stock transfers require at least two active warehouses. You currently have {warehouses.length === 0 ? 'no' : 'only one'} active warehouse.
          </span>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className="btn btn-secondary" 
              onClick={() => navigate('/warehouses')} 
              style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem', border: '1px solid #ffc107', backgroundColor: 'transparent', color: '#664d03', cursor: 'pointer' }}
            >
              Manage Warehouses
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => navigate('/inventory')} 
              style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem', border: '1px solid #ffc107', backgroundColor: 'transparent', color: '#664d03', cursor: 'pointer' }}
            >
              Manual Stock Adjustment
            </button>
          </div>
        </div>
      )}

      {successMsg && <div className="alert-bar success">{successMsg}</div>}
      {errorMsg && <div className="alert-bar error">{errorMsg}</div>}

      {/* Transfers table list */}
      {loading ? (
        <div className="loading-state">Loading transfers ledger...</div>
      ) : transfers.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: 'var(--panel-background)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          <span style={{ color: 'var(--text-muted)' }}>No transfers found. Click "Create Stock Transfer" to initialize a warehouse rebalance.</span>
        </div>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Transfer No.</th>
                <th>Source WH</th>
                <th>Destination WH</th>
                <th>Items count</th>
                <th>Status</th>
                <th>Date Logged</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((trf) => (
                <tr key={trf._id}>
                  <td style={{ fontWeight: '700', color: 'var(--primary-color)' }}>{trf.transferNumber}</td>
                  <td>{trf.sourceWarehouseId?.name} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({trf.sourceWarehouseId?.code})</span></td>
                  <td>{trf.destinationWarehouseId?.name} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({trf.destinationWarehouseId?.code})</span></td>
                  <td>{trf.items?.length || 0} items</td>
                  <td>
                    <span className={`pill ${trf.status === 'Completed' ? 'success' : trf.status === 'Cancelled' ? 'danger' : 'warning'}`}>
                      {trf.status}
                    </span>
                  </td>
                  <td>{new Date(trf.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-text" onClick={() => handleViewTransfer(trf._id)} style={{ padding: '2px 8px' }}>
                        View Details
                      </button>
                      {trf.status === 'Draft' && hasPermission('stock.transfer') && (
                        <>
                          <button className="btn btn-text" onClick={() => handleUpdateStatus(trf._id, 'Completed')} style={{ padding: '2px 8px', color: 'var(--success-color)' }}>
                            Complete
                          </button>
                          <button className="btn btn-text" onClick={() => handleUpdateStatus(trf._id, 'Cancelled')} style={{ padding: '2px 8px', color: 'var(--danger-color)' }}>
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
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

      {/* CREATE TRANSFER MODAL */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Initiate Stock Transfer">
        <form onSubmit={handleSaveTransfer} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Source Warehouse *</label>
              <select
                className="form-input"
                value={sourceWarehouseId}
                onChange={(e) => setSourceWarehouseId(e.target.value)}
                required
              >
                <option value="">Select source...</option>
                {warehouses.map(w => (
                  <option key={w._id} value={w._id}>{w.name} ({w.code})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Destination Warehouse *</label>
              <select
                className="form-input"
                value={destinationWarehouseId}
                onChange={(e) => setDestinationWarehouseId(e.target.value)}
                required
              >
                <option value="">Select destination...</option>
                {warehouses.map(w => (
                  <option key={w._id} value={w._id}>{w.name} ({w.code})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Dynamic items selection list */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Items List</h4>
              <button type="button" className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }} onClick={handleAddItemRow}>
                + Add Item Row
              </button>
            </div>

            {items.map((item, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '3fr 1.5fr auto', gap: '1rem', alignItems: 'flex-end', marginBottom: '0.75rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Product SKU / Name *</label>
                  <select
                    className="form-input"
                    value={item.productId}
                    onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                    required
                  >
                    <option value="">Choose item...</option>
                    {products.map(p => (
                      <option key={p._id} value={p._id}>{p.sku} - {p.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Qty to Transfer *</label>
                  <input
                    type="number"
                    className="form-input"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                    required
                  />
                </div>

                <button 
                  type="button" 
                  className="btn btn-text" 
                  style={{ color: 'var(--danger-color)', alignSelf: 'center', marginTop: '1.2rem', padding: '0 8px' }}
                  onClick={() => handleRemoveItemRow(idx)}
                  disabled={items.length === 1}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>

          <div className="form-group">
            <label className="form-label">Notes / Transfer reason</label>
            <input
              type="text"
              className="form-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Submission Status</label>
              <select
                className="form-input"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="Draft">Draft (Save description only)</option>
                <option value="Completed">Completed (Validates source inventory and updates stock immediately)</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsAddOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Process Transfer</button>
            </div>
          </div>
        </form>
      </Modal>

      {/* DETAIL MODAL WITH PDF & WHATSAPP ACTION */}
      <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title={`Stock Transfer Detail: ${selectedTransfer?.transferNumber}`}>
        {selectedTransfer && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', backgroundColor: 'var(--background-color)', padding: '1rem', borderRadius: '8px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Status</span>
                <span className={`pill ${selectedTransfer.status === 'Completed' ? 'success' : selectedTransfer.status === 'Cancelled' ? 'danger' : 'warning'}`}>
                  {selectedTransfer.status}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Source Warehouse</span>
                <span style={{ fontWeight: '600' }}>{selectedTransfer.sourceWarehouseId?.name}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Destination Warehouse</span>
                <span style={{ fontWeight: '600' }}>{selectedTransfer.destinationWarehouseId?.name}</span>
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '0.85rem', marginBottom: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Transferred Items</h4>
              <table className="data-table" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Product SKU</th>
                    <th>Product Name</th>
                    <th>Qty</th>
                    <th>Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTransfer.items?.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: '600' }}>{item.productId?.sku}</td>
                      <td>{item.productId?.name}</td>
                      <td style={{ fontWeight: '700' }}>{item.quantity}</td>
                      <td>{item.productId?.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', fontSize: '0.85rem' }}>
              <p><strong>Notes:</strong> {selectedTransfer.notes || 'None'}</p>
              <p><strong>Processed By:</strong> {selectedTransfer.createdBy?.name || 'System'}</p>
              <p><strong>Date Logged:</strong> {new Date(selectedTransfer.createdAt).toLocaleString()}</p>
              {selectedTransfer.completedAt && (
                <p><strong>Completed At:</strong> {new Date(selectedTransfer.completedAt).toLocaleString()}</p>
              )}
            </div>

            {/* Document PDF Actions & WhatsApp Share */}
            {selectedTransfer.status === 'Completed' && selectedTransfer.pdfUrl && (
              <div style={{ border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.85rem', fontWeight: '600', display: 'block' }}>Receipt & Transfer PDF Document</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Share or download verified dispatch documents.</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <a 
                    href={`${BACKEND_URL}${selectedTransfer.pdfUrl}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="btn btn-secondary" 
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', textDecoration: 'none', display: 'inline-block' }}
                  >
                    View PDF
                  </a>
                  <button 
                    className="btn btn-secondary" 
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', backgroundColor: '#25D366', color: 'white', borderColor: '#25D366' }}
                    onClick={() => handleWhatsAppShare(selectedTransfer)}
                  >
                    Share on WhatsApp
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              {selectedTransfer.status === 'Draft' && hasPermission('stock.transfer') && (
                <>
                  <button className="btn btn-secondary" style={{ backgroundColor: '#dc3545', color: 'white' }} onClick={() => handleUpdateStatus(selectedTransfer._id, 'Cancelled')}>
                    Cancel Transfer
                  </button>
                  <button className="btn btn-primary" onClick={() => handleUpdateStatus(selectedTransfer._id, 'Completed')}>
                    Complete & Shift Stock
                  </button>
                </>
              )}
              <button type="button" className="btn btn-secondary" onClick={() => setIsDetailOpen(false)}>Close</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Transfers;
