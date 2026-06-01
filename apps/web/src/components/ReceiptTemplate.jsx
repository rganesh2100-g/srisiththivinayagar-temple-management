import React from 'react';
import { format } from 'date-fns';

/**
 * Professional Receipt Template Component
 * Optimized for single-page printing with temple branding.
 */
const ReceiptTemplate = ({
  type = 'donation', // 'donation' or 'pooja'
  receiptNumber = 'RCP-000000',
  date = new Date(),
  name = 'John Doe',
  email = '',
  category = 'General Fund',
  poojaDate = '',
  timeSlot = '',
  amount = 0,
  status = 'Approved',
  notes = '',
  transactionId = ''
}) => {
  const formattedDate = date instanceof Date ? format(date, 'dd.MM.yyyy') : date;
  const formattedAmount = Number(amount).toFixed(2);

  return (
    <div className="w-full max-w-3xl mx-auto bg-white text-black p-6 sm:p-8 font-sans border border-gray-300 shadow-sm text-sm leading-relaxed">
      
      {/* Logo */}
      <div className="text-center mb-4">
        <img 
          src="https://horizons-cdn.hostinger.com/5e34f49c-00e8-4e55-9306-3c6d20c04e0a/b10e4494f6e8b9c8fd049079c568f341.png" 
          alt="Sri Sithhi Vinayagar Temple Logo" 
          className="h-16 sm:h-20 mx-auto object-contain" 
        />
      </div>

      {/* Temple Header */}
      <div className="text-center mb-5">
        <h1 className="text-lg sm:text-xl font-bold text-gray-900 uppercase tracking-wide">
          Sri Sithhi Vinayagar Temple Kultur Verein e.V
        </h1>
        <p className="text-gray-800 mt-1">Humboldt Str. 103, 90459 Nürnberg</p>
        <p className="text-gray-800">Tel. No. 0911 4555088 • Rg. No. VR201235</p>
      </div>

      <hr className="border-t-2 border-gray-800 mb-5" />

      {/* Title */}
      <div className="text-center mb-5">
        <h2 className="text-xl sm:text-2xl font-bold text-red-600 uppercase tracking-wider">
          {type === 'pooja' ? 'POOJA BOOKING RECEIPT' : 'DONATION RECEIPT'}
        </h2>
      </div>

      <hr className="border-t-2 border-gray-800 mb-5" />

      {/* Details */}
      <div className="mb-6 px-2 sm:px-8">
        <div className="grid grid-cols-3 gap-y-2.5 gap-x-4">
          <div className="col-span-1 font-semibold text-gray-800">Receipt Number:</div>
          <div className="col-span-2 font-mono font-medium text-gray-900">{receiptNumber}</div>

          <div className="col-span-1 font-semibold text-gray-800">Date:</div>
          <div className="col-span-2 text-gray-900">{formattedDate}</div>

          <div className="col-span-1 font-semibold text-gray-800">Name:</div>
          <div className="col-span-2 text-gray-900">{name}</div>

          {email && (
            <>
              <div className="col-span-1 font-semibold text-gray-800">Email:</div>
              <div className="col-span-2 text-gray-900">{email}</div>
            </>
          )}

          <div className="col-span-1 font-semibold text-gray-800">
            {type === 'pooja' ? 'Pooja Type:' : 'Category:'}
          </div>
          <div className="col-span-2 text-gray-900">{category}</div>

          {type === 'pooja' && poojaDate && (
            <>
              <div className="col-span-1 font-semibold text-gray-800">Pooja Date:</div>
              <div className="col-span-2 text-gray-900">{poojaDate}</div>
            </>
          )}

          {type === 'pooja' && timeSlot && (
            <>
              <div className="col-span-1 font-semibold text-gray-800">Time Slot:</div>
              <div className="col-span-2 text-gray-900">{timeSlot}</div>
            </>
          )}

          {transactionId && (
            <>
              <div className="col-span-1 font-semibold text-gray-800">Transaction ID:</div>
              <div className="col-span-2 font-mono text-xs sm:text-sm text-gray-900 break-all">{transactionId}</div>
            </>
          )}
        </div>
      </div>

      <hr className="border-t-2 border-gray-800 mb-6" />

      {/* Amount */}
      <div className="text-center mb-6">
        <p className="text-base sm:text-lg font-bold text-gray-800 mb-1 uppercase tracking-wide">
          {type === 'pooja' ? 'Booking Amount:' : 'Donation Amount:'}
        </p>
        <p className="text-3xl sm:text-4xl font-bold text-red-600">
          €{formattedAmount}
        </p>
        {status && (
          <p className="mt-2 text-sm font-medium text-gray-600 uppercase tracking-widest">
            Status: <span className={status.toLowerCase() === 'approved' || status.toLowerCase() === 'confirmed' ? 'text-green-600' : ''}>{status}</span>
          </p>
        )}
      </div>

      <hr className="border-t-2 border-gray-800 mb-6" />

      {/* Footer Messages */}
      <div className="text-center space-y-3 text-xs sm:text-sm text-gray-600 px-2 sm:px-8 pb-2">
        <p className="italic font-medium text-gray-800 text-sm sm:text-base mb-4">
          "May the divine grace of the Lord bless you and your family with health, happiness, prosperity, and spiritual fulfillment."
        </p>
        <p>
          This is a computer-generated digital receipt and does not require any signature or authorization.
        </p>
        <p className="font-bold text-gray-900 text-sm">
          Sri Sithhi Vinayagar Temple Kultur Verein e.V
        </p>
        <p>
          This is an official receipt. Please keep this document for your records.
        </p>
      </div>
    </div>
  );
};

export default ReceiptTemplate;