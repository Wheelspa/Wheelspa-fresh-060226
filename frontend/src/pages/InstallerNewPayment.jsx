import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  IndianRupee, User, Briefcase, Calendar, FileText,
  CreditCard, Save, ArrowLeft
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import AdminLayout from '../components/admin/AdminLayout';
import { 
  INSTALLER_CATEGORIES, 
  INSTALLER_PAYMENT_MODES, 
  INSTALLERS,
  MOCK_INSTALLER_PAYMENTS 
} from '../data/installerMock';
import { toast } from 'sonner';

const InstallerNewPayment = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filteredInstallers, setFilteredInstallers] = useState(INSTALLERS);
  const [formData, setFormData] = useState({
    category: '',
    installerId: '',
    installerName: '',
    jobReference: '',
    totalPayable: '',
    advancePaid: '',
    remainingBalance: 0,
    paymentMode: '',
    transactionId: '',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [errors, setErrors] = useState({});

  // Filter installers based on selected category
  useEffect(() => {
    if (formData.category) {
      const filtered = INSTALLERS.filter(i => i.category === formData.category);
      setFilteredInstallers(filtered);
      // Reset installer selection when category changes
      setFormData(prev => ({ ...prev, installerId: '', installerName: '' }));
    } else {
      setFilteredInstallers(INSTALLERS);
    }
  }, [formData.category]);

  // Auto-calculate remaining balance
  useEffect(() => {
    const total = parseFloat(formData.totalPayable) || 0;
    const advance = parseFloat(formData.advancePaid) || 0;
    const remaining = Math.max(0, total - advance);
    setFormData(prev => ({ ...prev, remainingBalance: remaining }));
  }, [formData.totalPayable, formData.advancePaid]);

  const handleInputChange = (field, value) => {
    if (field === 'installerId') {
      const installer = INSTALLERS.find(i => i.id === value);
      setFormData(prev => ({
        ...prev,
        installerId: value,
        installerName: installer?.name || ''
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.category) newErrors.category = 'Select a category';
    if (!formData.installerId) newErrors.installerId = 'Select an installer';
    if (!formData.jobReference.trim()) newErrors.jobReference = 'Enter job reference';
    if (!formData.totalPayable || parseFloat(formData.totalPayable) <= 0) {
      newErrors.totalPayable = 'Enter valid total amount';
    }
    if (!formData.advancePaid && formData.advancePaid !== 0) {
      newErrors.advancePaid = 'Enter advance amount (0 if none)';
    }
    if (parseFloat(formData.advancePaid) > parseFloat(formData.totalPayable)) {
      newErrors.advancePaid = 'Advance cannot exceed total payable';
    }
    if (!formData.paymentMode) newErrors.paymentMode = 'Select payment mode';
    if (!formData.paymentDate) newErrors.paymentDate = 'Select payment date';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);

    const newPayment = {
      id: Date.now().toString(),
      ...formData,
      totalPayable: parseFloat(formData.totalPayable),
      advancePaid: parseFloat(formData.advancePaid),
      remainingBalance: formData.remainingBalance,
      status: formData.remainingBalance === 0 ? 'completed' : 'partial',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      auditTrail: [
        { action: 'created', timestamp: new Date().toISOString(), by: 'admin' }
      ]
    };

    // Save to localStorage
    const storedPayments = localStorage.getItem('wheelspa_installer_payments');
    const payments = storedPayments ? JSON.parse(storedPayments) : MOCK_INSTALLER_PAYMENTS;
    payments.push(newPayment);
    localStorage.setItem('wheelspa_installer_payments', JSON.stringify(payments));

    await new Promise(resolve => setTimeout(resolve, 500));

    setIsSubmitting(false);
    toast.success('Payment entry added successfully!');
    navigate('/admin/installer');
  };

  return (
    <AdminLayout title="New Installer Payment">
      <div className="max-w-3xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate('/admin/installer')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card className="border-0 shadow-lg">
          <CardHeader className="border-b bg-gray-50">
            <CardTitle className="flex items-center text-xl">
              <IndianRupee className="h-6 w-6 text-green-500 mr-2" />
              Add Installer Payment
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Category & Installer */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <User className="h-5 w-5 text-green-500 mr-2" />
                  Installer Details
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Category *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => handleInputChange('category', value)}
                    >
                      <SelectTrigger className={`mt-1 ${errors.category ? 'border-red-500' : ''}`}>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {INSTALLER_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
                  </div>
                  <div>
                    <Label>Installer Name *</Label>
                    <Select
                      value={formData.installerId}
                      onValueChange={(value) => handleInputChange('installerId', value)}
                      disabled={!formData.category}
                    >
                      <SelectTrigger className={`mt-1 ${errors.installerId ? 'border-red-500' : ''}`}>
                        <SelectValue placeholder={formData.category ? "Select installer" : "Select category first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredInstallers.map((installer) => (
                          <SelectItem key={installer.id} value={installer.id}>
                            {installer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.installerId && <p className="text-red-500 text-sm mt-1">{errors.installerId}</p>}
                  </div>
                </div>
              </div>

              {/* Job Details */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Briefcase className="h-5 w-5 text-green-500 mr-2" />
                  Job Details
                </h3>
                <div>
                  <Label htmlFor="jobReference">Job / Project Reference *</Label>
                  <Input
                    id="jobReference"
                    value={formData.jobReference}
                    onChange={(e) => handleInputChange('jobReference', e.target.value)}
                    className={`mt-1 ${errors.jobReference ? 'border-red-500' : ''}`}
                    placeholder="e.g., PPF-BMW-001, WF-AUDI-002"
                  />
                  {errors.jobReference && <p className="text-red-500 text-sm mt-1">{errors.jobReference}</p>}
                </div>
              </div>

              {/* Payment Details */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <IndianRupee className="h-5 w-5 text-green-500 mr-2" />
                  Payment Details
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="totalPayable">Total Payable (₹) *</Label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 mt-0.5" />
                      <Input
                        id="totalPayable"
                        type="number"
                        value={formData.totalPayable}
                        onChange={(e) => handleInputChange('totalPayable', e.target.value)}
                        className={`mt-1 pl-10 ${errors.totalPayable ? 'border-red-500' : ''}`}
                        placeholder="0"
                        min="0"
                      />
                    </div>
                    {errors.totalPayable && <p className="text-red-500 text-sm mt-1">{errors.totalPayable}</p>}
                  </div>
                  <div>
                    <Label htmlFor="advancePaid">Advance Paid (₹) *</Label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 mt-0.5" />
                      <Input
                        id="advancePaid"
                        type="number"
                        value={formData.advancePaid}
                        onChange={(e) => handleInputChange('advancePaid', e.target.value)}
                        className={`mt-1 pl-10 ${errors.advancePaid ? 'border-red-500' : ''}`}
                        placeholder="0"
                        min="0"
                      />
                    </div>
                    {errors.advancePaid && <p className="text-red-500 text-sm mt-1">{errors.advancePaid}</p>}
                  </div>
                  <div>
                    <Label>Remaining Balance (₹)</Label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 mt-0.5" />
                      <Input
                        type="number"
                        value={formData.remainingBalance}
                        className="mt-1 pl-10 bg-gray-50"
                        disabled
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Auto-calculated</p>
                  </div>
                </div>
              </div>

              {/* Transaction Details */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <CreditCard className="h-5 w-5 text-green-500 mr-2" />
                  Transaction Details
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>Payment Mode *</Label>
                    <Select
                      value={formData.paymentMode}
                      onValueChange={(value) => handleInputChange('paymentMode', value)}
                    >
                      <SelectTrigger className={`mt-1 ${errors.paymentMode ? 'border-red-500' : ''}`}>
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                      <SelectContent>
                        {INSTALLER_PAYMENT_MODES.map((mode) => (
                          <SelectItem key={mode.value} value={mode.value}>
                            {mode.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.paymentMode && <p className="text-red-500 text-sm mt-1">{errors.paymentMode}</p>}
                  </div>
                  <div>
                    <Label htmlFor="transactionId">Transaction ID / Reference</Label>
                    <Input
                      id="transactionId"
                      value={formData.transactionId}
                      onChange={(e) => handleInputChange('transactionId', e.target.value)}
                      className="mt-1"
                      placeholder="UPI/NEFT/Cheque No."
                    />
                  </div>
                  <div>
                    <Label htmlFor="paymentDate">Payment Date *</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 mt-0.5" />
                      <Input
                        id="paymentDate"
                        type="date"
                        value={formData.paymentDate}
                        onChange={(e) => handleInputChange('paymentDate', e.target.value)}
                        className={`mt-1 pl-10 ${errors.paymentDate ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {errors.paymentDate && <p className="text-red-500 text-sm mt-1">{errors.paymentDate}</p>}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FileText className="h-5 w-5 text-green-500 mr-2" />
                  Additional Notes
                </h3>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Any remarks or details about this payment..."
                  rows={3}
                />
              </div>

              {/* Summary Card */}
              {formData.totalPayable && (
                <div className="bg-gray-50 rounded-lg p-4 border">
                  <h4 className="font-semibold text-gray-900 mb-3">Payment Summary</h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm text-gray-500">Total Payable</p>
                      <p className="text-lg font-bold text-gray-900">₹{parseFloat(formData.totalPayable || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Advance Paid</p>
                      <p className="text-lg font-bold text-green-600">₹{parseFloat(formData.advancePaid || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Balance</p>
                      <p className={`text-lg font-bold ${formData.remainingBalance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                        ₹{formData.remainingBalance.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                <Button
                  type="submit"
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Payment
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/admin/installer')}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default InstallerNewPayment;
