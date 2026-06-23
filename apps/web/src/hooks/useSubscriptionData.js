import { useState, useEffect } from 'react';
import pb from '@/lib/pocketbaseClient.js';

// Module-level cache for request deduplication and data caching
const subscriptionCache = new Map();
const pendingRequests = new Map();

export const useSubscriptionData = (userId) => {
  const [data, setData] = useState(() => subscriptionCache.get(userId) || null);
  const [loading, setLoading] = useState(!subscriptionCache.has(userId) && !!userId);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // 1. Return cached data immediately if available
    if (subscriptionCache.has(userId)) {
      setData(subscriptionCache.get(userId));
      setLoading(false);
      return;
    }

    // 2. Deduplicate requests: if a request is already in flight for this user, wait for it
    if (pendingRequests.has(userId)) {
      pendingRequests.get(userId)
        .then(res => {
          setData(res);
          setError(null);
        })
        .catch(err => {
          if (err.status !== 404) setError(err);
        })
        .finally(() => setLoading(false));
      return;
    }

    setLoading(true);
    
    const promise = pb.collection('subscriptions').getFirstListItem(`user="${userId}" && status="active"`, {
      fields: 'id,plan_type,status,start_date,end_date',
      $autoCancel: false
    });

    pendingRequests.set(userId, promise);

    promise
      .then(res => {
        subscriptionCache.set(userId, res);
        setData(res);
        setError(null);
      })
      .catch(err => {
        // 404 just means no active subscription found, which is a valid state
        if (err.status !== 404) {
          setError(err);
        }
        setData(null);
      })
      .finally(() => {
        setLoading(false);
        pendingRequests.delete(userId);
      });
  }, [userId]);

  return { data, loading, error };
};
