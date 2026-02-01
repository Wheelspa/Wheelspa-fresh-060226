import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Car, Plus, IndianRupee, Clock, CheckCircle, 
  AlertCircle, TrendingUp, Calendar, Users
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import AdminLayout from '../components/admin/AdminLayout';
import { MOCK_ENTRIES, JOB_STATUS, PAYMENT_MODES } from '../data/adminMock';
import { SERVICES } from '../data/mock';
import { format } from 'date-fns';

const AdminDashboard = () => {
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState({
    totalEntries: 0,
    totalRevenue: 0,
    pendingJobs: 0,
    completedToday: 0,
    cashCollection: 0
  });

  useEffect(() => {
    // Load entries from localStorage or use mock data
    const storedEntries = localStorage.getItem('wheelspa_entries');
    const allEntries = storedEntries ? JSON.parse(storedEntries) : MOCK_ENTRIES;
    setEntries(allEntries);

    // Calculate stats
    const today = new Date().toDateString();
    const todayEntries = allEntries.filter(e => 
      new Date(e.entryDate).toDateString() === today
    );

    setStats({
      totalEntries: allEntries.length,
      totalRevenue: allEntries.reduce((sum, e) => sum + e.amount, 0),
      pendingJobs: allEntries.filter(e => e.jobStatus === 'pending' || e.jobStatus === 'in_progress').length,
      completedToday: todayEntries.filter(e => e.jobStatus === 'completed').length,
      cashCollection: todayEntries.filter(e => e.paymentMode === 'cash').reduce((sum, e) => sum + e.amount, 0)
    });
  }, []);

  const getServiceName = (serviceId) => {
    const service = SERVICES.find(s => s.id === serviceId);
    return service?.shortName || serviceId;
  };

  const getStatusBadge = (status) => {
    const statusInfo = JOB_STATUS.find(s => s.value === status);
    return statusInfo ? (
      <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
    ) : null;
  };

  const getPaymentLabel = (mode) => {
    const payment = PAYMENT_MODES.find(p => p.value === mode);
    return payment?.label || mode;
  };

  const recentEntries = entries.slice(-5).reverse();

  return (
    <AdminLayout title="Dashboard">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Entries</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalEntries}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Car className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">₹{stats.totalRevenue.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <IndianRupee className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Jobs</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingJobs}</p>
              </div>
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Completed Today</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completedToday}</p>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm col-span-2 lg:col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Cash Today</p>
                <p className="text-2xl font-bold text-gray-900">₹{stats.cashCollection.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Plus className="h-5 w-5 text-green-500 mr-2" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/admin/new-entry" className="block">
              <Button className="w-full bg-green-500 hover:bg-green-600 text-white justify-start">
                <Car className="h-4 w-4 mr-2" />
                Add New Vehicle Entry
              </Button>
            </Link>
            <Link to="/admin/entries" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="h-4 w-4 mr-2" />
                View All Entries
              </Button>
            </Link>
            <Link to="/admin/reports" className="block">
              <Button variant="outline" className="w-full justify-start">
                <TrendingUp className="h-4 w-4 mr-2" />
                View Collection Reports
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <AlertCircle className="h-5 w-5 text-yellow-500 mr-2" />
              Pending Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {entries.filter(e => e.jobStatus === 'pending' || e.jobStatus === 'in_progress').length > 0 ? (
              <div className="space-y-3">
                {entries
                  .filter(e => e.jobStatus === 'pending' || e.jobStatus === 'in_progress')
                  .slice(0, 3)
                  .map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{entry.carNumber}</p>
                        <p className="text-sm text-gray-500">{getServiceName(entry.serviceType)}</p>
                      </div>
                      {getStatusBadge(entry.jobStatus)}
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-6">No pending jobs</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Entries */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center">
            <Users className="h-5 w-5 text-blue-500 mr-2" />
            Recent Entries
          </CardTitle>
          <Link to="/admin/entries">
            <Button variant="link" className="text-green-600">View All</Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Customer</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Car Number</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Service</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Amount</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Payment</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentEntries.length > 0 ? (
                  recentEntries.map((entry) => (
                    <tr key={entry.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-2">
                        <p className="font-medium text-gray-900">{entry.customerName}</p>
                        <p className="text-sm text-gray-500">{entry.mobileNumber}</p>
                      </td>
                      <td className="py-3 px-2 font-medium">{entry.carNumber}</td>
                      <td className="py-3 px-2">{getServiceName(entry.serviceType)}</td>
                      <td className="py-3 px-2 font-medium">₹{entry.amount.toLocaleString()}</td>
                      <td className="py-3 px-2 text-sm">{getPaymentLabel(entry.paymentMode)}</td>
                      <td className="py-3 px-2">{getStatusBadge(entry.jobStatus)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-gray-500">
                      No entries yet. Add your first vehicle entry.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminDashboard;
