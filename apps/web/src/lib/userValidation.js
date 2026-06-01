import pb from '@/lib/pocketbaseClient.js';
import logger from '@/lib/logger.js';

/**
 * Validates that a user exists with an even more robust retry 
 * and a direct collection check to bypass potential indexing lag.
 */
export const validateUserExists = async (currentUser, maxRetries = 5, delay = 2000) => {
  if (!currentUser || !currentUser.id) {
    logger.error('User validation failed: No user ID provided');
    return { isValid: false, error: 'User not authenticated' };
  }

  const userId = currentUser.id;
  logger.info(`[USER-VALIDATION] Validating user_id: ${userId}`);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Use getOne with $autoCancel false to ensure the request finishes
      const userRecord = await pb.collection('users').getOne(userId, { 
        $autoCancel: false,
        requestKey: null // Prevents canceling previous attempts
      });
      
      if (userRecord) {
        logger.info(`[USER-VALIDATION] ✓ User verified on attempt ${attempt}`);
        return { isValid: true, user: userRecord };
      }
    } catch (error) {
      if (error.status === 404 && attempt < maxRetries) {
        // Increased the delay slightly for the last few attempts
        const waitTime = attempt > 3 ? delay + 1000 : delay;
        logger.warn(`[USER-VALIDATION] ⚠ Attempt ${attempt} (404). Retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      logger.error(`[USER-VALIDATION] ✗ Final attempt ${attempt} failed: ${error.message}`);
      
      if (attempt === maxRetries) {
        return {
          isValid: false,
          error: "Database record is taking too long to appear. Please try logging in manually."
        };
      }
    }
  }

  return { isValid: false, error: 'Database timeout' };
};