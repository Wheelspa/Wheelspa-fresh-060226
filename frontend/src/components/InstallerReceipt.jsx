import React, { forwardRef } from 'react';
import { format } from 'date-fns';
import { BRAND_INFO } from '../data/mock';
import { INSTALLER_CATEGORIES, INSTALLER_PAYMENT_MODES } from '../data/installerMock';

const InstallerReceipt = forwardRef(({ payment, receiptNo }, ref) => {
  const getCategoryLabel = (value) => {
    return INSTALLER_CATEGORIES.find(c => c.value === value)?.label || value;
  };

  const getPaymentModeLabel = (value) => {
    return INSTALLER_PAYMENT_MODES.find(m => m.value === value)?.label || value;
  };

  return (
    <div ref={ref} className="bg-white p-8 max-w-2xl mx-auto" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <div className="border-b-2 border-green-500 pb-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <img 
              src={BRAND_INFO.logo} 
              alt="Wheelspa Logo" 
              className="h-16 mb-2"
              crossOrigin="anonymous"
            />
            <p className="text-sm text-gray-600">{BRAND_INFO.address}</p>
            <p className="text-sm text-gray-600">Phone: {BRAND_INFO.phones[0]}</p>
            <p className="text-sm text-gray-600">Email: {BRAND_INFO.email}</p>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold text-gray-800">PAYMENT RECEIPT</h1>
            <p className="text-sm text-gray-600 mt-2">Receipt No: <span className="font-semibold">{receiptNo}</span></p>
            <p className="text-sm text-gray-600">Date: <span className="font-semibold">{format(new Date(), 'dd MMM yyyy')}</span></p>
          </div>
        </div>
      </div>

      {/* Installer Details */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">Installer Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Installer Name</p>
            <p className="font-semibold text-gray-800">{payment.installerName}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Category</p>
            <p className="font-semibold text-gray-800">{getCategoryLabel(payment.category)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Job Reference</p>
            <p className="font-semibold text-gray-800 font-mono">{payment.jobReference}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Payment Date</p>
            <p className="font-semibold text-gray-800">{format(new Date(payment.paymentDate), 'dd MMM yyyy')}</p>
          </div>
        </div>
      </div>

      {/* Payment Details */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">Payment Details</h2>
        <table className="w-full">
          <tbody>
            <tr className="border-b">
              <td className="py-3 text-gray-600">Total Payable Amount</td>
              <td className="py-3 text-right font-semibold text-gray-800">₹{payment.totalPayable.toLocaleString()}</td>
            </tr>
            <tr className="border-b">
              <td className="py-3 text-gray-600">Amount Paid</td>
              <td className="py-3 text-right font-semibold text-green-600">₹{payment.advancePaid.toLocaleString()}</td>
            </tr>
            <tr className="border-b">
              <td className="py-3 text-gray-600">Balance Amount</td>
              <td className={`py-3 text-right font-semibold ${payment.remainingBalance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                ₹{payment.remainingBalance.toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Transaction Details */}
      <div className="mb-6 bg-gray-50 p-4 rounded-lg">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Transaction Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Payment Mode</p>
            <p className="font-semibold text-gray-800">{getPaymentModeLabel(payment.paymentMode)}</p>
          </div>
          {payment.transactionId && (
            <div>
              <p className="text-sm text-gray-500">Transaction ID / Reference</p>
              <p className="font-semibold text-gray-800 font-mono">{payment.transactionId}</p>
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      {payment.notes && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Remarks</h2>
          <p className="text-gray-600 bg-gray-50 p-3 rounded">{payment.notes}</p>
        </div>
      )}

      {/* Status Badge */}
      <div className="mb-8 text-center">
        <span className={`inline-block px-6 py-2 rounded-full text-sm font-semibold ${
          payment.remainingBalance > 0 
            ? 'bg-orange-100 text-orange-800' 
            : 'bg-green-100 text-green-800'
        }`}>
          {payment.remainingBalance > 0 ? 'PARTIAL PAYMENT' : 'FULLY PAID'}
        </span>
      </div>

      {/* Signature Section */}
      <div className="grid grid-cols-2 gap-8 mt-12 pt-8 border-t">
        <div className="text-center">
          <div className="border-b border-gray-400 mb-2 h-16"></div>
          <p className="text-sm text-gray-600">Receiver's Signature</p>
          <p className="text-xs text-gray-500">(Installer)</p>
        </div>
        <div className="text-center">
          <div className="border-b border-gray-400 mb-2 h-16"></div>
          <p className="text-sm text-gray-600">Authorized Signature</p>
          <p className="text-xs text-gray-500">(Wheelspa)</p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t text-center">
        <p className="text-xs text-gray-500">
          This is a computer-generated receipt. For any queries, please contact us at {BRAND_INFO.email}
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Generated on: {format(new Date(), 'dd MMM yyyy, hh:mm a')}
        </p>
      </div>
    </div>
  );
});

InstallerReceipt.displayName = 'InstallerReceipt';

export default InstallerReceipt;
