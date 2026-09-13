import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  BrandLogoIcon,
  DashboardIcon,
  ProductsIcon,
  InventoryIcon,
  PurchasesIcon,
  SalesIcon,
  TransfersIcon,
  WarehousesIcon,
  ExpiryIcon,
  ReportsIcon,
  ImportExportIcon,
  UsersIcon,
  SettingsIcon,
  LogOutIcon
} from './Icons';

const Sidebar = () => {
  const { user, logout, hasPermission } = useAuth();

  if (!user) return null;

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: <DashboardIcon />, permission: null },
    { name: 'Products', path: '/products', icon: <ProductsIcon />, permission: 'product.view' },
    { name: 'Inventory', path: '/inventory', icon: <InventoryIcon />, permission: 'stock.view' },
    { name: 'Purchases', path: '/purchases', icon: <PurchasesIcon />, permission: 'purchase.view' },
    { name: 'Sales', path: '/sales', icon: <SalesIcon />, permission: 'sale.view' },
    { name: 'Stock Transfers', path: '/transfers', icon: <TransfersIcon />, permission: 'stock.view' },
    { name: 'Warehouses', path: '/warehouses', icon: <WarehousesIcon />, permission: 'warehouse.view' },
    { name: 'Expiry Management', path: '/expiry', icon: <ExpiryIcon />, permission: 'stock.view' },
    { name: 'Aging Reports', path: '/reports', icon: <ReportsIcon />, permission: 'report.view' },
    { name: 'Import & Export', path: '/import-export', icon: <ImportExportIcon />, permission: 'import.export' },
    { name: 'Users & Roles', path: '/users', icon: <UsersIcon />, permission: 'user.manage' },
    { name: 'Settings', path: '/settings', icon: <SettingsIcon />, permission: 'settings.manage' }
  ];

  // Filter menu items by user permissions
  const visibleMenuItems = menuItems.filter(item => {
    if (!item.permission) return true;
    return hasPermission(item.permission);
  });

  const closeSidebar = () => {
    const container = document.querySelector('.app-container');
    if (container) {
      container.classList.remove('sidebar-mobile-open');
    }
  };

  return (
    <aside className="sidebar">
      <div className="logo-container">
        <div className="sidebar-brand-wrapper">
          <div className="sidebar-brand-icon">
            <BrandLogoIcon size={34} />
          </div>
          <span className="logo-text">StockPilot</span>
        </div>
        <button className="sidebar-close-btn" onClick={closeSidebar} title="Close Menu">
          &times;
        </button>
      </div>

      <nav className="nav-list">
        {visibleMenuItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={closeSidebar}
          >
            {item.icon}
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-profile">
        <div className="profile-avatar" style={{ position: 'relative' }}>
          {user.name ? user.name.split(' ').map(n => n[0]).join('') : 'U'}
          <span className="avatar-online-dot"></span>
        </div>
        <div className="profile-info">
          <span className="profile-name">{user.name}</span>
          <span className="profile-role">{user.role || 'Staff'}</span>
        </div>
        <button 
          onClick={logout} 
          className="sidebar-exit-btn"
          title="Sign Out"
        >
          <LogOutIcon style={{ width: '13px', height: '13px' }} />
          <span>Exit</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
