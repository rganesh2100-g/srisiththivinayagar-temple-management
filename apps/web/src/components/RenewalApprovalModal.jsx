import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { toast } from 'sonner';
import { formatDateGerman } from '@/lib/germanTimeUtils.js';

const RenewalApprovalModal = ({ isOpen, onClose, renewal, onSuccess }) => {
  const [loading, setLoading] = useState(false);

  const user = renewal?.user || renewal?.expand?.user_id;

  const handleApprove = async () => {
    if (!renewal || !user) return;
    
    setLoading(true);
    try {
      const now = new Date();

      // Update the renewal record
      await pb.collection('renewals').update(renewal.id, {
        status: 'approved',
        approved_date: now.toISOString()
      }, { $autoCancel: false });

      // Update the user's subscription
      let newExpiry = new Date();
      
      if (user.subscription_expiry_date) {
        const currentExpiry = new Date(user.subscription_expiry_date);
        // If current expiry is in the future, append 30 days to it. Otherwise, start from today.
        if (currentExpiry > now) {
          newExpiry = currentExpiry;
        }
      }
      
      newExpiry.setDate(newExpiry.getDate() + 30);

      await pb.collection('users').update(user.id, {
        approval_status: 'approved',
        subscription_expiry_date: newExpiry.toISOString(),
        last_renewal_date: now.toISOString()
      }, { $autoCancel: false });

      toast.success('Renewal approved successfully');
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Error approving renewal:', error);
      toast.error('Failed to approve renewal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl text-primary flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Approve Subscription Renewal
          </DialogTitle>
          <DialogDescription>
            Review the renewal payment details before approving.
          </DialogDescription>
        </DialogHeader>

        {renewal && user && (
          <div className="bg-muted/50 p-4 rounded-lg space-y-3 my-4 border border-border">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">Member Name:</span>
              <span className="text-sm font-semibold">{user.name || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">Email:</span>
              <span className="text-sm font-semibold">{user.email}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">Renewal Amount:</span>
              <span className="text-sm font-bold text-primary">€{parseFloat(renewal.renewal_amount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">Submitted On:</span>
              <span className="text-sm font-semibold">{formatDateGerman(renewal.submitted_date || renewal.created)}</span>
            </div>
          </div>
        )}

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 mt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleApprove} disabled={loading} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Approving...
              </>
            ) : (
              'Approve Renewal'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RenewalApprovalModal;