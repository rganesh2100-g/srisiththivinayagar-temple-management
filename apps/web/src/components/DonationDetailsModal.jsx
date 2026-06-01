import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, User, Mail, Phone, Calendar, Tag, FileText, Hash, CheckCircle, XCircle } from 'lucide-react';

const DonationDetailsModal = ({ isOpen, onClose, donation, onApprove, onReject, actionLoading }) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  if (!donation) return null;

  // Parse donor info from notes or relation
  const getDonorInfo = (record) => {
    let name = 'Not provided';
    let email = 'Not provided';
    let phone = 'Not provided';

    if (record.expand?.user_id) {
      name = record.expand.user_id.name || record.expand.user_id.email || 'Not provided';
      email = record.expand.user_id.email || 'Not provided';
      phone = record.expand.user_id.phone || 'Not provided';
    }

    if (record.notes) {
      const nameMatch = record.notes.match(/Name:\s*([^|]+?)(?=\s*\||$)/i);
      if (nameMatch && nameMatch[1].trim()) name = nameMatch[1].trim();

      const emailMatch = record.notes.match(/Email:\s*([^|]+?)(?=\s*\||$)/i);
      if (emailMatch && emailMatch[1].trim()) email = emailMatch[1].trim();

      const phoneMatch = record.notes.match(/Phone:\s*([^|]+?)(?=\s*\||$)/i);
      if (phoneMatch && phoneMatch[1].trim()) phone = phoneMatch[1].trim();
    }

    // Fallback to direct fields if they exist
    if (record.donor_name) name = record.donor_name;
    if (record.donor_email) email = record.donor_email;
    if (record.donor_phone) phone = record.donor_phone;

    return { name, email, phone };
  };

  const { name, email, phone } = getDonorInfo(donation);

  // Extract clean notes (remove the embedded Name/Email/Phone part if present)
  let cleanNotes = donation.notes || 'None';
  if (cleanNotes.includes('Notes:')) {
    const notesMatch = cleanNotes.match(/Notes:\s*(.*)/);
    if (notesMatch && notesMatch[1]) {
      cleanNotes = notesMatch[1].trim();
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200 shadow-none">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200 shadow-none">Rejected</Badge>;
      default:
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200 shadow-none">Pending</Badge>;
    }
  };

  const handleRejectSubmit = () => {
    onReject(donation, rejectionReason);
  };

  const handleApproveClick = () => {
    console.log('[DonationDetailsModal] Approve button clicked');
    console.log('[DonationDetailsModal] Donation ID:', donation.id);
    console.log('[DonationDetailsModal] Calling onApprove handler...');
    onApprove(donation);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        setIsRejecting(false);
        setRejectionReason('');
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-2xl">
        <div className="h-2 bg-gradient-to-r from-[#8B0000] to-[#CC2222]"></div>
        
        <div className="p-6">
          <DialogHeader className="mb-6">
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle className="text-2xl font-bold text-gray-900 mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Donation Details
                </DialogTitle>
                <DialogDescription>
                  Review the submitted donation information.
                </DialogDescription>
              </div>
              {getStatusBadge(donation.status)}
            </div>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Donor Information */}
            <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-2">Donor Information</h4>
              
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 font-medium">Full Name</p>
                  <p className="text-sm text-gray-900 font-medium">{name}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 font-medium">Email Address</p>
                  <p className="text-sm text-gray-900">{email}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 font-medium">Phone Number</p>
                  <p className="text-sm text-gray-900">{phone}</p>
                </div>
              </div>
            </div>

            {/* Donation Information */}
            <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-2">Donation Details</h4>
              
              <div className="flex items-start gap-3">
                <Hash className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 font-medium">Amount</p>
                  <p className="text-lg font-bold text-[#8B0000]">€{donation.amount?.toFixed(2)}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Tag className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 font-medium">Category</p>
                  <p className="text-sm text-gray-900">{donation.category || 'General Fund'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 font-medium">Date Submitted</p>
                  <p className="text-sm text-gray-900">{new Date(donation.donation_date || donation.created).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Details */}
          <div className="space-y-4 mb-6">
            {donation.special_occasion && (
              <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
                <p className="text-xs text-purple-600 font-semibold uppercase mb-1">Special Occasion</p>
                <p className="text-sm text-purple-900">{donation.special_occasion}</p>
              </div>
            )}

            <div className="bg-white p-4 rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <h4 className="text-sm font-semibold text-gray-900">Transaction Notes / Reference</h4>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap font-mono bg-gray-50 p-3 rounded-md border border-gray-100">
                {cleanNotes}
              </p>
            </div>
          </div>

          {/* Rejection Form */}
          {isRejecting && donation.status === 'pending' && (
            <div className="mb-6 p-4 bg-red-50 rounded-xl border border-red-100 animate-in fade-in slide-in-from-top-2">
              <Label htmlFor="rejectionReason" className="text-red-800 font-semibold mb-2 block">Reason for Rejection (Optional)</Label>
              <Textarea 
                id="rejectionReason"
                placeholder="e.g., Payment not received, invalid transaction ID..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="bg-white border-red-200 focus-visible:ring-red-500 mb-3"
                rows={3}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsRejecting(false)} disabled={actionLoading}>
                  Cancel
                </Button>
                <Button variant="destructive" size="sm" onClick={handleRejectSubmit} disabled={actionLoading}>
                  {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                  Confirm Rejection
                </Button>
              </div>
            </div>
          )}

          {/* Actions */}
          <DialogFooter className="sm:justify-between border-t border-gray-100 pt-4 mt-2">
            <Button variant="outline" onClick={onClose} disabled={actionLoading}>
              Close
            </Button>
            
            {donation.status === 'pending' && !isRejecting && (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  onClick={() => setIsRejecting(true)}
                  disabled={actionLoading}
                >
                  <XCircle className="w-4 h-4 mr-2" /> Reject
                </Button>
                <Button 
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleApproveClick}
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  Approve Donation
                </Button>
              </div>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DonationDetailsModal;