import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Car, Search, Plus, Edit, Trash2, 
  Eye, Calendar, Download, RefreshCw
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import AdminLayout from '../components/admin/AdminLayout';
import { useAdminAuth } from '../context/AdminAuthContext';
import { MOCK_ENTRIES, JOB_STATUS, PAYMENT_MODES } from '../data/adminMock';
import { SERVICES } from '../data/mock';
import { format } from 'date-fns';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminEntries = () => {
  const { admin } = useAdminAuth();
  const [entries, setEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (admin?.token) {
      loadEntries();
    }
  }, [admin?.token]);

  const normalizeEntry = (e) => ({
    ...e,
    customerName: e.customerName || e.customer_name || 'Customer',
    carNumber: e.carNumber || e.car_number || 'N/A',
    mobileNumber: e.mobileNumber || e.mobile_number || 'N/A',
    serviceType: e.serviceType || e.service_type || 'detailing',
    amount: e.amount || 0,
    paymentMode: e.paymentMode || e.payment_mode || 'cash',
    receivedBy: e.receivedBy || e.received_by || 'Staff',
    jobStatus: e.jobStatus || e.job_status || 'pending',
    entryDate: e.entryDate || e.created_at || new Date().toISOString()
  });

  const loadEntries = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/entries`, {
        headers: { 'Authorization': `Bearer ${admin?.token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const normalized = data.map(normalizeEntry);
        setEntries(normalized);
        setFilteredEntries(normalized);
      } else {
        toast.error('Failed to load entries from server');
      }
    } catch (error) {
      console.error('Error fetching entries:', error);
      toast.error('Connection error loading entries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = entries;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(entry =>
        entry.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.carNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.mobileNumber.includes(searchTerm)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(entry => entry.jobStatus === statusFilter);
    }

    // Payment filter
    if (paymentFilter !== 'all') {
      filtered = filtered.filter(entry => entry.paymentMode === paymentFilter);
    }

    setFilteredEntries(filtered.reverse());
  }, [entries, searchTerm, statusFilter, paymentFilter]);

  const getServiceName = (serviceId) => {
    const service = SERVICES.find(s => s.id === serviceId);
    return service?.name || serviceId;
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

  const handleViewEntry = (entry) => {
    setSelectedEntry(entry);
    setIsViewModalOpen(true);
  };

  const handleDeleteClick = (entry) => {
    setEntryToDelete(entry);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (entryToDelete) {
      try {
        const response = await fetch(`${API_URL}/api/entries/${entryToDelete.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${admin?.token}` }
        });
        if (response.ok) {
          toast.success('Entry deleted successfully');
          loadEntries();
        } else {
          const data = await response.json().catch(() => ({}));
          toast.error(data.detail || 'Failed to delete entry');
        }
      } catch (error) {
        console.error('Delete error:', error);
        toast.error('Connection error deleting entry');
      }
    }
    setIsDeleteModalOpen(false);
    setEntryToDelete(null);
  };

  const handleStatusUpdate = async (entryId, newStatus) => {
    try {
      const response = await fetch(`${API_URL}/api/tokens/${entryId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${admin?.token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        toast.success('Status updated successfully');
        loadEntries();
      } else {
        toast.error('Failed to update status');
      }
    } catch (error) {
      console.error('Status update error:', error);
      toast.error('Connection error updating status');
    }
  };

  const exportToCSV = () => {
    const headers = ['Customer Name', 'Car Number', 'Mobile', 'Service', 'Amount', 'Payment Mode', 'Received By', 'Status', 'Date'];
    const rows = filteredEntries.map(e => [
      e.customerName,
      e.carNumber,
      e.mobileNumber,
      getServiceName(e.serviceType),
      e.amount,
      getPaymentLabel(e.paymentMode),
      e.receivedBy,
      e.jobStatus,
      format(new Date(e.entryDate), 'dd/MM/yyyy HH:mm')
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wheelspa_entries_${format(new Date(), 'dd-MM-yyyy')}.csv`;
    a.click();
    toast.success('Entries exported successfully');
  };

  return (
    <AdminLayout title="All Entries">
      {/* Filters */}
      <Card className="border-0 shadow-sm mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, car number, or mobile..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {JOB_STATUS.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Payment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payments</SelectItem>
                  {PAYMENT_MODES.map(mode => (
                    <SelectItem key={mode.value} value={mode.value}>
                      {mode.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={loadEntries}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions Bar */}
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">
          Showing {filteredEntries.length} of {entries.length} entries
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Link to="/admin/new-entry">
            <Button className="bg-green-500 hover:bg-green-600 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
            </Button>
          </Link>
        </div>
      </div>

      {/* Entries Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-500">Customer</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-500">Car Number</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-500">Service</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-500">Amount</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-500">Payment</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-500">Status</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-500">Date</th>
                  <th className="text-center py-4 px-4 text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.length > 0 ? (
                  filteredEntries.map((entry) => (
                    <tr key={entry.id} className="border-b hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <p className="font-medium text-gray-900">{entry.customerName}</p>
                        <p className="text-sm text-gray-500">{entry.mobileNumber}</p>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-mono font-medium">{entry.carNumber}</span>
                      </td>
                      <td className="py-4 px-4 text-sm">{getServiceName(entry.serviceType)}</td>
                      <td className="py-4 px-4 font-medium">₹{entry.amount.toLocaleString()}</td>
                      <td className="py-4 px-4">
                        <span className="text-sm">{getPaymentLabel(entry.paymentMode)}</span>
                        {entry.paymentMode === 'cash' && entry.cashHandoverTo && (
                          <p className="text-xs text-gray-500">→ {entry.cashHandoverTo}</p>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <Select
                          value={entry.jobStatus}
                          onValueChange={(value) => handleStatusUpdate(entry.id, value)}
                        >
                          <SelectTrigger className="w-32 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {JOB_STATUS.map(status => (
                              <SelectItem key={status.value} value={status.value}>
                                {status.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-500">
                        {format(new Date(entry.entryDate), 'dd MMM yyyy')}
                        <br />
                        <span className="text-xs">{format(new Date(entry.entryDate), 'hh:mm a')}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewEntry(entry)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => handleDeleteClick(entry)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-gray-500">
                      <Car className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No entries found</p>
                      <Link to="/admin/new-entry">
                        <Button className="mt-4 bg-green-500 hover:bg-green-600 text-white">
                          <Plus className="h-4 w-4 mr-2" />
                          Add First Entry
                        </Button>
                      </Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* View Entry Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Car className="h-5 w-5 text-green-500 mr-2" />
              Entry Details
            </DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Customer Name</p>
                  <p className="font-medium">{selectedEntry.customerName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Mobile Number</p>
                  <p className="font-medium">{selectedEntry.mobileNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Car Number</p>
                  <p className="font-mono font-medium">{selectedEntry.carNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Service</p>
                  <p className="font-medium">{getServiceName(selectedEntry.serviceType)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Amount</p>
                  <p className="font-medium text-lg">₹{selectedEntry.amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Payment Mode</p>
                  <p className="font-medium">{getPaymentLabel(selectedEntry.paymentMode)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Received By</p>
                  <p className="font-medium">{selectedEntry.receivedBy}</p>
                </div>
                {selectedEntry.cashHandoverTo && (
                  <div>
                    <p className="text-sm text-gray-500">Cash Handed To</p>
                    <p className="font-medium">{selectedEntry.cashHandoverTo}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  {getStatusBadge(selectedEntry.jobStatus)}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Entry Date</p>
                  <p className="font-medium">{format(new Date(selectedEntry.entryDate), 'dd MMM yyyy, hh:mm a')}</p>
                </div>
              </div>
              {selectedEntry.notes && (
                <div>
                  <p className="text-sm text-gray-500">Notes</p>
                  <p className="text-sm">{selectedEntry.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Entry</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">
            Are you sure you want to delete this entry for{' '}
            <strong>{entryToDelete?.customerName}</strong> ({entryToDelete?.carNumber})?
            This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={handleDeleteConfirm}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminEntries;
