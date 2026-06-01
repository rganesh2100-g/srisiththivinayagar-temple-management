import { useState, useEffect } from 'react';
import pb from '@/lib/pocketbaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';

export const useUpgradeStatus = () => {
  const { currentUser } = useAuth();
  const [upgradeInfo, setUpgradeInfo] = useState({ status: 'free', subscription: null });
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    if (!currentUser) {
      setUpgradeInfo({ status: 'logged_out', subscription: null });
      setLoading(false);
      return;
    }

    try {
      // Check subscriptions collection first for the most accurate status
      // Note: Schema uses 'user' for the relation field
      const subRecords = await pb.collection('subscriptions').getList(1, 1, {
        filter: `user="${currentUser.id}"`,
        sort: '-created',
        $autoCancel: false
      });

      if (subRecords.items.length > 0) {
        const sub = subRecords.items[0];
        
        if (sub.status === 'pending') {
          setUpgradeInfo({ status: 'pending', subscription: sub });
        } else if (sub.status === 'active' || sub.status === 'approved') {
          const now = new Date();
          const renewalDate = new Date(sub.end_date || currentUser.subscription_expiry_date);
          
          // Check if subscription has expired
          if (renewalDate && renewalDate < now) {
            setUpgradeInfo({ status: 'expired', subscription: sub });
          } else {
            setUpgradeInfo({ status: 'premium', subscription: sub });
          }
        } else {
          setUpgradeInfo({ status: 'free', subscription: null });
        }
      } else {
        // Fallback to premium_upgrade_requests if no subscription record exists
        // Note: Schema uses 'email' for this collection
        const reqRecords = await pb.collection('premium_upgrade_requests').getList(1, 1, {
          filter: `email="${currentUser.email}"`,
          sort: '-created',
          $autoCancel: false
        });
        
        if (reqRecords.items.length > 0 && reqRecords.items[0].status === 'pending') {
          setUpgradeInfo({ status: 'pending', subscription: null });
        } else {
          // If user role is premium but no sub record exists (legacy data), treat as premium
          const isPremium = 
            currentUser.subscription_status === 'premium' || 
            currentUser.user_role === 'Premium Membership' || 
            currentUser.premium_status === 'Active' ||
            currentUser.membershipTier === 'premium' || 
            currentUser.membership_type === 'premium';

          if (isPremium) {
             setUpgradeInfo({ status: 'premium', subscription: null });
          } else {
             setUpgradeInfo({ status: 'free', subscription: null });
          }
        }
      }
    } catch (err) {
      console.error('Error fetching upgrade status:', err);
      setUpgradeInfo({ status: 'free', subscription: null });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [currentUser]);

  return { ...upgradeInfo, loading, refetchStatus: fetchStatus };
};