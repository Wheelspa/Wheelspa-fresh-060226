import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, Filter, Plus, Edit, Trash2, Eye, Calendar,
  Download, RefreshCw, IndianRupee, FileText, X
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import AdminLayout from '../components/admin/AdminLayout';
import { 
  MOCK_INSTALLER_PAYMENTS, 
  INSTALLER_CATEGORIES, 
  INSTALLER_PAYMENT_MODES,
  INSTALLERS 
} from '../data/installerMock';
import { format } from 'date-fns';
import { toast } from 'sonner';

const InstallerPayments = () => {
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [paymentModeFilter, setPaymentModeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState(null);
  
  const [editForm, setEditForm] = useState({
    advancePaid: '',
    paymentMode: '',
    transactionId: '',
    notes: ''
  });

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = () => {
    const storedPayments = localStorage.getItem('wheelspa_installer_payments');
    const allPayments = storedPayments ? JSON.parse(storedPayments) : MOCK_INSTALLER_PAYMENTS;
    setPayments(allPayments);
    setFilteredPayments(allPayments);
  };

  useEffect(() => {
    let filtered = payments;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.installerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.jobReference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.transactionId?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }

    // Payment mode filter
    if (paymentModeFilter !== 'all') {
      filtered = filtered.filter(p => p.paymentMode === paymentModeFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => 
        statusFilter === 'pending' ? p.remainingBalance > 0 : p.remainingBalance === 0
      );
    }

    // Date range filter
    if (dateFrom) {
      filtered = filtered.filter(p => new Date(p.paymentDate) >= new Date(dateFrom));
    }
    if (dateTo) {
      filtered = filtered.filter(p => new Date(p.paymentDate) <= new Date(dateTo));
    }

    setFilteredPayments(filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  }, [payments, searchTerm, categoryFilter, paymentModeFilter, statusFilter, dateFrom, dateTo]);

  const getCategoryLabel = (value) => {
    return INSTALLER_CATEGORIES.find(c => c.value === value)?.label || value;
  };

  const getPaymentModeLabel = (value) => {
    return INSTALLER_PAYMENT_MODES.find(m => m.value === value)?.label || value;
  };

  const handleViewPayment = (payment) => {
    setSelectedPayment(payment);
    setIsViewModalOpen(true);
  };

  const handleEditClick = (payment) => {
    setSelectedPayment(payment);
    setEditForm({
      advancePaid: payment.advancePaid.toString(),
      paymentMode: payment.paymentMode,
      transactionId: payment.transactionId || '',
      notes: payment.notes || ''
    });
    setIsEditModalOpen(true);
  };

  const handleEditSave = () => {
    const newAdvance = parseFloat(editForm.advancePaid);
    if (newAdvance > selectedPayment.totalPayable) {
      toast.error('Advance cannot exceed total payable');
      return;
    }

    const updatedPayments = payments.map(p => {
      if (p.id === selectedPayment.id) {
        const newRemaining = selectedPayment.totalPayable - newAdvance;
        return {
          ...p,
          advancePaid: newAdvance,
          remainingBalance: newRemaining,
          paymentMode: editForm.paymentMode,
          transactionId: editForm.transactionId,
          notes: editForm.notes,
          status: newRemaining === 0 ? 'completed' : 'partial',
          updatedAt: new Date().toISOString(),
          auditTrail: [
            ...p.auditTrail,
            { action: 'updated', timestamp: new Date().toISOString(), by: 'admin', changes: `Advance: ₹${newAdvance}` }
          ]
        };
      }
      return p;
    });

    localStorage.setItem('wheelspa_installer_payments', JSON.stringify(updatedPayments));
    setPayments(updatedPayments);
    setIsEditModalOpen(false);
    toast.success('Payment updated successfully!');
  };

  const handleDeleteClick = (payment) => {
    setPaymentToDelete(payment);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    const updatedPayments = payments.filter(p => p.id !== paymentToDelete.id);
    localStorage.setItem('wheelspa_installer_payments', JSON.stringify(updatedPayments));
    setPayments(updatedPayments);
    setIsDeleteModalOpen(false);
    toast.success('Payment deleted successfully');
  };

  const exportToExcel = () => {
    const headers = ['Installer', 'Category', 'Job Ref', 'Total', 'Paid', 'Pending', 'Mode', 'Transaction ID', 'Date', 'Status'];
    const rows = filteredPayments.map(p => [
      p.installerName,
      getCategoryLabel(p.category),
      p.jobReference,
      p.totalPayable,
      p.advancePaid,
      p.remainingBalance,
      getPaymentModeLabel(p.paymentMode),
      p.transactionId || '-',
      format(new Date(p.paymentDate), 'dd/MM/yyyy'),
      p.remainingBalance > 0 ? 'Pending' : 'Completed'
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `installer_payments_${format(new Date(), 'dd-MM-yyyy')}.csv`;
    a.click();
    toast.success('Exported to CSV successfully');
  };

  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setPaymentModeFilter('all');
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  return (
    <AdminLayout title="Installer Payments">
      {/* Filters */}
      <Card className="border-0 shadow-sm mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="lg:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, job ref, transaction..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {INSTALLER_CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={paymentModeFilter} onValueChange={setPaymentModeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Payment Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modes</SelectItem>
                {INSTALLER_PAYMENT_MODES.map(mode => (
                  <SelectItem key={mode.value} value={mode.value}>{mode.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={clearFilters}>
              <X className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>
          
          {/* Date Range */}
          <div className="flex flex-wrap gap-4 mt-4 items-center">
            <div className="flex items-center gap-2">
              <Label className="text-sm text-gray-500">From:</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-gray-500">To:</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-40"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <p className="text-sm text-gray-500">
          Showing {filteredPayments.length} of {payments.length} payments
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={loadPayments}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportToExcel}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Link to="/admin/installer/new-payment">
            <Button className="bg-green-500 hover:bg-green-600 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Add Payment
            </Button>
          </Link>
        </div>
      </div>

      {/* Payments Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-500">Installer</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-500">Category</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-500">Job Ref</th>
                  <th className="text-right py-4 px-4 text-sm font-medium text-gray-500">Total</th>
                  <th className="text-right py-4 px-4 text-sm font-medium text-gray-500">Paid</th>
                  <th className="text-right py-4 px-4 text-sm font-medium text-gray-500">Balance</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-500">Mode</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-500">Date</th>
                  <th className="text-center py-4 px-4 text-sm font-medium text-gray-500">Status</th>
                  <th className="text-center py-4 px-4 text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.length > 0 ? (
                  filteredPayments.map((payment) => (
                    <tr key={payment.id} className="border-b hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <p className="font-medium text-gray-900">{payment.installerName}</p>
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant="secondary" className="text-xs">
                          {getCategoryLabel(payment.category)}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 font-mono text-sm">{payment.jobReference}</td>
                      <td className="py-4 px-4 text-right font-medium">₹{payment.totalPayable.toLocaleString()}</td>
                      <td className="py-4 px-4 text-right text-green-600 font-medium">₹{payment.advancePaid.toLocaleString()}</td>
                      <td className="py-4 px-4 text-right">
                        <span className={`font-medium ${payment.remainingBalance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                          ₹{payment.remainingBalance.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm">{getPaymentModeLabel(payment.paymentMode)}</td>
                      <td className="py-4 px-4 text-sm text-gray-500">
                        {format(new Date(payment.paymentDate), 'dd MMM yyyy')}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <Badge className={payment.remainingBalance > 0 ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}>
                          {payment.remainingBalance > 0 ? 'Pending' : 'Completed'}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center space-x-1">
                          <Button variant="ghost" size="sm" onClick={() => handleViewPayment(payment)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEditClick(payment)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDeleteClick(payment)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="10" className="py-12 text-center text-gray-500">
                      <IndianRupee className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No payments found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* View Payment Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <FileText className="h-5 w-5 text-green-500 mr-2" />
              Payment Details
            </DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Installer</p>
                  <p className="font-medium">{selectedPayment.installerName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Category</p>
                  <p className="font-medium">{getCategoryLabel(selectedPayment.category)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Job Reference</p>
                  <p className="font-mono font-medium">{selectedPayment.jobReference}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Payment Date</p>
                  <p className="font-medium">{format(new Date(selectedPayment.paymentDate), 'dd MMM yyyy')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Payable</p>
                  <p className="font-medium text-lg">₹{selectedPayment.totalPayable.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Advance Paid</p>
                  <p className="font-medium text-lg text-green-600">₹{selectedPayment.advancePaid.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Balance</p>
                  <p className={`font-medium text-lg ${selectedPayment.remainingBalance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    ₹{selectedPayment.remainingBalance.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Payment Mode</p>
                  <p className="font-medium">{getPaymentModeLabel(selectedPayment.paymentMode)}</p>
                </div>
                {selectedPayment.transactionId && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Transaction ID</p>
                    <p className="font-mono font-medium">{selectedPayment.transactionId}</p>
                  </div>
                )}
              </div>
              {selectedPayment.notes && (
                <div>
                  <p className="text-sm text-gray-500">Notes</p>
                  <p className="text-sm bg-gray-50 p-3 rounded">{selectedPayment.notes}</p>
                </div>
              )}
              {/* Audit Trail */}
              <div>
                <p className="text-sm text-gray-500 mb-2">Audit Trail</p>
                <div className="bg-gray-50 rounded p-3 space-y-2 max-h-32 overflow-y-auto">
                  {selectedPayment.auditTrail?.map((log, idx) => (
                    <div key={idx} className="text-xs text-gray-600">
                      <span className="font-medium">{log.action}</span> by {log.by} on {format(new Date(log.timestamp), 'dd MMM yyyy HH:mm')}
                      {log.changes && <span className="text-gray-500"> - {log.changes}</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Payment Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Edit className="h-5 w-5 text-green-500 mr-2" />
              Update Payment
            </DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm text-gray-500">Installer: <span className="font-medium text-gray-900">{selectedPayment.installerName}</span></p>
                <p className="text-sm text-gray-500">Job: <span className="font-medium text-gray-900">{selectedPayment.jobReference}</span></p>
                <p className="text-sm text-gray-500">Total Payable: <span className="font-medium text-gray-900">₹{selectedPayment.totalPayable.toLocaleString()}</span></p>
              </div>
              <div>
                <Label>Advance Paid (₹)</Label>
                <Input
                  type="number"
                  value={editForm.advancePaid}
                  onChange={(e) => setEditForm(prev => ({ ...prev, advancePaid: e.target.value }))}
                  className="mt-1"
                  max={selectedPayment.totalPayable}
                />
                <p className="text-xs text-gray-500 mt-1">
                  New Balance: ₹{Math.max(0, selectedPayment.totalPayable - (parseFloat(editForm.advancePaid) || 0)).toLocaleString()}
                </p>
              </div>
              <div>
                <Label>Payment Mode</Label>
                <Select value={editForm.paymentMode} onValueChange={(v) => setEditForm(prev => ({ ...prev, paymentMode: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INSTALLER_PAYMENT_MODES.map(mode => (
                      <SelectItem key={mode.value} value={mode.value}>{mode.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Transaction ID</Label>
                <Input
                  value={editForm.transactionId}
                  onChange={(e) => setEditForm(prev => ({ ...prev, transactionId: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="mt-1"
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSave} className="bg-green-500 hover:bg-green-600 text-white">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Payment</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">
            Are you sure you want to delete this payment entry for{' '}
            <strong>{paymentToDelete?.installerName}</strong> ({paymentToDelete?.jobReference})?
            This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
            <Button className="bg-red-500 hover:bg-red-600 text-white" onClick={handleDeleteConfirm}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default InstallerPayments;
