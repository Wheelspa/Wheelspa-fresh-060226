import React, { useState, useEffect } from 'react';
import { 
  Calendar, ChevronLeft, ChevronRight, Clock, User, Car, 
  CreditCard, CheckCircle, AlertCircle, Phone
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
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
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const BookingSlots = () => {
  const { admin } = useAdminAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    payment_mode: 'cash'
  });
  const [processing, setProcessing] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    bookedPaid: 0,
    bookedUnpaid: 0
  });

  useEffect(() => {
    fetchSlots(format(selectedDate, 'yyyy-MM-dd'));
  }, [selectedDate]);

  const fetchSlots = async (date) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/bookings/slots/${date}`);
      if (response.ok) {
        const data = await response.json();
        setSlots(data.slots);
        
        // Calculate stats
        const available = data.slots.filter(s => s.status === 'available').length;
        const bookedPaid = data.slots.filter(s => s.status === 'booked_paid').length;
        const bookedUnpaid = data.slots.filter(s => s.status === 'booked_unpaid').length;
        setStats({
          total: data.slots.length,
          available,
          bookedPaid,
          bookedUnpaid
        });
      }
    } catch (error) {
      console.error('Error fetching slots:', error);
      toast.error('Failed to load slots');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentUpdate = async () => {
    if (!selectedSlot?.booking_id) return;
    
    setProcessing(true);
    try {
      const response = await fetch(`${API_URL}/api/bookings/${selectedSlot.booking_id}/payment`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${admin?.token}`
        },
        body: JSON.stringify({
          payment_status: 'paid',
          amount: parseFloat(paymentData.amount),
          payment_mode: paymentData.payment_mode
        })
      });

      if (response.ok) {
        toast.success('Payment marked as received!');
        setPaymentDialogOpen(false);
        setSelectedSlot(null);
        setPaymentData({ amount: '', payment_mode: 'cash' });
        fetchSlots(format(selectedDate, 'yyyy-MM-dd'));
      } else {
        toast.error('Failed to update payment');
      }
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error('Failed to update payment');
    } finally {
      setProcessing(false);
    }
  };

  const getSlotColor = (status) => {
    switch (status) {
      case 'booked_paid':
        return 'bg-green-500 hover:bg-green-600 text-white border-green-600';
      case 'booked_unpaid':
        return 'bg-yellow-400 hover:bg-yellow-500 text-gray-900 border-yellow-500';
      default:
        return 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getSlotIcon = (status) => {
    switch (status) {
      case 'booked_paid':
        return <CheckCircle className="h-4 w-4" />;
      case 'booked_unpaid':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const navigateWeek = (direction) => {
    const newWeekStart = addDays(weekStart, direction * 7);
    setWeekStart(newWeekStart);
    setSelectedDate(newWeekStart);
  };

  return (
    <AdminLayout title="Booking Slots">
      {/* Legend */}
      <Card className="border-0 shadow-sm mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-gray-900">Slot Status Legend</h2>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-green-500 border-2 border-green-600"></div>
                <span className="text-sm text-gray-600">Booked & Paid</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-yellow-400 border-2 border-yellow-500"></div>
                <span className="text-sm text-gray-600">Booked - Payment Pending</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-white border-2 border-gray-200"></div>
                <span className="text-sm text-gray-600">Available</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Slots</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Clock className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Available</p>
                <p className="text-2xl font-bold text-gray-700">{stats.available}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-gray-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Booked & Paid</p>
                <p className="text-2xl font-bold text-green-700">{stats.bookedPaid}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-700">Payment Pending</p>
                <p className="text-2xl font-bold text-yellow-700">{stats.bookedUnpaid}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-yellow-400 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-gray-900" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Week Navigation */}
      <Card className="border-0 shadow-sm mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <Button variant="outline" size="sm" onClick={() => navigateWeek(-1)}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous Week
            </Button>
            <h3 className="text-lg font-semibold text-gray-900">
              {format(weekStart, 'MMMM yyyy')}
            </h3>
            <Button variant="outline" size="sm" onClick={() => navigateWeek(1)}>
              Next Week
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          
          {/* Week Days */}
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={`p-3 rounded-lg text-center transition-all ${
                  isSameDay(day, selectedDate)
                    ? 'bg-green-500 text-white shadow-lg'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                }`}
              >
                <p className="text-xs font-medium">{format(day, 'EEE')}</p>
                <p className="text-lg font-bold">{format(day, 'd')}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selected Date & Slots */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-green-500" />
            {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3">
              {slots.map((slot) => (
                <button
                  key={slot.time}
                  onClick={() => {
                    if (slot.status === 'booked_unpaid') {
                      setSelectedSlot(slot);
                      setPaymentDialogOpen(true);
                    } else if (slot.status === 'booked_paid') {
                      setSelectedSlot(slot);
                    }
                  }}
                  className={`p-4 rounded-xl border-2 transition-all ${getSlotColor(slot.status)} ${
                    slot.status !== 'available' ? 'cursor-pointer' : 'cursor-default'
                  }`}
                  data-testid={`slot-${slot.time.replace(/\s/g, '-')}`}
                >
                  <div className="flex flex-col items-center gap-2">
                    {getSlotIcon(slot.status)}
                    <span className="font-semibold text-sm">{slot.time}</span>
                    {slot.status !== 'available' && (
                      <span className="text-xs truncate max-w-full">
                        {slot.customer_name?.split(' ')[0] || 'Customer'}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Slot Details */}
          {selectedSlot && selectedSlot.status === 'booked_paid' && !paymentDialogOpen && (
            <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-200">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-green-800 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Booked & Paid
                  </h4>
                  <div className="mt-2 space-y-1 text-sm text-green-700">
                    <p className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {selectedSlot.customer_name}
                    </p>
                    <p className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {selectedSlot.time}
                    </p>
                    {selectedSlot.service && (
                      <p className="flex items-center gap-2">
                        <Car className="h-4 w-4" />
                        {selectedSlot.service}
                      </p>
                    )}
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedSlot(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-yellow-700">
              <AlertCircle className="h-5 w-5" />
              Payment Pending
            </DialogTitle>
            <DialogDescription>
              Mark this booking as paid after receiving payment.
            </DialogDescription>
          </DialogHeader>

          {selectedSlot && (
            <div className="space-y-4 mt-4">
              {/* Booking Info */}
              <div className="p-4 bg-yellow-50 rounded-lg">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Customer</p>
                    <p className="font-medium">{selectedSlot.customer_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Time Slot</p>
                    <p className="font-medium">{selectedSlot.time}</p>
                  </div>
                  {selectedSlot.service && (
                    <div className="col-span-2">
                      <p className="text-gray-500">Service</p>
                      <p className="font-medium">{selectedSlot.service}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Form */}
              <div>
                <Label htmlFor="amount">Amount Received (₹)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                  placeholder="Enter amount"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Payment Mode</Label>
                <Select
                  value={paymentData.payment_mode}
                  onValueChange={(value) => setPaymentData({ ...paymentData, payment_mode: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handlePaymentUpdate}
                  className="flex-1 bg-green-500 hover:bg-green-600"
                  disabled={processing || !paymentData.amount}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {processing ? 'Processing...' : 'Mark as Paid'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setPaymentDialogOpen(false);
                    setSelectedSlot(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default BookingSlots;
