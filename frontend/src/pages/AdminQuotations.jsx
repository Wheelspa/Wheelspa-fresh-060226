import React, { useState, useEffect, useRef } from 'react';
import { 
  FileSpreadsheet, Save, Printer, RefreshCw, Search, 
  Car, User, Phone, Calendar, ShieldCheck, IndianRupee,
  Eye, CheckCircle, Trash2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import AdminLayout from '../components/admin/AdminLayout';
import { useAdminAuth } from '../context/AdminAuthContext';
import { BRAND_INFO } from '../data/mock';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Format amounts into standard Indian currency format (e.g. Rs 19,942.00)
export const formatIndianCurrency = (amount) => {
  const num = Number(amount);
  if (isNaN(num)) return 'Rs 0.00';
  return 'Rs ' + num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const AdminQuotations = () => {
  const { admin } = useAdminAuth();

  const [formData, setFormData] = useState({
    quotationNo: '',
    quotationDate: new Date().toISOString().split('T')[0],
    customerName: '',
    mobileNumber: '',
    vehicleModel: '',
    ppfPackage: '',
    basicCost: '',
    installerCharges: '',
    detailingCharges: '',
    marginPercentage: '30',
    gstPercentage: '18',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quotations, setQuotations] = useState([]);
  const [loadingQuotations, setLoadingQuotations] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedForPrint, setSelectedForPrint] = useState(null);
  const [printModalOpen, setPrintModalOpen] = useState(false);

  // Delete state & role check (owner and superadmin only)
  const canDelete = admin?.role === 'owner' || admin?.role === 'superadmin';
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quotationToDelete, setQuotationToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const printSheetRef = useRef(null);

  // Fetch next preview quotation number from backend
  const fetchNextQuotationNumber = async () => {
    if (!admin?.token) return;
    try {
      const res = await fetch(`${API_URL}/api/quotations/next-number`, {
        headers: {
          'Authorization': `Bearer ${admin.token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setFormData(prev => ({
          ...prev,
          quotationNo: data.next_quotation_number || 'WSPPF-001'
        }));
      }
    } catch (err) {
      console.error('Failed to load next quotation number', err);
    }
  };

  // Fetch saved quotations
  const fetchQuotations = async () => {
    if (!admin?.token) return;
    setLoadingQuotations(true);
    try {
      const res = await fetch(`${API_URL}/api/quotations`, {
        headers: {
          'Authorization': `Bearer ${admin.token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setQuotations(data);
      } else {
        toast.error('Failed to fetch quotations list');
      }
    } catch (err) {
      console.error('Error fetching quotations', err);
      toast.error('Error connecting to quotations server');
    } finally {
      setLoadingQuotations(false);
    }
  };

  useEffect(() => {
    if (admin?.token) {
      fetchNextQuotationNumber();
      fetchQuotations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admin?.token]);

  // Live Calculations (updating as user types, treating empty as 0)
  const basic = parseFloat(formData.basicCost) || 0;
  const installer = parseFloat(formData.installerCharges) || 0;
  const detailing = parseFloat(formData.detailingCharges) || 0;
  const marginPct = formData.marginPercentage === '' ? 0 : (parseFloat(formData.marginPercentage) || 0);
  const gstPct = formData.gstPercentage === '' ? 0 : (parseFloat(formData.gstPercentage) || 0);

  const totalCost = Math.round((basic + installer + detailing) * 100) / 100;
  const marginAmount = Math.round(totalCost * (marginPct / 100) * 100) / 100;
  const totalCostInclMargin = Math.round((totalCost + marginAmount) * 100) / 100;
  const gstAmount = Math.round(totalCostInclMargin * (gstPct / 100) * 100) / 100;
  const finalQuotationValue = Math.round((totalCostInclMargin + gstAmount) * 100) / 100;

  const handleInputChange = (field, value) => {
    if (field === 'mobileNumber') {
      value = value.replace(/\D/g, '').slice(0, 10);
    }
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear field-specific error as user types valid content
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Form validation matching Booking form pattern
  const validateForm = () => {
    const newErrors = {};

    if (!formData.customerName.trim()) {
      newErrors.customerName = 'Customer Name is required';
    }

    const cleanPhone = formData.mobileNumber.replace(/\D/g, '');
    if (!cleanPhone) {
      newErrors.mobileNumber = 'Mobile Number is required';
    } else if (cleanPhone.length !== 10) {
      newErrors.mobileNumber = 'Enter a valid 10-digit mobile number';
    }

    if (!formData.vehicleModel.trim()) {
      newErrors.vehicleModel = 'Vehicle / Model is required';
    }

    if (!formData.ppfPackage.trim()) {
      newErrors.ppfPackage = 'PPF Package / Film is required';
    }

    // Costs & percentages must be numbers >= 0
    const checkCostField = (val, fieldName, label) => {
      if (val !== '' && val !== null && val !== undefined) {
        const num = Number(val);
        if (isNaN(num)) {
          newErrors[fieldName] = `${label} must be a number`;
        } else if (num < 0) {
          newErrors[fieldName] = `${label} must be 0 or greater`;
        }
      }
    };

    checkCostField(formData.basicCost, 'basicCost', 'Basic Cost');
    checkCostField(formData.installerCharges, 'installerCharges', 'Installer Charges');
    checkCostField(formData.detailingCharges, 'detailingCharges', 'Detailing Charges');
    checkCostField(formData.marginPercentage, 'marginPercentage', 'Margin %');
    checkCostField(formData.gstPercentage, 'gstPercentage', 'GST %');

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast.error('Please fix the highlighted fields');
      const fieldOrder = [
        'customerName', 'mobileNumber', 'vehicleModel', 'ppfPackage',
        'basicCost', 'installerCharges', 'detailingCharges', 'marginPercentage', 'gstPercentage'
      ];
      const firstInvalidField = fieldOrder.find(f => newErrors[f]);
      if (firstInvalidField) {
        const el = document.getElementById(firstInvalidField);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (typeof el.focus === 'function') el.focus();
        }
      }
      return false;
    }

    return true;
  };

  // Reset form to blank and reload next sequence number
  const resetForm = async () => {
    setFormData({
      quotationNo: '',
      quotationDate: new Date().toISOString().split('T')[0],
      customerName: '',
      mobileNumber: '',
      vehicleModel: '',
      ppfPackage: '',
      basicCost: '',
      installerCharges: '',
      detailingCharges: '',
      marginPercentage: '30',
      gstPercentage: '18',
    });
    setErrors({});
    await fetchNextQuotationNumber();
  };

  // Save Quotation Handler
  const handleSaveQuotation = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        quotationDate: formData.quotationDate,
        customerName: formData.customerName.trim(),
        mobileNumber: formData.mobileNumber.replace(/\D/g, ''),
        vehicleModel: formData.vehicleModel.trim(),
        ppfPackage: formData.ppfPackage.trim(),
        basicCost: parseFloat(formData.basicCost) || 0,
        installerCharges: parseFloat(formData.installerCharges) || 0,
        detailingCharges: parseFloat(formData.detailingCharges) || 0,
        marginPercentage: formData.marginPercentage === '' ? 30 : (parseFloat(formData.marginPercentage) || 0),
        gstPercentage: formData.gstPercentage === '' ? 18 : (parseFloat(formData.gstPercentage) || 0),
      };

      const res = await fetch(`${API_URL}/api/quotations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${admin.token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to save quotation');
      }

      const savedDoc = await res.json();
      const quotationNum = savedDoc.quotation_number || savedDoc.quotation_no || 'Quotation';
      toast.success(`Quotation ${quotationNum} saved successfully!`);

      // Reset form to blank with next quotation number
      await resetForm();
      // Reload quotations list
      fetchQuotations();
    } catch (err) {
      toast.error(err.message || 'Error saving quotation');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Print Preview Modal
  const openPrintModal = (quotation) => {
    setSelectedForPrint(quotation);
    setPrintModalOpen(true);
  };

  // Trigger browser print
  const handlePrint = () => {
    window.print();
  };

  // Open Delete Confirmation Modal
  const handleDeleteClick = (quotation) => {
    setQuotationToDelete(quotation);
    setDeleteDialogOpen(true);
  };

  // Confirm Delete Quotation
  const handleConfirmDelete = async () => {
    if (!quotationToDelete) return;
    setIsDeleting(true);
    const qId = quotationToDelete.id || quotationToDelete.quotation_number;
    const qNum = quotationToDelete.quotation_number || quotationToDelete.quotation_no || qId;
    try {
      const res = await fetch(`${API_URL}/api/quotations/${qId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${admin.token}`
        }
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to delete quotation');
      }

      toast.success(`Quotation ${qNum} deleted successfully`);
      setDeleteDialogOpen(false);
      setQuotationToDelete(null);
      fetchQuotations();
    } catch (err) {
      toast.error(err.message || 'Failed to delete quotation');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered saved quotations
  const filteredQuotations = quotations.filter(q => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    const num = (q.quotation_number || q.quotation_no || '').toLowerCase();
    const name = (q.customer_name || q.customerName || '').toLowerCase();
    const phone = (q.mobile_number || q.mobileNumber || '').toLowerCase();
    const vehicle = (q.vehicle_model || q.vehicleModel || '').toLowerCase();
    const pkg = (q.ppf_package || q.ppfPackage || '').toLowerCase();
    return num.includes(query) || name.includes(query) || phone.includes(query) || vehicle.includes(query) || pkg.includes(query);
  });

  return (
    <AdminLayout title="PPF Quotation">
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm no-print">
          <div>
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-green-100 rounded-lg text-green-700">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">PPF Quotation Generator</h1>
                <p className="text-sm text-gray-500">
                  Instant live calculation, official quotation numbering, and print-ready customer copy
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={resetForm}
              className="text-gray-600 hover:text-gray-900 border-gray-300"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              New Blank Form
            </Button>
            <Button
              type="button"
              onClick={handleSaveQuotation}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700 text-white font-medium shadow-sm"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Saving...' : 'Save Quotation'}
            </Button>
          </div>
        </div>

        {/* Quotation Form Card */}
        <form onSubmit={handleSaveQuotation} className="no-print">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Customer & Vehicle Details (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              <Card className="border-gray-200 shadow-sm">
                <CardHeader className="bg-gray-50/70 border-b border-gray-200/80 pb-4">
                  <div className="flex items-center space-x-2">
                    <User className="h-5 w-5 text-green-600" />
                    <CardTitle className="text-base font-semibold text-gray-900">
                      Customer & Vehicle Details
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs text-gray-500">
                    Basic information required for generating the official quotation
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Quotation No (read-only, auto-generated by backend) */}
                    <div>
                      <Label htmlFor="quotationNo" className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Quotation No (Auto)
                      </Label>
                      <Input
                        id="quotationNo"
                        value={formData.quotationNo || 'Generating...'}
                        readOnly
                        disabled
                        className="mt-1.5 bg-gray-100 font-mono font-bold text-green-800 border-gray-300 cursor-not-allowed select-none"
                      />
                      <p className="text-xs text-gray-400 mt-1">Backend sequence format WSPPF-001</p>
                    </div>

                    {/* Quotation Date */}
                    <div>
                      <Label htmlFor="quotationDate" className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Quotation Date *
                      </Label>
                      <Input
                        id="quotationDate"
                        type="date"
                        value={formData.quotationDate}
                        onChange={(e) => handleInputChange('quotationDate', e.target.value)}
                        className={`mt-1.5 ${errors.quotationDate ? 'border-red-500' : 'border-gray-300'}`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Customer Name */}
                    <div>
                      <Label htmlFor="customerName" className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Customer Name *
                      </Label>
                      <Input
                        id="customerName"
                        value={formData.customerName}
                        onChange={(e) => handleInputChange('customerName', e.target.value)}
                        placeholder="e.g. Rahul Patil"
                        className={`mt-1.5 ${errors.customerName ? 'border-red-500' : 'border-gray-300'}`}
                      />
                      {errors.customerName && (
                        <p className="text-red-500 text-xs mt-1 font-medium">{errors.customerName}</p>
                      )}
                    </div>

                    {/* Mobile Number */}
                    <div>
                      <Label htmlFor="mobileNumber" className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Mobile Number * (10 Digits)
                      </Label>
                      <Input
                        id="mobileNumber"
                        value={formData.mobileNumber}
                        onChange={(e) => handleInputChange('mobileNumber', e.target.value)}
                        placeholder="e.g. 9876543210"
                        maxLength={10}
                        className={`mt-1.5 ${errors.mobileNumber ? 'border-red-500' : 'border-gray-300'}`}
                      />
                      {errors.mobileNumber && (
                        <p className="text-red-500 text-xs mt-1 font-medium">{errors.mobileNumber}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Vehicle / Model */}
                    <div>
                      <Label htmlFor="vehicleModel" className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Vehicle / Model *
                      </Label>
                      <Input
                        id="vehicleModel"
                        value={formData.vehicleModel}
                        onChange={(e) => handleInputChange('vehicleModel', e.target.value)}
                        placeholder="e.g. Mercedes-Benz GLC 300"
                        className={`mt-1.5 ${errors.vehicleModel ? 'border-red-500' : 'border-gray-300'}`}
                      />
                      {errors.vehicleModel && (
                        <p className="text-red-500 text-xs mt-1 font-medium">{errors.vehicleModel}</p>
                      )}
                    </div>

                    {/* PPF Package / Film */}
                    <div>
                      <Label htmlFor="ppfPackage" className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        PPF Package / Film *
                      </Label>
                      <Input
                        id="ppfPackage"
                        value={formData.ppfPackage}
                        onChange={(e) => handleInputChange('ppfPackage', e.target.value)}
                        placeholder="e.g. Garware Plus TPU (5-Year)"
                        className={`mt-1.5 ${errors.ppfPackage ? 'border-red-500' : 'border-gray-300'}`}
                      />
                      {errors.ppfPackage && (
                        <p className="text-red-500 text-xs mt-1 font-medium">{errors.ppfPackage}</p>
                      )}
                    </div>
                  </div>

                </CardContent>
              </Card>

              {/* Cost Inputs */}
              <Card className="border-gray-200 shadow-sm">
                <CardHeader className="bg-gray-50/70 border-b border-gray-200/80 pb-4">
                  <div className="flex items-center space-x-2">
                    <IndianRupee className="h-5 w-5 text-green-600" />
                    <CardTitle className="text-base font-semibold text-gray-900">
                      Cost & Quotation Parameters
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs text-gray-500">
                    Internal cost components, margin, and GST rates (treated as 0 if empty)
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Basic Cost */}
                    <div>
                      <Label htmlFor="basicCost" className="text-xs font-semibold text-gray-700">
                        Basic Cost (Rs)
                      </Label>
                      <Input
                        id="basicCost"
                        type="number"
                        min="0"
                        step="any"
                        value={formData.basicCost}
                        onChange={(e) => handleInputChange('basicCost', e.target.value)}
                        placeholder="0.00"
                        className={`mt-1.5 font-mono ${errors.basicCost ? 'border-red-500' : 'border-gray-300'}`}
                      />
                      {errors.basicCost && (
                        <p className="text-red-500 text-xs mt-1 font-medium">{errors.basicCost}</p>
                      )}
                    </div>

                    {/* Installer Charges */}
                    <div>
                      <Label htmlFor="installerCharges" className="text-xs font-semibold text-gray-700">
                        Installer Charges (Rs)
                      </Label>
                      <Input
                        id="installerCharges"
                        type="number"
                        min="0"
                        step="any"
                        value={formData.installerCharges}
                        onChange={(e) => handleInputChange('installerCharges', e.target.value)}
                        placeholder="0.00"
                        className={`mt-1.5 font-mono ${errors.installerCharges ? 'border-red-500' : 'border-gray-300'}`}
                      />
                      {errors.installerCharges && (
                        <p className="text-red-500 text-xs mt-1 font-medium">{errors.installerCharges}</p>
                      )}
                    </div>

                    {/* Detailing Charges */}
                    <div>
                      <Label htmlFor="detailingCharges" className="text-xs font-semibold text-gray-700">
                        Detailing Charges (Rs)
                      </Label>
                      <Input
                        id="detailingCharges"
                        type="number"
                        min="0"
                        step="any"
                        value={formData.detailingCharges}
                        onChange={(e) => handleInputChange('detailingCharges', e.target.value)}
                        placeholder="0.00"
                        className={`mt-1.5 font-mono ${errors.detailingCharges ? 'border-red-500' : 'border-gray-300'}`}
                      />
                      {errors.detailingCharges && (
                        <p className="text-red-500 text-xs mt-1 font-medium">{errors.detailingCharges}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                    {/* Official Margin % */}
                    <div>
                      <Label htmlFor="marginPercentage" className="text-xs font-semibold text-gray-700">
                        Official Margin % (Default 30%)
                      </Label>
                      <Input
                        id="marginPercentage"
                        type="number"
                        min="0"
                        step="any"
                        value={formData.marginPercentage}
                        onChange={(e) => handleInputChange('marginPercentage', e.target.value)}
                        placeholder="30"
                        className={`mt-1.5 font-mono ${errors.marginPercentage ? 'border-red-500' : 'border-gray-300'}`}
                      />
                      {errors.marginPercentage && (
                        <p className="text-red-500 text-xs mt-1 font-medium">{errors.marginPercentage}</p>
                      )}
                    </div>

                    {/* GST % */}
                    <div>
                      <Label htmlFor="gstPercentage" className="text-xs font-semibold text-gray-700">
                        GST % (Default 18%)
                      </Label>
                      <Input
                        id="gstPercentage"
                        type="number"
                        min="0"
                        step="any"
                        value={formData.gstPercentage}
                        onChange={(e) => handleInputChange('gstPercentage', e.target.value)}
                        placeholder="18"
                        className={`mt-1.5 font-mono ${errors.gstPercentage ? 'border-red-500' : 'border-gray-300'}`}
                      />
                      {errors.gstPercentage && (
                        <p className="text-red-500 text-xs mt-1 font-medium">{errors.gstPercentage}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Live Calculation Output Card (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              <Card className="border-green-200 bg-gradient-to-b from-white to-green-50/30 shadow-md">
                <CardHeader className="bg-green-600 text-white rounded-t-xl pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold flex items-center">
                      <ShieldCheck className="h-5 w-5 mr-2" />
                      Live Quotation Calculation
                    </CardTitle>
                    <Badge className="bg-green-700 text-white text-xs border-0">
                      Live Updating
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-green-100">
                    Auto-calculated in real time matching company quotation rules
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  
                  {/* Step 1: Total Cost */}
                  <div className="flex justify-between items-center py-2.5 border-b border-gray-200">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Total Cost</p>
                      <p className="text-xs text-gray-400">Basic + Installer + Detailing</p>
                    </div>
                    <span className="font-mono text-sm font-semibold text-gray-900">
                      {formatIndianCurrency(totalCost)}
                    </span>
                  </div>

                  {/* Step 2: Margin Amount */}
                  <div className="flex justify-between items-center py-2.5 border-b border-gray-200">
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        Margin Amount ({marginPct}%)
                      </p>
                      <p className="text-xs text-gray-400">Total Cost × Margin% / 100</p>
                    </div>
                    <span className="font-mono text-sm font-semibold text-gray-900">
                      {formatIndianCurrency(marginAmount)}
                    </span>
                  </div>

                  {/* Step 3: Total Cost Including Margin */}
                  <div className="flex justify-between items-center py-2.5 border-b border-gray-200">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Total Cost Incl. Margin</p>
                      <p className="text-xs text-gray-400">Total Cost + Margin Amount</p>
                    </div>
                    <span className="font-mono text-sm font-semibold text-gray-900">
                      {formatIndianCurrency(totalCostInclMargin)}
                    </span>
                  </div>

                  {/* Step 4: GST Amount */}
                  <div className="flex justify-between items-center py-2.5 border-b border-gray-200">
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        GST Amount ({gstPct}%)
                      </p>
                      <p className="text-xs text-gray-400">Total Incl. Margin × GST% / 100</p>
                    </div>
                    <span className="font-mono text-sm font-semibold text-gray-900">
                      {formatIndianCurrency(gstAmount)}
                    </span>
                  </div>

                  {/* Final Quotation Value Highlight Box */}
                  <div className="mt-4 p-5 rounded-xl bg-green-50 border-2 border-green-500 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-green-800">
                      FINAL QUOTATION VALUE (Including GST)
                    </p>
                    <p className="text-3xl font-extrabold text-green-700 font-mono mt-1">
                      {formatIndianCurrency(finalQuotationValue)}
                    </p>
                    <p className="text-xs text-green-600 mt-2 font-medium">
                      Customer Price (Internal breakdown hidden on print)
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 space-y-2">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-5 text-base shadow"
                    >
                      <Save className="h-5 w-5 mr-2" />
                      {isSubmitting ? 'Saving Quotation...' : 'Save Quotation'}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (validateForm()) {
                          openPrintModal({
                            quotation_number: formData.quotationNo || 'WSPPF-PREVIEW',
                            quotation_date: formData.quotationDate,
                            customer_name: formData.customerName,
                            mobile_number: formData.mobileNumber,
                            vehicle_model: formData.vehicleModel,
                            ppf_package: formData.ppfPackage,
                            final_quotation_value: finalQuotationValue,
                            gst_percentage: gstPct
                          });
                        }
                      }}
                      className="w-full border-gray-300 text-gray-700 hover:bg-gray-100"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview Customer Quotation Copy
                    </Button>
                  </div>

                </CardContent>
              </Card>
            </div>

          </div>
        </form>

        {/* Saved Quotations List Card */}
        <Card className="border-gray-200 shadow-sm no-print">
          <CardHeader className="bg-gray-50/70 border-b border-gray-200/80 pb-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-lg font-bold text-gray-900 flex items-center">
                  <FileSpreadsheet className="h-5 w-5 text-green-600 mr-2" />
                  Saved PPF Quotations ({filteredQuotations.length})
                </CardTitle>
                <CardDescription className="text-xs text-gray-500">
                  Search, review, and print official quotation copies for customers
                </CardDescription>
              </div>

              {/* Search bar */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search quotation, name, vehicle..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-white border-gray-300 text-sm"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loadingQuotations ? (
              <div className="p-8 text-center text-gray-500 flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
                <span>Loading quotations...</span>
              </div>
            ) : filteredQuotations.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <FileSpreadsheet className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="font-medium text-gray-700">No quotations found</p>
                <p className="text-xs text-gray-400 mt-1">Create and save your first PPF quotation using the form above.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      <th className="py-3 px-4">Quotation No</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Vehicle</th>
                      <th className="py-3 px-4">PPF Package</th>
                      <th className="py-3 px-4 text-right">Final Value (Incl. GST)</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-sm text-gray-800">
                    {filteredQuotations.map((q) => {
                      const qNum = q.quotation_number || q.quotation_no || 'N/A';
                      const qDate = q.quotation_date || q.quotationDate || '';
                      const cName = q.customer_name || q.customerName || 'N/A';
                      const cPhone = q.mobile_number || q.mobileNumber || '';
                      const vModel = q.vehicle_model || q.vehicleModel || 'N/A';
                      const pkg = q.ppf_package || q.ppfPackage || 'N/A';
                      const finalVal = q.final_quotation_value !== undefined ? q.final_quotation_value : q.finalQuotationValue;

                      return (
                        <tr key={q.id || qNum} className="hover:bg-gray-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-green-700">
                            {qNum}
                          </td>
                          <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                            {qDate}
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-medium text-gray-900">{cName}</p>
                            {cPhone && <p className="text-xs text-gray-500 font-mono">{cPhone}</p>}
                          </td>
                          <td className="py-3 px-4 font-medium text-gray-800">
                            {vModel}
                          </td>
                          <td className="py-3 px-4 text-gray-700 max-w-xs truncate">
                            {pkg}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-gray-900 whitespace-nowrap">
                            {formatIndianCurrency(finalVal)}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openPrintModal(q)}
                                className="text-gray-700 hover:text-green-700 hover:bg-green-50 border-gray-300"
                              >
                                <Printer className="h-4 w-4 mr-1.5 text-green-600" />
                                Print
                              </Button>
                              {canDelete && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteClick(q)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                  title="Delete Quotation"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Print Preview & Action Dialog */}
      <Dialog open={printModalOpen} onOpenChange={setPrintModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="p-4 bg-gray-50 border-b border-gray-200 flex flex-row items-center justify-between no-print">
            <div>
              <DialogTitle className="text-lg font-bold text-gray-900 flex items-center">
                <Printer className="h-5 w-5 text-green-600 mr-2" />
                Customer Quotation Copy Preview
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                Official quotation sheet for customer. Internal costs & margin are hidden.
              </DialogDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={handlePrint}
                className="bg-green-600 hover:bg-green-700 text-white font-medium"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print / Download PDF
              </Button>
            </div>
          </DialogHeader>

          {/* Printable Sheet View */}
          <div className="p-6 md:p-8 bg-white">
            {selectedForPrint && (
              <div 
                ref={printSheetRef}
                id="quotation-print-sheet" 
                className="max-w-3xl mx-auto bg-white p-6 md:p-10 border border-gray-200 rounded-lg shadow-sm"
                style={{ fontFamily: 'Arial, Helvetica, sans-serif', color: '#1f2937' }}
              >
                {/* Header */}
                <div className="border-b-2 border-green-600 pb-6 mb-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div>
                      <div className="flex items-center space-x-3 mb-2">
                        <img
                          src={BRAND_INFO.logo}
                          alt="Wheelspa"
                          className="h-12 w-auto object-contain"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                        <h1 className="text-2xl font-black tracking-tight text-gray-900 uppercase">
                          Wheelspa Private Limited
                        </h1>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed max-w-sm">
                        Opposite Pink City, Kaspate Vasti Road, Wakad, Pune-411041
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        <span className="font-semibold text-gray-800">Phone:</span> 777-007-3535 &nbsp;|&nbsp; 
                        <span className="font-semibold text-gray-800"> Email:</span> info@wheelspa.in
                      </p>
                    </div>

                    <div className="sm:text-right bg-gray-50 p-3 rounded-lg border border-gray-200 min-w-[210px]">
                      <span className="inline-block px-2.5 py-0.5 rounded text-xs font-bold bg-green-100 text-green-800 tracking-wider uppercase mb-1">
                        PPF Quotation
                      </span>
                      <p className="text-sm font-bold text-gray-900 font-mono">
                        {selectedForPrint.quotation_number || selectedForPrint.quotation_no || selectedForPrint.quotationNo}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Date: <span className="font-medium text-gray-800">{selectedForPrint.quotation_date || selectedForPrint.quotationDate}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Customer & Vehicle Info Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50/70 p-4 rounded-lg border border-gray-200">
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Customer Name</p>
                    <p className="text-base font-bold text-gray-900 mt-0.5">
                      {selectedForPrint.customer_name || selectedForPrint.customerName}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Mobile Number</p>
                    <p className="text-base font-semibold text-gray-900 mt-0.5 font-mono">
                      +91 {selectedForPrint.mobile_number || selectedForPrint.mobileNumber}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-gray-200/80">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Vehicle / Model</p>
                    <p className="text-base font-bold text-gray-900 mt-0.5">
                      {selectedForPrint.vehicle_model || selectedForPrint.vehicleModel}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-gray-200/80">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">PPF Package / Film</p>
                    <p className="text-base font-bold text-green-700 mt-0.5">
                      {selectedForPrint.ppf_package || selectedForPrint.ppfPackage}
                    </p>
                  </div>
                </div>

                {/* Quotation Itemized Customer Table (Strictly NO internal costs or margins) */}
                <div className="mb-6">
                  <table className="w-full border-collapse border border-gray-200 text-left">
                    <thead>
                      <tr className="bg-gray-100 text-gray-800 text-xs font-bold uppercase tracking-wider border-b border-gray-200">
                        <th className="py-3 px-4">Item & Description</th>
                        <th className="py-3 px-4 text-center">Warranty & Scope</th>
                        <th className="py-3 px-4 text-right">Value (Incl. GST)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-200">
                        <td className="py-4 px-4 align-top">
                          <p className="font-bold text-gray-900 text-sm">
                            Paint Protection Film (PPF) Installation
                          </p>
                          <p className="text-xs text-gray-600 mt-1 font-medium">
                            Package: {selectedForPrint.ppf_package || selectedForPrint.ppfPackage}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Vehicle: {selectedForPrint.vehicle_model || selectedForPrint.vehicleModel}
                          </p>
                        </td>
                        <td className="py-4 px-4 text-xs text-gray-600 align-top">
                          <ul className="list-disc list-inside space-y-1">
                            <li>Decontamination & Clay Bar Wash</li>
                            <li>Precision Edge-Wrapped PPF Film</li>
                            <li>Self-Healing Top Coat Inspection</li>
                          </ul>
                        </td>
                        <td className="py-4 px-4 text-right align-top font-mono font-bold text-base text-gray-900">
                          {formatIndianCurrency(
                            selectedForPrint.final_quotation_value !== undefined
                              ? selectedForPrint.final_quotation_value
                              : selectedForPrint.finalQuotationValue
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Final Total Box */}
                <div className="flex flex-col items-end mb-8">
                  <div className="w-full sm:w-80 bg-green-50/70 border-2 border-green-600 p-4 rounded-lg text-right">
                    <p className="text-xs font-bold uppercase text-green-900 tracking-wider">
                      FINAL QUOTATION VALUE
                    </p>
                    <p className="text-2xl font-black text-green-700 font-mono mt-1">
                      {formatIndianCurrency(
                        selectedForPrint.final_quotation_value !== undefined
                          ? selectedForPrint.final_quotation_value
                          : selectedForPrint.finalQuotationValue
                      )}
                    </p>
                    <p className="text-xs text-gray-600 mt-1 font-medium">
                      (All inclusive of applicable 18% GST)
                    </p>
                  </div>
                </div>

                {/* Terms and Conditions */}
                <div className="border-t border-gray-200 pt-4 text-xs text-gray-500 space-y-1">
                  <p className="font-bold text-gray-700 uppercase">Terms & Conditions:</p>
                  <p>1. This quotation is valid for 15 days from the date of issue.</p>
                  <p>2. Film warranty is covered as per respective manufacturer specifications against yellowing or peeling.</p>
                  <p>3. Vehicle handover and delivery schedule will be verified during vehicle check-in at Wheelspa Wakad studio.</p>
                </div>

                {/* Authorized Signatory */}
                <div className="mt-10 pt-4 flex justify-between items-end border-t border-gray-200">
                  <div className="text-xs text-gray-400">
                    Generated via Wheelspa Admin System
                  </div>
                  <div className="text-center">
                    <div className="h-10 border-b border-gray-400 w-48 mb-1"></div>
                    <p className="text-xs font-bold text-gray-800">Authorized Signatory</p>
                    <p className="text-xs text-gray-500">Wheelspa Private Limited</p>
                  </div>
                </div>

              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center">
              <Trash2 className="h-5 w-5 mr-2" />
              Delete Quotation
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-700 pt-3">
              Delete quotation {quotationToDelete?.quotation_number || quotationToDelete?.quotation_no || quotationToDelete?.id}? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setQuotationToDelete(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? 'Deleting...' : 'Delete Quotation'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </AdminLayout>
  );
};

export default AdminQuotations;
