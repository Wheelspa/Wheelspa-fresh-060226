import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AdminAuthProvider, useAdminAuth } from "./context/AdminAuthContext";

// Pages
import Home from "./pages/Home";
import About from "./pages/About";
import Services from "./pages/Services";
import Booking from "./pages/Booking";
import Knowledge from "./pages/Knowledge";
import Contact from "./pages/Contact";
import TokenDisplay from "./pages/TokenDisplay";

// Admin Pages
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminNewEntry from "./pages/AdminNewEntry";
import AdminEntries from "./pages/AdminEntries";
import AdminReports from "./pages/AdminReports";
import AdminServices from "./pages/AdminServices";
import AdminBookings from "./pages/AdminBookings";
import AdminUsers from "./pages/AdminUsers";
import AdminApprovals from "./pages/AdminApprovals";
import EmployeePerformance from "./pages/EmployeePerformance";
import BookingSlots from "./pages/BookingSlots";

// Installer Payment Pages
import InstallerDashboard from "./pages/InstallerDashboard";
import InstallerNewPayment from "./pages/InstallerNewPayment";
import InstallerPayments from "./pages/InstallerPayments";
import InstallerManage from "./pages/InstallerManage";

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAdminAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }
  
  return children;
};

// Admin Route Wrapper
const AdminRoutes = () => {
  const { isAuthenticated } = useAdminAuth();
  
  return (
    <Routes>
      <Route 
        path="/" 
        element={isAuthenticated ? <Navigate to="/admin/dashboard" replace /> : <AdminLogin />} 
      />
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/new-entry" 
        element={
          <ProtectedRoute>
            <AdminNewEntry />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/entries" 
        element={
          <ProtectedRoute>
            <AdminEntries />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/reports" 
        element={
          <ProtectedRoute>
            <AdminReports />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/services" 
        element={
          <ProtectedRoute>
            <AdminServices />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/bookings" 
        element={
          <ProtectedRoute>
            <AdminBookings />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/slots" 
        element={
          <ProtectedRoute>
            <BookingSlots />
          </ProtectedRoute>
        } 
      />
      {/* Installer Payment Routes */}
      <Route 
        path="/installer" 
        element={
          <ProtectedRoute>
            <InstallerDashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/installer/new-payment" 
        element={
          <ProtectedRoute>
            <InstallerNewPayment />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/installer/payments" 
        element={
          <ProtectedRoute>
            <InstallerPayments />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/installer/installers" 
        element={
          <ProtectedRoute>
            <InstallerManage />
          </ProtectedRoute>
        } 
      />
      {/* User Management (Owner only) */}
      <Route 
        path="/users" 
        element={
          <ProtectedRoute>
            <AdminUsers />
          </ProtectedRoute>
        } 
      />
      {/* Approval Requests (Superadmin & Owner) */}
      <Route 
        path="/approvals" 
        element={
          <ProtectedRoute>
            <AdminApprovals />
          </ProtectedRoute>
        } 
      />
      {/* Employee Performance (Owner only) */}
      <Route 
        path="/performance" 
        element={
          <ProtectedRoute>
            <EmployeePerformance />
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AdminAuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/services" element={<Services />} />
            <Route path="/booking" element={<Booking />} />
            <Route path="/knowledge" element={<Knowledge />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/token-display" element={<TokenDisplay />} />
            
            {/* Admin Routes */}
            <Route path="/admin/*" element={<AdminRoutes />} />
          </Routes>
        </AdminAuthProvider>
      </BrowserRouter>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;
