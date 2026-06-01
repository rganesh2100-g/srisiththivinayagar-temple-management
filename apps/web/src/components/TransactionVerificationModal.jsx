import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, Mail, ShieldCheck } from 'lucide-react';
import apiServerClient from '@/lib/apiServerClient';
import { toast } from 'sonner';

const TransactionVerificationModal = ({ isOpen, onClose, subscription, onSuccess }) => {
  const [transactionId, setTransactionId] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Initialize state when modal opens
  useEffect(() => {
    if (isOpen && subscription) {
      const initialTxnId = subscription.transaction_id || subscription.transactionId || '';
      setTransactionId(initialTxnId);
      setAdminNotes(subscription.admin_notes || '');
      setValidationResult(null);
      
      if (initialTxnId) {
        validateTransaction(initialTxnId);
      }
    }
  }, [isOpen, subscription]);

  // Debounced validation when user types
  useEffect(() => {
    if (!isOpen) return;
    
    const timer = setTimeout(() => {
      if (transactionId.trim()) {
        validateTransaction(transactionId.trim());
      } else {
        setValidationResult(null);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [transactionId, isOpen]);

  const validateTransaction = async (txnId) => {
    setIsValidating(true);
    try {
      const response = await apiServerClient.fetch('/subscription/verify-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: txnId })
      });

      if (!response.ok) {
        throw new Error('Validation request failed');
      }

      const data = await response.json();
      setValidationResult(data);
    } catch (error) {
      console.error('Transaction validation error:', error);
      setValidationResult({ valid: false, error: 'Failed to verify transaction' });
    } finally {
      setIsValidating(false);
    }
  };

  const handleApprove = async () => {
    if (!validationResult?.valid) return;

    setIsApproving(true);
    try {
      const response = await apiServerClient.fetch('/subscription/approve-with-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: subscription.id,
          transactionId: transactionId.trim(),
          adminNotes: adminNotes.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to approve subscription');
      }

      const data = await response.json();
      if (data.success) {
        toast.success('Subscription approved and receipt sent successfully.');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        throw new Error(data.message || 'Approval failed');
      }
    } catch (error) {
      console.error('Approval error:', error);
      toast.error(error.message || 'An error occurred during approval.');
    } finally {
      setIsApproving(false);
    }
  };

  const handleSendEmail = async () => {
    setIsSendingEmail(true);
    try {
      const response = await apiServerClient.fetch('/subscription/send-payer-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: subscription.id,
          transactionId: transactionId.trim(),
          adminNotes: adminNotes.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to send email');
      }

      const data = await response.json();
      if (data.success) {
        toast.success('Verification request email sent to the user.');
      } else {
        throw new Error(data.message || 'Failed to send email');
      }
    } catch (error) {
      console.error('Email sending error:', error);
      toast.error(error.message || 'An error occurred while sending the email.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  if (!subscription) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Verify & Approve Subscription
          </DialogTitle>
          <DialogDescription>
            Verify the transaction ID against payment records before approving this subscription.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Subscription Summary */}
          <div className="bg-muted/50 p-4 rounded-lg border border-border/50 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground font-medium mb-1">Member</p>
              <p className="font-medium">{subscription.user_id}</p>
            </div>
            <div>
              <p className="text-muted-foreground font-medium mb-1">Plan Type</p>
              <p className="font-medium">{subscription.subscription_type}</p>
            </div>
            <div>
              <p className="text-muted-foreground font-medium mb-1">Amount</p>
              <p className="font-medium text-primary">€{parseFloat(subscription.amount || 0).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-muted-foreground font-medium mb-1">Status</p>
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                {subscription.status}
              </Badge>
            </div>
          </div>

          {/* Transaction Verification */}
          <div className="space-y-3">
            <Label htmlFor="transactionId">Transaction ID</Label>
            <div className="relative">
              <Input
                id="transactionId"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="Enter transaction ID to verify..."
                className="pr-10 font-mono"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isValidating ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : validationResult?.valid ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : validationResult && !validationResult.valid ? (
                  <XCircle className="w-5 h-5 text-destructive" />
                ) : null}
              </div>
            </div>

            {/* Validation Status Message */}
            {transactionId && !isValidating && validationResult && (
              <div className={`text-sm p-3 rounded-md flex items-start gap-2 ${validationResult.valid ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-destructive/10 text-destructive border border-destructive/20'}`}>
                {validationResult.valid ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">Valid Payment Found</p>
                      <p className="text-xs opacity-90 mt-0.5">
                        Matched record: €{validationResult.paymentRecord?.amount} on {new Date(validationResult.paymentRecord?.payment_date || validationResult.paymentRecord?.created).toLocaleDateString()}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">Transaction Not Verified</p>
                      <p className="text-xs opacity-90 mt-0.5">
                        {validationResult.error || 'No verified payment record found matching this ID.'}
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Admin Notes */}
          <div className="space-y-2">
            <Label htmlFor="adminNotes">Admin Notes (Optional)</Label>
            <Textarea
              id="adminNotes"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Add any internal notes about this approval..."
              className="resize-none h-20"
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <div className="flex-1">
            {validationResult && !validationResult.valid && (
              <Button
                type="button"
                variant="outline"
                onClick={handleSendEmail}
                disabled={isSendingEmail}
                className="w-full sm:w-auto text-amber-700 border-amber-200 hover:bg-amber-50"
              >
                {isSendingEmail ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                Request Verification
              </Button>
            )}
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isApproving}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleApprove}
              disabled={!validationResult?.valid || isApproving}
              className="w-full sm:w-auto"
            >
              {isApproving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Approve Subscription
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionVerificationModal;