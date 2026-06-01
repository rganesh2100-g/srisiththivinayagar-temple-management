import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MessageSquare, CreditCard, AlertCircle, Heart } from 'lucide-react';

const DonationActivityCard = ({ donation }) => {
  // Extract rejection reason if present
  let rejectionReason = null;
  let displayNotes = donation.notes || '';

  if (donation.status === 'rejected' && displayNotes.includes('Rejection Reason:')) {
    const match = displayNotes.match(/Rejection Reason:\s*(.*)/);
    if (match && match[1]) {
      rejectionReason = match[1].trim();
      // Remove the rejection reason from the display notes
      displayNotes = displayNotes.replace(/\|\s*Rejection Reason:\s*.*/, '').trim();
    }
  }

  // Clean up guest info from notes if any (Name:, Email:, Phone:, TXN:)
  displayNotes = displayNotes.replace(/Name:.*\||Email:.*\||Phone:.*\||TXN:.*\|?/g, '').trim();

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
      default: return 'bg-amber-100 text-amber-800 border-amber-200';
    }
  };

  const getCategoryColor = (category) => {
    const cat = category?.toLowerCase() || '';
    if (cat.includes('maintenance')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (cat.includes('annadhanam')) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (cat.includes('goshala')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (cat.includes('veda')) return 'bg-purple-100 text-purple-800 border-purple-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const formattedDate = new Date(donation.donation_date || donation.created).toLocaleDateString('en-US', {
    year: 'numeric', 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit'
  });

  return (
    <Card className="w-full shadow-sm hover:shadow-md transition-shadow duration-200 border-none bg-white">
      <CardContent className="p-5">
        {/* Header: Amount, Category, Status, Date */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-red-50 rounded-xl text-red-600 shrink-0 mt-1">
              <Heart className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-3xl font-bold text-gray-900 tracking-tight">
                €{donation.amount?.toFixed(2)}
              </h4>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant="outline" className={`px-2.5 py-0.5 font-medium ${getCategoryColor(donation.category)}`}>
                  {donation.category || 'General Donation'}
                </Badge>
                <Badge variant="outline" className={`px-2.5 py-0.5 uppercase text-[10px] font-bold tracking-wider ${getStatusColor(donation.status)}`}>
                  {donation.status || 'pending'}
                </Badge>
              </div>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-sm font-medium text-gray-500 flex items-center sm:justify-end gap-1.5">
              <Calendar className="w-4 h-4 text-gray-400" />
              {formattedDate}
            </p>
          </div>
        </div>

        {/* Rejection Reason */}
        {rejectionReason && (
          <div className="mb-4 p-3.5 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-800 uppercase tracking-wider mb-0.5">Rejection Reason</p>
              <p className="text-sm text-red-700 leading-relaxed">{rejectionReason}</p>
            </div>
          </div>
        )}

        {/* Donor Message/Notes */}
        {displayNotes && (
          <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" /> Donor Message
            </p>
            <p className="text-sm text-gray-700 italic leading-relaxed">"{displayNotes}"</p>
          </div>
        )}

        {/* Footer: Transaction ID */}
        <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500 bg-gray-50 px-2.5 py-1.5 rounded-md border border-gray-100">
            <CreditCard className="w-3.5 h-3.5 text-gray-400" />
            <span className="uppercase tracking-wider">TXN:</span> 
            <span className="font-mono text-gray-700">{donation.transaction_id || 'N/A'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DonationActivityCard;