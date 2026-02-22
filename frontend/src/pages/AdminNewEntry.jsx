import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Car, User, Phone, IndianRupee, CreditCard, 
  Calendar, Clock, CheckCircle, UserCheck, Save, Ticket, ExternalLink
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import AdminLayout from '../components/admin/AdminLayout';
import { useAdminAuth } from '../context/AdminAuthContext';
import { PAYMENT_MODES, JOB_STATUS, STAFF_MEMBERS } from '../data/adminMock';
import { SERVICES } from '../data/mock';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminNewEntry = () => {
  const navigate = useNavigate();
  const { admin } = useAdminAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
  const [generatedToken, setGeneratedToken] = useState(null);
  const [formData, setFormData] = useState({
    customerName: '',
    carNumber: '',
    mobileNumber: '',
    serviceType: '',
    amount: '',
    paymentMode: '',
    receivedBy: '',
    cashHandoverTo: '',
    jobStatus: 'pending',
    notes: ''
  });
  const [errors, setErrors] = useState({});

  const handleInputChange = (field, value) => {
    if (field === 'carNumber') {
      value = formatCarNumber(value);
    }
    if (field === 'mobileNumber') {
      value = value.replace(/\D/g, '').slice(0, 10);
    }
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const formatCarNumber = (value) => {
    let formatted = value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    const parts = formatted.replace(/-/g, '');
    if (parts.length <= 2) {
      formatted = parts;
    } else if (parts.length <= 4) {
      formatted = `${parts.slice(0, 2)}-${parts.slice(2)}`;
    } else if (parts.length <= 6) {
      formatted = `${parts.slice(0, 2)}-${parts.slice(2, 4)}-${parts.slice(4)}`;
    } else {
      formatted = `${parts.slice(0, 2)}-${parts.slice(2, 4)}-${parts.slice(4, 6)}-${parts.slice(6, 10)}`;
    }
    return formatted;
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.customerName.trim()) newErrors.customerName = 'Customer name is required';
    if (!formData.carNumber.trim()) newErrors.carNumber = 'Car number is required';
    if (formData.carNumber.length < 10) newErrors.carNumber = 'Enter valid car number (e.g., MH-12-AB-1234)';
    if (!formData.mobileNumber.trim()) newErrors.mobileNumber = 'Mobile number is required';
    if (formData.mobileNumber.length !== 10) newErrors.mobileNumber = 'Enter valid 10-digit mobile number';
    if (!formData.serviceType) newErrors.serviceType = 'Select a service';
    if (!formData.amount || formData.amount <= 0) newErrors.amount = 'Enter valid amount';
    if (!formData.paymentMode) newErrors.paymentMode = 'Select payment mode';
    if (!formData.receivedBy) newErrors.receivedBy = 'Select who received payment';
    if (formData.paymentMode === 'cash' && !formData.cashHandoverTo) {
      newErrors.cashHandoverTo = 'Select who cash was handed over to';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const entryData = {
        customerName: formData.customerName,
        customer_name: formData.customerName,
        carNumber: formData.carNumber,
        car_number: formData.carNumber,
        mobileNumber: formData.mobileNumber,
        mobile_number: formData.mobileNumber,
        serviceType: formData.serviceType,
        service_type: formData.serviceType,
        serviceName: SERVICES.find(s => s.id === formData.serviceType)?.name || formData.serviceType,
        amount: parseFloat(formData.amount),
        paymentMode: formData.paymentMode,
        payment_mode: formData.paymentMode,
        receivedBy: formData.receivedBy,
        received_by: formData.receivedBy,
        cashHandoverTo: formData.cashHandoverTo,
        cash_handover_to: formData.cashHandoverTo,
        cashHandoverApproved: formData.paymentMode === 'cash',
        jobStatus: formData.jobStatus,
        job_status: formData.jobStatus,
        notes: formData.notes
      };

      const response = await fetch(`${API_URL}/api/entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${admin?.token}`
        },
        body: JSON.stringify(entryData)
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedToken(data);
        setTokenDialogOpen(true);
        toast.success('Vehicle entry added successfully!');
        
        // Reset form
        setFormData({
          customerName: '',
          carNumber: '',
          mobileNumber: '',
          serviceType: '',
          amount: '',
          paymentMode: '',
          receivedBy: '',
          cashHandoverTo: '',
          jobStatus: 'pending',
          notes: ''
        });
      } else {
        throw new Error('Failed to create entry');
      }
    } catch (error) {
      console.error('Error creating entry:', error);
      toast.error('Failed to create entry. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openTokenDisplay = () => {
    window.open('/token-display', '_blank');
  };

  return (
    <AdminLayout title="New Vehicle Entry">
      <div className="max-w-3xl mx-auto">
        {/* Quick Link to Token Display */}
        <div className="mb-4 flex justify-end">
          <Button
            variant="outline"
            onClick={openTokenDisplay}
            className="text-green-600 border-green-500 hover:bg-green-50"
          >
            <Ticket className="h-4 w-4 mr-2" />
            Open Token Display
            <ExternalLink className="h-4 w-4 ml-2" />
          </Button>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader className="border-b bg-gray-50">
            <CardTitle className="flex items-center text-xl">
              <Car className="h-6 w-6 text-green-500 mr-2" />
              Add New Vehicle Entry
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Customer Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <User className="h-5 w-5 text-green-500 mr-2" />
                  Customer Information
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customerName">Customer Name *</Label>
                    <Input
                      id="customerName"
                      value={formData.customerName}
                      onChange={(e) => handleInputChange('customerName', e.target.value)}
                      className={`mt-1 ${errors.customerName ? 'border-red-500' : ''}`}
                      placeholder="Enter customer name"
                    />
                    {errors.customerName && <p className="text-red-500 text-sm mt-1">{errors.customerName}</p>}
                  </div>
                  <div>
                    <Label htmlFor="mobileNumber">Mobile Number *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 mt-0.5" />
                      <Input
                        id="mobileNumber"
                        value={formData.mobileNumber}
                        onChange={(e) => handleInputChange('mobileNumber', e.target.value)}
                        className={`mt-1 pl-10 ${errors.mobileNumber ? 'border-red-500' : ''}`}
                        placeholder="9876543210"
                      />
                    </div>
                    {errors.mobileNumber && <p className="text-red-500 text-sm mt-1">{errors.mobileNumber}</p>}
                  </div>
                </div>
              </div>

              {/* Vehicle Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Car className="h-5 w-5 text-green-500 mr-2" />
                  Vehicle Information
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="carNumber">Car Number *</Label>
                    <Input
                      id="carNumber"
                      value={formData.carNumber}
                      onChange={(e) => handleInputChange('carNumber', e.target.value)}
                      className={`mt-1 font-mono ${errors.carNumber ? 'border-red-500' : ''}`}
                      placeholder="MH-12-AB-1234"
                      maxLength={13}
                    />
                    {errors.carNumber && <p className="text-red-500 text-sm mt-1">{errors.carNumber}</p>}
                    <p className="text-xs text-gray-500 mt-1">Format: MH-12-AB-1234</p>
                  </div>
                  <div>
                    <Label>Service Type *</Label>
                    <Select
                      value={formData.serviceType}
                      onValueChange={(value) => handleInputChange('serviceType', value)}
                    >
                      <SelectTrigger className={`mt-1 ${errors.serviceType ? 'border-red-500' : ''}`}>
                        <SelectValue placeholder="Select service" />
                      </SelectTrigger>
                      <SelectContent>
                        {SERVICES.map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.serviceType && <p className="text-red-500 text-sm mt-1">{errors.serviceType}</p>}
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <IndianRupee className="h-5 w-5 text-green-500 mr-2" />
                  Payment Information
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="amount">Amount (₹) *</Label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 mt-0.5" />
                      <Input
                        id="amount"
                        type="number"
                        value={formData.amount}
                        onChange={(e) => handleInputChange('amount', e.target.value)}
                        className={`mt-1 pl-10 ${errors.amount ? 'border-red-500' : ''}`}
                        placeholder="0"
                        min="0"
                      />
                    </div>
                    {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount}</p>}
                  </div>
                  <div>
                    <Label>Payment Mode *</Label>
                    <Select
                      value={formData.paymentMode}
                      onValueChange={(value) => handleInputChange('paymentMode', value)}
                    >
                      <SelectTrigger className={`mt-1 ${errors.paymentMode ? 'border-red-500' : ''}`}>
                        <SelectValue placeholder="Select payment mode" />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_MODES.map((mode) => (
                          <SelectItem key={mode.value} value={mode.value}>
                            {mode.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.paymentMode && <p className="text-red-500 text-sm mt-1">{errors.paymentMode}</p>}
                  </div>
                  <div>
                    <Label>Payment Received By *</Label>
                    <Select
                      value={formData.receivedBy}
                      onValueChange={(value) => handleInputChange('receivedBy', value)}
                    >
                      <SelectTrigger className={`mt-1 ${errors.receivedBy ? 'border-red-500' : ''}`}>
                        <SelectValue placeholder="Select staff member" />
                      </SelectTrigger>
                      <SelectContent>
                        {STAFF_MEMBERS.map((staff) => (
                          <SelectItem key={staff} value={staff}>
                            {staff}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.receivedBy && <p className="text-red-500 text-sm mt-1">{errors.receivedBy}</p>}
                  </div>

                  {formData.paymentMode === 'cash' && (
                    <div>
                      <Label>Cash Handed Over To *</Label>
                      <Select
                        value={formData.cashHandoverTo}
                        onValueChange={(value) => handleInputChange('cashHandoverTo', value)}
                      >
                        <SelectTrigger className={`mt-1 ${errors.cashHandoverTo ? 'border-red-500' : ''}`}>
                          <SelectValue placeholder="Select who received cash" />
                        </SelectTrigger>
                        <SelectContent>
                          {STAFF_MEMBERS.map((staff) => (
                            <SelectItem key={staff} value={staff}>
                              {staff}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.cashHandoverTo && <p className="text-red-500 text-sm mt-1">{errors.cashHandoverTo}</p>}
                      <p className="text-xs text-gray-500 mt-1">Self-declaration of cash handover</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Job Status */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  Job Status
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Job Status *</Label>
                    <Select
                      value={formData.jobStatus}
                      onValueChange={(value) => handleInputChange('jobStatus', value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {JOB_STATUS.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Entry Date & Time</Label>
                    <Input
                      value={new Date().toLocaleString('en-IN')}
                      className="mt-1 bg-gray-50"
                      disabled
                    />
                    <p className="text-xs text-gray-500 mt-1">Auto-captured</p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Additional Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  className="mt-1"
                  placeholder="Any additional notes..."
                  rows={3}
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                <Button
                  type="submit"
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    'Saving...'
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Entry & Generate Token
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/admin/dashboard')}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Token Generated Dialog */}
      <Dialog open={tokenDialogOpen} onOpenChange={setTokenDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">
              Token Generated Successfully!
            </DialogTitle>
          </DialogHeader>
          {generatedToken && (
            <div className="text-center py-6">
              <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl p-8 mb-6">
                <Ticket className="h-12 w-12 mx-auto mb-4 opacity-80" />
                <p className="text-sm uppercase tracking-wider mb-2">Token Number</p>
                <p className="text-6xl font-bold">{generatedToken.token_display}</p>
              </div>
              
              <div className="space-y-2 text-left bg-gray-50 rounded-xl p-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-500">Customer:</span>
                  <span className="font-medium">{generatedToken.customerName || generatedToken.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Car Number:</span>
                  <span className="font-mono font-medium">{generatedToken.carNumber || generatedToken.car_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Service:</span>
                  <span className="font-medium">{generatedToken.serviceName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status:</span>
                  <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                    Waiting
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={openTokenDisplay}
                  className="flex-1 bg-green-500 hover:bg-green-600"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Display
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setTokenDialogOpen(false)}
                  className="flex-1"
                >
                  Add Another
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminNewEntry;
