import React, { createContext, useContext, useState, useEffect } from 'react';
import { ADMIN_CREDENTIALS } from '../data/adminMock';

const AdminAuthContext = createContext(null);

export const AdminAuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if admin is already logged in
    const storedAdmin = localStorage.getItem('wheelspa_admin');
    if (storedAdmin) {
      setAdmin(JSON.parse(storedAdmin));
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const login = (adminId, password) => {
    if (adminId === ADMIN_CREDENTIALS.adminId && password === ADMIN_CREDENTIALS.password) {
      const adminData = { adminId, loginTime: new Date().toISOString() };
      localStorage.setItem('wheelspa_admin', JSON.stringify(adminData));
      setAdmin(adminData);
      setIsAuthenticated(true);
      return { success: true };
    }
    return { success: false, error: 'Invalid Admin ID or Password' };
  };

  const logout = () => {
    localStorage.removeItem('wheelspa_admin');
    setAdmin(null);
    setIsAuthenticated(false);
  };

  return (
    <AdminAuthContext.Provider value={{ isAuthenticated, admin, login, logout, loading }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return context;
};
