import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { DownloadIcon, UploadIcon } from '../components/Icons';
import { Spinner } from '../components/Loader';

const ImportExport = () => {
  const { apiFetch } = useAuth();
  const [customFieldDefs, setCustomFieldDefs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // CSV Import States
  const [step, setStep] = useState(1); // 1: Upload, 2: Map Columns, 3: Validate & Preview
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvRows, setCsvRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [validationResults, setValidationResults] = useState([]);
  const [summaryInfo, setSummaryInfo] = useState({ total: 0, valid: 0, invalid: 0 });

  useEffect(() => {
    const loadDefs = async () => {
      try {
        const res = await apiFetch('/products/custom-fields');
        if (res.success) {
          setCustomFieldDefs(res.data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadDefs();
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  // Upload step
  const handleUploadCSV = async (e) => {
    e.preventDefault();
    if (!file) {
      setErrorMsg('Please select a CSV file first.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await apiFetch('/imports/preview', {
        method: 'POST',
        body: formData
      });

      if (res.success) {
        setCsvHeaders(res.data.headers);
        setStep(2);
        
        // Autoselect mappings based on name matching
        const initialMapping = {};
        const standardFields = ['sku', 'name', 'category', 'unit', 'description', 'minimumStock', 'openingStock', 'warehouseCode'];
        
        standardFields.forEach(field => {
          const match = res.data.headers.find(h => h.toLowerCase() === field.toLowerCase() || h.toLowerCase().includes(field.toLowerCase()));
          initialMapping[field] = match || '';
        });

        customFieldDefs.forEach(def => {
          const match = res.data.headers.find(h => h.toLowerCase() === def.label.toLowerCase());
          initialMapping[def.key] = match || '';
        });

        setMapping(initialMapping);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to read CSV. Ensure file formatting is correct.');
    } finally {
      setLoading(false);
    }
  };

  const handleMappingChange = (field, headerValue) => {
    setMapping({
      ...mapping,
      [field]: headerValue
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile);
      } else {
        setErrorMsg('Please select a valid CSV file.');
      }
    }
  };

  const handleDownloadTemplate = () => {
    const headers = [
      'SKU',
      'Name',
      'Category',
      'Unit',
      'Description',
      'Minimum Stock',
      'Opening Stock',
      'Warehouse Code',
      ...customFieldDefs.map(def => def.label)
    ];
    const dummyRow = [
      'PROD-100',
      'Sample Product Name',
      'Electronics',
      'Pcs',
      'A premium sample product description',
      '15',
      '50',
      'WH-MAIN',
      ...customFieldDefs.map(def => {
        if (def.type === 'Number') return '10';
        if (def.type === 'Date') return new Date().toLocaleDateString();
        if (def.type === 'Boolean') return 'Yes';
        return 'Sample Value';
      })
    ];
    const csvContent = [headers.join(','), dummyRow.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', 'stockpilot_products_template.csv');
    a.click();
  };

  // Run validation
  const handleValidateMapping = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    
    // We need to parse all rows. The preview endpoint only returns the first 5.
    // Wait, how do we send the entire file rows? We can read it in frontend using FileReader and parse or we can let the backend do it.
    // Ah, wait! The `/imports/preview` only returned the headers and 5 rows for simple inspection, but to validate the whole file,
    // how do we get the rows?
    // Let's check `previewUpload` controller again. It didn't return all rows! It did not save the file on the server since it's just buffer upload.
    // Oh, wait. Let's look at `imports/controller.js` line 16:
    // `const { headers, rows } = parseCSV(csvText);`
    // And in step 2/3, how does `validateMappedData` get the rows?
    // It takes: `const { rows, mapping } = req.body;`
    // This means the FRONTEND is expected to send the `rows` in the body!
    // So the frontend can parse the CSV text locally or we can read it on the frontend.
    // Let's read the CSV file in JS using `FileReader`, split lines, parse it, and send the parsed rows to `/api/imports/validate`!
    // That is brilliant! Let's write a simple CSV parser in the frontend that splits by comma, handles double quotes correctly, and extracts row arrays.
    
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target.result;
        const parsed = parseCsvTextLocal(text);
        
        const res = await apiFetch('/imports/validate', {
          method: 'POST',
          body: JSON.stringify({
            rows: parsed.rows,
            mapping
          })
        });

        if (res.success) {
          setValidationResults(res.data);
          
          const valid = res.data.filter(r => r.isValid).length;
          const invalid = res.data.length - valid;
          setSummaryInfo({ total: res.data.length, valid, invalid });
          setStep(3);
        }
      } catch (err) {
        setErrorMsg(err.message || 'Validation failed. Check mapping values.');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  // Helper local parser matching backend csv parser
  const parseCsvTextLocal = (text) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) return { headers: [], rows: [] };
    
    const parseLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++; // skip next quote
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current);
      
      // Clean enclosing quotes and trim values
      return result.map(val => {
        let clean = val.trim();
        if (clean.startsWith('"') && clean.endsWith('"')) {
          clean = clean.substring(1, clean.length - 1).trim();
        }
        return clean;
      });
    };

    const headers = parseLine(lines[0]).map(h => h.trim());
    const rows = lines.slice(1).map(line => {
      const cells = parseLine(line);
      const rowObj = {};
      headers.forEach((h, idx) => {
        rowObj[h] = cells[idx] !== undefined ? cells[idx] : '';
      });
      return rowObj;
    });

    return { headers, rows };
  };

  // Commit import
  const handleCommitImport = async () => {
    const validItems = validationResults.filter(r => r.isValid).map(r => r.mappedProduct);
    if (validItems.length === 0) {
      setErrorMsg('No valid products to import.');
      return;
    }
    
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await apiFetch('/imports/commit', {
        method: 'POST',
        body: JSON.stringify({ items: validItems })
      });
      if (res.success) {
        setSuccessMsg(`Successfully imported ${res.count} products into database.`);
        setStep(1);
        setFile(null);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to complete final import commit.');
    } finally {
      setLoading(false);
    }
  };

  // Export actions
  const handleExportProducts = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const response = await apiFetch('/exports/products');
      const text = await response.text();
      const blob = new Blob([text], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('href', url);
      a.setAttribute('download', 'stockpilot_products_export.csv');
      a.click();
      setSuccessMsg('Product list exported successfully.');
    } catch (err) {
      setErrorMsg(err.message || 'Export products failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-title-section">
        <div>
          <h1 className="page-title">Import & Export</h1>
          <p className="page-subtitle">Migrate catalogs via CSV spreadsheet uploads and compile stock inventory sheets.</p>
        </div>
      </div>

      {successMsg && <div className="alert-bar success">{successMsg}</div>}
      {errorMsg && <div className="alert-bar error">{errorMsg}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', alignItems: 'flex-start' }}>
        {/* CSV Import card */}
        <div className="card" style={{ backgroundColor: 'var(--panel-background)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--primary-color)' }}>Batch Product CSV Import</h3>
          
          {step === 1 && (
            <form onSubmit={handleUploadCSV}>
              <div 
                className={`drag-drop-zone ${isDragging ? 'dragging' : ''}`}
                style={{
                  border: isDragging ? '2px dashed var(--primary-color)' : '2px dashed var(--border-color)',
                  padding: '2rem',
                  borderRadius: '8px',
                  textAlign: 'center',
                  backgroundColor: isDragging ? 'var(--primary-light)' : 'var(--background-color)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)'
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  id="csv-file"
                  accept=".csv"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                <label htmlFor="csv-file" style={{ cursor: 'pointer', display: 'block' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: isDragging ? 'var(--primary-color)' : 'var(--text-muted)' }}>⎗</div>
                  <strong>Click to browse files</strong> or drag a CSV file here
                  {file ? (
                    <div style={{ marginTop: '0.75rem', color: 'var(--success-color)', fontWeight: '600' }}>
                      Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                    </div>
                  ) : (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Supports standard UTF-8 CSV sheets
                    </div>
                  )}
                </label>
              </div>

              <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={handleDownloadTemplate} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>↓</span> Download CSV Template
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading || !file}>
                  {loading ? 'Processing...' : 'Upload & Preview Mapping'}
                </button>
              </div>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleValidateMapping}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Map standard catalog headers to corresponding CSV fields.</p>
              
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Core Fields</h4>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Product SKU *</label>
                    <select className="form-input" value={mapping.sku || ''} onChange={(e) => handleMappingChange('sku', e.target.value)} required>
                      <option value="">Select column...</option>
                      {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Product Name *</label>
                    <select className="form-input" value={mapping.name || ''} onChange={(e) => handleMappingChange('name', e.target.value)} required>
                      <option value="">Select column...</option>
                      {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Category</label>
                    <select className="form-input" value={mapping.category || ''} onChange={(e) => handleMappingChange('category', e.target.value)}>
                      <option value="">Select column...</option>
                      {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Unit</label>
                    <select className="form-input" value={mapping.unit || ''} onChange={(e) => handleMappingChange('unit', e.target.value)}>
                      <option value="">Select column...</option>
                      {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Stock & Details</h4>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Min. Stock threshold</label>
                    <select className="form-input" value={mapping.minimumStock || ''} onChange={(e) => handleMappingChange('minimumStock', e.target.value)}>
                      <option value="">Select column...</option>
                      {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Opening Stock Qty</label>
                    <select className="form-input" value={mapping.openingStock || ''} onChange={(e) => handleMappingChange('openingStock', e.target.value)}>
                      <option value="">Select column...</option>
                      {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Warehouse Code (Required if opening stock exists)</label>
                    <select className="form-input" value={mapping.warehouseCode || ''} onChange={(e) => handleMappingChange('warehouseCode', e.target.value)}>
                      <option value="">Select column...</option>
                      {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Dynamic Custom Fields Mapping */}
              {customFieldDefs.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Custom Attributes mapping</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    {customFieldDefs.map(def => (
                      <div className="form-group" key={def._id}>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>{def.label}</label>
                        <select className="form-input" value={mapping[def.key] || ''} onChange={(e) => handleMappingChange(def.key, e.target.value)}>
                          <option value="">Select column...</option>
                          {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>Go Back</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Validating...' : 'Validate CSV Records'}
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <div>
              {/* Validation Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', padding: '1rem', backgroundColor: 'var(--background-color)', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Total Rows</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: '700' }}>{summaryInfo.total}</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--success-color)', display: 'block' }}>Valid (Ready)</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--success-color)' }}>{summaryInfo.valid}</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--danger-color)', display: 'block' }}>Errors Found</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--danger-color)' }}>{summaryInfo.invalid}</span>
                </div>
              </div>

              {/* Records preview status */}
              <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', marginBottom: '1.5rem' }}>
                <table className="data-table" style={{ fontSize: '0.85rem', margin: 0 }}>
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>SKU</th>
                      <th>Product Name</th>
                      <th>Warehouse</th>
                      <th>Stock</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validationResults.map((res, idx) => (
                      <tr key={idx} style={{ backgroundColor: res.isValid ? 'inherit' : 'var(--danger-light)' }}>
                        <td>{res.rowIndex}</td>
                        <td style={{ fontWeight: '600' }}>{res.mappedProduct?.sku || 'N/A'}</td>
                        <td>{res.mappedProduct?.name || 'N/A'}</td>
                        <td>{res.mappedProduct?.warehouseCode || '-'}</td>
                        <td>{res.mappedProduct?.openingStock || 0}</td>
                        <td>
                          {res.isValid ? (
                            <span style={{ color: 'var(--success-color)', fontWeight: '600' }}>✓ Valid</span>
                          ) : (
                            <span style={{ color: 'var(--danger-color)', fontWeight: '600' }} title={res.errors.join(', ')}>
                              ✗ {res.errors.length} Error(s)
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setStep(2)}>Adjust Mapping</button>
                <button type="button" className="btn btn-primary btn-with-spinner" onClick={handleCommitImport} disabled={loading || summaryInfo.valid === 0}>
                  {loading ? (
                    <>
                      <Spinner size={16} color="#ffffff" />
                      <span>Importing...</span>
                    </>
                  ) : (
                    <>
                      <UploadIcon style={{ width: '16px', height: '16px' }} />
                      <span>Import {summaryInfo.valid} Valid Product(s)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Data export card */}
        <div className="card" style={{ backgroundColor: 'var(--panel-background)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--primary-color)' }}>Compile Data Exports</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Download local backups of catalogs, warehouse sheets, or sales history ledger logs in standard format.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button className="btn btn-secondary action-btn-with-icon" style={{ justifyContent: 'center' }} onClick={handleExportProducts} disabled={loading}>
              {loading ? (
                <>
                  <Spinner size={16} />
                  <span>Generating CSV...</span>
                </>
              ) : (
                <>
                  <DownloadIcon style={{ width: '16px', height: '16px' }} />
                  <span>Export Products Catalog (.CSV)</span>
                </>
              )}
            </button>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              Includes system attributes, custom fields definitions, and warehouse stocks balance.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportExport;
