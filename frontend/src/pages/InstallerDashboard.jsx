import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, IndianRupee, TrendingUp, Clock, 
  CheckCircle, AlertCircle, Wallet
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Link } from 'react-router-dom';
import AdminLayout from '../components/admin/AdminLayout';
import { MOCK_INSTALLER_PAYMENTS, INSTALLER_CATEGORIES } from '../data/installerMock';

const InstallerDashboard = () => {
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({
    totalPayable: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    categoryWise: []
  });

  useEffect(() => {
    const storedPayments = localStorage.getItem('wheelspa_installer_payments');
    const allPayments = storedPayments ? JSON.parse(storedPayments) : MOCK_INSTALLER_PAYMENTS;
    setPayments(allPayments);
    calculateStats(allPayments);
  }, []);

  const calculateStats = (paymentData) => {
    const totalPayable = paymentData.reduce((sum, p) => sum + p.totalPayable, 0);
    const totalPaid = paymentData.reduce((sum, p) => sum + p.advancePaid, 0);
    const totalOutstanding = paymentData.reduce((sum, p) => sum + p.remainingBalance, 0);

    const categoryWise = INSTALLER_CATEGORIES.map(cat => ({
      category: cat.label,
      value: cat.value,
      totalPayable: paymentData.filter(p => p.category === cat.value).reduce((sum, p) => sum + p.totalPayable, 0),
      totalPaid: paymentData.filter(p => p.category === cat.value).reduce((sum, p) => sum + p.advancePaid, 0),
      outstanding: paymentData.filter(p => p.category === cat.value).reduce((sum, p) => sum + p.remainingBalance, 0),
      count: paymentData.filter(p => p.category === cat.value).length
    }));

    setStats({ totalPayable, totalPaid, totalOutstanding, categoryWise });
  };

  const pendingPayments = payments.filter(p => p.remainingBalance > 0).slice(0, 5);

  return (
    <AdminLayout title="Installer Payments">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-500 to-blue-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-100">Total Payable</p>
                <p className="text-2xl font-bold text-white">₹{stats.totalPayable.toLocaleString()}</p>
              </div>
              <Wallet className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-500 to-green-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-100">Total Paid</p>
                <p className="text-2xl font-bold text-white">₹{stats.totalPaid.toLocaleString()}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-500 to-orange-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-100">Outstanding</p>
                <p className="text-2xl font-bold text-white">₹{stats.totalOutstanding.toLocaleString()}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-500 to-purple-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-100">Total Jobs</p>
                <p className="text-2xl font-bold text-white">{payments.length}</p>
              </div>
              <Users className="h-8 w-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <Card className="border-0 shadow-sm lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Plus className="h-5 w-5 text-green-500 mr-2" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/admin/installer/new-payment" className="block">
              <Button className="w-full bg-green-500 hover:bg-green-600 text-white justify-start">
                <IndianRupee className="h-4 w-4 mr-2" />
                Add New Payment
              </Button>
            </Link>
            <Link to="/admin/installer/payments" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Clock className="h-4 w-4 mr-2" />
                View All Payments
              </Button>
            </Link>
            <Link to="/admin/installer/installers" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Users className="h-4 w-4 mr-2" />
                Manage Installers
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Category-wise Summary */}
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <TrendingUp className="h-5 w-5 text-blue-500 mr-2" />
              Category-wise Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.categoryWise.map((cat, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{cat.category}</p>
                    <p className="text-sm text-gray-500">{cat.count} jobs</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-green-600">₹{cat.totalPaid.toLocaleString()} paid</p>
                    {cat.outstanding > 0 && (
                      <p className="text-sm text-orange-500">₹{cat.outstanding.toLocaleString()} pending</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Payments */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center">
            <AlertCircle className="h-5 w-5 text-orange-500 mr-2" />
            Pending Payments
          </CardTitle>
          <Link to="/admin/installer/payments?filter=pending">
            <Button variant="link" className="text-green-600">View All</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {pendingPayments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Installer</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Job Ref</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Category</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-gray-500">Total</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-gray-500">Paid</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-gray-500">Pending</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingPayments.map((payment) => (
                    <tr key={payment.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-2 font-medium">{payment.installerName}</td>
                      <td className="py-3 px-2 text-sm">{payment.jobReference}</td>
                      <td className="py-3 px-2">
                        <Badge variant="secondary" className="text-xs">
                          {INSTALLER_CATEGORIES.find(c => c.value === payment.category)?.label}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-right">₹{payment.totalPayable.toLocaleString()}</td>
                      <td className="py-3 px-2 text-right text-green-600">₹{payment.advancePaid.toLocaleString()}</td>
                      <td className="py-3 px-2 text-right font-medium text-orange-600">₹{payment.remainingBalance.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No pending payments! 🎉</p>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default InstallerDashboard;
