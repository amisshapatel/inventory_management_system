import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { PlusIcon } from '../components/Icons';
import Modal from '../components/Modal';

const Users = () => {
  const { apiFetch, hasPermission } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleName, setRoleName] = useState('Staff');
  const [status, setStatus] = useState('Active');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/users');
      if (res.success) {
        setUsers(res.data);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to fetch user accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleOpenAddModal = () => {
    setName('');
    setEmail('');
    setPassword('');
    setRoleName('Staff');
    setStatus('Active');
    setIsAddOpen(true);
  };

  const handleOpenEditModal = (u) => {
    setSelectedUser(u);
    setName(u.name);
    setEmail(u.email);
    setRoleName(u.role?.name || 'Staff');
    setStatus(u.status);
    setIsEditOpen(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await apiFetch('/users', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, roleName })
      });
      if (res.success) {
        setSuccessMsg(`User ${res.data.name} successfully registered.`);
        setIsAddOpen(false);
        loadUsers();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to register new user.');
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await apiFetch(`/users/${selectedUser._id}`, {
        method: 'PUT',
        body: JSON.stringify({ name, email, roleName, status })
      });
      if (res.success) {
        setSuccessMsg(`User account details updated.`);
        setIsEditOpen(false);
        loadUsers();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update user profile.');
    }
  };

  const handleDeleteUser = async (uId) => {
    if (!window.confirm('Are you sure you want to permanently delete this user?')) return;
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await apiFetch(`/users/${uId}`, {
        method: 'DELETE'
      });
      if (res.success) {
        setSuccessMsg('User account successfully deleted.');
        loadUsers();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to delete user.');
    }
  };

  return (
    <div>
      <div className="page-title-section">
        <div>
          <h1 className="page-title">Users & Roles</h1>
          <p className="page-subtitle">Manage user accounts, assign authorization levels, and restrict database write access.</p>
        </div>
        {hasPermission('user.manage') && (
          <button className="btn btn-primary" onClick={handleOpenAddModal}>
            <PlusIcon style={{ width: '16px', marginRight: '6px' }} />
            Add User Account
          </button>
        )}
      </div>

      {successMsg && <div className="alert-bar success">{successMsg}</div>}
      {errorMsg && <div className="alert-bar error">{errorMsg}</div>}

      {/* Users table */}
      {loading ? (
        <div className="loading-state">Retrieving user roster...</div>
      ) : users.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: 'var(--panel-background)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          <span style={{ color: 'var(--text-muted)' }}>No other users registered. Click "Add User Account".</span>
        </div>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Profile Name</th>
                <th>Email Address</th>
                <th>Assigned Role</th>
                <th>Permissions Count</th>
                <th>Account Status</th>
                <th>Created Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td style={{ fontWeight: '600' }}>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <span style={{ fontWeight: '700', color: 'var(--primary-color)' }}>{u.role?.name || 'Staff'}</span>
                  </td>
                  <td>{u.role?.permissions?.length || 0} rules allowed</td>
                  <td>
                    <span className={`pill ${u.status === 'Active' ? 'success' : 'danger'}`}>
                      {u.status}
                    </span>
                  </td>
                  <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {hasPermission('user.manage') && (
                        <button className="btn btn-text" onClick={() => handleOpenEditModal(u)} style={{ padding: '2px 8px', color: 'var(--primary-color)' }}>
                          Edit
                        </button>
                      )}
                      {hasPermission('user.manage') && u.email !== 'admin@example.com' && (
                        <button className="btn btn-text" onClick={() => handleDeleteUser(u._id)} style={{ padding: '2px 8px', color: 'var(--danger-color)' }}>
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

      {/* ADD MODAL */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Register User Account">
        <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Sarah Jenkins"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input
              type="email"
              className="form-input"
              placeholder="e.g. sarah@stockpilot.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Temporary Password *</label>
            <input
              type="password"
              className="form-input"
              placeholder="Min. 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Authorization Role *</label>
              <select
                className="form-input"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                required
              >
                <option value="Admin">Admin (Full database control)</option>
                <option value="Manager">Manager (Edit inventory, details & templates)</option>
                <option value="Staff">Staff (Log transfers, sales, purchases)</option>
                <option value="Viewer">Viewer (Read-only access)</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsAddOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Create User</button>
            </div>
          </div>
        </form>
      </Modal>

      {/* EDIT MODAL */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title={`Edit Account: ${selectedUser?.email}`}>
        <form onSubmit={handleUpdateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Authorization Role</label>
              <select
                className="form-input"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
              >
                <option value="Admin">Admin</option>
                <option value="Manager">Manager</option>
                <option value="Staff">Staff</option>
                <option value="Viewer">Viewer</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Account Status</label>
              <select
                className="form-input"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={selectedUser?.email === 'admin@example.com'}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsEditOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Changes</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Users;
