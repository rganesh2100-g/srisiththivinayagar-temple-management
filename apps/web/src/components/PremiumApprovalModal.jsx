import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Loader2, CheckCircle } from 'lucide-react';
import pb from '@/lib/pocketbaseClient.js';
import { toast } from 'sonner';
import { formatDateGerman } from '@/lib/germanTimeUtils.js';

const PremiumApprovalModal = ({ isOpen, onClose, pendingItem, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const user = pendingItem?.user;

  const handleApprove = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const now = new Date();
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);

      // 1. Update User
      await pb.collection('users').update(user.id, {
        approval_status: 'approved',
        subscription_expiry_date: expiryDate.toISOString(),
        account_type: 'Premium Membership'
      }, { $autoCancel: false });

      // 2. Update Request if it exists
      if (pendingItem.type === 'request') {
        await pb.collection('premium_upgrade_requests').update(pendingItem.data.id, {
          status: 'approved',
          admin_notes: 'Approved via admin panel'
        }, { $autoCancel: false });
      }

      // 3. Update Subscription if it exists
      if (pendingItem.type === 'subscription') {
        await pb.collection('subscriptions').update(pendingItem.data.id, {
          status: 'Approved',
          approved_date: now.toISOString()
        }, { $autoCancel: false });
      }

      // 4. Catch-all: Try to find and approve any dangling subscriptions for this user
      try {
        const subs = await pb.collection('subscriptions').getFullList({
          filter: `user = '${user.id}' && status = 'Pending'`,
          $autoCancel: false
        });
        for (const sub of subs) {
          await pb.collection('subscriptions').update(sub.id, {
            status: 'Approved',
            approved_date: now.toISOString()
          }, { $autoCancel: false });
        }
      } catch (e) {
        console.warn('Non-fatal: Could not update dangling subscriptions', e);
      }

      // 5. Catch-all: Try to find and approve any dangling requests for this user
      try {
        const reqs = await pb.collection('premium_upgrade_requests').getFullList({
          filter: `user_id = '${user.id}' && status = 'pending'`,
          $autoCancel: false
        });
        for (const req of reqs) {
          await pb.collection('premium_upgrade_requests').update(req.id, {
            status: 'approved',
            admin_notes: 'Auto-approved alongside user approval'
          }, { $autoCancel: false });
        }
      } catch (e) {
        console.warn('Non-fatal: Could not update dangling requests', e);
      }

      toast.success('Account type upgraded to Premium Membership');
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Error approving premium member:', error);
      toast.error('Failed to approve member. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl text-primary flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Approve Premium Member
          </DialogTitle>
          <DialogDescription>
            Review the member's details before approving their premium access.
          </DialogDescription>
        </DialogHeader>

        {user && (
          <div className="bg-muted/50 p-4 rounded-lg space-y-3 my-4 border border-border">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">Name:</span>
              <span className="text-sm font-semibold">{user.name || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">Email:</span>
              <span className="text-sm font-semibold">{user.email}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">Signup Date:</span>
              <span className="text-sm font-semibold">{formatDateGerman(user.created)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">Membership:</span>
              <span className="text-sm font-semibold capitalize">{user.membershipTier || user.membership_type || 'Premium'}</span>
            </div>
            {pendingItem?.data?.transaction_id && (
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">Transaction ID:</span>
                <span className="text-sm font-mono bg-background px-2 py-0.5 rounded border border-border">
                  {pendingItem.data.transaction_id}
                </span>
              </div>
            )}
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
              'Approve Member'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PremiumApprovalModal;