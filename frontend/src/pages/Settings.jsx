import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const Settings = () => {
  const { apiFetch } = useAuth();
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 1. System Settings State
  const [systemId, setSystemId] = useState('');
  const [inventoryMode, setInventoryMode] = useState('Single');
  const [defaultWarehouseId, setDefaultWarehouseId] = useState('');
  const [allowNegativeStock, setAllowNegativeStock] = useState(false);

  // 2. Custom Fields State
  const [customFields, setCustomFields] = useState([]);
  const [newField, setNewField] = useState({
    label: '',
    key: '',
    type: 'Text',
    required: false,
    showInList: true,
    optionsRaw: '' // for Dropdown options (comma-separated)
  });

  // 3. Notifications State
  const [notifications, setNotifications] = useState([]);
  const [notifyRecipients, setNotifyRecipients] = useState({}); // { [id]: 'comma, separated, emails' }

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch active warehouses
      const whRes = await apiFetch('/warehouses');
      if (whRes.success) {
        setWarehouses(whRes.data.filter(w => w.status === 'Active'));
      }

      // Fetch current settings
      const settingsRes = await apiFetch('/settings');
      if (settingsRes.success) {
        const sys = settingsRes.data.system;
        setSystemId(sys._id || '');
        setInventoryMode(sys.inventoryMode || 'Single');
        setDefaultWarehouseId(sys.defaultWarehouseId?._id || sys.defaultWarehouseId || '');
        setAllowNegativeStock(sys.allowNegativeStock || false);
        
        setNotifications(settingsRes.data.notifications || []);
        
        // Initialise email recipients inputs mapping
        const recMap = {};
        (settingsRes.data.notifications || []).forEach(n => {
          recMap[n._id] = n.recipients ? n.recipients.join(', ') : '';
        });
        setNotifyRecipients(recMap);
      }

      // Fetch custom fields definitions
      const cfRes = await apiFetch('/products/custom-fields');
      if (cfRes.success) {
        setCustomFields(cfRes.data);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to load system settings configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSystemSettings = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await apiFetch('/settings/system', {
        method: 'PUT',
        body: JSON.stringify({
          inventoryMode,
          defaultWarehouseId: defaultWarehouseId || null,
          allowNegativeStock
        })
      });
      if (res.success) {
        setSuccessMsg('Warehouse and stock settings saved successfully.');
        loadData();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update system settings.');
    }
  };

  const handleCreateCustomField = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!newField.label || !newField.key) {
      setErrorMsg('Please enter a field label and reference key.');
      return;
    }

    const payload = {
      label: newField.label,
      key: newField.key,
      type: newField.type,
      required: newField.required,
      showInList: newField.showInList,
      options: newField.type === 'Dropdown' && newField.optionsRaw 
        ? newField.optionsRaw.split(',').map(o => o.trim()).filter(o => o !== '')
        : []
    };

    try {
      const res = await apiFetch('/products/custom-fields', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res.success) {
        setSuccessMsg(`Custom field '${payload.label}' successfully registered.`);
        setNewField({
          label: '',
          key: '',
          type: 'Text',
          required: false,
          showInList: true,
          optionsRaw: ''
        });
        loadData();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to add custom attribute field.');
    }
  };

  const handleDeleteCustomField = async (id) => {
    if (!window.confirm('Are you sure you want to delete this custom field? This will erase all values entered for existing products.')) return;
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await apiFetch(`/products/custom-fields/${id}`, {
        method: 'DELETE'
      });
      if (res.success) {
        setSuccessMsg('Custom field definition deleted successfully.');
        loadData();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to delete field definition.');
    }
  };

  const handleUpdateNotification = async (id, updatedFields) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const payload = { ...updatedFields };
      if (updatedFields.recipientsRaw !== undefined) {
        payload.recipients = updatedFields.recipientsRaw.split(',').map(e => e.trim()).filter(e => e !== '');
        delete payload.recipientsRaw;
      }
      
      const res = await apiFetch(`/settings/notifications/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      if (res.success) {
        setSuccessMsg(`Notification rules updated.`);
        loadData();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update notification rule.');
    }
  };

  const handleRecipientsChange = (id, value) => {
    setNotifyRecipients({
      ...notifyRecipients,
      [id]: value
    });
  };

  if (loading && warehouses.length === 0) {
    return <div className="loading-state">Loading configuration preferences...</div>;
  }

  return (
    <div>
      <div className="page-title-section">
        <div>
          <h1 className="page-title">System Settings</h1>
          <p className="page-subtitle">Configure business rules, manage email alerts, and design dynamic catalog schemas.</p>
        </div>
      </div>

      {successMsg && <div className="alert-bar success">{successMsg}</div>}
      {errorMsg && <div className="alert-bar error">{errorMsg}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'flex-start' }}>
        
        {/* Left Column: System settings & Notification Settings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Warehouse mode settings */}
          <div className="card" style={{ backgroundColor: 'var(--panel-background)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--primary-color)' }}>Logistics & Warehouse Operations</h3>
            <form onSubmit={handleSaveSystemSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div className="form-group">
                <label className="form-label">Warehouse Operational Mode</label>
                <select 
                  className="form-input"
                  value={inventoryMode} 
                  onChange={(e) => setInventoryMode(e.target.value)}
                >
                  <option value="Single">Single Warehouse Mode (Hides selector complexity in UI)</option>
                  <option value="Multi">Multi Warehouse Mode (Exposes warehouse distributions & selection)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Default Fulfillment Warehouse</label>
                <select 
                  className="form-input"
                  value={defaultWarehouseId}
                  onChange={(e) => setDefaultWarehouseId(e.target.value)}
                >
                  <option value="">No default warehouse</option>
                  {warehouses.map(w => (
                    <option key={w._id} value={w._id}>{w.name} ({w.code})</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ flexDirection: 'row', gap: '10px', alignItems: 'center' }}>
                <input 
                  type="checkbox" 
                  id="allow-negative"
                  checked={allowNegativeStock}
                  onChange={(e) => setAllowNegativeStock(e.target.checked)}
                />
                <label htmlFor="allow-negative" style={{ fontWeight: '500', fontSize: '0.9rem', cursor: 'pointer' }}>
                  Allow Negative Stock (Permit dispatching items when quantities reach zero)
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary">Save Operational Settings</button>
              </div>
            </form>
          </div>

          {/* Notifications config */}
          <div className="card" style={{ backgroundColor: 'var(--panel-background)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--primary-color)' }}>SMTP Email Notification Rules</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Define emails that receive notifications when warehouse threshold event triggers occur.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {notifications.map((n) => (
                <div key={n._id} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: '600', textTransform: 'capitalize', fontSize: '0.9rem' }}>
                      {n.eventType.replace('_', ' ')} Alert
                    </span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                      <input 
                        type="checkbox" 
                        checked={n.enabled} 
                        onChange={(e) => handleUpdateNotification(n._id, { enabled: e.target.checked })}
                      />
                      Active
                    </label>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="text" 
                      className="form-input" 
                      style={{ flex: 1, fontSize: '0.8rem' }}
                      placeholder="Recipients (comma separated emails)"
                      value={notifyRecipients[n._id] || ''}
                      onChange={(e) => handleRecipientsChange(n._id, e.target.value)}
                    />
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      style={{ padding: '0 0.75rem', fontSize: '0.8rem' }}
                      onClick={() => handleUpdateNotification(n._id, { recipientsRaw: notifyRecipients[n._id] })}
                    >
                      Save Emails
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Custom Attribute Schema Fields definitions builder */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="card" style={{ backgroundColor: 'var(--panel-background)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--primary-color)' }}>Dynamic Product Schema Attributes</h3>
            
            {/* Create form */}
            <form onSubmit={handleCreateCustomField} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Define New Attribute</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Attribute Label *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Expiry Date"
                    value={newField.label}
                    onChange={(e) => setNewField({ ...newField, label: e.target.value, key: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Database Key (Autogenerated) *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={newField.key}
                    disabled
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Data Type</label>
                  <select 
                    className="form-input" 
                    value={newField.type}
                    onChange={(e) => setNewField({ ...newField, type: e.target.value })}
                  >
                    <option value="Text">Text</option>
                    <option value="Number">Number</option>
                    <option value="Date">Date</option>
                    <option value="Dropdown">Dropdown (Select List)</option>
                    <option value="Boolean">Boolean (Yes/No)</option>
                  </select>
                </div>
                {newField.type === 'Dropdown' && (
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Options (Comma-separated) *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Small, Medium, Large"
                      value={newField.optionsRaw}
                      onChange={(e) => setNewField({ ...newField, optionsRaw: e.target.value })}
                      required
                    />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.25rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={newField.required} 
                    onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
                  />
                  Mark Required
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={newField.showInList} 
                    onChange={(e) => setNewField({ ...newField, showInList: e.target.checked })}
                  />
                  Show in Products List
                </label>
              </div>

              <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-end', marginTop: '0.5rem' }}>
                Register Field Definition
              </button>
            </form>

            {/* Existing attributes list */}
            <div>
              <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Existing Attributes Schema</h4>
              {customFields.length === 0 ? (
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No custom field attributes defined yet.</span>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {customFields.map((field) => (
                    <div key={field._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--background-color)' }}>
                      <div>
                        <span style={{ fontWeight: '600', fontSize: '0.9rem', display: 'block' }}>{field.label}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Key: {field.key} | Type: {field.type} {field.required ? '| Required' : ''}
                        </span>
                      </div>
                      <button 
                        type="button" 
                        className="btn btn-text" 
                        style={{ color: 'var(--danger-color)', fontSize: '0.8rem', padding: '4px' }}
                        onClick={() => handleDeleteCustomField(field._id)}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
