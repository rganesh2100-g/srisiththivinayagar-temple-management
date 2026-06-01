import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, RefreshCw, CalendarDays, Hash, FileText } from 'lucide-react';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient.js';
import PaymentAccountDetails from '@/components/PaymentAccountDetails.jsx';

const RenewalModal = ({ isOpen, onClose, onSuccess, amount, nextRenewalDate }) => {
  const [transactionId, setTransactionId] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTransactionId('');
      setTransactionRef('');
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!transactionId.trim() || !transactionRef.trim()) {
      toast.error('Please enter transaction ID and reference');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        user_id: pb.authStore.model?.id,
        renewal_amount: amount,
        status: 'pending_approval',
        transaction_id: transactionId.trim(),
        transaction_ref: transactionRef.trim()
      };

      await pb.collection('renewals').create(payload, { $autoCancel: false });

      toast.success('Renewal transaction submitted for approval');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Renewal error:', error);
      toast.error(error.message || 'Failed to submit renewal');
    } finally {
      setLoading(false);
    }
  };

  const formattedDate = nextRenewalDate 
    ? new Date(nextRenewalDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Pending';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] p-0 overflow-hidden bg-background border-border rounded-2xl">
        <div className="flex flex-col md:flex-row h-full max-h-[90vh]">
          
          <div className="w-full md:w-1/2 bg-muted/10 p-6 sm:p-8 overflow-y-auto custom-scrollbar border-b md:border-b-0 md:border-r border-border">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-primary" />
                Renewal Payment Info
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Please transfer the renewal amount to our bank account or scan the QR code to pay instantly.
              </p>
            </div>
            <PaymentAccountDetails layout="vertical" className="shadow-none border-border/50 bg-background/50 backdrop-blur-sm" />
          </div>

          <div className="w-full md:w-1/2 p-6 sm:p-8 flex flex-col bg-background overflow-y-auto custom-scrollbar">
            <DialogHeader className="mb-8 text-left">
              <DialogTitle className="text-2xl font-bold text-primary" style={{ fontFamily: 'Playfair Display, serif' }}>
                Membership Renewal
              </DialogTitle>
              <DialogDescription className="text-base mt-2">
                Enter your payment transaction details to submit your renewal for approval.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 shadow-sm">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-1.5">
                  Amount
                </p>
                <p className="text-2xl font-bold text-primary">€{amount ? parseFloat(amount).toFixed(2) : '0.00'}</p>
              </div>
              <div className="bg-secondary/20 border border-border/50 rounded-xl p-4 shadow-sm">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5" /> Renewal Date
                </p>
                <p className="text-base font-semibold text-foreground mt-1">{formattedDate}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="transactionId" className="text-foreground font-semibold flex items-center gap-2">
                    <Hash className="w-4 h-4 text-primary" />
                    Transaction ID <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="transactionId"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="e.g., PAYPAL-123456789"
                    disabled={loading}
                    className="bg-background border-input focus:border-primary focus:ring-primary h-12 font-mono text-base shadow-sm"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="transactionRef" className="text-foreground font-semibold flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    Transaction Reference <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="transactionRef"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder="e.g., REF98765"
                    disabled={loading}
                    className="bg-background border-input focus:border-primary focus:ring-primary h-12 font-mono text-base shadow-sm"
                    required
                  />
                </div>
              </div>
              
              <DialogFooter className="gap-3 sm:gap-0 mt-8 pt-6 border-t border-border/50">
                <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="border-border text-foreground hover:bg-muted w-full sm:w-auto h-12 px-6">
                  Cancel
                </Button>
                <Button type="submit" disabled={loading || !transactionId.trim() || !transactionRef.trim()} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all active:scale-[0.98] w-full sm:w-auto h-12 px-8 font-semibold">
                  {loading && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
                  Submit Renewal
                </Button>
              </DialogFooter>
            </form>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RenewalModal;