import { useState, useEffect } from 'react';

export const useSubscriptionStatus = (user) => {
  const [status, setStatus] = useState({
    isPremium: false,
    isApproved: false,
    isExpired: false,
    isPendingApproval: false,
    isRenewalPending: false,
    expiryDate: null,
    daysUntilExpiry: null,
    loading: true
  });

  useEffect(() => {
    if (!user) {
      setStatus(s => ({ ...s, loading: false }));
      return;
    }

    // Robust check across all possible premium indicator fields
    const isPremium = 
      user.subscription_status === 'premium' || 
      user.user_role === 'Premium Membership' || 
      user.premium_status === 'Active' ||
      user.membershipTier === 'premium' || 
      user.membership_type === 'premium' ||
      user.account_type === 'Premium Member';
      
    const approvalStatus = user.approval_status;
    const expiryStr = user.subscription_expiry_date;
    
    let isExpired = false;
    let daysUntilExpiry = null;

    if (expiryStr) {
      const expiry = new Date(expiryStr);
      const now = new Date();
      const diffTime = expiry - now;
      daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      isExpired = diffTime < 0;
    } else if (isPremium && approvalStatus === 'approved') {
      // Legacy premium members might not have an expiry date yet.
      // We flag them as expired so they go through the renewal flow to set a date.
      isExpired = true; 
      daysUntilExpiry = -1;
    }

    setStatus({
      isPremium,
      isApproved: approvalStatus === 'approved',
      isExpired,
      isPendingApproval: approvalStatus === 'pending_approval',
      isRenewalPending: approvalStatus === 'renewal_pending_approval',
      expiryDate: expiryStr,
      daysUntilExpiry,
      loading: false
    });
  }, [user]);

  return status;
};