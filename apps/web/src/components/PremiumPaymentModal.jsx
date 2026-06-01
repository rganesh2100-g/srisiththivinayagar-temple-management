import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, ShieldCheck, Building2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import PaymentAccountDetails from '@/components/PaymentAccountDetails.jsx';
import { usePaymentAccount } from '@/hooks/usePaymentAccount.js';

const PremiumPaymentModal = ({ isOpen, onClose, onSuccess }) => {
  const { currentUser } = useAuth();
  const [transactionId, setTransactionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const { paymentAccount, loading: paymentLoading, error: paymentError, refetch: refetchPayment } = usePaymentAccount();

  useEffect(() => {
    if (isOpen) {
      setTransactionId('');
      setShowConfirmation(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!transactionId.trim()) {
      toast.error('Please enter a valid transaction ID');
      return;
    }

    setLoading(true);
    try {
      await pb.collection('premium_upgrade_requests').create({
        user_id: currentUser.id,
        transaction_id: transactionId.trim(),
        status: 'pending'
      }, { $autoCancel: false });
      
      setShowConfirmation(true);
    } catch (error) {
      console.error('Error submitting upgrade request:', error);
      toast.error('Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (showConfirmation) {
      onSuccess?.();
    }
    setTransactionId('');
    setShowConfirmation(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[800px] p-0 overflow-hidden bg-background border-border rounded-2xl max-h-[90vh] flex flex-col">
        {showConfirmation ? (
          <div className="py-16 px-6 flex flex-col items-center justify-center text-center space-y-4 overflow-y-auto">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4 shadow-inner">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <DialogTitle className="text-3xl font-bold text-foreground" style={{ fontFamily: 'Playfair Display, serif' }}>
              Request Submitted
            </DialogTitle>
            <DialogDescription className="text-base text-muted-foreground max-w-md">
              Thank you. Once the Admin verifies your transaction ID, your account will be upgraded to Premium status.
            </DialogDescription>
            <Button onClick={handleClose} className="mt-8 px-8 py-6 h-auto text-lg bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-all shadow-md">
              Return to Profile
            </Button>
          </div>
        ) : (
          <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
            
            {/* Header */}
            <div className="p-6 pb-4 border-b border-border/50 bg-muted/30 sticky top-0 z-10 backdrop-blur-md">
              <DialogHeader className="text-left">
                <DialogTitle className="text-2xl font-bold text-primary flex items-center gap-2" style={{ fontFamily: 'Playfair Display, serif' }}>
                  <ShieldCheck className="w-6 h-6" />
                  Premium Membership
                </DialogTitle>
                <DialogDescription className="text-base mt-2">
                  Complete your premium payment and enter your transaction reference below.
                </DialogDescription>
              </DialogHeader>
            </div>
            
            {/* Scrollable Content */}
            <div className="p-6 space-y-8 flex-1">
              
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 flex items-center justify-between shadow-sm">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Amount Due</p>
                  <p className="text-3xl font-bold text-primary">€120.00 <span className="text-sm font-medium text-muted-foreground">/ Year</span></p>
                </div>
              </div>

              {/* Payment Instructions & Account Details */}
              <div className="space-y-4">
                <Label className="text-sm font-semibold text-foreground flex items-center gap-2 uppercase tracking-wider">
                  <Building2 className="w-4 h-4 text-primary" />
                  Payment Instructions
                </Label>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 leading-relaxed">
                  Please transfer the exact premium membership amount to the bank account below. You can also <strong>Scan QR code to pay instantly</strong>.
                </div>
                
                <PaymentAccountDetails 
                  layout="horizontal" 
                  accountData={paymentAccount}
                  isLoading={paymentLoading}
                  externalError={paymentError}
                  onRetry={refetchPayment}
                  disableAutoFetch={true}
                />
              </div>

              <form id="premium-payment-form" onSubmit={handleSubmit} className="space-y-3 bg-muted/30 p-5 rounded-xl border border-border/50">
                <Label htmlFor="transactionId" className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Transaction ID <span className="text-destructive">*</span>
                </Label>
                <p className="text-xs text-muted-foreground">
                  Found on your bank transfer receipt or payment confirmation email.
                </p>
                <Input
                  id="transactionId"
                  placeholder="e.g., PAY-123456789"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="bg-background border-input focus:border-primary focus:ring-primary h-11 font-mono text-sm shadow-sm"
                  required
                />
              </form>

            </div>

            {/* Footer */}
            <div className="p-6 pt-4 border-t border-border/50 bg-muted/30 sticky bottom-0 z-10 backdrop-blur-md">
              <DialogFooter className="gap-3 sm:gap-0">
                <Button type="button" variant="outline" onClick={handleClose} disabled={loading} className="border-border text-foreground hover:bg-muted h-11">
                  Cancel
                </Button>
                <Button type="submit" form="premium-payment-form" disabled={loading || !transactionId.trim()} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all active:scale-[0.98] h-11 font-semibold">
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Payment'
                  )}
                </Button>
              </DialogFooter>
            </div>
            
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PremiumPaymentModal;