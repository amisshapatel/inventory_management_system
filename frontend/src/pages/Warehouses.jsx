import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { PlusIcon } from '../components/Icons';
import Modal from '../components/Modal';

const Warehouses = () => {
  const { apiFetch, hasPermission } = useAuth();
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);

  // Form Fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState('Active');

  const loadWarehouses = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/warehouses');
      if (res.success) {
        setWarehouses(res.data);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to retrieve warehouse locations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWarehouses();
  }, []);

  const handleOpenAddModal = () => {
    setName('');
    setCode('');
    setAddress('');
    setStatus('Active');
    setIsAddOpen(true);
  };

  const handleOpenEditModal = (wh) => {
    setSelectedWarehouse(wh);
    setName(wh.name);
    setCode(wh.code);
    setAddress(wh.address || '');
    setStatus(wh.status);
    setIsEditOpen(true);
  };

  const handleSaveWarehouse = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await apiFetch('/warehouses', {
        method: 'POST',
        body: JSON.stringify({ name, code, address, status })
      });
      if (res.success) {
        setSuccessMsg(`Warehouse ${res.data.name} created successfully.`);
        setIsAddOpen(false);
        loadWarehouses();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create warehouse.');
    }
  };

  const handleUpdateWarehouse = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await apiFetch(`/warehouses/${selectedWarehouse._id}`, {
        method: 'PUT',
        body: JSON.stringify({ name, code, address, status })
      });
      if (res.success) {
        setSuccessMsg(`Warehouse ${res.data.name} updated successfully.`);
        setIsEditOpen(false);
        loadWarehouses();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update warehouse details.');
    }
  };

  const handleDeleteWarehouse = async (whId) => {
    if (!window.confirm('Are you sure you want to delete this warehouse? This will clean up empty stock balances.')) return;
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await apiFetch(`/warehouses/${whId}`, {
        method: 'DELETE'
      });
      if (res.success) {
        setSuccessMsg('Warehouse successfully deleted.');
        loadWarehouses();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to delete warehouse. Make sure it has no active stock balances first.');
    }
  };

  return (
    <div>
      <div className="page-title-section">
        <div>
          <h1 className="page-title">Warehouses</h1>
          <p className="page-subtitle">Configure inventory storage hubs, shipping channels, and operational addresses.</p>
        </div>
        {hasPermission('warehouse.create') && (
          <button className="btn btn-primary" onClick={handleOpenAddModal}>
            <PlusIcon style={{ width: '16px', marginRight: '6px' }} />
            Create Warehouse
          </button>
        )}
      </div>

      {successMsg && <div className="alert-bar success">{successMsg}</div>}
      {errorMsg && <div className="alert-bar error">{errorMsg}</div>}

      {/* Warehouse grid table */}
      {loading ? (
        <div className="loading-state">Querying warehouse locations...</div>
      ) : warehouses.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: 'var(--panel-background)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          <span style={{ color: 'var(--text-muted)' }}>No warehouse hubs registered. Click "Create Warehouse" to add locations.</span>
        </div>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Warehouse Code</th>
                <th>Warehouse Name</th>
                <th>Address</th>
                <th>Status</th>
                <th>Date Added</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {warehouses.map((wh) => (
                <tr key={wh._id}>
                  <td style={{ fontWeight: '700', color: 'var(--primary-color)' }}>{wh.code}</td>
                  <td style={{ fontWeight: '500' }}>{wh.name}</td>
                  <td>{wh.address || 'No address specified'}</td>
                  <td>
                    <span className={`pill ${wh.status === 'Active' ? 'success' : 'danger'}`}>
                      {wh.status}
                    </span>
                  </td>
                  <td>{new Date(wh.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {hasPermission('warehouse.edit') && (
                        <button className="btn btn-text" onClick={() => handleOpenEditModal(wh)} style={{ padding: '2px 8px', color: 'var(--primary-color)' }}>
                          Edit
                        </button>
                      )}
                      {hasPermission('warehouse.edit') && (
                        <button className="btn btn-text" onClick={() => handleDeleteWarehouse(wh._id)} style={{ padding: '2px 8px', color: 'var(--danger-color)' }}>
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE MODAL */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Create Storage Warehouse">
        <form onSubmit={handleSaveWarehouse} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Warehouse Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Warehouse A1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Warehouse Code *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. WH-MAIN"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Operational Street Address</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. 100 Logistics Blvd, Sector 4"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Warehouse Status</label>
              <select
                className="form-input"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsAddOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Create Warehouse</button>
            </div>
          </div>
        </form>
      </Modal>

      {/* EDIT MODAL */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title={`Edit Warehouse: ${selectedWarehouse?.code}`}>
        <form onSubmit={handleUpdateWarehouse} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Warehouse Name *</label>
              <input
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Warehouse Code *</label>
              <input
                type="text"
                className="form-input"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Operational Street Address</label>
            <input
              type="text"
              className="form-input"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Warehouse Status</label>
              <select
                className="form-input"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsEditOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Update Warehouse</button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Warehouses;
