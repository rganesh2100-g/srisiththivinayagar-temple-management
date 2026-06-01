import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard, ShieldCheck, Building2, Hash, FileText } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { toast } from 'sonner';
import PaymentAccountDetails from '@/components/PaymentAccountDetails.jsx';
import logger from '@/lib/logger.js';
import { validateUserExists } from '@/lib/userValidation.js';

const SubscriptionPaymentModal = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  defaultAmount = null,
  subscriptionType = 'Premium Monthly'
}) => {
  const { currentUser } = useAuth();
  
  const selectedType = subscriptionType.toLowerCase().includes('yearly') ? 'Yearly' : 'Monthly';
  const minAmount = selectedType === 'Yearly' ? 120 : 10;
  const initialAmount = defaultAmount && parseFloat(defaultAmount) >= minAmount ? parseFloat(defaultAmount) : minAmount;
  
  const [amount, setAmount] = useState(initialAmount.toString());
  const [transactionId, setTransactionId] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTransactionId('');
      setTransactionRef('');
      const resolvedMin = subscriptionType.toLowerCase().includes('yearly') ? 120 : 10;
      const initial = defaultAmount && parseFloat(defaultAmount) >= resolvedMin ? parseFloat(defaultAmount) : resolvedMin;
      setAmount(initial.toString());
    }
  }, [isOpen, defaultAmount, subscriptionType]);

  const formatDateForAPI = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day} 00:00:00.000Z`;
  };

  const handlePayment = async () => {
    const numAmount = parseFloat(amount);
    
    console.log('Current User ID:', currentUser?.id);
    
    if (!currentUser?.id) {
      toast.error('Please log in again to upgrade to premium');
      return;
    }

    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Invalid subscription amount');
      return;
    }

    if (numAmount < minAmount) {
      toast.error(`Minimum amount for ${selectedType} is €${minAmount}`);
      return;
    }

    if (!transactionId.trim() || !transactionRef.trim()) {
      toast.error('Please enter transaction ID and reference');
      return;
    }

    logger.info('Starting user validation before subscription creation');
    const validation = await validateUserExists(currentUser);
    
    if (!validation.isValid) {
      logger.error('User validation failed, cannot create subscription', { error: validation.error });
      toast.error(validation.error);
      return;
    }

    if (!currentUser?.email) {
      logger.error('Subscription creation failed - missing user email', { userId: currentUser.id });
      toast.error('User email is missing. Please update your profile.');
      return;
    }

    const today = new Date();
    const endDate = new Date(today);
    
    if (selectedType === 'Monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    const subscriptionPayload = {
      user: currentUser.id,
      plan_type: 'premium',
      billing_cycle: selectedType.toLowerCase(),
      amount: minAmount,
      custom_donation: numAmount > minAmount ? numAmount - minAmount : 0,
      total_amount: numAmount,
      transaction_id: transactionId.trim(),
      transaction_ref: transactionRef.trim(),
      status: 'pending',
      start_date: formatDateForAPI(today),
      end_date: formatDateForAPI(endDate)
    };

    setLoading(true);
    try {
      // Validate all required fields for subscriptions collection before making the API call
      const missingFields = [];
      if (!subscriptionPayload.user) missingFields.push('User ID (relation)');
      if (!subscriptionPayload.plan_type) missingFields.push('Plan Type');
      if (!subscriptionPayload.status) missingFields.push('Status');
      if (!subscriptionPayload.billing_cycle) missingFields.push('Billing Cycle');
      if (!subscriptionPayload.transaction_id) missingFields.push('Transaction ID');
      if (subscriptionPayload.total_amount === undefined || subscriptionPayload.total_amount === null || isNaN(subscriptionPayload.total_amount)) missingFields.push('Total Amount');

      if (missingFields.length > 0) {
        throw new Error(`Please fill in required fields: ${missingFields.join(', ')}`);
      }

      await pb.collection('subscriptions').create(subscriptionPayload, { $autoCancel: false });
      
      toast.success('Subscription submitted successfully');
      
      setTransactionId('');
      setTransactionRef('');
      
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      logger.error('Subscription creation error', { error: err.message, payload: subscriptionPayload });
      toast.error(`Submission failed: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const isSubmitDisabled = loading || !currentUser?.id || !transactionId.trim() || !transactionRef.trim();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[750px] rounded-2xl max-h-[90vh] overflow-y-auto p-0 custom-scrollbar">
        <div className="p-6 pb-4 border-b border-border/50 bg-muted/30 sticky top-0 z-10 backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-primary flex items-center gap-2" style={{ fontFamily: 'Playfair Display, serif' }}>
              <CreditCard className="w-6 h-6" />
              Complete Subscription
            </DialogTitle>
            <DialogDescription className="text-base mt-2">
              Complete your payment via bank transfer or QR code to maintain access to exclusive temple features.
            </DialogDescription>
          </DialogHeader>
        </div>
        
        <div className="p-6 space-y-8">
          <div className="space-y-4">
            <Label className="text-sm font-semibold text-foreground flex items-center gap-2 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-primary" />
              Subscription Details
            </Label>
            <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl border border-border/50">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Member Name</p>
                <p className="font-medium text-sm text-foreground">{currentUser?.name || currentUser?.email || 'Valued Member'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Plan Type</p>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-none">
                    {selectedType}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2 col-span-2 pt-3 border-t border-border/50">
                <Label htmlFor="amount" className="text-xs text-muted-foreground font-medium">Amount Due (€)</Label>
                <div className="relative w-1/2 min-w-[200px]">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground font-medium">€</span>
                  <Input
                    id="amount"
                    type="number"
                    min={minAmount}
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-8 font-bold text-xl text-primary bg-background h-12 shadow-sm border-primary/20 focus:border-primary focus:ring-primary"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">Minimum amount is €{minAmount}. Any extra amount is graciously accepted as a donation.</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-sm font-semibold text-foreground flex items-center gap-2 uppercase tracking-wider">
              <Building2 className="w-4 h-4 text-primary" />
              Payment Instructions
            </Label>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 leading-relaxed">
              Please transfer the exact subscription amount to the bank account below. You can also scan the QR code or use the payment link.
            </div>
            
            <PaymentAccountDetails layout="horizontal" />
          </div>

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
              onClick={handlePayment} 
              disabled={isSubmitDisabled} 
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

export default SubscriptionPaymentModal;