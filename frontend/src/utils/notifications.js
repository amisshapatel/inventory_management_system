// Notification utility for managing local notification storage
// This simulates notification history in the frontend since backend doesn't have a notification history table

export const addNotification = (title, message) => {
  const notifications = getNotifications();
  const newNotification = {
    title,
    message,
    time: new Date().toLocaleString()
  };
  
  // Add new notification at the beginning
  notifications.unshift(newNotification);
  
  // Keep only last 50 notifications
  if (notifications.length > 50) {
    notifications.pop();
  }
  
  localStorage.setItem('notifications', JSON.stringify(notifications));
  
  // Dispatch custom event to notify components
  window.dispatchEvent(new CustomEvent('notificationAdded', { detail: newNotification }));
};

export const getNotifications = () => {
  const saved = localStorage.getItem('notifications');
  return saved ? JSON.parse(saved) : [];
};

export const clearNotifications = () => {
  localStorage.removeItem('notifications');
  window.dispatchEvent(new CustomEvent('notificationsCleared'));
};

export const getNotificationCount = () => {
  return getNotifications().length;
};

// Initialize with demo notifications if none exist
export const initializeDemoNotifications = () => {
  if (getNotifications().length === 0) {
    const demoNotifications = [
      {
        title: 'Welcome to StockPilot',
        message: 'This is your notification center. You will see important updates here.',
        time: new Date().toLocaleString()
      },
      {
        title: 'Mailtrap Integration',
        message: 'Email notifications are configured and working. Check your Mailtrap inbox for system alerts.',
        time: new Date(Date.now() - 3600000).toLocaleString()
      },
      {
        title: 'System Ready',
        message: 'Your inventory management system is ready to use. Start by adding products or warehouses.',
        time: new Date(Date.now() - 7200000).toLocaleString()
      }
    ];
    
    localStorage.setItem('notifications', JSON.stringify(demoNotifications));
    window.dispatchEvent(new CustomEvent('notificationAdded', { detail: demoNotifications[0] }));
  }
};