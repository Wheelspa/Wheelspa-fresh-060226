import React, { useState, useEffect } from 'react';
import { 
  FileText, Save, RefreshCw, Search, 
  Car, User, Phone, Calendar, ShieldCheck, IndianRupee,
  Share2, Copy, ExternalLink, MessageSquare, ToggleLeft, 
  ToggleRight, RotateCcw, Check, CheckCircle, XCircle, 
  AlertCircle, Edit, Tag, Plus, Trash2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
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

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// Indian currency formatter
export const formatIndianCurrency = (amount) => {
  const num = Number(amount);
  if (isNaN(num)) return 'Rs 0.00';
  return 'Rs ' + num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const STANDARD_SERVICES = [
  { key: 'paint_protection_film', label: 'Paint Protection Film (PPF)' },
  { key: 'window_filming', label: 'Window Filming' },
  { key: 'ceramic_coating', label: 'Ceramic Coating' },
  { key: 'graphene_coating', label: 'Graphene Coating' },
  { key: 'interior_ppf', label: 'Interior PPF' },
  { key: 'sunroof_ppf', label: 'Sunroof PPF' },
];

const AdminCustomerQuotations = () => {
  const { admin } = useAdminAuth();

  // Form Basic Info State
  const [formData, setFormData] = useState({
    quotationNo: '',
    quotationDate: new Date().toISOString().split('T')[0],
    customerName: '',
    mobile: '',
    vehicleModel: '',
    discount: '',
  });

  // Services Dropdown Rows State: array of { id, key, amount, detail }
  const [selectedServices, setSelectedServices] = useState([
    { id: 1, key: 'paint_protection_film', amount: '', detail: '' }
  ]);

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null); // id when editing a pending quotation

  // List & Search State
  const [quotations, setQuotations] = useState([]);
  const [loadingQuotations, setLoadingQuotations] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Share Modal & Action State
  const [selectedForShare, setSelectedForShare] = useState(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [regenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false);
  const [quotationToRegenerate, setQuotationToRegenerate] = useState(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Phone normalization for WhatsApp (wa.me/91XXXXXXXXXX)
  const normalizePhoneForWhatsApp = (phone) => {
    const digits = (phone || '').replace(/\D/g, '');
    if (digits.length === 10) return `91${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return digits;
    if (digits.length > 10) return digits;
    return `91${digits}`;
  };

  // Fetch next preview quotation number
  const fetchNextQuotationNumber = async () => {
    if (!admin?.token) return;
    try {
      const res = await fetch(`${API_URL}/api/customer-quotations/next-number`, {
        headers: { 'Authorization': `Bearer ${admin.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFormData(prev => ({
          ...prev,
          quotationNo: data.next_quotation_number || 'WSCQ-001'
        }));
      }
    } catch (err) {
      console.error('Failed to load next customer quotation number', err);
    }
  };

  // Fetch saved quotations
  const fetchQuotations = async () => {
    if (!admin?.token) return;
    setLoadingQuotations(true);
    try {
      const res = await fetch(`${API_URL}/api/customer-quotations`, {
        headers: { 'Authorization': `Bearer ${admin.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setQuotations(data);
      } else {
        toast.error('Failed to load customer quotations');
      }
    } catch (err) {
      console.error('Error fetching customer quotations', err);
      toast.error('Error connecting to quotation service');
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

  // Live Calculations
  const servicesSum = selectedServices.reduce((sum, s) => {
    if (s.key) {
      return sum + (parseFloat(s.amount) || 0);
    }
    return sum;
  }, 0);
  const selectedServicesCount = selectedServices.filter(s => s.key && (parseFloat(s.amount) || 0) > 0).length;
  const discountNum = parseFloat(formData.discount) || 0;
  const rawSubtotal = servicesSum - discountNum;
  const liveSubtotal = Math.round(Math.max(0, rawSubtotal) * 100) / 100;
  const liveGst = Math.round(liveSubtotal * 0.18 * 100) / 100;
  const liveFinalPrice = Math.round((liveSubtotal + liveGst) * 100) / 100;

  // Handle Basic Inputs
  const handleInputChange = (field, value) => {
    if (field === 'mobile') {
      value = value.replace(/\D/g, '').slice(0, 10);
    }
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Handle Dynamic Services Dropdown Rows
  const handleAddServiceRow = () => {
    if (selectedServices.length >= STANDARD_SERVICES.length) {
      toast.info('All available services have already been added');
      return;
    }
    const usedKeys = selectedServices.map(s => s.key).filter(Boolean);
    const nextAvailable = STANDARD_SERVICES.find(s => !usedKeys.includes(s.key));
    setSelectedServices(prev => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        key: nextAvailable ? nextAvailable.key : '',
        amount: '',
        detail: ''
      }
    ]);
  };

  const handleServiceKeyChange = (rowId, newKey) => {
    setSelectedServices(prev => prev.map(row => {
      if (row.id === rowId) {
        return {
          ...row,
          key: newKey,
          detail: newKey === 'paint_protection_film' ? row.detail : ''
        };
      }
      return row;
    }));
    if (errors.services) {
      setErrors(prev => {
        const next = { ...prev };
        delete next.services;
        return next;
      });
    }
  };

  const handleServiceAmountChange = (rowId, amount) => {
    setSelectedServices(prev => prev.map(row => {
      if (row.id === rowId) {
        return { ...row, amount };
      }
      return row;
    }));
    if (errors.services) {
      setErrors(prev => {
        const next = { ...prev };
        delete next.services;
        return next;
      });
    }
  };

  const handleServiceDetailChange = (rowId, detail) => {
    setSelectedServices(prev => prev.map(row => {
      if (row.id === rowId) {
        return { ...row, detail: detail.slice(0, 100) };
      }
      return row;
    }));
  };

  const handleRemoveServiceRow = (rowId) => {
    setSelectedServices(prev => {
      const next = prev.filter(r => r.id !== rowId);
      if (next.length === 0) {
        return [{ id: Date.now(), key: '', amount: '', detail: '' }];
      }
      return next;
    });
  };

  // Validate Form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.customerName.trim()) {
      newErrors.customerName = 'Customer Name is required';
    }

    const cleanPhone = formData.mobile.replace(/\D/g, '');
    if (!cleanPhone) {
      newErrors.mobile = 'Mobile Number is required';
    } else if (cleanPhone.length !== 10) {
      newErrors.mobile = 'Enter a valid 10-digit mobile number';
    }

    if (!formData.vehicleModel.trim()) {
      newErrors.vehicleModel = 'Vehicle / Model is required';
    }

    const hasValidService = selectedServices.some(s => s.key && parseFloat(s.amount) > 0);
    if (!hasValidService) {
      newErrors.services = 'Please select at least one service from the dropdown with an amount greater than ₹0';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      if (newErrors.services) {
        toast.error(newErrors.services);
      } else {
        toast.error('Please fix the highlighted fields');
      }
      return false;
    }
    return true;
  };

  // Reset Form
  const resetForm = async () => {
    setEditingId(null);
    setFormData({
      quotationNo: '',
      quotationDate: new Date().toISOString().split('T')[0],
      customerName: '',
      mobile: '',
      vehicleModel: '',
      discount: '',
    });
    setSelectedServices([
      { id: Date.now(), key: 'paint_protection_film', amount: '', detail: '' }
    ]);
    setErrors({});
    await fetchNextQuotationNumber();
  };

  // Populate form for editing a pending quotation
  const handleEditClick = (q) => {
    if (q.status !== 'pending') {
      toast.error('Only pending quotations can be edited');
      return;
    }

    setEditingId(q.id || q.quotation_no);

    const rows = [];

    // Backward compatibility: old quotation with ppf_price > 0
    if (Number(q.ppf_price) > 0) {
      rows.push({
        id: Date.now() + Math.random(),
        key: 'paint_protection_film',
        amount: String(q.ppf_price),
        detail: q.ppf_package || ''
      });
    }

    if (q.services) {
      q.services.forEach(s => {
        if (s.selected && Number(s.amount) > 0) {
          if (s.key === 'paint_protection_film' && Number(q.ppf_price) > 0) {
            return;
          }
          rows.push({
            id: Date.now() + Math.random(),
            key: s.key,
            amount: String(s.amount),
            detail: s.detail || ''
          });
        }
      });
    }

    if (rows.length === 0) {
      rows.push({ id: Date.now(), key: 'paint_protection_film', amount: '', detail: '' });
    }

    setSelectedServices(rows);

    setFormData({
      quotationNo: q.quotation_no,
      quotationDate: q.quotation_date || new Date().toISOString().split('T')[0],
      customerName: q.customer_name || '',
      mobile: q.mobile || '',
      vehicleModel: q.vehicle_model || '',
      discount: q.discount ? String(q.discount) : '',
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.info(`Editing pending quotation ${q.quotation_no}`);
  };

  // Save or Update Quotation
  const handleSaveQuotation = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Map all 6 STANDARD_SERVICES for the backend
      const servicesPayload = STANDARD_SERVICES.map(std => {
        const match = selectedServices.find(s => s.key === std.key);
        const isSelected = Boolean(match && parseFloat(match.amount) > 0);
        return {
          key: std.key,
          label: std.label,
          selected: isSelected,
          amount: match ? (parseFloat(match.amount) || 0.0) : 0.0,
          detail: (match && match.detail && match.detail.trim()) || null
        };
      });

      const payload = {
        quotation_date: formData.quotationDate,
        customer_name: formData.customerName.trim(),
        mobile: formData.mobile.replace(/\D/g, ''),
        vehicle_model: formData.vehicleModel.trim(),
        services: servicesPayload,
        discount: parseFloat(formData.discount) || 0.0,
      };

      let res;
      if (editingId) {
        res = await fetch(`${API_URL}/api/customer-quotations/${editingId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${admin.token}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`${API_URL}/api/customer-quotations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${admin.token}`
          },
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to save customer quotation');
      }

      const savedDoc = await res.json();
      toast.success(
        editingId 
          ? `Quotation ${savedDoc.quotation_no} updated successfully!` 
          : `Quotation ${savedDoc.quotation_no} saved successfully!`
      );

      // Reset form and reload list
      await resetForm();
      fetchQuotations();

      // Open share link modal immediately after save
      setSelectedForShare(savedDoc);
      setShareModalOpen(true);

    } catch (err) {
      toast.error(err.message || 'Error saving customer quotation');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ensure share token exists
  const ensureShareToken = async (qId) => {
    try {
      const res = await fetch(`${API_URL}/api/customer-quotations/${qId}/share-link`, {
        headers: { 'Authorization': `Bearer ${admin.token}` }
      });
      if (!res.ok) throw new Error('Failed to retrieve share token');
      const data = await res.json();
      setQuotations(prev => prev.map(item => {
        if (item.id === qId || item.quotation_no === qId) {
          return { ...item, share_token: data.share_token, link_disabled: data.link_disabled };
        }
        return item;
      }));
      return data.share_token;
    } catch (err) {
      console.error('Error fetching share token:', err);
      toast.error('Could not generate share token');
      return null;
    }
  };

  // Open Share Dialog
  const openShareModal = async (quotation) => {
    let token = quotation.share_token;
    const qId = quotation.id || quotation.quotation_no;
    if (!token) {
      token = await ensureShareToken(qId);
      setSelectedForShare({ ...quotation, share_token: token });
    } else {
      setSelectedForShare(quotation);
    }
    setShareModalOpen(true);
  };

  // Copy shareable link
  const handleCopyLink = async (quotation) => {
    let token = quotation.share_token;
    const qId = quotation.id || quotation.quotation_no;
    if (!token) {
      token = await ensureShareToken(qId);
    }
    if (!token) {
      toast.error('Unable to retrieve share link');
      return;
    }
    const baseUrl = (process.env.REACT_APP_PUBLIC_SITE_URL || window.location.origin).replace(/\/+$/, '');
    const shareUrl = `${baseUrl}/q2/${token}`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      toast.success('Share link copied to clipboard!');
    } catch (err) {
      toast.error('Failed to copy link to clipboard');
    }
  };

  // Send via WhatsApp
  const handleShareWhatsApp = async (quotation) => {
    let token = quotation.share_token;
    const qId = quotation.id || quotation.quotation_no;
    if (!token) {
      token = await ensureShareToken(qId);
    }
    if (!token) {
      toast.error('Unable to retrieve share link');
      return;
    }
    const baseUrl = (process.env.REACT_APP_PUBLIC_SITE_URL || window.location.origin).replace(/\/+$/, '');
    const fullLink = `${baseUrl}/q2/${token}`;
    const phone = quotation.mobile || '';
    const customerName = quotation.customer_name || 'Customer';
    const qNum = quotation.quotation_no || '';
    const vehicleModel = (quotation.vehicle_model || '').trim();
    const price = formatIndianCurrency(quotation.final_price);
    const brandPhone = (BRAND_INFO.phones && BRAND_INFO.phones[0]) || '70226-70226';

    const lines = [
      `Dear ${customerName},`,
      '',
      'Thank you for choosing *Wheelspa*.',
      '',
      'Your quotation is ready:',
      `Quotation No: ${qNum}`,
    ];

    if (vehicleModel) {
      lines.push(`Vehicle: ${vehicleModel}`);
    }

    lines.push(
      `Total Amount: *${price}* (incl. 18% GST)`,
      '',
      'View, approve or reject your quotation here:',
      '',
      fullLink,
      '',
      'Regards,',
      'Team Wheelspa',
      `Wakad, Pune | ${brandPhone}`
    );

    const message = lines.join('\n');
    const waUrl = `https://wa.me/${normalizePhoneForWhatsApp(phone)}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  // Open link in new tab
  const handleOpenLink = async (quotation) => {
    let token = quotation.share_token;
    const qId = quotation.id || quotation.quotation_no;
    if (!token) {
      token = await ensureShareToken(qId);
    }
    if (!token) {
      toast.error('Unable to retrieve share link');
      return;
    }
    const baseUrl = (process.env.REACT_APP_PUBLIC_SITE_URL || window.location.origin).replace(/\/+$/, '');
    const shareUrl = `${baseUrl}/q2/${token}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  // Toggle link disabled/enabled status
  const handleToggleLinkStatus = async (quotation) => {
    const qId = quotation.id || quotation.quotation_no;
    try {
      const res = await fetch(`${API_URL}/api/customer-quotations/${qId}/share-link/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${admin.token}`
        },
        body: JSON.stringify({ disabled: !quotation.link_disabled })
      });
      if (!res.ok) throw new Error('Failed to toggle share link');
      const data = await res.json();
      setQuotations(prev => prev.map(item => {
        if (item.id === qId || item.quotation_no === qId) {
          return { ...item, link_disabled: data.link_disabled, share_token: data.share_token };
        }
        return item;
      }));
      if (selectedForShare && (selectedForShare.id === qId || selectedForShare.quotation_no === qId)) {
        setSelectedForShare(prev => ({ ...prev, link_disabled: data.link_disabled, share_token: data.share_token }));
      }
      toast.success(data.link_disabled ? 'Share link disabled' : 'Share link enabled');
    } catch (err) {
      toast.error(err.message || 'Error updating link status');
    }
  };

  // Confirm and regenerate share link
  const handleConfirmRegenerate = async () => {
    if (!quotationToRegenerate) return;
    setIsRegenerating(true);
    const qId = quotationToRegenerate.id || quotationToRegenerate.quotation_no;
    try {
      const res = await fetch(`${API_URL}/api/customer-quotations/${qId}/share-link/regenerate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${admin.token}` }
      });
      if (!res.ok) throw new Error('Failed to regenerate share link');
      const data = await res.json();
      setQuotations(prev => prev.map(item => {
        if (item.id === qId || item.quotation_no === qId) {
          return { ...item, share_token: data.share_token, link_disabled: data.link_disabled };
        }
        return item;
      }));
      if (selectedForShare && (selectedForShare.id === qId || selectedForShare.quotation_no === qId)) {
        setSelectedForShare(prev => ({ ...prev, share_token: data.share_token, link_disabled: data.link_disabled }));
      }
      toast.success('Share link regenerated! Old link has been invalidated.');
      setRegenerateConfirmOpen(false);
      setQuotationToRegenerate(null);
    } catch (err) {
      toast.error(err.message || 'Failed to regenerate link');
    } finally {
      setIsRegenerating(false);
    }
  };

  // Filter saved quotations
  const filteredQuotations = quotations.filter(q => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    const num = (q.quotation_no || '').toLowerCase();
    const name = (q.customer_name || '').toLowerCase();
    const phone = (q.mobile || '').toLowerCase();
    const vehicle = (q.vehicle_model || '').toLowerCase();
    const pkg = (q.ppf_package || '').toLowerCase();
    const status = (q.status || '').toLowerCase();
    return num.includes(query) || name.includes(query) || phone.includes(query) || vehicle.includes(query) || pkg.includes(query) || status.includes(query);
  });

  return (
    <AdminLayout title="Customer Quotation">
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div>
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-blue-100 rounded-lg text-blue-700">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {editingId ? `Edit Customer Quotation (${formData.quotationNo})` : 'Customer Quotation Generator'}
                </h1>
                <p className="text-sm text-gray-500">
                  Interactive package & detailing estimate with customer self-approval link
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
              {editingId ? 'Cancel Edit / New Form' : 'New Blank Form'}
            </Button>
            <Button
              type="button"
              onClick={handleSaveQuotation}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700 text-white font-medium shadow-sm"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Saving...' : editingId ? 'Update Quotation' : 'Save Quotation'}
            </Button>
          </div>
        </div>

        {/* Quotation Form */}
        <form onSubmit={handleSaveQuotation}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Left Column (7 cols): Customer, Vehicle & Services Dropdown Section */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Customer & Vehicle Information */}
              <Card className="border-gray-200 shadow-sm">
                <CardHeader className="bg-gray-50/70 border-b border-gray-200/80 pb-4">
                  <div className="flex items-center space-x-2">
                    <User className="h-5 w-5 text-green-600" />
                    <CardTitle className="text-base font-semibold text-gray-900">
                      Customer & Vehicle Information
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs text-gray-500">
                    Basic customer details and official quotation numbering
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Quotation Number */}
                    <div>
                      <Label className="text-xs font-semibold text-gray-700">Quotation No</Label>
                      <Input
                        readOnly
                        value={formData.quotationNo}
                        className="bg-gray-100 font-mono font-bold text-green-700 mt-1"
                      />
                    </div>

                    {/* Quotation Date */}
                    <div>
                      <Label className="text-xs font-semibold text-gray-700">Quotation Date</Label>
                      <Input
                        type="date"
                        value={formData.quotationDate}
                        onChange={(e) => handleInputChange('quotationDate', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* Customer Name */}
                  <div>
                    <Label className="text-xs font-semibold text-gray-700">
                      Customer Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      placeholder="e.g. Rahul Sharma"
                      value={formData.customerName}
                      onChange={(e) => handleInputChange('customerName', e.target.value)}
                      className={`mt-1 ${errors.customerName ? 'border-red-500' : ''}`}
                    />
                    {errors.customerName && (
                      <p className="text-xs text-red-500 mt-1">{errors.customerName}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Mobile Number */}
                    <div>
                      <Label className="text-xs font-semibold text-gray-700">
                        Mobile Number <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative mt-1">
                        <span className="absolute left-3 top-2.5 text-xs font-semibold text-gray-400 font-mono">
                          +91
                        </span>
                        <Input
                          placeholder="9876543210"
                          maxLength={10}
                          value={formData.mobile}
                          onChange={(e) => handleInputChange('mobile', e.target.value)}
                          className={`pl-11 font-mono ${errors.mobile ? 'border-red-500' : ''}`}
                        />
                      </div>
                      {errors.mobile && (
                        <p className="text-xs text-red-500 mt-1">{errors.mobile}</p>
                      )}
                    </div>

                    {/* Vehicle / Model */}
                    <div>
                      <Label className="text-xs font-semibold text-gray-700">
                        Vehicle / Model <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        placeholder="e.g. BMW 3 Series / Creta"
                        value={formData.vehicleModel}
                        onChange={(e) => handleInputChange('vehicleModel', e.target.value)}
                        className={`mt-1 ${errors.vehicleModel ? 'border-red-500' : ''}`}
                      />
                      {errors.vehicleModel && (
                        <p className="text-xs text-red-500 mt-1">{errors.vehicleModel}</p>
                      )}
                    </div>
                  </div>

                </CardContent>
              </Card>

              {/* Services & Scope Dropdown Section */}
              <Card className="border-gray-200 shadow-sm">
                <CardHeader className="bg-gray-50/70 border-b border-gray-200/80 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <ShieldCheck className="h-5 w-5 text-blue-600" />
                      <CardTitle className="text-base font-semibold text-gray-900">
                        Services & Scope
                      </CardTitle>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddServiceRow}
                      disabled={selectedServices.length >= STANDARD_SERVICES.length}
                      className="text-xs bg-white text-green-700 hover:bg-green-50 border-green-300 font-semibold"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1 text-green-600" />
                      Add Service
                    </Button>
                  </div>
                  <CardDescription className="text-xs text-gray-500">
                    Select services from the dropdown list and enter respective pricing
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-6 space-y-4">
                  {errors.services && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{errors.services}</span>
                    </div>
                  )}

                  {/* List of Service Rows with Dropdown */}
                  {selectedServices.map((row, index) => {
                    const isPPF = row.key === 'paint_protection_film';
                    const usedKeys = selectedServices
                      .filter((_, i) => i !== index)
                      .map(r => r.key)
                      .filter(Boolean);

                    return (
                      <div 
                        key={row.id} 
                        className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/30 space-y-3 transition-colors"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                          
                          {/* Service Dropdown (col 7) */}
                          <div className="sm:col-span-7">
                            <Label className="text-xs font-semibold text-gray-600 mb-1 block">
                              Service #{index + 1}
                            </Label>
                            <Select
                              value={row.key}
                              onValueChange={(val) => handleServiceKeyChange(row.id, val)}
                            >
                              <SelectTrigger className="w-full bg-white border-gray-300 text-sm h-10">
                                <SelectValue placeholder="Select a service from dropdown..." />
                              </SelectTrigger>
                              <SelectContent>
                                {STANDARD_SERVICES.map((s) => {
                                  const alreadyUsed = usedKeys.includes(s.key);
                                  return (
                                    <SelectItem 
                                      key={s.key} 
                                      value={s.key}
                                      disabled={alreadyUsed}
                                    >
                                      {s.label} {alreadyUsed ? '(Already selected)' : ''}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Amount Input (col 4) */}
                          <div className="sm:col-span-4">
                            <Label className="text-xs font-semibold text-gray-600 mb-1 block">
                              Amount (₹)
                            </Label>
                            <Input
                              type="number"
                              placeholder="Amount ₹"
                              min="0"
                              value={row.amount}
                              onChange={(e) => handleServiceAmountChange(row.id, e.target.value)}
                              className="text-right font-mono text-sm bg-white border-gray-300 h-10"
                            />
                          </div>

                          {/* Delete Row Button (col 1) */}
                          <div className="sm:col-span-1 flex items-end justify-center pt-1 sm:pt-5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveServiceRow(row.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 h-10 w-10 shrink-0"
                              title="Remove service"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                        </div>

                        {/* Film / Package Name text input for Paint Protection Film (PPF) */}
                        {isPPF && (
                          <div className="pt-2 border-t border-blue-200/80 flex flex-col sm:flex-row sm:items-center sm:space-x-3">
                            <Label 
                              htmlFor={`film-detail-${row.id}`} 
                              className="text-xs text-gray-700 font-medium whitespace-nowrap mb-1 sm:mb-0"
                            >
                              Film / Package Name (optional):
                            </Label>
                            <Input
                              id={`film-detail-${row.id}`}
                              placeholder="e.g. Garware Plus TPU / Llumar Platinum / Avery Dennison"
                              maxLength={100}
                              value={row.detail || ''}
                              onChange={(e) => handleServiceDetailChange(row.id, e.target.value)}
                              className="h-8 text-xs bg-white text-gray-800 border-gray-300 flex-1"
                            />
                          </div>
                        )}

                      </div>
                    );
                  })}

                  {/* Add Another Service Button Row */}
                  <div className="flex justify-between items-center pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddServiceRow}
                      disabled={selectedServices.length >= STANDARD_SERVICES.length}
                      className="text-xs text-blue-700 hover:bg-blue-50 border-blue-200"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      + Add Another Service
                    </Button>
                    <span className="text-xs text-gray-400">
                      {selectedServices.filter(s => s.key).length} of {STANDARD_SERVICES.length} services added
                    </span>
                  </div>

                  {/* Discount Input Row */}
                  <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-green-700">
                      <Tag className="w-4 h-4" />
                      <Label className="text-sm font-semibold">Special Discount (₹)</Label>
                    </div>
                    <div className="w-36">
                      <Input
                        type="number"
                        placeholder="0"
                        min="0"
                        value={formData.discount}
                        onChange={(e) => handleInputChange('discount', e.target.value)}
                        className="text-right font-mono text-sm text-green-700 border-green-300"
                      />
                    </div>
                  </div>

                </CardContent>
              </Card>
            </div>

            {/* Right Column (5 cols): Live Calculations & Pricing Box */}
            <div className="lg:col-span-5 space-y-6">
              <Card className="border-gray-200 shadow-sm sticky top-6">
                <CardHeader className="bg-gray-50/70 border-b border-gray-200/80 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <IndianRupee className="h-5 w-5 text-green-600" />
                      <CardTitle className="text-base font-semibold text-gray-900">
                        Live Quotation Summary
                      </CardTitle>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs">
                      GST 18% Fixed
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-6 space-y-4">
                  
                  {/* Selected Services Sum */}
                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <span>Selected Services ({selectedServicesCount})</span>
                    <span className="font-mono font-medium text-gray-900">
                      {formatIndianCurrency(servicesSum)}
                    </span>
                  </div>

                  {/* Discount */}
                  {discountNum > 0 && (
                    <div className="flex justify-between items-center text-sm text-green-700">
                      <span>Discount</span>
                      <span className="font-mono font-medium">
                        - {formatIndianCurrency(discountNum)}
                      </span>
                    </div>
                  )}

                  <div className="border-t border-gray-200 pt-3 flex justify-between items-center text-sm font-semibold text-gray-800">
                    <span>Subtotal</span>
                    <span className="font-mono">
                      {formatIndianCurrency(liveSubtotal)}
                    </span>
                  </div>

                  {/* GST 18% */}
                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <span>GST (18%)</span>
                    <span className="font-mono font-medium text-gray-900">
                      {formatIndianCurrency(liveGst)}
                    </span>
                  </div>

                  {/* Final Price Card */}
                  <div className="mt-4 p-5 rounded-xl bg-gradient-to-br from-green-50 to-emerald-100/60 border-2 border-green-500 shadow-xs">
                    <p className="text-xs font-black uppercase tracking-wider text-green-900">
                      FINAL CUSTOMER PRICE
                    </p>
                    <p className="text-3xl font-black text-green-700 font-mono mt-1">
                      {formatIndianCurrency(liveFinalPrice)}
                    </p>
                    <p className="text-[11px] text-green-800 mt-1">
                      Includes 18% GST and all chosen service scope
                    </p>
                  </div>

                  {/* Submit / Reset Actions */}
                  <div className="pt-4 space-y-2.5">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 shadow-sm"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSubmitting ? 'Saving...' : editingId ? 'Update Quotation' : 'Save & Generate Share Link'}
                    </Button>

                    {editingId && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={resetForm}
                        className="w-full border-gray-300 text-gray-700"
                      >
                        Cancel Editing
                      </Button>
                    )}
                  </div>

                </CardContent>
              </Card>
            </div>

          </div>
        </form>

        {/* Saved Customer Quotations Table */}
        <Card className="border-gray-200 shadow-sm mt-8">
          <CardHeader className="bg-gray-50/70 border-b border-gray-200/80 pb-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-base font-semibold text-gray-900">
                  Saved Customer Quotations ({filteredQuotations.length})
                </CardTitle>
                <CardDescription className="text-xs text-gray-500">
                  Track customer acceptance decisions and manage customer shareable links
                </CardDescription>
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search quotation, name, model..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-white border-gray-300 text-sm"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchQuotations}
                  disabled={loadingQuotations}
                  title="Refresh list"
                  className="shrink-0"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingQuotations ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loadingQuotations ? (
              <div className="py-12 text-center text-gray-500">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-green-600" />
                <p className="text-sm">Loading customer quotations...</p>
              </div>
            ) : filteredQuotations.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                <FileText className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                <p className="text-sm font-medium text-gray-600">No customer quotations found</p>
                <p className="text-xs text-gray-400 mt-0.5">Use the form above to generate your first customer quotation.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      <th className="py-3 px-4">Quotation No</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Vehicle</th>
                      <th className="py-3 px-4 text-right">Final Price</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-sm text-gray-800">
                    {filteredQuotations.map((q) => {
                      const isPending = q.status === 'pending';
                      const isApproved = q.status === 'approved';
                      const isRejected = q.status === 'rejected';

                      return (
                        <tr key={q.id || q.quotation_no} className="hover:bg-gray-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-green-700 whitespace-nowrap">
                            {q.quotation_no}
                            <span className="block text-[11px] font-normal text-gray-500 font-sans">
                              {q.quotation_date}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-semibold text-gray-900">{q.customer_name}</p>
                            <p className="text-xs font-mono text-gray-500">+91 {q.mobile}</p>
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-medium text-gray-800">{q.vehicle_model}</p>
                            {/* If legacy quotation with ppf_price > 0 */}
                            {Number(q.ppf_price) > 0 ? (
                              <p className="text-xs text-green-700">
                                Paint Protection Film {q.ppf_package ? `(${q.ppf_package})` : ''}
                              </p>
                            ) : (
                              (() => {
                                const ppfSvc = q.services?.find(s => s.key === 'paint_protection_film' && s.selected);
                                if (ppfSvc && ppfSvc.detail) {
                                  return <p className="text-xs text-green-700">{ppfSvc.detail}</p>;
                                }
                                return null;
                              })()
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-gray-900 whitespace-nowrap">
                            {formatIndianCurrency(q.final_price)}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            {isApproved && (
                              <Badge className="bg-green-100 text-green-800 border-green-300">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Approved
                              </Badge>
                            )}
                            {isRejected && (
                              <div>
                                <Badge className="bg-red-100 text-red-800 border-red-300">
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Rejected
                                </Badge>
                                {q.customer_reject_reason && (
                                  <p className="text-[10px] text-red-600 max-w-xs truncate mt-0.5" title={q.customer_reject_reason}>
                                    "{q.customer_reject_reason}"
                                  </p>
                                )}
                              </div>
                            )}
                            {isPending && (
                              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center space-x-1.5">
                              {/* Edit Button: ONLY for pending ones! */}
                              {isPending && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditClick(q)}
                                  className="text-blue-700 hover:bg-blue-50 border-blue-200 px-2"
                                  title="Edit pending quotation"
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Edit
                                </Button>
                              )}

                              {/* Share Dialog Button */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openShareModal(q)}
                                className="text-gray-700 hover:text-green-700 hover:bg-green-50 border-gray-300 px-2.5"
                                title="Shareable Link Details"
                              >
                                <Share2 className="h-4 w-4 mr-1 text-green-600" />
                                Share
                              </Button>

                              {/* Quick Copy Link Button */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCopyLink(q)}
                                className="text-gray-600 hover:text-gray-900 border-gray-300 px-2"
                                title="Copy link to clipboard"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>

                              {/* Quick WhatsApp Button */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleShareWhatsApp(q)}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200 px-2"
                                title="Send on WhatsApp"
                              >
                                <MessageSquare className="h-4 w-4" />
                              </Button>

                              {/* Open Link Button */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenLink(q)}
                                className="text-gray-600 hover:text-gray-900 border-gray-300 px-2"
                                title="Open customer page"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
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

      {/* Share Link Modal */}
      <Dialog open={shareModalOpen} onOpenChange={setShareModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center text-gray-900">
              <Share2 className="h-5 w-5 text-green-600 mr-2" />
              Customer Share Link &mdash; {selectedForShare?.quotation_no}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Shareable link for customer approval with live status tracking.
            </DialogDescription>
          </DialogHeader>

          {selectedForShare && (
            <div className="space-y-4 pt-2">
              
              {/* Summary Box */}
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 text-xs flex justify-between items-center">
                <div>
                  <p className="font-bold text-gray-900 text-sm">
                    {selectedForShare.customer_name}
                  </p>
                  <p className="text-gray-500 mt-0.5">
                    {selectedForShare.vehicle_model}
                    {Number(selectedForShare.ppf_price) > 0
                      ? ` • Paint Protection Film ${selectedForShare.ppf_package ? `(${selectedForShare.ppf_package})` : ''}`
                      : (() => {
                          const ppfSvc = selectedForShare.services?.find(s => s.key === 'paint_protection_film' && s.selected);
                          return ppfSvc?.detail ? ` • ${ppfSvc.detail}` : '';
                        })()}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    selectedForShare.link_disabled 
                      ? 'bg-red-100 text-red-700' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {selectedForShare.link_disabled ? 'Link Disabled' : 'Link Active'}
                  </span>
                  <p className="text-gray-900 font-bold font-mono text-sm mt-1">
                    {formatIndianCurrency(selectedForShare.final_price)}
                  </p>
                </div>
              </div>

              {/* URL Box & Copy */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">Customer Shareable URL (/q2/...)</Label>
                <div className="flex space-x-2">
                  <Input
                    readOnly
                    value={`${(process.env.REACT_APP_PUBLIC_SITE_URL || window.location.origin).replace(/\/+$/, '')}/q2/${selectedForShare.share_token || 'loading...'}`}
                    className="font-mono text-xs bg-gray-50 text-gray-800"
                  />
                  <Button
                    type="button"
                    onClick={() => handleCopyLink(selectedForShare)}
                    className="bg-green-600 hover:bg-green-700 text-white shrink-0"
                  >
                    <Copy className="h-4 w-4 mr-1.5" />
                    Copy Link
                  </Button>
                </div>
              </div>

              {/* Actions: Send on WhatsApp & Open */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <Button
                  type="button"
                  onClick={() => handleShareWhatsApp(selectedForShare)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white w-full"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send on WhatsApp
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenLink(selectedForShare)}
                  className="border-gray-300 text-gray-800 hover:bg-gray-50 w-full"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Link
                </Button>
              </div>

              {/* Management Controls: Disable/Enable Toggle & Regenerate */}
              <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleToggleLinkStatus(selectedForShare)}
                  className={`text-xs ${
                    selectedForShare.link_disabled 
                      ? 'border-green-300 text-green-700 hover:bg-green-50' 
                      : 'border-amber-300 text-amber-700 hover:bg-amber-50'
                  }`}
                >
                  {selectedForShare.link_disabled ? (
                    <>
                      <ToggleRight className="h-4 w-4 mr-1.5 text-green-600" />
                      Enable Link
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="h-4 w-4 mr-1.5 text-amber-600" />
                      Disable Link
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setQuotationToRegenerate(selectedForShare);
                    setRegenerateConfirmOpen(true);
                  }}
                  className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                  Regenerate Link
                </Button>
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Regenerate Confirmation Dialog */}
      <Dialog open={regenerateConfirmOpen} onOpenChange={setRegenerateConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-amber-600 flex items-center">
              <RotateCcw className="h-5 w-5 mr-2" />
              Regenerate Share Link?
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-700 pt-3 leading-relaxed">
              Regenerating will immediately invalidate the current link. Anyone visiting the old link will get a "Quotation not found" error.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setRegenerateConfirmOpen(false);
                setQuotationToRegenerate(null);
              }}
              disabled={isRegenerating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmRegenerate}
              disabled={isRegenerating}
              className="bg-amber-600 hover:bg-amber-700 text-white font-medium"
            >
              {isRegenerating ? 'Regenerating...' : 'Yes, Regenerate Link'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </AdminLayout>
  );
};

export default AdminCustomerQuotations;
