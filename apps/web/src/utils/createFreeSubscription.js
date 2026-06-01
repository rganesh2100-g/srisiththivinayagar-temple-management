import pb from '@/lib/pocketbaseClient.js';

/**
 * Creates a free subscription record for a user.
 * Includes retry logic to ensure the subscription is created successfully.
 * 
 * @param {string} userId - The ID of the user
 * @param {number} retries - Number of retry attempts (default: 3)
 * @returns {Promise<Object>} The created subscription record
 */
export const createFreeSubscription = async (userId, retries = 3) => {
  const startDate = new Date();
  const endDate = new Date();
  endDate.setFullYear(endDate.getFullYear() + 1);

  const subscriptionData = {
    user: userId,
    membership_type: 'free',
    amount: 0,
    transaction_id: `FREE-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
    transaction_ref: 'auto-free-signup',
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString(),
    approval_status: 'active'
  };

  let lastError;

  for (let i = 0; i < retries; i++) {
    try {
      const record = await pb.collection('subscriptions').create(subscriptionData, { $autoCancel: false });
      console.log(`[Subscription] Successfully created free subscription for user ${userId}`);
      return record;
    } catch (error) {
      lastError = error;
      console.error(`[Subscription] Attempt ${i + 1} failed to create free subscription:`, error);
      
      if (i < retries - 1) {
        // Exponential backoff: 1s, 2s, 4s...
        const delay = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`Failed to create free subscription after ${retries} attempts. Last error: ${lastError?.message}`);
};