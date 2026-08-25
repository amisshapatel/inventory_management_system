import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { BellIcon, SearchIcon } from './Icons';
import { getNotifications, clearNotifications as clearNotificationsUtil, initializeDemoNotifications } from '../utils/notifications';

const Header = () => {
  const { user } = useAuth();
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
    const handleNotificationAdded = (event) => {
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
      <div className="search-bar">
        <SearchIcon style={{ width: '16px', color: '#64748b' }} />
        <input type="text" placeholder="Search products, orders, or warehouses..." />
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

        <div className="user-display" title="User Profile">
          <span style={{ fontSize: '0.85rem', color: '#64748b', marginRight: '4px' }}>Welcome,</span>
          <span>{user.name || 'User'}</span>
        </div>
      </div>
    </header>
  );
};

export default Header;


