import React from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, CreditCard, User, Mail, Phone, Hash, CheckCircle, XCircle, Loader2, Ban } from 'lucide-react';
import { toast } from 'sonner';

const PoojaApprovalDetailsModal = ({ isOpen, onClose, bookingData, onApprove, onReject, onCancelBooking, isProcessing }) => {
  if (!bookingData) return null;

  const poojaName = bookingData.expand?.pooja?.name || bookingData.pooja_name || 'Unknown Pooja';
  const userName = bookingData.expand?.user?.name || bookingData.name || 'Unknown User';
  const userEmail = bookingData.expand?.user?.email || bookingData.email || 'No email';
  const userPhone = bookingData.expand?.user?.phone || bookingData.user_contact || 'No phone';

  const handleAction = (actionType) => {
    if (!bookingData?.id) {
      toast.error('Cannot perform action: Booking ID is missing.');
      console.error('Validation Error: Booking ID is missing', bookingData);
      return;
    }
    
    if (actionType === 'approve') onApprove(bookingData);
    if (actionType === 'reject') onReject(bookingData);
    if (actionType === 'cancel') onCancelBooking(bookingData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isProcessing && onClose(open)}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-muted/30 p-6 border-b border-border/50">
          <DialogHeader>
            <div className="flex justify-between items-start gap-4">
              <div>
                <DialogTitle className="text-2xl font-bold text-primary mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
                  {poojaName}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2 text-sm">
                  <Hash className="w-3.5 h-3.5" />
                  <span className="font-mono">{bookingData.id}</span>
                </DialogDescription>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant="outline" className="bg-background text-foreground border-border whitespace-nowrap capitalize">
                  {bookingData.status}
                </Badge>
                {bookingData.booking_status && bookingData.booking_status !== bookingData.status && (
                  <span className="text-[10px] text-muted-foreground uppercase">
                    Legacy: {bookingData.booking_status}
                  </span>
                )}
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Devotee Details */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Devotee Information
              </h4>
              <div className="bg-muted/10 rounded-xl p-4 border border-border/50 space-y-3">
                <p className="font-medium text-foreground">{userName}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4 shrink-0" />
                  <span className="truncate">{userEmail}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4 shrink-0" />
                  <span>{userPhone}</span>
                </div>
              </div>
            </div>

            {/* Schedule Details */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Schedule Details
              </h4>
              <div className="bg-muted/10 rounded-xl p-4 border border-border/50 space-y-3">
                <div className="flex items-start gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">
                      {bookingData.pooja_date ? format(new Date(bookingData.pooja_date), 'EEEE, MMMM d, yyyy') : 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>{bookingData.time_slot || bookingData.booking_time}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5" /> Payment Information
            </h4>
            <div className="bg-muted/10 rounded-xl p-4 border border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Donation Amount</p>
                <p className="text-2xl font-bold text-foreground">€{(bookingData.donation_amount || bookingData.fee_amount || 0).toFixed(2)}</p>
              </div>
              <div className="sm:text-right">
                <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5 sm:justify-end">
                  Payment Status: 
                  <span className={`font-semibold capitalize ${
                    bookingData.payment_status === 'completed' ? 'text-emerald-600' : 
                    bookingData.payment_status === 'failed' ? 'text-rose-600' : 'text-amber-600'
                  }`}>
                    {bookingData.payment_status}
                  </span>
                </p>
                <p className="font-mono text-xs bg-background px-2 py-1 rounded border border-border/50 inline-block mt-1">
                  Tx ID: {bookingData.transaction_id || 'N/A'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground text-center pt-2">
            Booked on: {bookingData.created ? format(new Date(bookingData.created), 'MMM d, yyyy h:mm a') : 'Unknown'}
          </div>
        </div>

        <DialogFooter className="p-6 bg-muted/30 border-t border-border/50 flex-col sm:flex-row gap-3 sm:gap-0 justify-between items-center">
          <Button variant="outline" onClick={onClose} disabled={isProcessing} className="w-full sm:w-auto">
            Close
          </Button>
          <div className="flex flex-wrap justify-end gap-3 w-full sm:w-auto">
            {bookingData.status !== 'cancelled' && bookingData.status !== 'rejected' && (
              <Button 
                variant="outline" 
                className="w-full sm:w-auto bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-800 border-slate-200"
                onClick={() => handleAction('cancel')}
                disabled={isProcessing}
              >
                {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Ban className="w-4 h-4 mr-2" />}
                Cancel Booking
              </Button>
            )}
            {bookingData.status === 'pending' && (
              <>
                <Button 
                  variant="outline" 
                  className="w-full sm:w-auto bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800 border-rose-200"
                  onClick={() => handleAction('reject')}
                  disabled={isProcessing}
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                  Reject
                </Button>
                <Button 
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => handleAction('approve')}
                  disabled={isProcessing}
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  Approve Booking
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PoojaApprovalDetailsModal;