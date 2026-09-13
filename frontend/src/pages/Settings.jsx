import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { SettingsIcon, BellIcon, ProductsIcon, TrashIcon, SaveIcon, SendIcon, PlusIcon } from '../components/Icons';
import { Loader } from '../components/Loader';
import { addNotification } from '../utils/notifications';

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
  const [savingEmail, setSavingEmail] = useState(null); // Track which notification is being saved
  const [sendingTestEmail, setSendingTestEmail] = useState(null); // Track which notification is sending test email

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
        addNotification('System Settings Updated', 'Warehouse and stock settings have been saved successfully.');
        // Update local state with response data instead of reloading
        if (res.data) {
          setSystemId(res.data._id || '');
          setInventoryMode(res.data.inventoryMode || 'Single');
          setDefaultWarehouseId(res.data.defaultWarehouseId?._id || res.data.defaultWarehouseId || '');
          setAllowNegativeStock(res.data.allowNegativeStock || false);
        }
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
        addNotification('Custom Field Created', `Custom field '${payload.label}' has been added successfully.`);
        setNewField({
          label: '',
          key: '',
          type: 'Text',
          required: false,
          showInList: true,
          optionsRaw: ''
        });
        // Update local state instead of reloading
        setCustomFields([...customFields, res.data]);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to add custom attribute field.');
    }
  };

  const handleDeleteCustomField = async (id) => {
    if (!window.confirm('Are you sure you want to delete this custom field? This will erase all values entered for existing products.')) return;
    setErrorMsg('');
    setSuccessMsg('');
    
    // Optimistic UI update
    const originalFields = [...customFields];
    setCustomFields(customFields.filter(field => field._id !== id));
    
    try {
      const res = await apiFetch(`/products/custom-fields/${id}`, {
        method: 'DELETE'
      });
      if (res.success) {
        setSuccessMsg('Custom field definition deleted successfully.');
        addNotification('Custom Field Deleted', 'Custom field has been removed successfully.');
      } else {
        // Revert on failure
        setCustomFields(originalFields);
        setErrorMsg('Failed to delete field definition.');
      }
    } catch (err) {
      // Revert on error
      setCustomFields(originalFields);
      setErrorMsg(err.message || 'Failed to delete field definition.');
    }
  };

  const handleUpdateNotification = async (id, updatedFields) => {
    setErrorMsg('');
    setSuccessMsg('');
    
    // Show immediate feedback for email save
    const isEmailUpdate = updatedFields.recipientsRaw !== undefined;
    if (isEmailUpdate) {
      setSavingEmail(id);
      setSuccessMsg('Saving email recipients...');
    }
    
    // Optimistic UI update - update local state immediately
    const updatedNotifications = notifications.map(n => {
      if (n._id === id) {
        return { ...n, ...updatedFields };
      }
      return n;
    });
    setNotifications(updatedNotifications);
    
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
        const notification = notifications.find(n => n._id === id);
        
        if (isEmailUpdate) {
          // Enhanced success message for email updates
          const emailCount = payload.recipients?.length || 0;
          setSuccessMsg(`✓ Email recipients saved successfully! ${emailCount} email(s) will receive ${notification?.eventType?.replace('_', ' ')} alerts.`);
          addNotification(
            'Email Notification Settings Saved', 
            `${emailCount} recipient(s) configured for ${notification?.eventType?.replace('_', ' ')} alerts. Emails will be sent via Mailtrap when triggered.`
          );
        } else {
          setSuccessMsg(`Notification rules updated.`);
          addNotification('Notification Settings Updated', `Notification rules for ${notification?.eventType || 'unknown'} have been updated successfully.`);
        }
        
        // Update with the server response to ensure consistency
        setNotifications(notifications.map(n => 
          n._id === id ? res.data : n
        ));
      } else {
        // Revert optimistic update on failure
        setNotifications(notifications);
        setErrorMsg('Failed to update notification rule.');
      }
    } catch (err) {
      // Revert optimistic update on error
      setNotifications(notifications);
      setErrorMsg(err.message || 'Failed to update notification rule.');
    } finally {
      if (isEmailUpdate) {
        setSavingEmail(null);
      }
    }
  };

  const handleRecipientsChange = (id, value) => {
    setNotifyRecipients({
      ...notifyRecipients,
      [id]: value
    });
  };

  const handleSendTestEmail = async (notificationId) => {
    setErrorMsg('');
    setSuccessMsg('');
    setSendingTestEmail(notificationId);
    
    try {
      const res = await apiFetch('/settings/send-test-email', {
        method: 'POST',
        body: JSON.stringify({ notificationId })
      });

      if (res.success) {
        setSuccessMsg(`✓ Test email sent successfully to ${res.data.recipients.join(', ')}! Check your Mailtrap inbox.`);
        addNotification(
          'Test Email Sent', 
          `Test email for ${res.data.eventType} was sent to ${res.data.recipients.join(', ')}. Check your Mailtrap inbox to verify.`
        );
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to send test email.');
    } finally {
      setSendingTestEmail(null);
    }
  };

  if (loading && warehouses.length === 0) {
    return (
      <Loader 
        message="Loading configuration preferences..." 
        subtitle="Retrieving system settings, custom schema fields, and notification policies..." 
      />
    );
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

      <div className="settings-grid">
        
        {/* Left Column: System settings & Notification Settings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Warehouse mode settings */}
          <div className="settings-section-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
              <SettingsIcon style={{ width: '20px', height: '20px', color: 'var(--primary-color)' }} />
              <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-dark)' }}>Logistics & Warehouse Operations</h3>
            </div>
            
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

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', marginTop: '0.25rem', marginBottom: '0.25rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingRight: '1rem' }}>
                  <label htmlFor="allow-negative" style={{ fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer', color: 'var(--text-dark)' }}>
                    Allow Negative Stock
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Permit dispatching items when warehouse quantities reach zero
                  </span>
                </div>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    id="allow-negative"
                    checked={allowNegativeStock}
                    onChange={(e) => setAllowNegativeStock(e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ padding: '0.6rem 1.5rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <SaveIcon style={{ width: '15px', height: '15px' }} />
                  <span>Save Operational Settings</span>
                </button>
              </div>
            </form>
          </div>

          {/* Notifications config */}
          <div className="settings-section-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
              <BellIcon style={{ width: '20px', height: '20px', color: 'var(--primary-color)' }} />
              <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-dark)' }}>SMTP Email Notification Rules</h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>Define emails that receive notifications when warehouse threshold event triggers occur.</p>
            
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading notification rules...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                <p>No notification rules found. Click the button below to initialize default notification rules.</p>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  style={{ marginTop: '1rem' }}
                  onClick={async () => {
                    try {
                      const res = await apiFetch('/settings/seed-notifications', { method: 'POST' });
                      if (res.success) {
                        setSuccessMsg('Notification rules initialized successfully.');
                        loadData();
                      }
                    } catch (err) {
                      setErrorMsg('Failed to initialize notification rules.');
                    }
                  }}
                >
                  Initialize Notification Rules
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {notifications.map((n) => (
                  <div key={n._id} style={notifications.length > 0 && notifications[notifications.length - 1]._id === n._id ? { borderBottom: 'none', paddingBottom: 0 } : { borderBottom: '1px solid var(--border-color)', paddingBottom: '1.25rem' }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span style={{ fontWeight: '600', textTransform: 'capitalize', fontSize: '0.9rem', color: 'var(--text-dark)' }}>
                        {n.eventType.replace('_', ' ')} Alert
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '500' }}>{n.enabled ? 'Active' : 'Inactive'}</span>
                        <label className="switch" style={{ transform: 'scale(0.85)' }}>
                          <input 
                            type="checkbox" 
                            checked={n.enabled} 
                            onChange={(e) => handleUpdateNotification(n._id, { enabled: e.target.checked })}
                          />
                          <span className="slider"></span>
                        </label>
                        {n.enabled && (
                          <button 
                            type="button" 
                            className="btn-action btn-action-view" 
                            style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                            onClick={() => handleSendTestEmail(n._id)}
                            disabled={sendingTestEmail === n._id}
                            title="Send a test email to verify your email settings"
                          >
                            <SendIcon style={{ width: '12px', height: '12px' }} />
                            <span>{sendingTestEmail === n._id ? 'Sending...' : 'Test Email'}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                      <input 
                        type="text" 
                        className="form-input" 
                        style={{ flex: 1, fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}
                        placeholder="Recipients (comma separated emails)"
                        value={notifyRecipients[n._id] || ''}
                        onChange={(e) => handleRecipientsChange(n._id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleUpdateNotification(n._id, { recipientsRaw: notifyRecipients[n._id] });
                          }
                        }}
                        disabled={savingEmail === n._id}
                      />
                      <button 
                        type="button" 
                        className="btn btn-primary" 
                        style={{ padding: '0 1.25rem', fontSize: '0.85rem', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        onClick={() => handleUpdateNotification(n._id, { recipientsRaw: notifyRecipients[n._id] })}
                        disabled={savingEmail === n._id}
                      >
                        <SaveIcon style={{ width: '14px', height: '14px' }} />
                        <span>{savingEmail === n._id ? 'Saving...' : 'Save Emails'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Custom Attribute Schema Fields definitions builder */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="settings-section-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
              <ProductsIcon style={{ width: '20px', height: '20px', color: 'var(--primary-color)' }} />
              <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-dark)' }}>Dynamic Product Schema Attributes</h3>
            </div>
            
            {/* Create form */}
            <form onSubmit={handleCreateCustomField} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.5px' }}>Define New Attribute</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Attribute Label *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Brand, Expiry Date"
                    value={newField.label}
                    onChange={(e) => setNewField({ ...newField, label: e.target.value, key: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Database Key (Autogenerated)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={newField.key}
                    placeholder="autogenerated_key"
                    disabled
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                <div className="form-group" style={newField.type !== 'Dropdown' ? { gridColumn: 'span 2' } : {}}>
                  <label className="form-label">Data Type</label>
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
                    <label className="form-label">Options (Comma-separated) *</label>
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

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label className="switch" style={{ transform: 'scale(0.85)' }}>
                      <input 
                        type="checkbox" 
                        checked={newField.required} 
                        onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
                      />
                      <span className="slider"></span>
                    </label>
                    <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-dark)' }}>Mark Required</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label className="switch" style={{ transform: 'scale(0.85)' }}>
                      <input 
                        type="checkbox" 
                        checked={newField.showInList} 
                        onChange={(e) => setNewField({ ...newField, showInList: e.target.checked })}
                      />
                      <span className="slider"></span>
                    </label>
                    <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-dark)' }}>Show in Products List</span>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ padding: '0.6rem 1.5rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <PlusIcon style={{ width: '15px', height: '15px' }} />
                  <span>Register Field Definition</span>
                </button>
              </div>
            </form>

            {/* Existing attributes list */}
            <div>
              <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: '700', letterSpacing: '0.5px' }}>Existing Attributes Schema</h4>
              {customFields.length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: '1rem 0' }}>No custom field attributes defined yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {customFields.map((field) => (
                    <div key={field._id} className="attribute-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', border: '1px solid var(--border-color)', borderRadius: '10px', backgroundColor: 'var(--background-color)' }}>
                      <div>
                        <span style={{ fontWeight: '600', fontSize: '0.9rem', display: 'block', color: 'var(--text-dark)' }}>{field.label}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Key: <code style={{ backgroundColor: 'var(--border-color)', padding: '1px 5px', borderRadius: '4px', fontSize: '0.7rem' }}>{field.key}</code> | Type: <strong>{field.type}</strong> {field.required ? ' | Required' : ''} {field.showInList ? ' | Shown in List' : ''}
                        </span>
                      </div>
                      <button 
                        type="button" 
                        className="btn-action btn-action-delete" 
                        style={{ padding: '4px 8px' }}
                        onClick={() => handleDeleteCustomField(field._id)}
                        title="Delete custom field"
                      >
                        <TrashIcon style={{ width: '13px', height: '13px' }} />
                        <span>Delete</span>
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
