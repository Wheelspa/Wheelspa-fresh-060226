import React, { useState, useEffect } from 'react';
import { Calendar, Phone, Mail, Car, Clock, Eye, Trash2, CheckCircle, XCircle, AlertCircle, MessageCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { format } from 'date-fns';
import { toast } from 'sonner';

// WhatsApp notification templates for admin -> customer messages
export const CONFIRMED_BOOKING_WA_TEMPLATE =
  "Hello {name}, your Wheelspa booking is confirmed. Booking ID: {id}. Service: {service}. Date: {date}, Time: {time}. Location: Opposite Pink City, Kaspate Vasti Road, Wakad, Pune. See you soon!";

export const REJECTED_BOOKING_WA_TEMPLATE =
  "Hello {name}, sorry, the requested slot could not be confirmed. Please choose another time on wheelspa.in or call us at 70226-70226.";

export const normalizePhoneTo91 = (phone) => {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return '91' + digits.slice(1);
  }
  if (digits.length === 10) {
    return '91' + digits;
  }
  if (digits.length > 10) {
    return '91' + digits.slice(-10);
  }
  return '91' + digits;
};

export const buildCustomerWhatsAppUrl = (booking) => {
  if (!booking || !booking.phone) return '#';
  const phone = normalizePhoneTo91(booking.phone);
  const name = booking.customerName || booking.customer_name || 'Customer';
  const service = booking.serviceName || booking.service || 'Detailing Service';

  let formattedDate = 'N/A';
  const rawDate = booking.appointmentDate || booking.appointment_date;
  if (rawDate) {
    try {
      const parsed = rawDate.includes('T') ? new Date(rawDate) : new Date(rawDate.replace(/-/g, '/'));
      formattedDate = format(parsed, 'dd MMM yyyy');
    } catch {
      formattedDate = rawDate;
    }
  }

  const time = booking.timeSlot || booking.time_slot || '';

  let message = '';
  if (booking.status === 'confirmed') {
    message = CONFIRMED_BOOKING_WA_TEMPLATE
      .replace('{name}', name)
      .replace('{id}', booking.id || '')
      .replace('{service}', service)
      .replace('{date}', formattedDate)
      .replace('{time}', time);
  } else if (booking.status === 'rejected') {
    message = REJECTED_BOOKING_WA_TEMPLATE
      .replace('{name}', name);
  } else {
    return '#';
  }

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
};

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminBookings = () => {
  const { admin } = useAdminAuth();
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (admin?.token) {
      loadBookings();
    }
  }, [admin?.token]);

  const normalizeBooking = (b) => ({
    ...b,
    customerName: b.customerName || b.customer_name || 'Customer',
    phone: b.phone || 'N/A',
    email: b.email || '',
    serviceName: b.serviceName || b.service || 'Detailing Service',
    carBrand: b.carBrand || '',
    carModel: b.carModel || '',
    carNumber: b.carNumber || b.car_number || '',
    appointmentDate: b.appointmentDate || b.appointment_date || '',
    timeSlot: b.timeSlot || b.time_slot || '',
    status: b.status || 'pending',
    createdAt: b.created_at || b.createdAt || new Date().toISOString()
  });

  const loadBookings = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/bookings`, {
        headers: { 'Authorization': `Bearer ${admin?.token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const normalized = data.map(normalizeBooking);
        normalized.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setBookings(normalized);
      } else {
        toast.error('Failed to load bookings from server');
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
      toast.error('Connection error loading bookings');
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId, newStatus) => {
    try {
      const response = await fetch(`${API_URL}/api/bookings/${bookingId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${admin?.token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(data.message || `Booking status updated to ${newStatus}`);
        loadBookings();
      } else {
        toast.error(data.detail || 'Failed to update booking status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Connection error updating status');
    }
  };

  const handleRejectBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to reject this booking?')) return;
    await updateBookingStatus(bookingId, 'rejected');
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    await updateBookingStatus(bookingId, 'cancelled');
  };

  const deleteBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to delete this booking?')) return;

    try {
      if (admin?.role === 'admin') {
        const targetBooking = bookings.find(b => b.id === bookingId);
        const response = await fetch(`${API_URL}/api/approval-requests`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${admin?.token}`
          },
          body: JSON.stringify({
            request_type: 'delete',
            data_type: 'booking',
            data_id: bookingId,
            original_data: targetBooking,
            notes: 'Delete booking'
          })
        });
        if (response.ok) {
          toast.success('Approval request submitted for deletion');
        } else {
          toast.error('Failed to submit deletion request');
        }
      } else {
        const response = await fetch(`${API_URL}/api/bookings/${bookingId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${admin?.token}` }
        });
        if (response.ok) {
          toast.success('Booking deleted successfully');
          loadBookings();
        } else {
          toast.error('Failed to delete booking');
        }
      }
    } catch (error) {
      console.error('Error deleting booking:', error);
      toast.error('Connection error deleting booking');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="h-4 w-4" />;
      case 'pending': return <AlertCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const filteredBookings = filterStatus === 'all' 
    ? bookings 
    : bookings.filter(b => b.status === filterStatus);

  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    completed: bookings.filter(b => b.status === 'completed').length,
  };

  return (
    <AdminLayout title="Customer Bookings">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Bookings</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Calendar className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Confirmed</p>
                <p className="text-2xl font-bold text-green-600">{stats.confirmed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Completed</p>
                <p className="text-2xl font-bold text-blue-600">{stats.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Actions */}
      <Card className="border-0 shadow-sm mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-gray-900">All Customer Bookings</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Filter:</span>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bookings List */}
      {filteredBookings.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Bookings Found</h3>
            <p className="text-gray-500">
              {filterStatus === 'all' 
                ? 'Customer bookings from the website will appear here.'
                : `No ${filterStatus} bookings found.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((booking) => (
            <Card key={booking.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Booking Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{booking.customerName}</h3>
                      <Badge className={getStatusColor(booking.status)}>
                        {getStatusIcon(booking.status)}
                        <span className="ml-1 capitalize">{booking.status}</span>
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
                      <div className="flex items-center text-gray-600">
                        <Phone className="h-4 w-4 mr-2 text-gray-400" />
                        {booking.phone}
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Car className="h-4 w-4 mr-2 text-gray-400" />
                        {[booking.carBrand, booking.carModel].filter(Boolean).join(' ')
                          ? `${[booking.carBrand, booking.carModel].filter(Boolean).join(' ')} ${booking.carNumber ? `(${booking.carNumber})` : ''}`.trim()
                          : (booking.carNumber || 'N/A')}
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        {booking.appointmentDate 
                          ? format(new Date(booking.appointmentDate), 'dd MMM yyyy')
                          : 'N/A'}
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Clock className="h-4 w-4 mr-2 text-gray-400" />
                        {booking.timeSlot || 'N/A'}
                      </div>
                    </div>
                    <p className="text-sm text-green-600 mt-2 font-medium">
                      Service: {booking.serviceName || booking.service}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {(booking.status === 'confirmed' || booking.status === 'rejected') && (
                      <a
                        href={buildCustomerWhatsAppUrl(booking)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-green-600 border-green-500 hover:bg-green-50 hover:text-green-700 flex items-center gap-1.5"
                          data-testid={`whatsapp-customer-${booking.id}`}
                        >
                          <MessageCircle className="h-4 w-4" />
                          WhatsApp customer
                        </Button>
                      </a>
                    )}
                    {booking.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-1"
                          onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                          data-testid={`approve-booking-${booking.id}`}
                        >
                          <CheckCircle className="h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-1"
                          onClick={() => handleRejectBooking(booking.id)}
                          data-testid={`reject-booking-${booking.id}`}
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </Button>
                      </>
                    )}
                    {booking.status === 'confirmed' && (
                      <>
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1"
                          onClick={() => updateBookingStatus(booking.id, 'completed')}
                          data-testid={`complete-booking-${booking.id}`}
                        >
                          <CheckCircle className="h-4 w-4" />
                          Mark Completed
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-500 hover:bg-red-50 hover:text-red-700 flex items-center gap-1"
                          onClick={() => handleCancelBooking(booking.id)}
                          data-testid={`cancel-booking-${booking.id}`}
                        >
                          <XCircle className="h-4 w-4" />
                          Cancel
                        </Button>
                      </>
                    )}
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setSelectedBooking(booking);
                        setViewDialogOpen(true);
                      }}
                      data-testid={`view-booking-${booking.id}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => deleteBooking(booking.id)}
                      data-testid={`delete-booking-${booking.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
            <DialogDescription>
              Booking ID: {selectedBooking?.id}
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Customer Name</p>
                  <p className="font-medium">{selectedBooking.customerName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium">{selectedBooking.phone}</p>
                </div>
                {selectedBooking.email && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{selectedBooking.email}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Car Brand</p>
                  <p className="font-medium">{selectedBooking.carBrand}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Car Model</p>
                  <p className="font-medium">{selectedBooking.carModel}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Car Number</p>
                  <p className="font-medium">{selectedBooking.carNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Service</p>
                  <p className="font-medium text-green-600">
                    {selectedBooking.serviceName || selectedBooking.service}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <Badge className={getStatusColor(selectedBooking.status)}>
                    {selectedBooking.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Appointment Date</p>
                  <p className="font-medium">
                    {selectedBooking.appointmentDate 
                      ? format(new Date(selectedBooking.appointmentDate), 'PPP')
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Time Slot</p>
                  <p className="font-medium">{selectedBooking.timeSlot || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">Booked On</p>
                  <p className="font-medium">
                    {selectedBooking.createdAt 
                      ? format(new Date(selectedBooking.createdAt), 'PPP p')
                      : 'N/A'}
                  </p>
                </div>
              </div>
              {selectedBooking.notes && (
                <div>
                  <p className="text-sm text-gray-500">Notes</p>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-lg mt-1">
                    {selectedBooking.notes}
                  </p>
                </div>
              )}
              <div className="flex gap-2 pt-4">
                <a 
                  href={`tel:${selectedBooking.phone}`}
                  className="flex-1"
                >
                  <Button className="w-full bg-green-500 hover:bg-green-600">
                    <Phone className="h-4 w-4 mr-2" />
                    Call Customer
                  </Button>
                </a>
                <a 
                  href={
                    (selectedBooking.status === 'confirmed' || selectedBooking.status === 'rejected')
                      ? buildCustomerWhatsAppUrl(selectedBooking)
                      : `https://wa.me/${normalizePhoneTo91(selectedBooking.phone)}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button variant="outline" className="w-full flex items-center justify-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </Button>
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminBookings;
