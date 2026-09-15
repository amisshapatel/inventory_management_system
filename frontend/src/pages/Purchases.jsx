import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PlusIcon, ViewIcon, PackageCheckIcon, XCircleIcon, XIcon } from '../components/Icons';
import { Loader } from '../components/Loader';
import Modal from '../components/Modal';
import { addNotification } from '../utils/notifications';

const Purchases = () => {
  const { apiFetch, hasPermission } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [purchases, setPurchases] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);

  // Form fields
  const [supplierName, setSupplierName] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('Draft');
  const [items, setItems] = useState([{ productId: '', quantity: 1, costPrice: '' }]);

  const loadData = async () => {
    setLoading(true);
    try {
      const whRes = await apiFetch('/warehouses');
      if (whRes.success) setWarehouses(whRes.data.filter(w => w.status === 'Active'));

      const prodRes = await apiFetch('/products');
      if (prodRes.success) setProducts(prodRes.data.filter(p => p.status === 'Active'));

      const purRes = await apiFetch('/purchases');
      if (purRes.success) {
        setPurchases(purRes.data);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to load purchase records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'add' && hasPermission('purchase.create')) {
      handleOpenAddModal();
    }
  }, [searchParams]);

  const handleOpenAddModal = () => {
    setSupplierName('');
    setWarehouseId(warehouses[0]?._id || '');
    setNotes('');
    setStatus('Draft');
    setItems([{ productId: '', quantity: 1, costPrice: '' }]);
    setIsAddOpen(true);
  };

  const handleViewPurchase = async (purchaseId) => {
    try {
      const res = await apiFetch(`/purchases/${purchaseId}`);
      if (res.success) {
        setSelectedPurchase(res.data);
        setIsDetailOpen(true);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to retrieve purchase details.');
    }
  };

  const handleAddItemRow = () => {
    setItems([...items, { productId: '', quantity: 1, costPrice: '' }]);
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

  const handleSavePurchase = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Validations
    if (!warehouseId) {
      setErrorMsg('Please select a target warehouse.');
      return;
    }

    const filteredItems = items.filter(i => i.productId && i.quantity > 0);
    if (filteredItems.length === 0) {
      setErrorMsg('Please add at least one product with quantity > 0.');
      return;
    }

    const payload = {
      supplierName,
      warehouseId,
      notes,
      status,
      items: filteredItems.map(i => ({
        productId: i.productId,
        quantity: Number(i.quantity),
        costPrice: i.costPrice ? Number(i.costPrice) : undefined
      }))
    };

    try {
      const res = await apiFetch('/purchases', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res.success) {
        setSuccessMsg(`Purchase ${res.data.purchaseNumber} successfully logged.`);
        addNotification('Purchase Created', `Purchase ${res.data.purchaseNumber} has been logged successfully.`);
        setIsAddOpen(false);
        loadData();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit purchase order.');
    }
  };

  const handleUpdateStatus = async (purchaseId, newStatus) => {
    if (!window.confirm(`Are you sure you want to mark this purchase as ${newStatus}? This cannot be reverted.`)) return;
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await apiFetch(`/purchases/${purchaseId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      if (res.success) {
        setSuccessMsg(`Purchase marked as ${newStatus}. Inventory adjusted accordingly.`);
        addNotification('Purchase Status Updated', `Purchase has been marked as ${newStatus}. Inventory adjusted accordingly.`);
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
          <h1 className="page-title">Purchases</h1>
          <p className="page-subtitle">Log incoming vendor shipments and update stock inventory levels.</p>
        </div>
        {hasPermission('purchase.create') && (
          <button className="btn btn-primary" onClick={handleOpenAddModal}>
            <PlusIcon style={{ width: '16px', marginRight: '6px' }} />
            New Purchase Entry
          </button>
        )}
      </div>

      {successMsg && <div className="alert-bar success">{successMsg}</div>}
      {errorMsg && <div className="alert-bar error">{errorMsg}</div>}

      {/* Purchase list table */}
      {loading ? (
        <Loader 
          message="Loading purchases ledger..." 
          subtitle="Fetching incoming supplier orders, line items, and fulfillment statuses..." 
        />
      ) : purchases.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: 'var(--panel-background)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          <span style={{ color: 'var(--text-muted)' }}>No purchases recorded. Click "New Purchase Entry" to load vendor items.</span>
        </div>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Purchase No.</th>
                <th>Supplier</th>
                <th>Warehouse Destination</th>
                <th>Items Count</th>
                <th>Notes</th>
                <th>Status</th>
                <th>Date Logged</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((pur) => (
                <tr key={pur._id}>
                  <td style={{ fontWeight: '700', color: 'var(--primary-color)' }}>{pur.purchaseNumber}</td>
                  <td>{pur.supplierName || 'Anonymous Vendor'}</td>
                  <td>
                    <span style={{ fontWeight: '500' }}>{pur.warehouseId?.name}</span>{' '}
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({pur.warehouseId?.code})</span>
                  </td>
                  <td>{pur.items?.length || 0} items</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{pur.notes || '-'}</td>
                  <td>
                    <span className={`pill ${pur.status === 'Completed' ? 'success' : pur.status === 'Cancelled' ? 'danger' : 'warning'}`}>
                      {pur.status}
                    </span>
                  </td>
                  <td>{new Date(pur.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="action-btn-group">
                      <button 
                        className="btn-action btn-action-view" 
                        onClick={() => handleViewPurchase(pur._id)} 
                        title="View details"
                      >
                        <ViewIcon />
                        <span>View</span>
                      </button>
                      {pur.status === 'Draft' && hasPermission('purchase.edit') && (
                        <>
                          <button 
                            className="btn-action btn-action-success" 
                            onClick={() => handleUpdateStatus(pur._id, 'Completed')} 
                            title="Complete & receive stock"
                          >
                            <PackageCheckIcon />
                            <span>Receive</span>
                          </button>
                          <button 
                            className="btn-action btn-action-cancel" 
                            onClick={() => handleUpdateStatus(pur._id, 'Cancelled')} 
                            title="Cancel purchase order"
                          >
                            <XCircleIcon />
                            <span>Cancel</span>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Results Count */}
        <div className="pagination-bar">
          <span>Showing {purchases.length} purchases</span>
        </div>
      )}

      {/* CREATE PURCHASE ENTRY MODAL */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Log Purchase Entry">
        <form onSubmit={handleSavePurchase} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Supplier Name (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Acme Components Inc."
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Destination Warehouse *</label>
              <select
                className="form-input"
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                required
              >
                <option value="">Select destination location</option>
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
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Cost Price (Optional)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="e.g. 150"
                    value={item.costPrice}
                    onChange={(e) => handleItemChange(idx, 'costPrice', e.target.value)}
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
            <label className="form-label">Notes / Purchase Details</label>
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
                <option value="Draft">Draft (Only saves entry info)</option>
                <option value="Completed">Completed (Adds items immediately to stock)</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsAddOpen(false)}>
                <XIcon style={{ width: '14px', height: '14px' }} />
                <span>Cancel</span>
              </button>
              <button type="submit" className="btn btn-primary">
                <PlusIcon style={{ width: '15px', height: '15px' }} />
                <span>Save Purchase</span>
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* DETAIL MODAL */}
      <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title={`Purchase Order Detail: ${selectedPurchase?.purchaseNumber}`}>
        {selectedPurchase && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', backgroundColor: 'var(--background-color)', padding: '1rem', borderRadius: '8px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Status</span>
                <span className={`pill ${selectedPurchase.status === 'Completed' ? 'success' : selectedPurchase.status === 'Cancelled' ? 'danger' : 'warning'}`}>
                  {selectedPurchase.status}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Vendor/Supplier</span>
                <span style={{ fontWeight: '600' }}>{selectedPurchase.supplierName || 'Anonymous Vendor'}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Warehouse Location</span>
                <span style={{ fontWeight: '600' }}>{selectedPurchase.warehouseId?.name}</span>
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '0.85rem', marginBottom: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Ordered Items</h4>
              <table className="data-table" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Product SKU</th>
                    <th>Product Name</th>
                    <th>Ordered Qty</th>
                    <th>Unit</th>
                    <th>Logged Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPurchase.items?.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: '600' }}>{item.productId?.sku}</td>
                      <td>{item.productId?.name}</td>
                      <td style={{ fontWeight: '700' }}>{item.quantity}</td>
                      <td>{item.productId?.unit}</td>
                      <td>{item.costPrice ? `$${item.costPrice}` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', fontSize: '0.85rem' }}>
              <p><strong>Notes:</strong> {selectedPurchase.notes || 'None'}</p>
              <p><strong>Created By:</strong> {selectedPurchase.createdBy?.name || 'System'}</p>
              <p><strong>Date Logged:</strong> {new Date(selectedPurchase.createdAt).toLocaleString()}</p>
              {selectedPurchase.completedAt && (
                <p><strong>Completed At:</strong> {new Date(selectedPurchase.completedAt).toLocaleString()}</p>
              )}
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              {selectedPurchase.status === 'Draft' && hasPermission('purchase.edit') && (
                <>
                  <button className="btn btn-action-cancel" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => handleUpdateStatus(selectedPurchase._id, 'Cancelled')}>
                    <XCircleIcon style={{ width: '15px', height: '15px' }} />
                    <span>Cancel Order</span>
                  </button>
                  <button className="btn btn-primary" onClick={() => handleUpdateStatus(selectedPurchase._id, 'Completed')}>
                    <PackageCheckIcon style={{ width: '16px', height: '16px' }} />
                    <span>Complete & Add Stock</span>
                  </button>
                </>
              )}
              <button type="button" className="btn btn-secondary" onClick={() => setIsDetailOpen(false)}>
                <XIcon style={{ width: '14px', height: '14px' }} />
                <span>Close</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Purchases;
