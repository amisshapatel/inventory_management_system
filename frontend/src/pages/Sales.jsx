import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PlusIcon } from '../components/Icons';
import Modal from '../components/Modal';

const Sales = () => {
  const { apiFetch, hasPermission } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [sales, setSales] = useState([]);
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
  const [selectedSale, setSelectedSale] = useState(null);

  // Form fields
  const [customerName, setCustomerName] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('Draft');
  const [items, setItems] = useState([{ productId: '', quantity: 1, sellingPrice: '' }]);

  const loadData = async () => {
    setLoading(true);
    try {
      const whRes = await apiFetch('/warehouses');
      if (whRes.success) setWarehouses(whRes.data.filter(w => w.status === 'Active'));

      const prodRes = await apiFetch('/products?limit=1000');
      if (prodRes.success) setProducts(prodRes.data.filter(p => p.status === 'Active'));

      const saleRes = await apiFetch(`/sales?page=${page}&limit=15`);
      if (saleRes.success) {
        setSales(saleRes.data);
        setTotalPages(saleRes.pages);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to load sale orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page]);

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'add' && hasPermission('sale.create')) {
      handleOpenAddModal();
    }
  }, [searchParams]);

  const handleOpenAddModal = () => {
    setCustomerName('');
    setWarehouseId(warehouses[0]?._id || '');
    setNotes('');
    setStatus('Draft');
    setItems([{ productId: '', quantity: 1, sellingPrice: '' }]);
    setIsAddOpen(true);
  };

  const handleViewSale = async (saleId) => {
    try {
      const res = await apiFetch(`/sales/${saleId}`);
      if (res.success) {
        setSelectedSale(res.data);
        setIsDetailOpen(true);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to retrieve sale details.');
    }
  };

  const handleAddItemRow = () => {
    setItems([...items, { productId: '', quantity: 1, sellingPrice: '' }]);
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

  const handleSaveSale = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!warehouseId) {
      setErrorMsg('Please select a dispatch warehouse.');
      return;
    }

    const filteredItems = items.filter(i => i.productId && i.quantity > 0);
    if (filteredItems.length === 0) {
      setErrorMsg('Please add at least one product with quantity > 0.');
      return;
    }

    const payload = {
      customerName,
      warehouseId,
      notes,
      status,
      items: filteredItems.map(i => ({
        productId: i.productId,
        quantity: Number(i.quantity),
        sellingPrice: i.sellingPrice ? Number(i.sellingPrice) : undefined
      }))
    };

    try {
      const res = await apiFetch('/sales', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res.success) {
        setSuccessMsg(`Sale order ${res.data.saleNumber} successfully created.`);
        setIsAddOpen(false);
        loadData();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create sale order.');
    }
  };

  const handleUpdateStatus = async (saleId, newStatus) => {
    if (!window.confirm(`Are you sure you want to mark this sale as ${newStatus}? This cannot be reverted.`)) return;
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await apiFetch(`/sales/${saleId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      if (res.success) {
        setSuccessMsg(`Sale order status updated to ${newStatus}. Inventory adjusted accordingly.`);
        if (isDetailOpen) setIsDetailOpen(false);
        loadData();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update status.');
    }
  };

  return (
    <div>
      <div className="page-title-section">
        <div>
          <h1 className="page-title">Sales / POS</h1>
          <p className="page-subtitle">Process customer sales, point-of-sale invoices, and dispatch stock items.</p>
        </div>
        {hasPermission('sale.create') && (
          <button className="btn btn-primary" onClick={handleOpenAddModal}>
            <PlusIcon style={{ width: '16px', marginRight: '6px' }} />
            New Sale Entry
          </button>
        )}
      </div>

      {successMsg && <div className="alert-bar success">{successMsg}</div>}
      {errorMsg && <div className="alert-bar error">{errorMsg}</div>}

      {/* Sales list table */}
      {loading ? (
        <div className="loading-state">Loading sales dashboard...</div>
      ) : sales.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: 'var(--panel-background)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          <span style={{ color: 'var(--text-muted)' }}>No sales logged yet. Click "New Sale Entry" to sell products.</span>
        </div>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Sale No.</th>
                <th>Customer Name</th>
                <th>Source Warehouse</th>
                <th>Items Sold</th>
                <th>Notes</th>
                <th>Status</th>
                <th>Sale Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale._id}>
                  <td style={{ fontWeight: '700', color: 'var(--primary-color)' }}>{sale.saleNumber}</td>
                  <td>{sale.customerName || 'Anonymous Customer'}</td>
                  <td>
                    <span style={{ fontWeight: '500' }}>{sale.warehouseId?.name}</span>{' '}
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({sale.warehouseId?.code})</span>
                  </td>
                  <td>{sale.items?.length || 0} items</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{sale.notes || '-'}</td>
                  <td>
                    <span className={`pill ${sale.status === 'Completed' ? 'success' : sale.status === 'Cancelled' ? 'danger' : 'warning'}`}>
                      {sale.status}
                    </span>
                  </td>
                  <td>{new Date(sale.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-text" onClick={() => handleViewSale(sale._id)} style={{ padding: '2px 8px' }}>
                        Open details
                      </button>
                      {sale.status === 'Draft' && hasPermission('sale.create') && (
                        <>
                          <button className="btn btn-text" onClick={() => handleUpdateStatus(sale._id, 'Completed')} style={{ padding: '2px 8px', color: 'var(--success-color)' }}>
                            Complete
                          </button>
                          <button className="btn btn-text" onClick={() => handleUpdateStatus(sale._id, 'Cancelled')} style={{ padding: '2px 8px', color: 'var(--danger-color)' }}>
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
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                disabled={page === 1}
              >
                Previous
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE SALE ENTRY MODAL */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Create Sales Invoice / POS">
        <form onSubmit={handleSaveSale} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Customer Name (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. John Doe / Retail Client"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Dispatch Warehouse *</label>
              <select
                className="form-input"
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                required
              >
                <option value="">Select source location</option>
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
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1.5fr auto', gap: '1rem', alignItems: 'flex-end', marginBottom: '0.75rem' }}>
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
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Qty *</label>
                  <input
                    type="number"
                    className="form-input"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Selling Price (Optional)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="e.g. 200"
                    value={item.sellingPrice}
                    onChange={(e) => handleItemChange(idx, 'sellingPrice', e.target.value)}
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
            <label className="form-label">Notes / Sale details</label>
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
                <option value="Draft">Draft (Saves entry info only)</option>
                <option value="Completed">Completed (Validates and deducts stock immediately)</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsAddOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Process Invoice</button>
            </div>
          </div>
        </form>
      </Modal>

      {/* DETAIL MODAL */}
      <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title={`Sale Invoice Detail: ${selectedSale?.saleNumber}`}>
        {selectedSale && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', backgroundColor: 'var(--background-color)', padding: '1rem', borderRadius: '8px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Status</span>
                <span className={`pill ${selectedSale.status === 'Completed' ? 'success' : selectedSale.status === 'Cancelled' ? 'danger' : 'warning'}`}>
                  {selectedSale.status}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Customer Name</span>
                <span style={{ fontWeight: '600' }}>{selectedSale.customerName || 'Anonymous Customer'}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Source Warehouse</span>
                <span style={{ fontWeight: '600' }}>{selectedSale.warehouseId?.name}</span>
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '0.85rem', marginBottom: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Items Sold</h4>
              <table className="data-table" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Product SKU</th>
                    <th>Product Name</th>
                    <th>Sold Qty</th>
                    <th>Unit</th>
                    <th>Unit Price</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSale.items?.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: '600' }}>{item.productId?.sku}</td>
                      <td>{item.productId?.name}</td>
                      <td style={{ fontWeight: '700' }}>{item.quantity}</td>
                      <td>{item.productId?.unit}</td>
                      <td>{item.sellingPrice ? `$${item.sellingPrice}` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', fontSize: '0.85rem' }}>
              <p><strong>Notes:</strong> {selectedSale.notes || 'None'}</p>
              <p><strong>Processed By:</strong> {selectedSale.createdBy?.name || 'System'}</p>
              <p><strong>Invoice Date:</strong> {new Date(selectedSale.createdAt).toLocaleString()}</p>
              {selectedSale.completedAt && (
                <p><strong>Dispatched At:</strong> {new Date(selectedSale.completedAt).toLocaleString()}</p>
              )}
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              {selectedSale.status === 'Draft' && hasPermission('sale.create') && (
                <>
                  <button className="btn btn-secondary" style={{ backgroundColor: '#dc3545', color: 'white' }} onClick={() => handleUpdateStatus(selectedSale._id, 'Cancelled')}>
                    Cancel Order
                  </button>
                  <button className="btn btn-primary" onClick={() => handleUpdateStatus(selectedSale._id, 'Completed')}>
                    Complete & Dispatch Stock
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

export default Sales;
