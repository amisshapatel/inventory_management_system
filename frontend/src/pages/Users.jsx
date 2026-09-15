import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  PlusIcon, 
  SearchIcon, 
  CheckCircleIcon, 
  UsersIcon, 
  LockIcon, 
  LayersIcon, 
  FilterIcon,
  EditIcon,
  TrashIcon,
  SaveIcon,
  XIcon,
  RotateCcwIcon,
  ShieldCheckIcon,
  ProductsIcon,
  InventoryIcon,
  PurchasesIcon,
  SalesIcon,
  WarehousesIcon,
  ReportsIcon,
  ImportExportIcon,
  SettingsIcon,
  CheckIcon
} from '../components/Icons';
import { Loader } from '../components/Loader';
import Modal from '../components/Modal';

// Master list of system models & permission actions (Strapi-style matrix)
const MODEL_DEFINITIONS = [
  {
    id: 'products',
    name: 'Products & SKUs',
    category: 'Collection Type',
    icon: ProductsIcon,
    description: 'Product definitions, barcodes, pricing, and custom attributes',
    actions: {
      create: { key: 'product.create', label: 'Create Product' },
      read: { key: 'product.view', label: 'View Products' },
      update: { key: 'product.edit', label: 'Update Product' },
      delete: { key: 'product.delete', label: 'Delete Product' }
    }
  },
  {
    id: 'inventory',
    name: 'Inventory & Stock',
    category: 'Collection Type',
    icon: InventoryIcon,
    description: 'Warehouse on-hand quantities, lot balances, and reorder levels',
    actions: {
      read: { key: 'stock.view', label: 'View Stock Balances' },
      update: { key: 'stock.adjust', label: 'Adjust / Override Stock' },
      special: { key: 'stock.transfer', label: 'Transfer Between Hubs' }
    }
  },
  {
    id: 'purchases',
    name: 'Purchase Orders',
    category: 'Collection Type',
    icon: PurchasesIcon,
    description: 'Vendor purchasing, incoming POs, and goods receiving',
    actions: {
      create: { key: 'purchase.create', label: 'Create Purchase PO' },
      read: { key: 'purchase.view', label: 'View Purchases' },
      update: { key: 'purchase.edit', label: 'Edit Purchase Orders' },
      delete: { key: 'purchase.delete', label: 'Delete Purchases' }
    }
  },
  {
    id: 'sales',
    name: 'Sales & Orders',
    category: 'Collection Type',
    icon: SalesIcon,
    description: 'Customer dispatch orders, stock deductions, and packing slips',
    actions: {
      create: { key: 'sale.create', label: 'Create Sales Order' },
      read: { key: 'sale.view', label: 'View Sales History' },
      delete: { key: 'sale.cancel', label: 'Cancel & Revert Stock' }
    }
  },
  {
    id: 'warehouses',
    name: 'Warehouses',
    category: 'Collection Type',
    icon: WarehousesIcon,
    description: 'Physical storage depots, distribution centers, and shelf hubs',
    actions: {
      create: { key: 'warehouse.create', label: 'Add Warehouse' },
      read: { key: 'warehouse.view', label: 'View Warehouses' },
      update: { key: 'warehouse.edit', label: 'Edit Facilities' }
    }
  },
  {
    id: 'reports',
    name: 'Reports & Analytics',
    category: 'Collection Type',
    icon: ReportsIcon,
    description: 'Stock valuation, low stock forecasts, and aging inventory',
    actions: {
      read: { key: 'report.view', label: 'Generate & View Reports' }
    }
  },
  {
    id: 'import_export',
    name: 'Import & Export',
    category: 'Administration',
    icon: ImportExportIcon,
    description: 'Bulk CSV uploads, template mapping, and warehouse balance backups',
    actions: {
      special: { key: 'import.export', label: 'Import / Export CSV' }
    }
  },
  {
    id: 'settings',
    name: 'System Settings',
    category: 'Administration',
    icon: SettingsIcon,
    description: 'Operational thresholds, SMTP mail delivery, and dynamic attributes',
    actions: {
      update: { key: 'settings.manage', label: 'Manage Preferences' }
    }
  },
  {
    id: 'users',
    name: 'User & Role Security',
    category: 'Administration',
    icon: UsersIcon,
    description: 'Employee directory, access policies, and permission grants',
    actions: {
      update: { key: 'user.manage', label: 'Manage Accounts & Roles' }
    }
  }
];

// Flat list of all 18 system permission keys
const ALL_SYSTEM_PERMISSIONS = [
  'product.view', 'product.create', 'product.edit', 'product.delete',
  'stock.view', 'stock.adjust', 'stock.transfer',
  'purchase.view', 'purchase.create', 'purchase.edit', 'purchase.delete',
  'sale.view', 'sale.create', 'sale.cancel',
  'warehouse.view', 'warehouse.create', 'warehouse.edit',
  'report.view',
  'import.export',
  'settings.manage',
  'user.manage'
];

