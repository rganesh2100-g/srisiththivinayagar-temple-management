import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CreditCard, Hash, FileText, Plus, Minus } from 'lucide-react';
import pb from '@/lib/pocketbaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { toast } from 'sonner';
import PaymentAccountDetails from '@/components/PaymentAccountDetails.jsx';
import { usePaymentAccount } from '@/hooks/usePaymentAccount.js';
import logger from '@/lib/logger.js';
import { validateUserExists } from '@/lib/userValidation.js';

const PremiumUpgradeModal = ({ isOpen, onClose, onSuccess, amount }) => {
  const { currentUser } = useAuth();
  const [transactionId, setTransactionId] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [customAmount, setCustomAmount] = useState(10);
  
  const { paymentAccount, loading: paymentLoading, error: paymentError, refetch: refetchPayment } = usePaymentAccount();

  useEffect(() => {
    if (isOpen) {
      setTransactionId('');
      setTransactionRef('');
      if (!amount) {
        setCustomAmount(billingCycle === 'monthly' ? 10 : 120);
      }
    }
  }, [isOpen, amount, billingCycle]);

  const formatDateForAPI = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day} 00:00:00.000Z`;
  };

  const handleUpgrade = async () => {
    logger.info('Starting user validation before premium upgrade request creation', { userId: currentUser?.id });
    
    if (!currentUser?.id) {
      toast.error('Please log in again to upgrade to premium');
      return;
    }

    if (!transactionId.trim() || !transactionRef.trim()) {
      toast.error('Please enter transaction ID and reference');
      return;
    }

    const validation = await validateUserExists(currentUser);
    
    if (!validation.isValid) {
      logger.error('User validation failed, cannot create premium upgrade request', { error: validation.error });
      toast.error(validation.error);
      return;
    }

    if (!currentUser?.email) {
      toast.error('User email is missing. Please update your profile.');
      return;
    }

    const currentAmount = amount || customAmount;
    const today = new Date();
    const endDate = new Date(today);
    
    if (billingCycle === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    const payload = {
      user: currentUser.id,
      email: currentUser.email,
      amount: currentAmount,
      total_amount: currentAmount,
      plan_type: 'premium',
      billing_cycle: billingCycle,
      transaction_id: transactionId.trim(),
      transaction_ref: transactionRef.trim(),
      status: 'pending',
      start_date: formatDateForAPI(today),
      end_date: formatDateForAPI(endDate)
    };

    setLoading(true);
    try {
      // Validate all required fields strictly
      const missingFields = [];
      if (!payload.user) missingFields.push('User ID');
      if (!payload.email) missingFields.push('Email');
      if (!payload.plan_type) missingFields.push('Plan Type');
      if (!payload.status) missingFields.push('Status');
      if (!payload.billing_cycle) missingFields.push('Billing Cycle');
      if (!payload.transaction_id) missingFields.push('Transaction ID');
      if (payload.total_amount === undefined || payload.total_amount === null || isNaN(payload.total_amount)) missingFields.push('Total Amount');

      if (missingFields.length > 0) {
        throw new Error(`Please fill in all required fields: ${missingFields.join(', ')}`);
      }

      // Create payment record
      await pb.collection('payments').create(payload, { $autoCancel: false });
      
      // Update user status to reflect pending premium upgrade
      await pb.collection('users').update(currentUser.id, {
        premium_status: 'Pending'
      }, { $autoCancel: false });
      
      toast.success('Upgrade request submitted successfully');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      logger.error('Premium upgrade request creation error', { error: err.message, payload });
      toast.error(`Failed to submit upgrade request: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const adjustPrice = (adjustment) => {
    const minPrice = billingCycle === 'monthly' ? 10 : 120;
    setCustomAmount(prev => Math.max(minPrice, prev + adjustment));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[850px] rounded-2xl max-h-[90vh] overflow-y-auto p-0 custom-scrollbar">
        <div className="p-6 pb-4 border-b border-border/50 bg-muted/30 sticky top-0 z-10 backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-primary flex items-center gap-2" style={{ fontFamily: 'Playfair Display, serif' }}>
              <CreditCard className="w-6 h-6" />
              Upgrade to Premium
            </DialogTitle>
            <DialogDescription className="text-base mt-2">
              Please transfer the membership amount and enter the transaction details below to complete your upgrade.
            </DialogDescription>
          </DialogHeader>
        </div>
        
        <div className="p-6 space-y-8">
          
          <PaymentAccountDetails 
            layout="horizontal" 
            accountData={paymentAccount}
            isLoading={paymentLoading}
            externalError={paymentError}
            onRetry={refetchPayment}
            disableAutoFetch={true}
          />

          {!amount && (
            <div className="space-y-4 bg-muted/30 p-5 rounded-xl border border-border/50">
              <Label className="text-sm font-semibold text-foreground">Select Membership Plan</Label>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant={billingCycle === 'monthly' ? 'default' : 'outline'}
                  onClick={() => setBillingCycle('monthly')}
                  className={`flex-1 h-10 shadow-sm transition-all ${billingCycle === 'monthly' ? 'bg-[#8B0000] hover:bg-[#6b0000] text-white border-[#8B0000]' : 'bg-background text-foreground hover:bg-muted border-border'}`}
                >
                  Monthly (€10/mo)
                </Button>
                <Button
                  type="button"
                  variant={billingCycle === 'yearly' ? 'default' : 'outline'}
                  onClick={() => setBillingCycle('yearly')}
                  className={`flex-1 h-10 shadow-sm transition-all ${billingCycle === 'yearly' ? 'bg-[#8B0000] hover:bg-[#6b0000] text-white border-[#8B0000]' : 'bg-background text-foreground hover:bg-muted border-border'}`}
                >
                  Yearly (€120/yr)
                </Button>
              </div>

              <div className="pt-2">
                <Label className="text-xs text-muted-foreground mb-2 block">
                  Contribution Amount (Min €{billingCycle === 'monthly' ? '10' : '120'})
                </Label>
                <div className="flex items-center gap-4 bg-background rounded-lg border border-border p-1 w-full max-w-[250px]">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => adjustPrice(-10)} 
                    disabled={customAmount <= (billingCycle === 'monthly' ? 10 : 120)} 
                    className="h-8 w-8 text-[#8B0000] hover:bg-[#8B0000]/10 hover:text-[#8B0000]"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Input
                    type="number"
                    min={billingCycle === 'monthly' ? 10 : 120}
                    step="1"
                    value={customAmount}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val)) setCustomAmount(val);
                    }}
                    className="h-8 text-center font-bold text-lg border-none shadow-none focus-visible:ring-0 px-0"
                  />
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => adjustPrice(10)} 
                    className="h-8 w-8 text-[#8B0000] hover:bg-[#8B0000]/10 hover:text-[#8B0000]"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {amount && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Amount Due</p>
                <p className="text-3xl font-bold text-primary">€{Number(amount).toFixed(2)}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-5 rounded-xl border border-border/50">
            <div className="space-y-3">
              <Label htmlFor="transactionId" className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Hash className="w-4 h-4 text-primary" />
                Transaction ID <span className="text-destructive">*</span>
              </Label>
              <Input 
                id="transactionId"
                placeholder="e.g., TXN123456789"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                className="bg-background border-input focus:border-primary focus:ring-primary font-mono text-sm h-11"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="transactionRef" className="text-sm font-semibold text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Transaction Reference <span className="text-destructive">*</span>
              </Label>
              <Input 
                id="transactionRef"
                placeholder="e.g., REF98765"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                className="bg-background border-input focus:border-primary focus:ring-primary font-mono text-sm h-11"
              />
            </div>
          </div>
        </div>

        <div className="p-6 pt-4 border-t border-border/50 bg-muted/30 sticky bottom-0 z-10 backdrop-blur-md">
          <DialogFooter className="gap-3 sm:gap-0">
            <Button variant="outline" onClick={onClose} disabled={loading} className="border-border text-foreground hover:bg-muted">
              Cancel
            </Button>
            <Button 
              onClick={handleUpgrade} 
              disabled={loading || !transactionId.trim() || !transactionRef.trim()} 
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all active:scale-[0.98]"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Confirm Payment
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PremiumUpgradeModal;