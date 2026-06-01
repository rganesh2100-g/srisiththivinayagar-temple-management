import { useState, useEffect, useCallback } from 'react';
import pb from '@/lib/pocketbaseClient';

export const usePaymentAccount = () => {
  const [paymentAccount, setPaymentAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPaymentAccount = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch the most recently created payment account
      const record = await pb.collection('payment_accounts').getFirstListItem('', {
        sort: '-created',
        $autoCancel: false
      });
      setPaymentAccount(record);
    } catch (err) {
      console.error('[usePaymentAccount] Error fetching payment account:', err);
      if (err.status === 404) {
        setError('No payment account details have been configured yet.');
      } else {
        setError('Unable to load payment details. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPaymentAccount();
  }, [fetchPaymentAccount]);

  return { paymentAccount, loading, error, refetch: fetchPaymentAccount };
};