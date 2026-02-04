import React, { useState, useEffect } from 'react';
import { ClipboardCheck, Check, X, Eye, Clock, User, FileEdit, Trash2, Calendar } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import AdminLayout from '../components/admin/AdminLayout';
import { useAdminAuth } from '../context/AdminAuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminApprovals = () => {
  const { admin, refreshPendingApprovals } = useAdminAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [actionNotes, setActionNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [filterStatus]);

  const fetchRequests = async () => {
    try {
      const url = filterStatus === 'all' 
        ? `${API_URL}/api/approval-requests`
        : `${API_URL}/api/approval-requests?status=${filterStatus}`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${admin?.token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setRequests(data);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Failed to load approval requests');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (requestId, action) => {
    setProcessing(true);
    try {
      const response = await fetch(`${API_URL}/api/approval-requests/${requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${admin?.token}`
        },
        body: JSON.stringify({ action, notes: actionNotes })
      });

      if (response.ok) {
        toast.success(`Request ${action}d successfully`);
        setViewDialogOpen(false);
        setSelectedRequest(null);
        setActionNotes('');
        fetchRequests();
        refreshPendingApprovals();
      } else {
        const data = await response.json();
        toast.error(data.detail || `Failed to ${action} request`);
      }
    } catch (error) {
      console.error('Error processing request:', error);
      toast.error(`Failed to ${action} request`);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800"><Check className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800"><X className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  const getTypeIcon = (type) => {
    return type === 'delete' ? <Trash2 className="h-4 w-4 text-red-500" /> : <FileEdit className="h-4 w-4 text-blue-500" />;
  };

  const getDataTypeLabel = (dataType) => {
    const labels = {
      booking: 'Customer Booking',
      entry: 'Vehicle Entry',
      installer_payment: 'Installer Payment',
      service: 'Service',
      installer: 'Installer'
    };
    return labels[dataType] || dataType;
  };

  const stats = {
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  };

  return (
    <AdminLayout title="Approval Requests">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Approved</p>
                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              </div>
              <Check className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
              </div>
              <X className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card className="border-0 shadow-sm mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Approval Requests</h2>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        </div>
      ) : requests.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <ClipboardCheck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Requests Found</h3>
            <p className="text-gray-500">
              {filterStatus === 'pending' 
                ? 'No pending approval requests at the moment.'
                : `No ${filterStatus} requests found.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getTypeIcon(request.request_type)}
                      <span className="font-semibold text-gray-900 capitalize">
                        {request.request_type} {getDataTypeLabel(request.data_type)}
                      </span>
                      {getStatusBadge(request.status)}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mt-3">
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2 text-gray-400" />
                        Requested by: <span className="font-medium ml-1">{request.requested_by_name}</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        {format(new Date(request.created_at), 'dd MMM yyyy, HH:mm')}
                      </div>
                    </div>
                    {request.reviewed_by && (
                      <p className="text-xs text-gray-500 mt-2">
                        {request.status === 'approved' ? 'Approved' : 'Rejected'} by {request.reviewed_by} on {format(new Date(request.reviewed_at), 'dd MMM yyyy')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedRequest(request);
                        setViewDialogOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                    {request.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          className="bg-green-500 hover:bg-green-600"
                          onClick={() => {
                            setSelectedRequest(request);
                            setViewDialogOpen(true);
                          }}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-500 hover:bg-red-50"
                          onClick={() => {
                            setSelectedRequest(request);
                            setViewDialogOpen(true);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* View/Action Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedRequest && getTypeIcon(selectedRequest.request_type)}
              {selectedRequest?.request_type === 'delete' ? 'Delete' : 'Edit'} Request
            </DialogTitle>
            <DialogDescription>
              {selectedRequest && getDataTypeLabel(selectedRequest.data_type)} - ID: {selectedRequest?.data_id}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-6 mt-4">
              {/* Request Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Requested By</p>
                  <p className="font-medium">{selectedRequest.requested_by_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Request Date</p>
                  <p className="font-medium">{format(new Date(selectedRequest.created_at), 'PPP p')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  {getStatusBadge(selectedRequest.status)}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Request Type</p>
                  <p className="font-medium capitalize">{selectedRequest.request_type}</p>
                </div>
              </div>

              {/* Original Data */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Original Data</h4>
                <div className="bg-gray-50 rounded-lg p-4 text-sm">
                  <pre className="whitespace-pre-wrap text-gray-600">
                    {JSON.stringify(selectedRequest.original_data, null, 2)}
                  </pre>
                </div>
              </div>

              {/* New Data (for edit requests) */}
              {selectedRequest.request_type === 'edit' && selectedRequest.new_data && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Proposed Changes</h4>
                  <div className="bg-blue-50 rounded-lg p-4 text-sm">
                    <pre className="whitespace-pre-wrap text-blue-600">
                      {JSON.stringify(selectedRequest.new_data, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedRequest.notes && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Notes</h4>
                  <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">{selectedRequest.notes}</p>
                </div>
              )}

              {/* Action Section (only for pending) */}
              {selectedRequest.status === 'pending' && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Add Review Notes (Optional)</h4>
                  <Textarea
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    placeholder="Add any notes about your decision..."
                    className="mb-4"
                  />
                  <div className="flex gap-3">
                    <Button
                      className="flex-1 bg-green-500 hover:bg-green-600"
                      onClick={() => handleAction(selectedRequest.id, 'approve')}
                      disabled={processing}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      {processing ? 'Processing...' : 'Approve Request'}
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 text-red-500 border-red-300 hover:bg-red-50"
                      onClick={() => handleAction(selectedRequest.id, 'reject')}
                      disabled={processing}
                    >
                      <X className="h-4 w-4 mr-2" />
                      {processing ? 'Processing...' : 'Reject Request'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Review Info (for processed requests) */}
              {selectedRequest.status !== 'pending' && selectedRequest.reviewed_by && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Review Details</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm">
                      <span className="text-gray-500">Reviewed by:</span>{' '}
                      <span className="font-medium">{selectedRequest.reviewed_by}</span>
                    </p>
                    <p className="text-sm">
                      <span className="text-gray-500">Reviewed on:</span>{' '}
                      <span className="font-medium">{format(new Date(selectedRequest.reviewed_at), 'PPP p')}</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminApprovals;
