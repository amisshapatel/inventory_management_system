import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ProductsIcon,
  InventoryIcon,
  PurchasesIcon,
  SalesIcon,
  TransfersIcon,
  WarehousesIcon,
  ExpiryIcon,
  PlusIcon
} from '../components/Icons';

const Dashboard = () => {
  const { apiFetch } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await apiFetch('/reports/dashboard');
        if (response.success) {
          setStats(response.data);
        } else {
          setError('Failed to fetch dashboard statistics.');
        }
      } catch (err) {
        console.error(err);
        setError(err.message || 'An error occurred while loading dashboard.');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const formatDate = () => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date().toLocaleDateString('en-US', options);
  };

  if (loading) {
    return <div className="loading-state">Loading dashboard analytics...</div>;
  }

  if (error) {
    return <div className="alert-bar error">{error}</div>;
  }

  const { metrics, criticalAlerts, recentActivity, stockMovementChart, warehouseDistributionChart } = stats || {
    metrics: { totalProducts: 0, inventoryValue: 0, lowStockCount: 0, expiringCount: 0, deadStockCount: 0, totalWarehouses: 0 },
    criticalAlerts: [],
    recentActivity: [],
    stockMovementChart: [],
    warehouseDistributionChart: []
  };

  // Helper to format currency
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div>
      {/* Title Section */}
      <div className="page-title-section">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Overview of warehouse performance and stock status.</p>
        </div>
        <div className="date-badge">
          {formatDate()}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Total Products</span>
            <div className="metric-icon-box blue">
              <ProductsIcon style={{ width: '18px' }} />
            </div>
          </div>
          <span className="metric-value">{metrics.totalProducts}</span>
          <span className="metric-trend up">
            <span>↑ 4% this month</span>
          </span>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Inventory Value</span>
            <div className="metric-icon-box blue">
              <InventoryIcon style={{ width: '18px' }} />
            </div>
          </div>
          <span className="metric-value">{formatCurrency(metrics.inventoryValue)}</span>
          <span className="metric-trend up">
            <span>↑ 12% vs last year</span>
          </span>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Low Stock</span>
            <div className="metric-icon-box red">
              <ExpiryIcon style={{ width: '18px' }} />
            </div>
          </div>
          <span className="metric-value" style={{ color: 'var(--danger-color)' }}>{metrics.lowStockCount}</span>
          <span className="metric-trend neutral">
            <span>Requires action</span>
          </span>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Expiring</span>
            <div className="metric-icon-box red">
              <ExpiryIcon style={{ width: '18px' }} />
            </div>
          </div>
          <span className="metric-value" style={{ color: 'var(--warning-color)' }}>{metrics.expiringCount}</span>
          <span className="metric-trend neutral">
            <span>Within 7 days</span>
          </span>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Dead Stock</span>
            <div className="metric-icon-box">
              <ProductsIcon style={{ width: '18px' }} />
            </div>
          </div>
          <span className="metric-value">{metrics.deadStockCount}</span>
          <span className="metric-trend neutral">
            <span>90+ days inactive</span>
          </span>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Warehouses</span>
            <div className="metric-icon-box blue">
              <WarehousesIcon style={{ width: '18px' }} />
            </div>
          </div>
          <span className="metric-value">{metrics.totalWarehouses}</span>
          <span className="metric-trend neutral">
            <span>Operational hubs</span>
          </span>
        </div>
      </div>

      {/* Quick Actions */}
      <h2 className="section-title">Quick Actions</h2>
      <div className="quick-actions-row">
        <button className="action-card primary" onClick={() => navigate('/products?action=add')}>
          <PlusIcon />
          <span>Add Product</span>
        </button>
        <button className="action-card" onClick={() => navigate('/purchases?action=add')}>
          <PurchasesIcon />
          <span>Create Purchase</span>
        </button>
        <button className="action-card" onClick={() => navigate('/sales?action=add')}>
          <SalesIcon />
          <span>Create Sale</span>
        </button>
        <button className="action-card" onClick={() => navigate('/transfers?action=add')}>
          <TransfersIcon />
          <span>Transfer Stock</span>
        </button>
      </div>

      {/* Grid: Left and Right Columns */}
      <div className="dashboard-grid">
        <div className="left-column">
          {/* Critical Alerts */}
          <div>
            <div className="alerts-header">
              <h2 className="section-title" style={{ marginBottom: 0 }}>Critical Alerts</h2>
              <span className="view-all-link" style={{ cursor: 'pointer' }} onClick={() => navigate('/inventory')}>View All Alerts</span>
            </div>
            
            <div className="alerts-grid">
              {criticalAlerts.length === 0 ? (
                <div className="alert-item-card" style={{ gridColumn: 'span 2', justifyContent: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No critical alerts at this time.</span>
                </div>
              ) : (
                criticalAlerts.map((alert, idx) => (
                  <div key={idx} className="alert-item-card">
                    <div className="alert-details">
                      <div className={`alert-badge-box ${alert.icon === 'warning' ? 'danger' : alert.icon === 'clock' ? 'warning' : 'info'}`}>
                        <ExpiryIcon style={{ width: '20px' }} />
                      </div>
                      <div>
                        <div className="alert-title">{alert.title}</div>
                        <div className="alert-desc">{alert.details}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Charts Row */}
          <div className="charts-row">
            {/* Stock Movement */}
            <div className="chart-card">
              <h3 className="chart-title">Stock Movement (7 Days)</h3>
              <div className="svg-chart-container">
                {/* Build simple graphical columns based on 7 days movement data */}
                {Array.from({ length: 7 }).map((_, i) => {
                  const date = new Date();
                  date.setDate(date.getDate() - (6 - i));
                  const dateStr = date.toISOString().split('T')[0];
                  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

                  // Sum quantity for this date
                  const dayData = stockMovementChart.filter(item => item._id.date === dateStr);
                  const totalQty = dayData.reduce((sum, item) => sum + item.count, 0);

                  // Normalize height (max height 100px)
                  const maxHeight = 100;
                  const maxChartVal = Math.max(...stockMovementChart.map(d => d.count), 10);
                  const height = Math.min((totalQty / maxChartVal) * maxHeight, maxHeight);

                  return (
                    <div key={i} className="chart-bar-col">
                      <div 
                        className={`chart-bar ${totalQty > 0 ? 'filled' : ''}`} 
                        style={{ height: `${height + 10}px`, backgroundColor: totalQty > 0 ? 'var(--primary-color)' : '#cbd5e1' }}
                        title={`${totalQty} units moved on ${dateStr}`}
                      />
                      <span className="chart-bar-label">{dayName}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Warehouse Distribution */}
            <div className="chart-card">
              <h3 className="chart-title">Warehouse Distribution</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.5rem 0' }}>
                {warehouseDistributionChart.length === 0 ? (
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>No stock distributed yet.</span>
                ) : (
                  warehouseDistributionChart.map((dist, idx) => {
                    const totalQty = warehouseDistributionChart.reduce((sum, d) => sum + d.totalQuantity, 0) || 1;
                    const percent = Math.round((dist.totalQuantity / totalQty) * 100);
                    return (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                          <span style={{ fontWeight: '500' }}>{dist.warehouseName}</span>
                          <span style={{ color: 'var(--text-muted)' }}>{dist.totalQuantity} units ({percent}%)</span>
                        </div>
                        <div style={{ height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                          <div 
                            style={{ 
                              height: '100%', 
                              width: `${percent}%`, 
                              backgroundColor: idx === 0 ? 'var(--primary-color)' : idx === 1 ? 'var(--success-color)' : 'var(--info-color)' 
                            }} 
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Activity */}
        <div className="recent-activity-card">
          <h2 className="section-title" style={{ marginBottom: '0.5rem' }}>Recent Activity</h2>
          <div className="activity-timeline">
            {recentActivity.length === 0 ? (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No recent activity records.</span>
            ) : (
              recentActivity.map((act) => (
                <div key={act.id} className="activity-item">
                  <div className={`activity-dot ${act.type === 'PURCHASE_IN' ? 'purchase' : act.type === 'SALE_OUT' ? 'sale' : 'transfer'}`} />
                  <div className="activity-content">
                    <div className="activity-item-header">
                      <span className="activity-title">{act.title}</span>
                      <span className="activity-time">{new Date(act.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <span className="activity-desc">{act.description}</span>
                    <span 
                      className="activity-badge"
                      style={{ 
                        backgroundColor: act.status === 'SHIPPED' ? 'var(--primary-light)' : act.status === 'PENDING RECEIPT' ? 'var(--warning-light)' : 'var(--success-light)',
                        color: act.status === 'SHIPPED' ? 'var(--primary-color)' : act.status === 'PENDING RECEIPT' ? 'var(--warning-color)' : 'var(--success-color)'
                      }}
                    >
                      {act.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