const DEFAULT_ROLE_METADATA = [
  {
    name: 'Admin',
    tier: 'Full Master Access',
    badgeClass: 'admin',
    description: 'Complete master authority across all inventory, purchasing, financial records, system settings, and role management.',
    permissions: [...ALL_SYSTEM_PERMISSIONS]
  },
  {
    name: 'Manager',
    tier: 'Operational Management',
    badgeClass: 'manager',
    description: 'Oversees inventory flow, purchases, sales orders, warehouse facilities, and reports without user management access.',
    permissions: [
      'product.view', 'product.create', 'product.edit',
      'stock.view', 'stock.adjust', 'stock.transfer',
      'purchase.view', 'purchase.create', 'purchase.edit',
      'sale.view', 'sale.create', 'sale.cancel',
      'warehouse.view', 'warehouse.create', 'warehouse.edit',
      'report.view', 'import.export', 'settings.manage'
    ]
  },
  {
    name: 'Staff',
    tier: 'Floor Operations',
    badgeClass: 'staff',
    description: 'Executes day-to-day warehouse operations: transfers, balances, vendor order reception, and customer sales order logging.',
    permissions: [
      'product.view',
      'stock.view', 'stock.transfer',
      'purchase.view', 'purchase.create',
      'sale.view', 'sale.create'
    ]
  },
  {
    name: 'Viewer',
    tier: 'Auditor / Read-Only',
    badgeClass: 'viewer',
    description: 'Read-only access for auditors or external reviewers across catalog, stock quantities, transactions, and reports.',
    permissions: [
      'product.view',
      'stock.view',
      'purchase.view',
      'sale.view',
      'warehouse.view',
      'report.view'
    ]
  }
];

