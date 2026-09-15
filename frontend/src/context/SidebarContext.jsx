import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const SidebarContext = createContext(null);

export const SidebarProvider = ({ children }) => {
  // Check if initial screen is mobile
  const getIsMobile = () => typeof window !== 'undefined' && window.innerWidth <= 768;

  const [isMobile, setIsMobile] = useState(getIsMobile);
  
  // Stored desktop preference (defaults to true if not set)
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    if (window.innerWidth <= 768) return false;
    const saved = localStorage.getItem('stockpilot_sidebar_open');
    return saved !== null ? saved === 'true' : true;
  });

  // Keep track of window resize for mobile breakpoint
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      // Auto-close overlay when switching to mobile
      if (mobile && isSidebarOpen) {
        const saved = localStorage.getItem('stockpilot_sidebar_open');
        if (saved === null) {
          setIsSidebarOpen(false);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isSidebarOpen]);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => {
      const next = !prev;
      if (!isMobile) {
        localStorage.setItem('stockpilot_sidebar_open', String(next));
      }
      return next;
    });
  }, [isMobile]);

  const closeSidebar = useCallback(() => {
    setIsSidebarOpen(false);
    if (!isMobile) {
      localStorage.setItem('stockpilot_sidebar_open', 'false');
    }
  }, [isMobile]);

  const openSidebar = useCallback(() => {
    setIsSidebarOpen(true);
    if (!isMobile) {
      localStorage.setItem('stockpilot_sidebar_open', 'true');
    }
  }, [isMobile]);

  // Global keyboard shortcuts (Ctrl+B / Cmd+B to toggle, Escape to close on mobile)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Toggle with Ctrl+B or Cmd+B
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
      // Escape to close if open
      if (e.key === 'Escape' && isSidebarOpen) {
        closeSidebar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar, closeSidebar, isSidebarOpen]);

  const value = {
    isSidebarOpen,
    isMobile,
    toggleSidebar,
    closeSidebar,
    openSidebar
  };

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};
