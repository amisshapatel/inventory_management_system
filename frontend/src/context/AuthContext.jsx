import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const BACKEND_API_URL = import.meta.env.VITE_API_URL || '/api';

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('stockpilot_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('stockpilot_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    setError(null);
    try {
      const response = await fetch(`${BACKEND_API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.message || 'Login failed');
      }

      setUser(resData.data);
      localStorage.setItem('stockpilot_user', JSON.stringify(resData.data));
      return resData.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('stockpilot_user');
  };

  // Helper method to wrap API requests with authentication token
  const apiFetch = async (endpoint, options = {}) => {
    const storedUser = localStorage.getItem('stockpilot_user');
    let token = '';
    if (storedUser) {
      token = JSON.parse(storedUser).token;
    }

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers
    };

    // If body is FormData (used for file upload), do not set Content-Type header
    if (options.body instanceof FormData) {
      delete headers['Content-Type'];
    }

    const url = endpoint.startsWith('http') ? endpoint : `${BACKEND_API_URL}${endpoint}`;
    const response = await fetch(url, config);

    // If it's a file download (like export CSV)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/csv')) {
      return response; // Return raw response so the page can download it
    }

    const resData = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired / Unauthorized - force logout
        logout();
      }
      throw new Error(resData.message || 'API request failed');
    }

    return resData;
  };

  // Helper to check if current user has a specific permission
  const hasPermission = (permission) => {
    if (!user) return false;
    if (user.role === 'Admin') return true; // Admin override
    return user.permissions && user.permissions.includes(permission);
  };

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    apiFetch,
    hasPermission,
    backendUrl: import.meta.env.VITE_BACKEND_URL || ''
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};
