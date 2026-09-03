import React, { useState, useEffect } from 'react';
import { 
  BarChart3, IndianRupee, Calendar, TrendingUp, 
  Download, PieChart, Users
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import AdminLayout from '../components/admin/AdminLayout';
import { useAdminAuth } from '../context/AdminAuthContext';
import { MOCK_ENTRIES, PAYMENT_MODES, STAFF_MEMBERS } from '../data/adminMock';
import { SERVICES } from '../data/mock';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, subDays } from 'date-fns';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminReports = () => {
  const { admin } = useAdminAuth();
  const [entries, setEntries] = useState([]);
  const [dateRange, setDateRange] = useState('today');
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState({
    totalCollection: 0,
    cashCollection: 0,
    onlineCollection: 0,
    entryCount: 0,
    byPaymentMode: [],
    byService: [],
    byStaff: [],
    cashHandovers: []
  });

  useEffect(() => {
    if (admin?.token) {
      loadEntries();
    }
  }, [admin?.token]);

  const loadEntries = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/entries`, {
        headers: { 'Authorization': `Bearer ${admin?.token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const normalized = data.map(e => ({
          ...e,
          customerName: e.customerName || e.customer_name || 'Customer',
          carNumber: e.carNumber || e.car_number || 'N/A',
          mobileNumber: e.mobileNumber || e.mobile_number || 'N/A',
          serviceType: e.serviceType || e.service_type || 'detailing',
          amount: parseFloat(e.amount) || 0,
          paymentMode: e.paymentMode || e.payment_mode || 'cash',
          receivedBy: e.receivedBy || e.received_by || 'Staff',
          jobStatus: e.jobStatus || e.job_status || 'pending',
          entryDate: e.entryDate || e.created_at || new Date().toISOString()
        }));
        setEntries(normalized);
      } else {
        toast.error('Failed to load report data from server');
      }
    } catch (error) {
      console.error('Error fetching entries for reports:', error);
      toast.error('Connection error loading reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculateReports();
  }, [entries, dateRange]);

  const getDateRange = () => {
    const now = new Date();
    switch (dateRange) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'yesterday':
        const yesterday = subDays(now, 1);
        return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
      case 'thisWeek':
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'thisMonth':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'last7Days':
        return { start: subDays(now, 7), end: now };
      case 'last30Days':
        return { start: subDays(now, 30), end: now };
      case 'all':
        return { start: new Date(2020, 0, 1), end: now };
      default:
        return { start: startOfDay(now), end: endOfDay(now) };
    }
  };

  const calculateReports = () => {
    const { start, end } = getDateRange();
    
    const filteredEntries = entries.filter(entry => {
      const entryDate = new Date(entry.entryDate);
      return isWithinInterval(entryDate, { start, end });
    });

    // Total Collection
    const totalCollection = filteredEntries.reduce((sum, e) => sum + e.amount, 0);
    
    // Cash vs Online
    const cashCollection = filteredEntries
      .filter(e => e.paymentMode === 'cash')
      .reduce((sum, e) => sum + e.amount, 0);
    
    const onlineCollection = totalCollection - cashCollection;

    // By Payment Mode
    const byPaymentMode = PAYMENT_MODES.map(mode => ({
      mode: mode.label,
      value: mode.value,
      amount: filteredEntries
        .filter(e => e.paymentMode === mode.value)
        .reduce((sum, e) => sum + e.amount, 0),
      count: filteredEntries.filter(e => e.paymentMode === mode.value).length
    })).filter(m => m.amount > 0);

    // By Service
    const byService = SERVICES.map(service => ({
      service: service.shortName,
      amount: filteredEntries
        .filter(e => e.serviceType === service.id)
        .reduce((sum, e) => sum + e.amount, 0),
      count: filteredEntries.filter(e => e.serviceType === service.id).length
    })).filter(s => s.amount > 0);

    // By Staff (who received payment)
    const byStaff = STAFF_MEMBERS.map(staff => ({
      staff,
      amount: filteredEntries
        .filter(e => e.receivedBy === staff)
        .reduce((sum, e) => sum + e.amount, 0),
      count: filteredEntries.filter(e => e.receivedBy === staff).length
    })).filter(s => s.amount > 0);

    // Cash Handovers
    const cashHandovers = filteredEntries
      .filter(e => e.paymentMode === 'cash' && e.cashHandoverTo)
      .map(e => ({
        id: e.id,
        from: e.receivedBy,
        to: e.cashHandoverTo,
        amount: e.amount,
        date: e.entryDate,
        customer: e.customerName,
        carNumber: e.carNumber
      }));

    setReportData({
      totalCollection,
      cashCollection,
      onlineCollection,
      entryCount: filteredEntries.length,
      byPaymentMode,
      byService,
      byStaff,
      cashHandovers
    });
  };

  const exportReport = () => {
    const { start, end } = getDateRange();
    const report = `
WHEELSPA COLLECTION REPORT
==========================
Period: ${format(start, 'dd MMM yyyy')} - ${format(end, 'dd MMM yyyy')}

SUMMARY
-------
Total Entries: ${reportData.entryCount}
Total Collection: ₹${reportData.totalCollection.toLocaleString()}
Cash Collection: ₹${reportData.cashCollection.toLocaleString()}
Online Collection: ₹${reportData.onlineCollection.toLocaleString()}

BY PAYMENT MODE
---------------
${reportData.byPaymentMode.map(m => `${m.mode}: ₹${m.amount.toLocaleString()} (${m.count} entries)`).join('\n')}

BY SERVICE
----------
${reportData.byService.map(s => `${s.service}: ₹${s.amount.toLocaleString()} (${s.count} entries)`).join('\n')}

BY STAFF
--------
${reportData.byStaff.map(s => `${s.staff}: ₹${s.amount.toLocaleString()} (${s.count} entries)`).join('\n')}

CASH HANDOVERS
--------------
${reportData.cashHandovers.map(h => `${h.from} → ${h.to}: ₹${h.amount.toLocaleString()} (${h.carNumber})`).join('\n') || 'No cash handovers'}

Generated on: ${format(new Date(), 'dd MMM yyyy HH:mm')}
    `.trim();

    const blob = new Blob([report], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wheelspa_report_${format(new Date(), 'dd-MM-yyyy')}.txt`;
    a.click();
    toast.success('Report exported successfully');
  };

  return (
    <AdminLayout title="Collection Reports">
      {/* Filter Bar */}
      <Card className="border-0 shadow-sm mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-gray-400" />
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="thisWeek">This Week</SelectItem>
                  <SelectItem value="thisMonth">This Month</SelectItem>
                  <SelectItem value="last7Days">Last 7 Days</SelectItem>
                  <SelectItem value="last30Days">Last 30 Days</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={exportReport} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-500 to-green-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-100">Total Collection</p>
                <p className="text-2xl font-bold text-white">₹{reportData.totalCollection.toLocaleString()}</p>
              </div>
              <IndianRupee className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-500 to-orange-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-100">Cash Collection</p>
                <p className="text-2xl font-bold text-white">₹{reportData.cashCollection.toLocaleString()}</p>
              </div>
              <IndianRupee className="h-8 w-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-500 to-blue-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-100">Online Collection</p>
                <p className="text-2xl font-bold text-white">₹{reportData.onlineCollection.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-500 to-purple-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-100">Total Entries</p>
                <p className="text-2xl font-bold text-white">{reportData.entryCount}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Reports */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* By Payment Mode */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <PieChart className="h-5 w-5 text-green-500 mr-2" />
              Collection by Payment Mode
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reportData.byPaymentMode.length > 0 ? (
              <div className="space-y-4">
                {reportData.byPaymentMode.map((item, index) => (
                  <div key={index}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">{item.mode}</span>
                      <span className="text-sm text-gray-500">{item.count} entries</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${(item.amount / reportData.totalCollection) * 100}%` }}
                        />
                      </div>
                      <span className="font-medium w-28 text-right">₹{item.amount.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">No data for selected period</p>
            )}
          </CardContent>
        </Card>

        {/* By Service */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <BarChart3 className="h-5 w-5 text-blue-500 mr-2" />
              Collection by Service
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reportData.byService.length > 0 ? (
              <div className="space-y-4">
                {reportData.byService.map((item, index) => (
                  <div key={index}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">{item.service}</span>
                      <span className="text-sm text-gray-500">{item.count} entries</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${(item.amount / reportData.totalCollection) * 100}%` }}
                        />
                      </div>
                      <span className="font-medium w-28 text-right">₹{item.amount.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">No data for selected period</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Staff Collection & Cash Handovers */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* By Staff */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Users className="h-5 w-5 text-purple-500 mr-2" />
              Collection by Staff
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reportData.byStaff.length > 0 ? (
              <div className="space-y-3">
                {reportData.byStaff.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="font-semibold text-purple-600">
                          {item.staff.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{item.staff}</p>
                        <p className="text-sm text-gray-500">{item.count} entries</p>
                      </div>
                    </div>
                    <span className="font-bold text-lg">₹{item.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">No data for selected period</p>
            )}
          </CardContent>
        </Card>

        {/* Cash Handovers */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <IndianRupee className="h-5 w-5 text-orange-500 mr-2" />
              Cash Handover Log
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reportData.cashHandovers.length > 0 ? (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {reportData.cashHandovers.map((handover, index) => (
                  <div key={index} className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-orange-800">
                          {handover.from} → {handover.to}
                        </p>
                        <p className="text-sm text-orange-600">{handover.carNumber}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {format(new Date(handover.date), 'dd MMM yyyy, hh:mm a')}
                        </p>
                      </div>
                      <span className="font-bold text-orange-700">₹{handover.amount.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">No cash handovers for selected period</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminReports;
