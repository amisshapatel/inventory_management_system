import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import { BellIcon, SearchIcon } from './Icons';
import { getNotifications, clearNotifications as clearNotificationsUtil, initializeDemoNotifications } from '../utils/notifications';

const MenuIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="4" x2="20" y1="12" y2="12" />
    <line x1="4" x2="20" y1="6" y2="6" />
    <line x1="4" x2="20" y1="18" y2="18" />
  </svg>
);

const Header = () => {
  const { user } = useAuth();
  const { toggleSidebar, isSidebarOpen } = useSidebar();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const notificationRef = useRef(null);

  // Load notifications from localStorage
  useEffect(() => {
    initializeDemoNotifications();
    setNotifications(getNotifications());
  }, []);

  // Listen for notification updates
  useEffect(() => {
    const handleNotificationAdded = () => {
      setNotifications(getNotifications());
    };


    const handleNotificationsCleared = () => {
      setNotifications([]);
    };

    window.addEventListener('notificationAdded', handleNotificationAdded);
    window.addEventListener('notificationsCleared', handleNotificationsCleared);

    return () => {
      window.removeEventListener('notificationAdded', handleNotificationAdded);
      window.removeEventListener('notificationsCleared', handleNotificationsCleared);
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
  };

  const clearNotifications = () => {
    clearNotificationsUtil();
  };

  if (!user) return null;

  return (
    <header className="app-header">
      <div className="header-left">
        <button 
          className="menu-toggle-btn" 
          onClick={toggleSidebar} 
          title={isSidebarOpen ? "Collapse sidebar (Ctrl+B)" : "Expand sidebar (Ctrl+B)"}
          aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          aria-expanded={isSidebarOpen}
        >
          <MenuIcon style={{ width: '20px', height: '20px' }} />
        </button>
        <div className="search-bar">
          <SearchIcon style={{ width: '16px', color: '#64748b' }} />
          <input type="text" placeholder="Search products, orders, or warehouses..." />
        </div>
      </div>

      <div className="header-actions">
        <div className="notification-container" ref={notificationRef}>
          <button 
            className="notification-btn" 
            title="View notifications"
            onClick={handleNotificationClick}
          >
            <BellIcon style={{ width: '20px', height: '20px' }} />
            {notifications.length > 0 && (
              <span className="notification-badge">{notifications.length}</span>
            )}
          </button>

          {showNotifications && (
            <div className="notification-dropdown">
              <div className="notification-header">
                <h4>Notifications</h4>
                {notifications.length > 0 && (
                  <button 
                    className="clear-notifications-btn"
                    onClick={clearNotifications}
                  >
                    Clear All
                  </button>
                )}
              </div>
              <div className="notification-list">
                {notifications.length === 0 ? (
                  <div className="no-notifications">No notifications</div>
                ) : (
                  notifications.map((notification, index) => (
                    <div key={index} className="notification-item">
                      <div className="notification-content">
                        <div className="notification-title">{notification.title}</div>
                        <div className="notification-message">{notification.message}</div>
                        <div className="notification-time">{notification.time}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="user-display" title="User Profile" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{ position: 'relative', width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #0b5ed7, #38bdf8)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem', boxShadow: '0 2px 6px rgba(11, 94, 215, 0.25)' }}>
            {user.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'U'}
            <span className="avatar-online-dot"></span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;


