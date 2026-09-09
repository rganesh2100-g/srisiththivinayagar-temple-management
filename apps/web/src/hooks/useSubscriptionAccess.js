import { useState, useEffect } from 'react';
import pb from '@/lib/pocketbaseClient.js';
import apiServerClient from '@/utils/apiServerClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';

export const useSubscriptionAccess = (providedUserId) => {
  const { accountType, currentUser } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchSubscription = async () => {
      // Extract safe string ID to prevent [object Object] serialization errors
      let extractedId = providedUserId;
      if (typeof providedUserId === 'object' && providedUserId !== null) {
        extractedId = providedUserId.id;
      }
      
      // Fallback to currentUser.id if not provided or invalid
      if (!extractedId && currentUser?.id) {
        extractedId = currentUser.id;
      }

      const safeUserId = extractedId ? String(extractedId) : null;

      // 1. If no valid userId provided, skip
      if (!safeUserId || safeUserId === '[object Object]') {
        if (isMounted) {
          setSubscription(null);
          setIsPremium(false);
          setLoading(false);
        }
        return;
      }

      // 2. ADMIN BYPASS: Grant instant access regardless of actual subscription status
      const isAdmin = accountType === 'admin' || currentUser?.role === 'admin';
      if (isAdmin) {
        if (isMounted) {
          setSubscription({
            id: 'admin_override',
            plan_type: 'premium',
            status: 'active',
            is_admin: true
          });
          setIsPremium(true);
          setLoading(false);
        }
        return;
      }

      // 3. Normal user check
      try {
        setLoading(true);
        setError(null);

        // Fetch fresh user data (H3 /auth/me — lazy PG mirror happens server-side)
        const response = await apiServerClient.get('/auth/me');
        if (!response.ok) {
          throw new Error('Failed to load user profile');
        }
        const body = await response.json();
        const userRecord = body.user || null;

        if (isMounted && userRecord) {
          setIsPremium(userRecord.account_type === 'Premium Membership');
        }

        // Fetch active subscription for the user
        const records = await pb.collection('subscriptions').getFullList({
          filter: `user = "${safeUserId}" && status = "active"`,
          sort: '-created',
          $autoCancel: false
        });

        if (isMounted) {
          if (records.length > 0) {
            setSubscription(records[0]);
          } else {
            setSubscription(null);
          }
        }
      } catch (err) {
        console.error(`[useSubscriptionAccess] Error fetching subscription for userId: "${safeUserId}"`, err);
        if (isMounted) {
          setError(err);
          setSubscription(null);
          setIsPremium(false);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchSubscription();

    return () => {
      isMounted = false;
    };
  }, [providedUserId, accountType, currentUser]);

  return { subscription, isPremium, loading, error };
};