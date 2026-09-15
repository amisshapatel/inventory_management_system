import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SidebarProvider, useSidebar } from './context/SidebarContext';
import { ScreenLoader } from './components/Loader';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import Purchases from './pages/Purchases';
import Sales from './pages/Sales';
import Transfers from './pages/Transfers';
import Warehouses from './pages/Warehouses';
import ExpiryManagement from './pages/ExpiryManagement';
import Reports from './pages/Reports';
import ImportExport from './pages/ImportExport';
import Users from './pages/Users';
import Settings from './pages/Settings';

const ProtectedLayoutInner = ({ children }) => {
  const { isSidebarOpen, isMobile, closeSidebar } = useSidebar();

  const containerClasses = [
    'app-container',
    !isSidebarOpen && !isMobile ? 'sidebar-collapsed' : '',
    isSidebarOpen && isMobile ? 'sidebar-mobile-open' : ''
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      <Sidebar />
      <div 
        className="sidebar-overlay" 
        onClick={closeSidebar}
        role="button"
        tabIndex={0}
        aria-label="Close sidebar overlay"
      />
      <div className="main-workspace">
        <Header />
        <div className="content-area">
          {children}
        </div>
      </div>
    </div>
  );
};

const ProtectedLayout = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <ScreenLoader 
        message="Authenticating session..." 
        subtitle="Synchronizing warehouse telemetry and roles..." 
      />
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <SidebarProvider>
      <ProtectedLayoutInner>
        {children}
      </ProtectedLayoutInner>
    </SidebarProvider>
  );
};

const PublicLayout = ({ children }) => {
  const { user, loading } = useAuth();


  if (loading) {
    return (
      <ScreenLoader 
        message="Starting StockPilot..." 
        subtitle="Verifying secure authentication channel..." 
      />
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Authentication */}
          <Route 
            path="/login" 
            element={
              <PublicLayout>
                <Login />
              </PublicLayout>
            } 
          />

          {/* Protected Routes */}
          <Route path="/" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
          <Route path="/products" element={<ProtectedLayout><Products /></ProtectedLayout>} />
          <Route path="/inventory" element={<ProtectedLayout><Inventory /></ProtectedLayout>} />
          <Route path="/purchases" element={<ProtectedLayout><Purchases /></ProtectedLayout>} />
          <Route path="/sales" element={<ProtectedLayout><Sales /></ProtectedLayout>} />
          <Route path="/transfers" element={<ProtectedLayout><Transfers /></ProtectedLayout>} />
          <Route path="/warehouses" element={<ProtectedLayout><Warehouses /></ProtectedLayout>} />
          <Route path="/expiry" element={<ProtectedLayout><ExpiryManagement /></ProtectedLayout>} />
          <Route path="/reports" element={<ProtectedLayout><Reports /></ProtectedLayout>} />
          <Route path="/import-export" element={<ProtectedLayout><ImportExport /></ProtectedLayout>} />
          <Route path="/users" element={<ProtectedLayout><Users /></ProtectedLayout>} />
          <Route path="/settings" element={<ProtectedLayout><Settings /></ProtectedLayout>} />

          {/* Fallback to Dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
