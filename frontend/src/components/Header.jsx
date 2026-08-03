import React from 'react';
import { useAuth } from '../context/AuthContext';
import { BellIcon, SearchIcon } from './Icons';

const Header = () => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <header className="app-header">
      <div className="search-bar">
        <SearchIcon style={{ width: '16px', color: '#64748b' }} />
        <input type="text" placeholder="Search products, orders, or warehouses..." />
      </div>

      <div className="header-actions">
        <button className="notification-btn" title="View notifications">
          <BellIcon style={{ width: '20px', height: '20px' }} />
          <span className="notification-badge"></span>
        </button>

        <div className="user-display" title="User Profile">
          <span style={{ fontSize: '0.85rem', color: '#64748b', marginRight: '4px' }}>Welcome,</span>
          <span>{user.name || 'User'}</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
