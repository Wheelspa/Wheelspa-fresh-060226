import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  Car, LogOut, Plus, List, BarChart3, Menu, X, 
  Home, ChevronRight, Bell, Wallet, Users, Settings, CalendarCheck,
  Crown, Shield, UserCog, ClipboardCheck, UserPlus, Star, CalendarDays
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { BRAND_INFO } from '../../data/mock';
import { toast } from 'sonner';

const AdminLayout = ({ children, title }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { admin, logout, pendingApprovals, canApproveRequests, canManageUsers, changePassword } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long');
      return;
    }

    setPasswordLoading(true);
    const result = await changePassword(oldPassword, newPassword);
    setPasswordLoading(false);

    if (result.success) {
      toast.success('Password updated successfully!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      toast.error(result.error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/admin');
  };

  const getRoleIcon = () => {
    switch (admin?.role) {
      case 'owner': return <Crown className="h-4 w-4 text-yellow-400" />;
      case 'superadmin': return <Shield className="h-4 w-4 text-blue-400" />;
      default: return <UserCog className="h-4 w-4 text-green-400" />;
    }
  };

  const getRoleBadgeColor = () => {
    switch (admin?.role) {
      case 'owner': return 'bg-yellow-500/20 text-yellow-400';
      case 'superadmin': return 'bg-blue-500/20 text-blue-400';
      default: return 'bg-green-500/20 text-green-400';
    }
  };

  const navItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: Home },
    { path: '/admin/bookings', label: 'Customer Bookings', icon: CalendarCheck },
    { path: '/admin/slots', label: 'Booking Slots', icon: CalendarDays },
    { path: '/admin/new-entry', label: 'New Entry', icon: Plus },
    { path: '/admin/entries', label: 'All Entries', icon: List },
    { path: '/admin/reports', label: 'Reports', icon: BarChart3 },
    { path: '/admin/services', label: 'Manage Services', icon: Settings },
  ];

  const installerNavItems = [
    { path: '/admin/installer', label: 'Installer Dashboard', icon: Wallet },
    { path: '/admin/installer/new-payment', label: 'Add Payment', icon: Plus },
    { path: '/admin/installer/payments', label: 'All Payments', icon: List },
    { path: '/admin/installer/installers', label: 'Manage Installers', icon: Users },
  ];

  // Role-specific nav items
  const showApprovals = admin && (admin.role === 'superadmin' || admin.role === 'owner');
  const showUserManagement = admin && admin.role === 'owner';
  const showPerformance = admin && admin.role === 'owner';

  const approvalNavItem = showApprovals ? [
    { path: '/admin/approvals', label: 'Approval Requests', icon: ClipboardCheck, badge: pendingApprovals }
  ] : [];

  const userManagementNavItem = showUserManagement ? [
    { path: '/admin/users', label: 'Manage Users', icon: UserPlus }
  ] : [];

  const performanceNavItem = showPerformance ? [
    { path: '/admin/performance', label: 'Employee Performance', icon: Star }
  ] : [];

  const isActive = (path) => location.pathname === path;
  const showAdminSection = showApprovals || showUserManagement || showPerformance;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-gray-900 transform transition-transform duration-300 lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center justify-between">
              <img
                src={BRAND_INFO.logo}
                alt="Wheelspa"
                className="h-12 w-auto"
              />
              <button 
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-gray-400 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">Admin Portal</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {/* Vehicle Entries Section */}
            <p className="text-xs text-gray-500 uppercase tracking-wider px-4 mb-2">Vehicle Entries</p>
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive(item.path)
                    ? 'bg-green-500 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            ))}

            {/* Installer Payments Section */}
            <div className="pt-4 mt-4 border-t border-gray-800">
              <p className="text-xs text-gray-500 uppercase tracking-wider px-4 mb-2">Installer Payments</p>
              {installerNavItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive(item.path)
                      ? 'bg-green-500 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-sm">{item.label}</span>
                </Link>
              ))}
            </div>

            {/* Administration Section (Role-based) */}
            {showAdminSection && (
              <div className="pt-4 mt-4 border-t border-gray-800">
                <p className="text-xs text-gray-500 uppercase tracking-wider px-4 mb-2">Administration</p>
                
                {/* Approval Requests */}
                {approvalNavItem.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                      isActive(item.path)
                        ? 'bg-green-500 text-white'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <item.icon className="h-5 w-5" />
                      <span className="text-sm">{item.label}</span>
                    </div>
                    {item.badge > 0 && (
                      <Badge className="bg-red-500 text-white text-xs px-2">
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                ))}

                {/* User Management */}
                {userManagementNavItem.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive(item.path)
                        ? 'bg-green-500 text-white'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                ))}

                {/* Employee Performance */}
                {performanceNavItem.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive(item.path)
                        ? 'bg-green-500 text-white'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                ))}
              </div>
            )}
          </nav>

          {/* User Info & Logout */}
          <div className="p-4 border-t border-gray-800">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold">
                  {admin?.name?.charAt(0).toUpperCase() || admin?.username?.charAt(0).toUpperCase() || 'A'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{admin?.name || admin?.username || 'Admin'}</p>
                <div className={`inline-flex items-center space-x-1 text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor()}`}>
                  {getRoleIcon()}
                  <span className="capitalize">{admin?.role || 'admin'}</span>
                </div>
              </div>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Top Header */}
        <header className="bg-white shadow-sm sticky top-0 z-30">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
              >
                <Menu className="h-6 w-6" />
              </button>
              <div className="flex items-center text-sm text-gray-500">
                <Car className="h-4 w-4 mr-2 text-green-500" />
                <span>Admin</span>
                <ChevronRight className="h-4 w-4 mx-1" />
                <span className="text-gray-900 font-medium">{title}</span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {showApprovals && pendingApprovals > 0 && (
                <Link to="/admin/approvals">
                  <button className="p-2 rounded-lg hover:bg-gray-100 relative">
                    <Bell className="h-5 w-5 text-gray-500" />
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                      {pendingApprovals}
                    </span>
                  </button>
                </Link>
              )}
              <Link to="/" target="_blank">
                <Button variant="outline" size="sm" className="hidden sm:flex">
                  View Website
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>

      {/* Forced Password Change Modal */}
      <Dialog open={!!admin?.must_change_password} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              Password Change Required
            </DialogTitle>
            <DialogDescription>
              Your account requires a password update before accessing the admin dashboard.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordSubmit} className="space-y-4 pt-2">
            <div>
              <Label htmlFor="oldPass">Current Password</Label>
              <Input
                id="oldPass"
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Enter current password (e.g. owner123)"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="newPass">New Password</Label>
              <Input
                id="newPass"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="confirmPass">Confirm New Password</Label>
              <Input
                id="confirmPass"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                className="mt-1"
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={handleLogout}>
                Logout
              </Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white" disabled={passwordLoading}>
                {passwordLoading ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminLayout;
