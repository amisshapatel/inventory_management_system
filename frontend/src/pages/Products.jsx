import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PlusIcon } from '../components/Icons';
import Modal from '../components/Modal';

const Products = () => {
  const { apiFetch, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [customFieldDefs, setCustomFieldDefs] = useState([]);
  const [categories, setCategories] = useState(['Electronics', 'Accessories', 'Furniture', 'Apparel']); // Default categories
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedProductBalances, setSelectedProductBalances] = useState([]);

  // Form Fields
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'Electronics',
    unit: 'Pcs',
    description: '',
    status: 'Active',
    minimumStock: 0,
    customFields: {}
  });

  const loadData = async () => {
    setLoading(true);
    try {
      // Get Custom Fields Definitions
      const fieldsRes = await apiFetch('/products/custom-fields');
      if (fieldsRes.success) {
        setCustomFieldDefs(fieldsRes.data);
      }

      // Build product list endpoint query
      let queryStr = `/products?page=${page}&limit=10`;
      if (search) queryStr += `&search=${encodeURIComponent(search)}`;
      if (category) queryStr += `&category=${encodeURIComponent(category)}`;
      if (status) queryStr += `&status=${status}`;

      const prodRes = await apiFetch(queryStr);
      if (prodRes.success) {
        setProducts(prodRes.data);
        setTotalPages(prodRes.pages);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, category, status]);

  // Check if navigate parameter exists to trigger add action immediately
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'add' && hasPermission('product.create')) {
      handleOpenAddModal();
    }
  }, [searchParams]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  const handleOpenAddModal = () => {
    // Initialise custom fields defaults
    const initialCustoms = {};
    customFieldDefs.forEach(f => {
      if (f.type === 'Boolean') initialCustoms[f.key] = false;
      else if (f.type === 'Number') initialCustoms[f.key] = 0;
      else initialCustoms[f.key] = '';
    });

    setFormData({
      name: '',
      sku: '',
      category: categories[0] || 'Electronics',
      unit: 'Pcs',
      description: '',
      status: 'Active',
      minimumStock: 0,
      customFields: initialCustoms
    });
    setIsAddOpen(true);
  };

  const handleOpenEditModal = (product) => {
    setSelectedProduct(product);
    
    // Ensure all custom fields exist
    const initialCustoms = { ...(product.customFields || {}) };
    customFieldDefs.forEach(f => {
      if (initialCustoms[f.key] === undefined) {
        if (f.type === 'Boolean') initialCustoms[f.key] = false;
        else if (f.type === 'Number') initialCustoms[f.key] = '';
        else initialCustoms[f.key] = '';
      } else if (f.type === 'Date' && initialCustoms[f.key]) {
        // Format to YYYY-MM-DD
        initialCustoms[f.key] = new Date(initialCustoms[f.key]).toISOString().split('T')[0];
      }
    });

    setFormData({
      name: product.name,
      sku: product.sku,
      category: product.category,
      unit: product.unit,
      description: product.description || '',
      status: product.status,
      minimumStock: product.minimumStock,
      customFields: initialCustoms
    });
    setIsEditOpen(true);
  };

  const handleViewProduct = async (product) => {
    setSelectedProduct(product);
    setIsDetailOpen(true);
    try {
      const balanceRes = await apiFetch(`/inventory?search=${encodeURIComponent(product.sku)}`);
      if (balanceRes.success) {
        setSelectedProductBalances(balanceRes.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCustomFieldChange = (key, val, type) => {
    setFormData(prev => {
      let finalVal = val;
      if (type === 'Boolean') {
        finalVal = val === true || val === 'true';
      }
      return {
        ...prev,
        customFields: {
          ...prev.customFields,
          [key]: finalVal
        }
      };
    });
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await apiFetch('/products', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      if (res.success) {
        setSuccessMsg('Product created successfully');
        setIsAddOpen(false);
        loadData();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create product');
    }
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await apiFetch(`/products/${selectedProduct._id}`, {
        method: 'PUT',
        body: JSON.stringify(formData)
      });
      if (res.success) {
        setSuccessMsg('Product updated successfully');
        setIsEditOpen(false);
        loadData();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update product');
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product? This will remove custom field data for this product.')) return;
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await apiFetch(`/products/${productId}`, {
        method: 'DELETE'
      });
      if (res.success) {
        setSuccessMsg('Product deleted successfully');
        loadData();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to delete product');
    }
  };

  // Helper to render custom field values nicely
  const renderCustomValue = (val, type) => {
    if (val === undefined || val === null) return '-';
    if (type === 'Boolean') return val ? 'Yes' : 'No';
    if (type === 'Date') return new Date(val).toLocaleDateString();
    return String(val);
  };

  return (
    <div>
      {/* Title block */}
      <div className="page-title-section">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">Manage items, stock thresholds, and custom attribute categories.</p>
        </div>
        {hasPermission('product.create') && (
          <button className="btn btn-primary" onClick={handleOpenAddModal}>
            <PlusIcon style={{ width: '16px', marginRight: '6px' }} />
            Add Product
          </button>
        )}
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
          
          <div className="form-group" style={{ width: '180px', marginBottom: 0 }}>
            <select className="form-input" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="form-group" style={{ width: '150px', marginBottom: 0 }}>
            <select className="form-input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <button type="submit" className="btn btn-secondary">Search</button>
        </form>
      </div>

      {/* Products Table */}
      {loading ? (
        <div className="loading-state">Loading product database...</div>
      ) : products.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: 'var(--panel-background)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          <span style={{ color: 'var(--text-muted)' }}>No products found matching filters.</span>
        </div>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product SKU</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Unit</th>
                <th>Min. Stock</th>
                {customFieldDefs.filter(f => f.showInList).map(f => (
                  <th key={f.key}>{f.label}</th>
                ))}
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product._id}>
                  <td style={{ fontWeight: '600', color: 'var(--primary-color)' }}>{product.sku}</td>
                  <td style={{ fontWeight: '500' }}>{product.name}</td>
                  <td>{product.category}</td>
                  <td>{product.unit}</td>
                  <td>{product.minimumStock}</td>
                  {/* Dynamic custom columns */}
                  {customFieldDefs.filter(f => f.showInList).map(f => (
                    <td key={f.key}>
                      {renderCustomValue(product.customFields ? product.customFields[f.key] : undefined, f.type)}
                    </td>
                  ))}
                  <td>
                    <span className={`pill ${product.status === 'Active' ? 'success' : 'danger'}`}>
                      {product.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="btn btn-text" onClick={() => handleViewProduct(product)} style={{ padding: '2px 8px' }}>
                        View
                      </button>
                      {hasPermission('product.edit') && (
                        <button className="btn btn-text" onClick={() => handleOpenEditModal(product)} style={{ padding: '2px 8px', color: 'var(--primary-color)' }}>
                          Edit
                        </button>
                      )}
                      {hasPermission('product.delete') && (
                        <button className="btn btn-text" onClick={() => handleDeleteProduct(product._id)} style={{ padding: '2px 8px', color: 'var(--danger-color)' }}>
                          Delete
                        </button>
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

      {/* ADD MODAL */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Create New Product">
        <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Product Name *</label>
              <input
                type="text"
                className="form-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Product SKU *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. ELEC-COIL-X"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select
                className="form-input"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Unit of Measure *</label>
              <input
                type="text"
                className="form-input"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Minimum Stock Threshold</label>
              <input
                type="number"
                className="form-input"
                value={formData.minimumStock}
                onChange={(e) => setFormData({ ...formData, minimumStock: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Product Description</label>
            <textarea
              className="form-input"
              rows="2"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Dynamic Custom Fields Section */}
          {customFieldDefs.length > 0 && (
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <h4 style={{ fontSize: '0.85rem', marginBottom: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Custom Attributes</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {customFieldDefs.map((field) => (
                  <div className="form-group" key={field._id}>
                    <label className="form-label">
                      {field.label} {field.required && '*'}
                    </label>
                    
                    {field.type === 'Boolean' ? (
                      <select
                        className="form-input"
                        value={formData.customFields[field.key] || false}
                        onChange={(e) => handleCustomFieldChange(field.key, e.target.value, field.type)}
                      >
                        <option value={false}>No</option>
                        <option value={true}>Yes</option>
                      </select>
                    ) : field.type === 'Dropdown' ? (
                      <select
                        className="form-input"
                        value={formData.customFields[field.key] || ''}
                        onChange={(e) => handleCustomFieldChange(field.key, e.target.value, field.type)}
                        required={field.required}
                      >
                        <option value="">Select option</option>
                        {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : (
                      <input
                        type={field.type === 'Number' ? 'number' : field.type === 'Date' ? 'date' : 'text'}
                        className="form-input"
                        value={formData.customFields[field.key] || ''}
                        onChange={(e) => handleCustomFieldChange(field.key, e.target.value, field.type)}
                        required={field.required}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsAddOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Create Product</button>
          </div>
        </form>
      </Modal>

      {/* EDIT MODAL */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title={`Edit Product: ${selectedProduct?.sku}`}>
        <form onSubmit={handleUpdateProduct} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Product Name *</label>
              <input
                type="text"
                className="form-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Product SKU (Uniquely Locked) *</label>
              <input
                type="text"
                className="form-input"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select
                className="form-input"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Unit *</label>
              <input
                type="text"
                className="form-input"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Min. Stock</label>
              <input
                type="number"
                className="form-input"
                value={formData.minimumStock}
                onChange={(e) => setFormData({ ...formData, minimumStock: Number(e.target.value) })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-input"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Product Description</label>
            <textarea
              className="form-input"
              rows="2"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Dynamic Custom Fields Section */}
          {customFieldDefs.length > 0 && (
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <h4 style={{ fontSize: '0.85rem', marginBottom: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Custom Attributes</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {customFieldDefs.map((field) => (
                  <div className="form-group" key={field._id}>
                    <label className="form-label">
                      {field.label} {field.required && '*'}
                    </label>
                    
                    {field.type === 'Boolean' ? (
                      <select
                        className="form-input"
                        value={formData.customFields[field.key] ?? false}
                        onChange={(e) => handleCustomFieldChange(field.key, e.target.value, field.type)}
                      >
                        <option value={false}>No</option>
                        <option value={true}>Yes</option>
                      </select>
                    ) : field.type === 'Dropdown' ? (
                      <select
                        className="form-input"
                        value={formData.customFields[field.key] || ''}
                        onChange={(e) => handleCustomFieldChange(field.key, e.target.value, field.type)}
                        required={field.required}
                      >
                        <option value="">Select option</option>
                        {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : (
                      <input
                        type={field.type === 'Number' ? 'number' : field.type === 'Date' ? 'date' : 'text'}
                        className="form-input"
                        value={formData.customFields[field.key] || ''}
                        onChange={(e) => handleCustomFieldChange(field.key, e.target.value, field.type)}
                        required={field.required}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsEditOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Update Product</button>
          </div>
        </form>
      </Modal>

      {/* DETAIL MODAL */}
      <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title={`Product Information: ${selectedProduct?.name}`}>
        {selectedProduct && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Core details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block' }}>SKU Code</span>
                <span style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--primary-color)' }}>{selectedProduct.sku}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block' }}>Category</span>
                <span style={{ fontSize: '1.1rem', fontWeight: '600' }}>{selectedProduct.category}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block' }}>Unit of Measure</span>
                <span style={{ fontSize: '1rem', fontWeight: '500' }}>{selectedProduct.unit}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block' }}>Minimum Threshold</span>
                <span style={{ fontSize: '1rem', fontWeight: '500' }}>{selectedProduct.minimumStock} units</span>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block' }}>Description</span>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-dark)' }}>{selectedProduct.description || 'No description provided.'}</p>
            </div>

            {/* Custom attributes */}
            {customFieldDefs.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <h4 style={{ fontSize: '0.85rem', marginBottom: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Additional Attributes</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {customFieldDefs.map((field) => (
                    <div key={field._id}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>{field.label}</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>
                        {renderCustomValue(selectedProduct.customFields ? selectedProduct.customFields[field.key] : undefined, field.type)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warehouse Wise Stocks */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <h4 style={{ fontSize: '0.85rem', marginBottom: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Warehouse Stock Distribution</h4>
              {selectedProductBalances.length === 0 ? (
                <div style={{ padding: '1rem', textAlign: 'center', backgroundColor: 'var(--background-color)', borderRadius: '6px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>This product is not stocked in any warehouse.</span>
                </div>
              ) : (
                <table className="data-table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Warehouse</th>
                      <th>Warehouse Code</th>
                      <th>Quantity On Hand</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProductBalances.map(bal => (
                      <tr key={bal._id}>
                        <td style={{ fontWeight: '600' }}>{bal.warehouseId?.name}</td>
                        <td>{bal.warehouseId?.code}</td>
                        <td style={{ fontWeight: '700', color: bal.quantity <= selectedProduct.minimumStock ? 'var(--danger-color)' : 'inherit' }}>
                          {bal.quantity} {bal.quantity <= selectedProduct.minimumStock && ' (Low Stock!)'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsDetailOpen(false)}>Close</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Products;
