import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminAuthContext = createContext(null);

export const AdminAuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingApprovals, setPendingApprovals] = useState(0);

  // Fetch pending approvals count
  const fetchPendingApprovals = useCallback(async (token) => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/api/approval-requests/pending-count`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPendingApprovals(data.count);
      }
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
    }
  }, []);

  useEffect(() => {
    // Check if admin is already logged in
    const storedToken = localStorage.getItem('wheelspa_token');
    const storedAdmin = localStorage.getItem('wheelspa_admin');
    
    if (storedToken && storedAdmin) {
      const adminData = JSON.parse(storedAdmin);
      setAdmin({ ...adminData, token: storedToken });
      setIsAuthenticated(true);
      fetchPendingApprovals(storedToken);
    }
    setLoading(false);
  }, [fetchPendingApprovals]);

  // Refresh pending count periodically
  useEffect(() => {
    if (isAuthenticated && admin?.token && ['superadmin', 'owner'].includes(admin?.role)) {
      const interval = setInterval(() => {
        fetchPendingApprovals(admin.token);
      }, 30000); // Every 30 seconds
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, admin, fetchPendingApprovals]);

  const login = async (username, password) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.detail || 'Invalid credentials' };
      }

      const adminData = {
        ...data.user,
        token: data.token,
        loginTime: new Date().toISOString()
      };

      localStorage.setItem('wheelspa_token', data.token);
      localStorage.setItem('wheelspa_admin', JSON.stringify(data.user));
      setAdmin(adminData);
      setIsAuthenticated(true);
      
      // Fetch pending approvals for superadmin/owner
      if (['superadmin', 'owner'].includes(data.user.role)) {
        fetchPendingApprovals(data.token);
      }

      return { success: true, user: data.user };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Connection error. Please try again.' };
    }
  };

  const logout = () => {
    localStorage.removeItem('wheelspa_token');
    localStorage.removeItem('wheelspa_admin');
    setAdmin(null);
    setIsAuthenticated(false);
    setPendingApprovals(0);
  };

  // Helper to check if user can edit/delete directly
  const canEditDirectly = () => {
    return admin?.role === 'superadmin' || admin?.role === 'owner';
  };

  // Helper to check if user can manage users
  const canManageUsers = () => {
    return admin?.role === 'owner';
  };

  // Helper to check if user can approve requests
  const canApproveRequests = () => {
    return admin?.role === 'superadmin' || admin?.role === 'owner';
  };

  // Refresh pending approvals manually
  const refreshPendingApprovals = () => {
    if (admin?.token) {
      fetchPendingApprovals(admin.token);
    }
  };

  const changePassword = async (oldPassword, newPassword) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${admin?.token}`
        },
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword })
      });
      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.detail || 'Failed to change password' };
      }
      
      const updatedUser = { ...admin, must_change_password: false };
      localStorage.setItem('wheelspa_admin', JSON.stringify({
        id: admin.id,
        username: admin.username,
        role: admin.role,
        name: admin.name,
        must_change_password: false
      }));
      setAdmin(updatedUser);
      return { success: true };
    } catch (error) {
      console.error('Change password error:', error);
      return { success: false, error: 'Connection error. Please try again.' };
    }
  };

  return (
    <AdminAuthContext.Provider value={{ 
      isAuthenticated, 
      admin, 
      login, 
      logout, 
      loading,
      pendingApprovals,
      canEditDirectly,
      canManageUsers,
      canApproveRequests,
      refreshPendingApprovals,
      changePassword
    }}>
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
