import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Phone, Printer, MessageSquare, Calendar, Car, 
  ShieldCheck, AlertCircle, Clock, FileText, CheckCircle,
  MapPin, Mail, XCircle, Check, Sparkles, Send
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import { BRAND_INFO } from '../data/mock';
import { toast } from 'sonner';

// Terms and warranty clauses - editable constant array
export const CUSTOMER_QUOTATION_TERMS = [
  "This quotation is valid until the stated 'Valid Until' date.",
  "Paint Protection Film (PPF) warranty is covered directly under manufacturer terms against bubbling, peeling, or yellowing.",
  "Ceramic / Graphene coatings include full surface paint correction and decontamination prior to application.",
  "Window films meet state-approved visibility standards and include heat & UV rejection performance warranty.",
  "A curing period of 7 days is strictly advised post-installation. Avoid high-pressure washing during this period.",
  "Job scheduling and bay allocation will be confirmed upon receiving booking advance token."
];

// Currency formatter for Indian Rupees
export const formatIndianCurrency = (amount) => {
  const num = Number(amount);
  if (isNaN(num)) return 'Rs 0.00';
  return 'Rs ' + num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Date formatter
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
};

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const PublicCustomerQuotation = () => {
  const { token } = useParams();
  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState(null); // 404, 429, etc.

  // Decision Modal State
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [pendingDecision, setPendingDecision] = useState(null); // "approved" | "rejected"
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);

  // Prevent search engine indexing via robots meta tag
  useEffect(() => {
    let meta = document.querySelector('meta[name="robots"]');
    let created = false;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'robots';
      document.head.appendChild(meta);
      created = true;
    }
    const previous = meta.content;
    meta.content = 'noindex, nofollow';

    return () => {
      if (created && meta.parentNode) {
        meta.parentNode.removeChild(meta);
      } else if (meta) {
        meta.content = previous || '';
      }
    };
  }, []);

  // Fetch quotation details
  const fetchQuotation = async () => {
    setLoading(true);
    setErrorStatus(null);
    try {
      const res = await fetch(`${API_URL}/api/public/customer-quotations/${token}`);
      if (!res.ok) {
        setErrorStatus(res.status);
        setQuotation(null);
        return;
      }
      const data = await res.json();
      setQuotation(data);
      if (data.quotation_no) {
        document.title = `Quotation ${data.quotation_no} - ${BRAND_INFO.name}`;
      }
    } catch (err) {
      console.error('Failed to load quotation:', err);
      setErrorStatus(500);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchQuotation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Check if quotation has expired
  const isExpired = () => {
    if (!quotation?.valid_until) return false;
    try {
      const validUntilDate = new Date(quotation.valid_until);
      validUntilDate.setHours(23, 59, 59, 999);
      const now = new Date();
      return now > validUntilDate;
    } catch {
      return false;
    }
  };

  // Open Decision Confirmation Modal
  const handleOpenDecisionModal = (type) => {
    setPendingDecision(type);
    setRejectReason('');
    setDecisionModalOpen(true);
  };

  // Submit Decision (Approve / Reject)
  const handleSubmitDecision = async () => {
    if (!pendingDecision) return;
    setIsSubmittingDecision(true);
    try {
      const payload = {
        decision: pendingDecision,
        reason: pendingDecision === 'rejected' ? rejectReason.trim() : undefined
      };

      const res = await fetch(`${API_URL}/api/public/customer-quotations/${token}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to submit decision');
      }

      const updated = await res.json();
      toast.success(
        pendingDecision === 'approved' 
          ? 'Quotation approved successfully!' 
          : 'Quotation rejected.'
      );

      // Update local quotation state with decision
      setQuotation(prev => ({
        ...prev,
        status: updated.status,
        status_updated_at: updated.status_updated_at,
        customer_reject_reason: updated.customer_reject_reason
      }));

      setDecisionModalOpen(false);
    } catch (err) {
      toast.error(err.message || 'Error submitting response');
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  // Primary brand phone & WhatsApp details
  const brandPhone = (BRAND_INFO.phones && BRAND_INFO.phones[0]) || '70226-70226';
  const cleanPhone = brandPhone.replace(/\D/g, '');
  const brandWaNumber = (BRAND_INFO.whatsapp || cleanPhone || '7770073535').replace(/\D/g, '');
  const normalizedStudioWa = brandWaNumber.length === 10 ? `91${brandWaNumber}` : brandWaNumber;

  // WhatsApp prefilled message after decision
  const getWhatsAppTellMessage = () => {
    if (!quotation) return '';
    const qNum = quotation.quotation_no || '';
    const cName = quotation.customer_name || 'Customer';
    const vModel = (quotation.vehicle_model || '').trim();
    const price = formatIndianCurrency(quotation.final_price);

    if (quotation.status === 'approved') {
      const lines = [
        'Hello Wheelspa,',
        '',
        `I approve quotation ${qNum}.`,
        `Name: ${cName}`,
      ];
      if (vModel) {
        lines.push(`Vehicle: ${vModel}`);
      }
      lines.push(
        `Total: ${price}`,
        '',
        'Please confirm my appointment slot.',
        '',
        'Thank you.'
      );
      return lines.join('\n');
    }

    if (quotation.status === 'rejected') {
      const reason = quotation.customer_reject_reason ? quotation.customer_reject_reason.trim() : 'Not specified';
      const lines = [
        'Hello Wheelspa,',
        '',
        `I am unable to proceed with quotation ${qNum}.`,
        `Name: ${cName}`,
        `Reason: ${reason || 'Not specified'}`,
        '',
        'Thank you.'
      ];
      return lines.join('\n');
    }

    const lines = [
      'Hello Wheelspa,',
      '',
      `I have an inquiry regarding quotation ${qNum}.`,
      `Name: ${cName}`,
      '',
      'Thank you.'
    ];
    return lines.join('\n');
  };

  const tellWaUrl = `https://wa.me/${normalizedStudioWa}?text=${encodeURIComponent(getWhatsAppTellMessage())}`;

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-600 font-medium">Loading your quotation...</p>
      </div>
    );
  }

  // Not Found / Error Screen
  if (errorStatus || !quotation) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col justify-between">
        <header className="bg-white border-b border-gray-200 py-4 px-6 shadow-sm">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-3">
              <img 
                src={BRAND_INFO.logo} 
                alt={BRAND_INFO.name} 
                className="h-10 w-auto object-contain"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <span className="text-xl font-black tracking-tight text-gray-900 uppercase">
                {BRAND_INFO.name}
              </span>
            </Link>
          </div>
        </header>

        <main className="flex-1 max-w-lg mx-auto w-full flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-6 shadow-inner">
            <AlertCircle className="w-10 h-10" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
            Quotation Not Found
          </h1>
          <p className="text-gray-600 mb-8 text-sm sm:text-base leading-relaxed">
            {errorStatus === 429
              ? 'Too many requests were sent. Please wait a minute before refreshing.'
              : 'The quotation link you followed is invalid, has expired, or has been deactivated by our team.'}
          </p>

          <div className="w-full space-y-3">
            <a
              href={`tel:${cleanPhone}`}
              className="w-full inline-flex items-center justify-center px-5 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold transition shadow-sm"
            >
              <Phone className="w-5 h-5 mr-2" />
              Call Wheelspa Studio ({brandPhone})
            </a>
            <a
              href={`https://wa.me/${normalizedStudioWa}?text=${encodeURIComponent('Hi Wheelspa, I need assistance with my quotation.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center px-5 py-3 rounded-xl bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 font-semibold transition shadow-sm"
            >
              <MessageSquare className="w-5 h-5 mr-2 text-green-600" />
              Chat on WhatsApp
            </a>
            <Link
              to="/"
              className="w-full inline-flex items-center justify-center px-5 py-2.5 text-sm text-gray-500 hover:text-gray-900 transition"
            >
              Back to Wheelspa Home
            </Link>
          </div>
        </main>

        <footer className="py-6 text-center text-xs text-gray-400 border-t border-gray-200">
          © {new Date().getFullYear()} {BRAND_INFO.name}. All rights reserved.
        </footer>
      </div>
    );
  }

  const expired = isExpired();
  const isPending = quotation.status === 'pending';
  const isApproved = quotation.status === 'approved';
  const isRejected = quotation.status === 'rejected';

  return (
    <div className="min-h-screen bg-slate-100/70 text-gray-800 flex flex-col selection:bg-green-100 selection:text-green-900">
      
      {/* Print stylesheet */}
      <style>{`
        @media print {
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-full-width {
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          @page {
            margin: 1.2cm;
            size: A4 portrait;
          }
        }
      `}</style>

      {/* Top Navigation */}
      <nav className="no-print bg-white border-b border-gray-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2.5">
            <img 
              src={BRAND_INFO.logo} 
              alt={BRAND_INFO.name} 
              className="h-9 w-auto object-contain"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div>
              <span className="text-lg font-black tracking-tight text-gray-900 uppercase block leading-none">
                {BRAND_INFO.name}
              </span>
              <span className="text-[10px] text-green-700 font-semibold tracking-wider uppercase block mt-0.5">
                {BRAND_INFO.tagline}
              </span>
            </div>
          </Link>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
              title="Print quotation or save as PDF"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5 text-gray-600" />
              <span className="hidden sm:inline">Print / Save as PDF</span>
              <span className="sm:hidden">Print</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-6">

        {/* Status / Expiration Banners */}
        {expired && (
          <div className="no-print rounded-xl bg-amber-50 border-2 border-amber-300 p-4 text-amber-900 flex items-start space-x-3 shadow-xs">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-sm">This quotation has expired</p>
              <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                This estimate was valid until <strong>{formatDate(quotation.valid_until)}</strong>. Please contact Wheelspa for an updated quote.
              </p>
            </div>
            <a
              href={`tel:${cleanPhone}`}
              className="shrink-0 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg transition"
            >
              Contact Us
            </a>
          </div>
        )}

        {isApproved && (
          <div className="rounded-xl bg-green-50 border-2 border-green-500 p-4 text-green-950 flex items-start space-x-3 shadow-xs">
            <CheckCircle className="w-6 h-6 text-green-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-extrabold text-base text-green-900">
                You approved this quotation
              </p>
              <p className="text-xs text-green-800 mt-0.5">
                Approved on <strong>{formatDateTime(quotation.status_updated_at)}</strong>. Our studio manager will reach out shortly to lock in your preferred appointment slot.
              </p>
            </div>
          </div>
        )}

        {isRejected && (
          <div className="rounded-xl bg-red-50 border-2 border-red-400 p-4 text-red-950 flex items-start space-x-3 shadow-xs">
            <XCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-extrabold text-base text-red-900">
                You rejected this quotation
              </p>
              <p className="text-xs text-red-800 mt-0.5">
                Submitted on <strong>{formatDateTime(quotation.status_updated_at)}</strong>
                {quotation.customer_reject_reason && (
                  <span className="block mt-1 font-medium bg-red-100/70 p-2 rounded text-red-900">
                    Reason: {quotation.customer_reject_reason}
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Paper Sheet View */}
        <div className="print-full-width bg-white rounded-2xl border border-gray-200/90 shadow-sm overflow-hidden p-6 sm:p-8 md:p-10">
          
          {/* Header */}
          <div className="border-b-2 border-green-600 pb-6 mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <img
                    src={BRAND_INFO.logo}
                    alt={BRAND_INFO.name}
                    className="h-12 w-auto object-contain"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <div>
                    <h1 className="text-2xl font-black tracking-tight text-gray-900 uppercase">
                      {BRAND_INFO.name} Private Limited
                    </h1>
                    <p className="text-xs text-green-700 font-bold uppercase tracking-wider">
                      Automotive Detailing & PPF Studio
                    </p>
                  </div>
                </div>

                <div className="text-xs text-gray-600 space-y-0.5 pt-1">
                  <p className="flex items-center text-gray-600">
                    <MapPin className="w-3.5 h-3.5 mr-1.5 text-gray-400 shrink-0" />
                    {BRAND_INFO.address}
                  </p>
                  <p className="flex items-center text-gray-600">
                    <Phone className="w-3.5 h-3.5 mr-1.5 text-gray-400 shrink-0" />
                    <span>Phone: {BRAND_INFO.phones?.join(' / ')}</span>
                    <span className="mx-2 text-gray-300">|</span>
                    <Mail className="w-3.5 h-3.5 mr-1 text-gray-400 shrink-0" />
                    <span>Email: {BRAND_INFO.email}</span>
                  </p>
                </div>
              </div>

              {/* Identity & Status Badge */}
              <div className="sm:text-right bg-gray-50 border border-gray-200 p-3.5 rounded-xl min-w-[220px] self-stretch sm:self-auto">
                <div className="flex items-center justify-between sm:justify-end gap-2 mb-1">
                  <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-extrabold bg-green-600 text-white tracking-wider uppercase">
                    Customer Quotation
                  </span>
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    isApproved ? 'bg-green-100 text-green-800' :
                    isRejected ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {quotation.status}
                  </span>
                </div>
                <p className="text-lg font-black text-gray-900 font-mono">
                  {quotation.quotation_no}
                </p>
                <div className="text-xs text-gray-600 mt-1.5 space-y-0.5">
                  <p>Date: <span className="font-semibold text-gray-800">{formatDate(quotation.date || quotation.quotation_date)}</span></p>
                  <p className={expired ? "text-amber-700 font-bold" : "text-green-800 font-semibold"}>
                    Valid until: <span>{formatDate(quotation.valid_until)}</span>
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Customer & Vehicle Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 bg-gray-50/80 p-4 sm:p-5 rounded-xl border border-gray-200">
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Customer Name</p>
              <p className="text-base font-bold text-gray-900 mt-0.5">
                {quotation.customer_name}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Mobile Number</p>
              <p className="text-base font-semibold text-gray-900 mt-0.5 font-mono">
                +91 {quotation.mobile}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Vehicle / Model</p>
              <p className="text-base font-bold text-gray-900 mt-0.5 flex items-center">
                <Car className="w-4 h-4 mr-1.5 text-gray-500" />
                {quotation.vehicle_model}
              </p>
            </div>
          </div>

          {/* Itemized Services Table */}
          <div className="mb-6 overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-700 text-xs font-bold uppercase tracking-wider border-b border-gray-200">
                  <th className="py-3 px-4">Selected Scope & Services</th>
                  <th className="py-3 px-4 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm">
                
                {/* Selected Services */}
                {quotation.services && quotation.services.length > 0 ? (
                  quotation.services.map((svc, idx) => (
                    <tr key={idx}>
                      <td className="py-3.5 px-4 align-top">
                        <p className="font-bold text-gray-900 flex items-center">
                          <Check className="w-4 h-4 mr-1.5 text-green-600 shrink-0" />
                          <span>{svc.label}</span>
                        </p>
                        {svc.detail && (
                          <p className="text-xs text-gray-500 mt-0.5 pl-5.5">
                            {svc.detail}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right align-top font-mono font-semibold text-gray-900">
                        {formatIndianCurrency(svc.amount)}
                      </td>
                    </tr>
                  ))
                ) : null}

                {/* Discount Row if any */}
                {Number(quotation.discount) > 0 && (
                  <tr className="bg-green-50/50">
                    <td className="py-3 px-4 text-green-800 font-semibold text-xs uppercase tracking-wider">
                      Promotional Discount Applied
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-green-700">
                      - {formatIndianCurrency(quotation.discount)}
                    </td>
                  </tr>
                )}

              </tbody>
            </table>
          </div>

          {/* Pricing Box */}
          <div className="flex flex-col items-end mb-8">
            <div className="w-full sm:w-88 bg-gray-50/90 border border-gray-200 rounded-xl p-5 space-y-2.5">
              
              <div className="flex justify-between items-center text-sm text-gray-600">
                <span>Subtotal</span>
                <span className="font-mono font-semibold text-gray-800">
                  {formatIndianCurrency(quotation.subtotal)}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm text-gray-600">
                <span>GST (18%)</span>
                <span className="font-mono font-semibold text-gray-800">
                  {formatIndianCurrency(quotation.gst_amount)}
                </span>
              </div>

              <div className="pt-3 border-t-2 border-green-600 flex justify-between items-baseline">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-green-900">
                    FINAL PRICE
                  </p>
                  <p className="text-[10px] text-gray-500">
                    (All-inclusive of 18% GST)
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl sm:text-3xl font-black text-green-700 font-mono tracking-tight">
                    {formatIndianCurrency(quotation.final_price)}
                  </span>
                </div>
              </div>

            </div>

            {quotation.last_updated && (
              <p className="text-[11px] text-gray-400 mt-2 font-medium">
                Last updated: {formatDate(quotation.last_updated)}
              </p>
            )}
          </div>

          {/* Terms & Conditions */}
          <div className="border-t border-gray-200 pt-5 text-xs text-gray-500 space-y-1.5">
            <p className="font-bold text-gray-700 uppercase tracking-wider text-[11px]">
              Terms & Conditions:
            </p>
            <ol className="list-decimal list-inside space-y-1 pl-1 leading-relaxed">
              {CUSTOMER_QUOTATION_TERMS.map((term, index) => (
                <li key={index}>{term}</li>
              ))}
            </ol>
          </div>

          {/* Signatory Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
            <div className="text-xs text-gray-400 space-y-0.5">
              <p className="font-medium text-gray-500">Official Wheelspa Customer Quotation</p>
              <p>Generated securely via Wheelspa System.</p>
              <p className="text-[11px] text-gray-400">Studio Wakad, Pune • {BRAND_INFO.email}</p>
            </div>

            <div className="text-center self-center sm:self-auto">
              <div className="h-10 border-b border-gray-400 w-48 mb-1"></div>
              <p className="text-xs font-bold text-gray-800">Authorized Signatory</p>
              <p className="text-[11px] text-gray-500">{BRAND_INFO.name} Private Limited</p>
            </div>
          </div>

        </div>

        {/* Decision Buttons (Shown only when status is pending and quotation is NOT expired) */}
        {isPending && !expired && (
          <div className="no-print bg-white border border-gray-200 rounded-2xl p-6 shadow-md">
            <div className="text-center sm:text-left sm:flex sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Accept or Decline this Quotation</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Let our detailing team know your decision so we can block vehicle bay slots.
                </p>
              </div>

              <div className="mt-4 sm:mt-0 flex items-center justify-center gap-3">
                <Button
                  type="button"
                  onClick={() => handleOpenDecisionModal('approved')}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-sm text-sm"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Approve Quotation
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenDecisionModal('rejected')}
                  className="border-red-300 text-red-600 hover:bg-red-50 font-bold px-6 py-2.5 rounded-xl text-sm"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject Quotation
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Post-Decision / Contact Banner */}
        <div className="no-print bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-gray-900">Need instant assistance or slot confirmation?</p>
              <p className="text-xs text-gray-500">Reach our studio managers directly via WhatsApp or phone call.</p>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <a
                href={`tel:${cleanPhone}`}
                className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-xs sm:text-sm transition"
              >
                <Phone className="w-4 h-4 mr-2 text-gray-600" />
                Call Studio
              </a>

              <a
                href={tellWaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-xs sm:text-sm transition shadow-sm"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                {isPending ? 'Ask on WhatsApp' : 'Tell Wheelspa on WhatsApp'}
              </a>

              <button
                type="button"
                onClick={() => window.print()}
                className="hidden md:inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold text-xs sm:text-sm transition"
              >
                <Printer className="w-4 h-4 mr-2 text-gray-600" />
                Print PDF
              </button>
            </div>
          </div>
        </div>

      </main>

      {/* Decision Confirmation Dialog */}
      <Dialog open={decisionModalOpen} onOpenChange={setDecisionModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-gray-900">
              {pendingDecision === 'approved' ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  Confirm Quotation Approval
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-600 mr-2" />
                  Decline Quotation
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 pt-1">
              {pendingDecision === 'approved'
                ? `You are accepting quotation ${quotation.quotation_no} for ${formatIndianCurrency(quotation.final_price)}. Wheelspa team will be notified immediately.`
                : `Are you sure you want to decline quotation ${quotation.quotation_no}? You can share an optional reason below.`}
            </DialogDescription>
          </DialogHeader>

          {pendingDecision === 'rejected' && (
            <div className="space-y-2 pt-2">
              <Label className="text-xs font-semibold text-gray-700">
                Reason for declining (Optional, max 300 characters)
              </Label>
              <Textarea
                placeholder="e.g. Budget constraints, postponing to next month, etc."
                value={rejectReason}
                maxLength={300}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="text-sm"
              />
              <p className="text-[10px] text-gray-400 text-right">
                {rejectReason.length}/300 characters
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setDecisionModalOpen(false)}
              disabled={isSubmittingDecision}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitDecision}
              disabled={isSubmittingDecision}
              className={
                pendingDecision === 'approved'
                  ? 'bg-green-600 hover:bg-green-700 text-white font-bold'
                  : 'bg-red-600 hover:bg-red-700 text-white font-bold'
              }
            >
              {isSubmittingDecision
                ? 'Submitting...'
                : pendingDecision === 'approved'
                ? 'Yes, Approve Quotation'
                : 'Confirm Decline'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="no-print mt-auto py-6 border-t border-gray-200 bg-white text-center text-xs text-gray-400">
        <p>© {new Date().getFullYear()} {BRAND_INFO.name} Private Limited. All rights reserved.</p>
      </footer>

    </div>
  );
};

export default PublicCustomerQuotation;