const Users = () => {
  const { apiFetch, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState('matrix'); // 'matrix', 'roles', 'users'
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState(DEFAULT_ROLE_METADATA);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Matrix State
  const [selectedRole, setSelectedRole] = useState('Manager');
  const [categoryFilter, setCategoryFilter] = useState('All'); // 'All', 'Collection Type', 'Administration'
  const [matrixSearch, setMatrixSearch] = useState('');
  const [rolePermissionsMap, setRolePermissionsMap] = useState({
    Admin: [...ALL_SYSTEM_PERMISSIONS],
    Manager: [...DEFAULT_ROLE_METADATA[1].permissions],
    Staff: [...DEFAULT_ROLE_METADATA[2].permissions],
    Viewer: [...DEFAULT_ROLE_METADATA[3].permissions]
  });
  const [originalPermissionsMap, setOriginalPermissionsMap] = useState({
    Admin: [...ALL_SYSTEM_PERMISSIONS],
    Manager: [...DEFAULT_ROLE_METADATA[1].permissions],
    Staff: [...DEFAULT_ROLE_METADATA[2].permissions],
    Viewer: [...DEFAULT_ROLE_METADATA[3].permissions]
  });
  const [isSavingRole, setIsSavingRole] = useState(false);
  const [isResettingRole, setIsResettingRole] = useState(false);

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

  // Load users & live roles
  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Users
      const userRes = await apiFetch('/users');
      if (userRes.success) {
        setUsers(userRes.data);
      }

      // 2. Fetch Roles with saved permissions from MongoDB
      try {
        const rolesRes = await apiFetch('/users/roles');
        if (rolesRes.success && rolesRes.data?.length > 0) {
          const newPermMap = { ...rolePermissionsMap };
          const merged = DEFAULT_ROLE_METADATA.map(def => {
            const live = rolesRes.data.find(r => r.name.toLowerCase() === def.name.toLowerCase());
            const perms = live?.permissions && live.permissions.length > 0 ? live.permissions : def.permissions;
            newPermMap[def.name] = perms;
            return {
              ...def,
              userCount: live?.userCount ?? (userRes.data || []).filter(u => (u.role?.name || u.role) === def.name).length,
              permissions: perms
            };
          });

          // Ensure Admin always has all
          newPermMap.Admin = [...ALL_SYSTEM_PERMISSIONS];

          setRoles(merged);
          setRolePermissionsMap(newPermMap);
          setOriginalPermissionsMap(JSON.parse(JSON.stringify(newPermMap)));
        }
      } catch (roleErr) {
        console.warn('Role fetch fallback:', roleErr);
        const fallbackWithCounts = DEFAULT_ROLE_METADATA.map(def => ({
          ...def,
          userCount: (userRes.data || []).filter(u => (u.role?.name || u.role) === def.name).length
        }));
        setRoles(fallbackWithCounts);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to fetch user accounts and security roles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered models for matrix
  const filteredModels = useMemo(() => {
    return MODEL_DEFINITIONS.filter(m => {
      const matchesCategory = categoryFilter === 'All' || m.category === categoryFilter;
      const matchesSearch = !matrixSearch || 
        m.name.toLowerCase().includes(matrixSearch.toLowerCase()) ||
        m.description.toLowerCase().includes(matrixSearch.toLowerCase()) ||
        Object.values(m.actions).some(a => a.label.toLowerCase().includes(matrixSearch.toLowerCase()) || a.key.toLowerCase().includes(matrixSearch.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [categoryFilter, matrixSearch]);

  // Check if current role has unsaved changes
  const isCurrentRoleDirty = useMemo(() => {
    if (selectedRole === 'Admin') return false;
    const current = (rolePermissionsMap[selectedRole] || []).slice().sort();
    const original = (originalPermissionsMap[selectedRole] || []).slice().sort();
    return JSON.stringify(current) !== JSON.stringify(original);
  }, [selectedRole, rolePermissionsMap, originalPermissionsMap]);

  // Current active role metadata
  const currentRoleMeta = useMemo(() => {
    return roles.find(r => r.name === selectedRole) || DEFAULT_ROLE_METADATA.find(r => r.name === selectedRole) || {
      name: selectedRole,
      tier: 'Custom Tier',
      badgeClass: selectedRole.toLowerCase(),
      description: 'Custom access profile',
      permissions: rolePermissionsMap[selectedRole] || []
    };
  }, [selectedRole, roles, rolePermissionsMap]);

  // Helper to check if selected role has permission
  const hasPerm = (permKey) => {
    if (selectedRole === 'Admin') return true;
    return (rolePermissionsMap[selectedRole] || []).includes(permKey);
  };

  // Toggle single permission for selected role
  const handleTogglePermission = (permKey) => {
    if (selectedRole === 'Admin') return; // Admin is permanent
    setErrorMsg('');
    setSuccessMsg('');

    const current = rolePermissionsMap[selectedRole] || [];
    let updated;
    if (current.includes(permKey)) {
      updated = current.filter(k => k !== permKey);
    } else {
      updated = [...current, permKey];
    }

    setRolePermissionsMap(prev => ({
      ...prev,
      [selectedRole]: updated
    }));
  };

  // Toggle an entire column (e.g. all CREATE permissions)
  const handleToggleColumn = (actionType) => {
    if (selectedRole === 'Admin') return;
    setErrorMsg('');
    setSuccessMsg('');

    // Find all permission keys in this column across visible models
    const columnKeys = [];
    filteredModels.forEach(m => {
      if (m.actions[actionType]) {
        columnKeys.push(m.actions[actionType].key);
      }
    });

    if (columnKeys.length === 0) return;

    const current = rolePermissionsMap[selectedRole] || [];
    const allColSelected = columnKeys.every(k => current.includes(k));

    let updated;
    if (allColSelected) {
      // Remove all
      updated = current.filter(k => !columnKeys.includes(k));
    } else {
      // Add all missing
      const toAdd = columnKeys.filter(k => !current.includes(k));
      updated = [...current, ...toAdd];
    }

    setRolePermissionsMap(prev => ({
      ...prev,
      [selectedRole]: updated
    }));
  };

  // Select all permissions for selected role
  const handleSelectAll = () => {
    if (selectedRole === 'Admin') return;
    setRolePermissionsMap(prev => ({
      ...prev,
      [selectedRole]: [...ALL_SYSTEM_PERMISSIONS]
    }));
  };

  // Deselect all permissions for selected role
  const handleDeselectAll = () => {
    if (selectedRole === 'Admin') return;
    setRolePermissionsMap(prev => ({
      ...prev,
      [selectedRole]: []
    }));
  };

  // Discard changes
  const handleDiscardChanges = () => {
    setRolePermissionsMap(prev => ({
      ...prev,
      [selectedRole]: [...(originalPermissionsMap[selectedRole] || [])]
    }));
  };

  // Save role permissions to MongoDB
  const handleSaveRolePermissions = async () => {
    if (selectedRole === 'Admin') return;
    setIsSavingRole(true);
    setErrorMsg('');
    setSuccessMsg('');

    const permissions = rolePermissionsMap[selectedRole] || [];

    try {
      const res = await apiFetch(`/users/roles/${selectedRole}/permissions`, {
        method: 'PUT',
        body: JSON.stringify({ permissions })
      });

      if (res.success) {
        setSuccessMsg(`Permissions for role "${selectedRole}" saved successfully!`);
        // Update original snapshot
        setOriginalPermissionsMap(prev => ({
          ...prev,
          [selectedRole]: [...permissions]
        }));
        // Update roles state
        setRoles(prev => prev.map(r => r.name === selectedRole ? { ...r, permissions } : r));
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || `Failed to save permissions for ${selectedRole}.`);
    } finally {
      setIsSavingRole(false);
    }
  };

  // Reset role permissions to factory defaults
  const handleResetRolePermissions = async () => {
    if (selectedRole === 'Admin') return;
    if (!window.confirm(`Are you sure you want to reset all permissions for "${selectedRole}" back to factory defaults?`)) {
      return;
    }

    setIsResettingRole(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await apiFetch(`/users/roles/${selectedRole}/reset`, {
        method: 'POST'
      });

      if (res.success && res.data) {
        const resetPerms = res.data.permissions || [];
        setRolePermissionsMap(prev => ({
          ...prev,
          [selectedRole]: [...resetPerms]
        }));
        setOriginalPermissionsMap(prev => ({
          ...prev,
          [selectedRole]: [...resetPerms]
        }));
        setRoles(prev => prev.map(r => r.name === selectedRole ? { ...r, permissions: resetPerms } : r));
        setSuccessMsg(`Role "${selectedRole}" has been reset to default permissions.`);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || `Failed to reset role ${selectedRole}.`);
    } finally {
      setIsResettingRole(false);
    }
  };

  // Check if a column has all checked
  const isColumnAllChecked = (actionType) => {
    if (selectedRole === 'Admin') return true;
    const columnKeys = [];
    filteredModels.forEach(m => {
      if (m.actions[actionType]) {
        columnKeys.push(m.actions[actionType].key);
      }
    });
    if (columnKeys.length === 0) return false;
    const current = rolePermissionsMap[selectedRole] || [];
    return columnKeys.every(k => current.includes(k));
  };

  // User Add / Edit Handlers
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
        loadData();
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
        loadData();
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
        loadData();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to delete user.');
    }
  };

  return (
    <div>
      {/* Title block */}
      <div className="page-title-section">
        <div>
          <h1 className="page-title">Users & Role Permissions</h1>
          <p className="page-subtitle">
            Configure access tiers, grant or revoke model permissions, and manage authorized team credentials.
          </p>
        </div>
        {hasPermission('user.manage') && (
          <button className="btn btn-primary action-btn-with-icon" onClick={handleOpenAddModal}>
            <PlusIcon style={{ width: '16px', height: '16px' }} />
            <span>Add User Account</span>
          </button>
        )}
      </div>

      {successMsg && <div className="alert-bar success">{successMsg}</div>}
      {errorMsg && <div className="alert-bar error">{errorMsg}</div>}

      {/* Main Segmented Tab Switcher */}
      <div className="segmented-tabs">
        <button 
          className={`tab-btn ${activeTab === 'matrix' ? 'active' : ''}`}
          onClick={() => setActiveTab('matrix')}
        >
          <LayersIcon style={{ width: '16px', height: '16px' }} />
          <span>Role Permission Matrix</span>
          <span className="tab-badge">{ALL_SYSTEM_PERMISSIONS.length} Privileges</span>
        </button>

        <button 
          className={`tab-btn ${activeTab === 'roles' ? 'active' : ''}`}
          onClick={() => setActiveTab('roles')}
        >
          <LockIcon style={{ width: '15px', height: '15px' }} />
          <span>Roles Overview</span>
          <span className="tab-badge">{roles.length}</span>
        </button>

        <button 
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <UsersIcon style={{ width: '16px', height: '16px' }} />
          <span>User Directory</span>
          <span className="tab-badge">{users.length}</span>
        </button>
      </div>

      {loading ? (
        <Loader 
          message="Retrieving access control policies..." 
          subtitle="Loading role definitions, permission matrix, and user accounts..." 
        />
      ) : (
        <>
          {/* ========================================================================= */}
          {/* TAB 1: STRAPI-STYLE PERMISSIONS MATRIX (INTERACTIVE CHECKBOX TABLE)        */}
          {/* ========================================================================= */}
          {activeTab === 'matrix' && (
            <div>
              {/* Role Selection Tabs (Admin, Manager, Staff, Viewer) */}
              <div className="role-selector-container">
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', paddingLeft: '0.5rem', marginRight: '0.25rem' }}>
                  Select Role:
                </span>
                {['Admin', 'Manager', 'Staff', 'Viewer'].map(role => {
                  const isActive = selectedRole === role;
                  const perms = role === 'Admin' ? ALL_SYSTEM_PERMISSIONS : (rolePermissionsMap[role] || []);
                  const isDirty = role !== 'Admin' && JSON.stringify((rolePermissionsMap[role] || []).slice().sort()) !== JSON.stringify((originalPermissionsMap[role] || []).slice().sort());
                  
                  return (
                    <button
                      key={role}
                      className={`role-select-tab ${isActive ? 'active' : ''}`}
                      onClick={() => setSelectedRole(role)}
                    >
                      {role === 'Admin' ? (
                        <ShieldCheckIcon style={{ width: '15px', height: '15px', color: '#7c3aed' }} />
                      ) : (
                        <LockIcon style={{ width: '14px', height: '14px' }} />
                      )}
                      <span>{role}</span>
                      <span className="perm-action-count-badge">
                        {perms.length}/{ALL_SYSTEM_PERMISSIONS.length}
                      </span>
                      {isDirty && (
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#f59e0b', marginLeft: '2px' }} title="Unsaved changes" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Role Summary Header Card (Matches Strapi role bar) */}
              <div className="role-summary-header">
                <div>
                  <div className="role-summary-title">
                    <span className={`role-pill ${currentRoleMeta.badgeClass}`} style={{ fontSize: '0.9rem', padding: '0.35rem 0.85rem' }}>
                      {currentRoleMeta.name}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-dark)' }}>
                      {currentRoleMeta.tier}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      • {currentRoleMeta.userCount || 0} user{currentRoleMeta.userCount === 1 ? '' : 's'} assigned
                    </span>
                  </div>
                  <p className="role-summary-desc">
                    {currentRoleMeta.description}
                  </p>
                </div>

                {/* Role Actions Toolbar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  {selectedRole !== 'Admin' && (
                    <>
                      <button 
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
                        onClick={handleSelectAll}
                        title="Grant all 18 permissions to this role"
                      >
                        Select All
                      </button>

                      <button 
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
                        onClick={handleDeselectAll}
                        title="Remove all permissions from this role"
                      >
                        Deselect All
                      </button>

                      <button 
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
                        onClick={handleResetRolePermissions}
                        disabled={isResettingRole}
                        title="Reset to factory preset permissions"
                      >
                        <RotateCcwIcon style={{ width: '13px', height: '13px' }} />
                        <span>Reset</span>
                      </button>
                    </>
                  )}

                  <button 
                    type="button"
                    className="btn btn-primary action-btn-with-icon"
                    onClick={handleSaveRolePermissions}
                    disabled={selectedRole === 'Admin' || isSavingRole || !isCurrentRoleDirty}
                    style={{ 
                      opacity: selectedRole === 'Admin' || !isCurrentRoleDirty ? 0.6 : 1,
                      backgroundColor: isCurrentRoleDirty ? '#4f46e5' : undefined,
                      borderColor: isCurrentRoleDirty ? '#4f46e5' : undefined
                    }}
                  >
                    <SaveIcon style={{ width: '14px', height: '14px' }} />
                    <span>{isSavingRole ? 'Saving...' : isCurrentRoleDirty ? 'Save Permissions *' : 'Permissions Saved'}</span>
                  </button>
                </div>
              </div>

              {/* Unsaved Changes Banner */}
              {isCurrentRoleDirty && (
                <div className="matrix-unsaved-banner">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>⚠️</span>
                    <span>
                      You have modified permissions for <strong>{selectedRole}</strong> that are not yet saved to MongoDB.
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem' }}
                      onClick={handleDiscardChanges}
                    >
                      Discard
                    </button>
                    <button 
                      className="btn btn-primary" 
                      style={{ padding: '0.3rem 0.75rem', fontSize: '0.78rem', backgroundColor: '#92400e', borderColor: '#92400e' }}
                      onClick={handleSaveRolePermissions}
                      disabled={isSavingRole}
                    >
                      {isSavingRole ? 'Saving...' : 'Save Now'}
                    </button>
                  </div>
                </div>
              )}

              {/* Admin Permanent Notice */}
              {selectedRole === 'Admin' && (
                <div className="matrix-admin-note">
                  <ShieldCheckIcon style={{ width: '17px', height: '17px', color: '#0284c7', flexShrink: 0 }} />
                  <span>
                    <strong>Admin Role Protection:</strong> The Admin role possesses full unrestricted authority across all models, records, and administrative settings. Master permissions cannot be revoked from Admin. To configure customized access, select <strong>Manager</strong>, <strong>Staff</strong>, or <strong>Viewer</strong> above.
                  </span>
                </div>
              )}

              {/* Category Pills & Search Filter Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                <div className="perm-category-tabs">
                  <button 
                    className={`perm-cat-pill ${categoryFilter === 'All' ? 'active' : ''}`}
                    onClick={() => setCategoryFilter('All')}
                  >
                    All Modules ({MODEL_DEFINITIONS.length})
                  </button>
                  <button 
                    className={`perm-cat-pill ${categoryFilter === 'Collection Type' ? 'active' : ''}`}
                    onClick={() => setCategoryFilter('Collection Type')}
                  >
                    Collection Type (6)
                  </button>
                  <button 
                    className={`perm-cat-pill ${categoryFilter === 'Administration' ? 'active' : ''}`}
                    onClick={() => setCategoryFilter('Administration')}
                  >
                    Administration (3)
                  </button>
                </div>

                <div className="input-icon-group" style={{ width: '280px' }}>
                  <span className="input-icon-left">
                    <SearchIcon style={{ width: '15px', height: '15px' }} />
                  </span>
                  <input 
                    type="text" 
                    className="form-input has-left-icon"
                    placeholder="Search model or action..."
                    value={matrixSearch}
                    onChange={(e) => setMatrixSearch(e.target.value)}
                    style={{ padding: '0.45rem 0.75rem 0.45rem 2.2rem', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              {/* Strapi-Style Permissions Matrix Table */}
              <div className="table-container" style={{ background: 'var(--panel-background)', border: '1px solid var(--border-color)', borderRadius: '14px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                <table className="data-table" style={{ margin: 0 }}>
                  <thead>
                    <tr style={{ background: 'var(--background-color)' }}>
                      <th style={{ minWidth: '260px', padding: '1rem 1.25rem' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          MODEL
                        </span>
                      </th>

                      {/* CREATE Column Header */}
                      <th className="perm-table-th" style={{ width: '120px' }}>
                        <div 
                          className="perm-table-th-select-all"
                          onClick={() => handleToggleColumn('create')}
                          title={selectedRole === 'Admin' ? 'Admin permissions are locked' : 'Click to toggle all CREATE permissions'}
                        >
                          <span>CREATE</span>
                          <input 
                            type="checkbox"
                            className={`custom-perm-checkbox ${selectedRole === 'Admin' ? 'locked' : ''}`}
                            checked={isColumnAllChecked('create')}
                            disabled={selectedRole === 'Admin'}
                            readOnly
                            style={{ pointerEvents: 'none' }}
                          />
                        </div>
                      </th>

                      {/* READ Column Header */}
                      <th className="perm-table-th" style={{ width: '120px' }}>
                        <div 
                          className="perm-table-th-select-all"
                          onClick={() => handleToggleColumn('read')}
                          title={selectedRole === 'Admin' ? 'Admin permissions are locked' : 'Click to toggle all READ permissions'}
                        >
                          <span>READ</span>
                          <input 
                            type="checkbox"
                            className={`custom-perm-checkbox ${selectedRole === 'Admin' ? 'locked' : ''}`}
                            checked={isColumnAllChecked('read')}
                            disabled={selectedRole === 'Admin'}
                            readOnly
                            style={{ pointerEvents: 'none' }}
                          />
                        </div>
                      </th>

                      {/* UPDATE Column Header */}
                      <th className="perm-table-th" style={{ width: '120px' }}>
                        <div 
                          className="perm-table-th-select-all"
                          onClick={() => handleToggleColumn('update')}
                          title={selectedRole === 'Admin' ? 'Admin permissions are locked' : 'Click to toggle all UPDATE permissions'}
                        >
                          <span>UPDATE</span>
                          <input 
                            type="checkbox"
                            className={`custom-perm-checkbox ${selectedRole === 'Admin' ? 'locked' : ''}`}
                            checked={isColumnAllChecked('update')}
                            disabled={selectedRole === 'Admin'}
                            readOnly
                            style={{ pointerEvents: 'none' }}
                          />
                        </div>
                      </th>

                      {/* DELETE Column Header */}
                      <th className="perm-table-th" style={{ width: '120px' }}>
                        <div 
                          className="perm-table-th-select-all"
                          onClick={() => handleToggleColumn('delete')}
                          title={selectedRole === 'Admin' ? 'Admin permissions are locked' : 'Click to toggle all DELETE permissions'}
                        >
                          <span>DELETE</span>
                          <input 
                            type="checkbox"
                            className={`custom-perm-checkbox ${selectedRole === 'Admin' ? 'locked' : ''}`}
                            checked={isColumnAllChecked('delete')}
                            disabled={selectedRole === 'Admin'}
                            readOnly
                            style={{ pointerEvents: 'none' }}
                          />
                        </div>
                      </th>

                      {/* SPECIAL ACTIONS Column Header */}
                      <th className="perm-table-th" style={{ width: '180px' }}>
                        <div 
                          className="perm-table-th-select-all"
                          onClick={() => handleToggleColumn('special')}
                          title={selectedRole === 'Admin' ? 'Admin permissions are locked' : 'Click to toggle SPECIAL permissions'}
                        >
                          <span>SPECIAL ACTIONS</span>
                          <input 
                            type="checkbox"
                            className={`custom-perm-checkbox ${selectedRole === 'Admin' ? 'locked' : ''}`}
                            checked={isColumnAllChecked('special')}
                            disabled={selectedRole === 'Admin'}
                            readOnly
                            style={{ pointerEvents: 'none' }}
                          />
                        </div>
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredModels.map((model) => {
                      const ModelIcon = model.icon;
                      return (
                        <tr key={model.id} className="matrix-row-hover">
                          {/* Model Info */}
                          <td style={{ padding: '0.9rem 1.25rem' }}>
                            <div className="model-name-badge">
                              <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1', flexShrink: 0 }}>
                                <ModelIcon style={{ width: '16px', height: '16px' }} />
                              </div>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span style={{ fontWeight: 600, color: 'var(--text-dark)', fontSize: '0.9rem' }}>
                                    {model.name}
                                  </span>
                                  <span className="model-category-tag">
                                    {model.category}
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  {model.description}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* CREATE Action Cell */}
                          <td className="matrix-checkbox-cell">
                            {model.actions.create ? (
                              <label style={{ cursor: selectedRole === 'Admin' ? 'not-allowed' : 'pointer', display: 'inline-block' }}>
                                <input 
                                  type="checkbox"
                                  className={`custom-perm-checkbox ${selectedRole === 'Admin' ? 'locked' : ''}`}
                                  checked={hasPerm(model.actions.create.key)}
                                  disabled={selectedRole === 'Admin'}
                                  onChange={() => handleTogglePermission(model.actions.create.key)}
                                  title={`${model.actions.create.label} (${model.actions.create.key})`}
                                />
                              </label>
                            ) : (
                              <span style={{ color: '#cbd5e1', fontWeight: 'bold' }}>—</span>
                            )}
                          </td>

                          {/* READ Action Cell */}
                          <td className="matrix-checkbox-cell">
                            {model.actions.read ? (
                              <label style={{ cursor: selectedRole === 'Admin' ? 'not-allowed' : 'pointer', display: 'inline-block' }}>
                                <input 
                                  type="checkbox"
                                  className={`custom-perm-checkbox ${selectedRole === 'Admin' ? 'locked' : ''}`}
                                  checked={hasPerm(model.actions.read.key)}
                                  disabled={selectedRole === 'Admin'}
                                  onChange={() => handleTogglePermission(model.actions.read.key)}
                                  title={`${model.actions.read.label} (${model.actions.read.key})`}
                                />
                              </label>
                            ) : (
                              <span style={{ color: '#cbd5e1', fontWeight: 'bold' }}>—</span>
                            )}
                          </td>

                          {/* UPDATE Action Cell */}
                          <td className="matrix-checkbox-cell">
                            {model.actions.update ? (
                              <label style={{ cursor: selectedRole === 'Admin' ? 'not-allowed' : 'pointer', display: 'inline-block' }}>
                                <input 
                                  type="checkbox"
                                  className={`custom-perm-checkbox ${selectedRole === 'Admin' ? 'locked' : ''}`}
                                  checked={hasPerm(model.actions.update.key)}
                                  disabled={selectedRole === 'Admin'}
                                  onChange={() => handleTogglePermission(model.actions.update.key)}
                                  title={`${model.actions.update.label} (${model.actions.update.key})`}
                                />
                              </label>
                            ) : (
                              <span style={{ color: '#cbd5e1', fontWeight: 'bold' }}>—</span>
                            )}
                          </td>

                          {/* DELETE Action Cell */}
                          <td className="matrix-checkbox-cell">
                            {model.actions.delete ? (
                              <label style={{ cursor: selectedRole === 'Admin' ? 'not-allowed' : 'pointer', display: 'inline-block' }}>
                                <input 
                                  type="checkbox"
                                  className={`custom-perm-checkbox ${selectedRole === 'Admin' ? 'locked' : ''}`}
                                  checked={hasPerm(model.actions.delete.key)}
                                  disabled={selectedRole === 'Admin'}
                                  onChange={() => handleTogglePermission(model.actions.delete.key)}
                                  title={`${model.actions.delete.label} (${model.actions.delete.key})`}
                                />
                              </label>
                            ) : (
                              <span style={{ color: '#cbd5e1', fontWeight: 'bold' }}>—</span>
                            )}
                          </td>

                          {/* SPECIAL ACTIONS Cell */}
                          <td className="matrix-checkbox-cell">
                            {model.actions.special ? (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                                <label style={{ cursor: selectedRole === 'Admin' ? 'not-allowed' : 'pointer', display: 'inline-block' }}>
                                  <input 
                                    type="checkbox"
                                    className={`custom-perm-checkbox ${selectedRole === 'Admin' ? 'locked' : ''}`}
                                    checked={hasPerm(model.actions.special.key)}
                                    disabled={selectedRole === 'Admin'}
                                    onChange={() => handleTogglePermission(model.actions.special.key)}
                                    title={`${model.actions.special.label} (${model.actions.special.key})`}
                                  />
                                </label>
                                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                                  {model.actions.special.label}
                                </span>
                              </div>
                            ) : (
                              <span style={{ color: '#cbd5e1', fontWeight: 'bold' }}>—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
            </div>

            {/* Results Count */}
            <div className="pagination-bar">
              <span>Showing {filteredModels.length} models</span>
            </div>

              {/* Bottom Matrix Action Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', padding: '0.5rem 0.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  <strong>{selectedRole}</strong> has <strong>{(rolePermissionsMap[selectedRole] || []).length}</strong> of {ALL_SYSTEM_PERMISSIONS.length} privileges configured.
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {isCurrentRoleDirty && (
                    <button 
                      className="btn btn-secondary"
                      onClick={handleDiscardChanges}
                      style={{ fontSize: '0.82rem' }}
                    >
                      Discard Changes
                    </button>
                  )}
                  <button 
                    className="btn btn-primary action-btn-with-icon"
                    onClick={handleSaveRolePermissions}
                    disabled={selectedRole === 'Admin' || isSavingRole || !isCurrentRoleDirty}
                    style={{ 
                      fontSize: '0.82rem',
                      backgroundColor: isCurrentRoleDirty ? '#4f46e5' : undefined,
                      borderColor: isCurrentRoleDirty ? '#4f46e5' : undefined
                    }}
                  >
                    <SaveIcon style={{ width: '14px', height: '14px' }} />
                    <span>{isSavingRole ? 'Saving...' : 'Save Role Permissions'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: ROLES OVERVIEW TABLE & COVERAGE CARDS                              */}
          {/* ========================================================================= */}
          {activeTab === 'roles' && (
            <div>
              {/* Top Role Cards */}
              <div className="role-overview-grid">
                {roles.map(role => {
                  const rolePerms = rolePermissionsMap[role.name] || role.permissions || [];
                  const pct = Math.round((rolePerms.length / ALL_SYSTEM_PERMISSIONS.length) * 100);
                  
                  return (
                    <div key={role.name} className="role-overview-card">
                      <div className="role-overview-card-header">
                        <span className={`role-pill ${role.badgeClass}`}>{role.name}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {role.userCount || 0} user{role.userCount === 1 ? '' : 's'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                        {role.description}
                      </div>
                      <div style={{ marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px dashed var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--primary-color)' }}>
                          {rolePerms.length} of {ALL_SYSTEM_PERMISSIONS.length} Privileges ({pct}%)
                        </span>
                        <button 
                          className="btn btn-text" 
                          onClick={() => {
                            setSelectedRole(role.name);
                            setActiveTab('matrix');
                          }}
                          style={{ fontSize: '0.75rem', padding: 0 }}
                        >
                          Configure Matrix →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Roles Summary Table */}
              <div className="table-card">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '160px' }}>Role Identity</th>
                      <th style={{ width: '180px' }}>Access Tier</th>
                      <th>Role Description & Scope</th>
                      <th style={{ width: '130px', textAlign: 'center' }}>Assigned Users</th>
                      <th style={{ width: '170px' }}>Permissions Coverage</th>
                      <th style={{ width: '130px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roles.map(role => {
                      const rolePerms = rolePermissionsMap[role.name] || role.permissions || [];
                      const pct = Math.round((rolePerms.length / ALL_SYSTEM_PERMISSIONS.length) * 100);
                      
                      return (
                        <tr key={role.name}>
                          <td>
                            <span className={`role-pill ${role.badgeClass}`}>{role.name}</span>
                          </td>
                          <td>
                            <span style={{ fontWeight: '600', fontSize: '0.85rem' }}>{role.tier}</span>
                          </td>
                          <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {role.description}
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: '700', color: 'var(--text-dark)' }}>
                            {role.userCount || 0}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ flex: 1, height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                <div 
                                  style={{ 
                                    height: '100%', 
                                    width: `${pct}%`,
                                    backgroundColor: role.name === 'Admin' ? '#7c3aed' : role.name === 'Manager' ? '#4f46e5' : '#059669'
                                  }} 
                                />
                              </div>
                              <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>
                                {rolePerms.length}/{ALL_SYSTEM_PERMISSIONS.length}
                              </span>
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                              onClick={() => {
                                setSelectedRole(role.name);
                                setActiveTab('matrix');
                              }}
                            >
                              Configure
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Results Count */}
              <div className="pagination-bar">
                <span>Showing {roles.length} roles</span>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: USER DIRECTORY TABLE                                               */}
          {/* ========================================================================= */}
          {activeTab === 'users' && (
            <div className="table-card">
              {users.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>No other users registered. Click "Add User Account".</span>
                </div>
              ) : (
                <>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Profile Name</th>
                        <th>Email Address</th>
                        <th>Assigned Role</th>
                        <th>Permissions Granted</th>
                        <th>Account Status</th>
                        <th>Created Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => {
                        const uRoleName = u.role?.name || u.role || 'Staff';
                        const badgeClass = uRoleName.toLowerCase();
                        const userPerms = u.role?.permissions || rolePermissionsMap[uRoleName] || [];
                        
                        return (
                          <tr key={u._id}>
                            <td style={{ fontWeight: '600' }}>{u.name}</td>
                            <td>{u.email}</td>
                            <td>
                              <span className={`role-pill ${badgeClass}`}>
                                {uRoleName}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                {uRoleName === 'Admin' ? '18 / 18 (Full Access)' : `${userPerms.length} allowed`}
                              </span>
                            </td>
                            <td>
                              <span className={`pill ${u.status === 'Active' ? 'success' : 'danger'}`}>
                                {u.status}
                              </span>
                            </td>
                            <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                            <td>
                              <div className="action-btn-group">
                                {hasPermission('user.manage') && (
                                  <button 
                                    className="btn-action btn-action-edit" 
                                    onClick={() => handleOpenEditModal(u)} 
                                    title="Edit user"
                                  >
                                    <EditIcon />
                                    <span>Edit</span>
                                  </button>
                                )}
                                {hasPermission('user.manage') && u.email !== 'admin@example.com' && (
                                  <button 
                                    className="btn-action btn-action-delete" 
                                    onClick={() => handleDeleteUser(u._id)} 
                                    title="Delete user"
                                  >
                                    <TrashIcon />
                                    <span>Delete</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </>
              )}

              {/* Results Count */}
              <div className="pagination-bar">
                <span>Showing {users.length} users</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* ADD USER MODAL */}
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
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Assigned Role</label>
            <select className="form-input" value={roleName} onChange={(e) => setRoleName(e.target.value)}>
              <option value="Admin">Admin (Full Control - 18 Permissions)</option>
              <option value="Manager">Manager (Operations - {rolePermissionsMap.Manager?.length || 16} Permissions)</option>
              <option value="Staff">Staff (Floor Ops - {rolePermissionsMap.Staff?.length || 6} Permissions)</option>
              <option value="Viewer">Viewer (Read-Only - {rolePermissionsMap.Viewer?.length || 6} Permissions)</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsAddOpen(false)}>
              <XIcon style={{ width: '14px', height: '14px' }} />
              <span>Cancel</span>
            </button>
            <button type="submit" className="btn btn-primary">
              <PlusIcon style={{ width: '15px', height: '15px' }} />
              <span>Create User</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT USER MODAL */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit User Account">
        <form onSubmit={handleUpdateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Assigned Role</label>
            <select className="form-input" value={roleName} onChange={(e) => setRoleName(e.target.value)}>
              <option value="Admin">Admin (Full Control)</option>
              <option value="Manager">Manager (Operations)</option>
              <option value="Staff">Staff (Floor Ops)</option>
              <option value="Viewer">Viewer (Read-Only)</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Account Status</label>
            <select className="form-input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsEditOpen(false)}>
              <XIcon style={{ width: '14px', height: '14px' }} />
              <span>Cancel</span>
            </button>
            <button type="submit" className="btn btn-primary">
              <SaveIcon style={{ width: '15px', height: '15px' }} />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Users;
