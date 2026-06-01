import 'dotenv/config';
import express from 'express';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';

const router = express.Router();

logger.info('[SUBSCRIPTIONS-USER-ROUTES] ========================================');
logger.info('[SUBSCRIPTIONS-USER-ROUTES] Initializing User Subscriptions Routes');
logger.info('[SUBSCRIPTIONS-USER-ROUTES] ========================================');

/**
 * GET /subscriptions/user/:user_id - Get subscription for a user
 * 
 * Route Parameters:
 *   - user_id (string, required): ID of the user
 * 
 * Response:
 *   - { subscription_id: string, user_id: string, membership_type: string, amount: number, transaction_id: string, transaction_ref: string, start_date: string, end_date: string, approval_status: string }
 *   - null (status 200) if no subscription found
 * 
 * Security: No authentication required
 */
router.get('/:user_id', async (req, res) => {
  logger.info('[SUBSCRIPTIONS-USER] ========================================');
  logger.info('[SUBSCRIPTIONS-USER] GET /:user_id - Get user subscription request received');
  logger.info('[SUBSCRIPTIONS-USER] ========================================');

  const { user_id } = req.params;

  // Step 1: Validate user_id parameter
  logger.info('[SUBSCRIPTIONS-USER] Step 1: Validating user_id parameter');
  if (!user_id || typeof user_id !== 'string' || user_id.trim().length === 0) {
    logger.warn('[SUBSCRIPTIONS-USER] ✗ Validation failed: Missing or invalid user_id');
    logger.warn(`[SUBSCRIPTIONS-USER]   - user_id received: ${JSON.stringify(user_id)}`);
    throw new Error('user_id is required and must be a non-empty string');
  }
  logger.info(`[SUBSCRIPTIONS-USER] ✓ user_id validated: ${user_id}`);

  // Step 2: Build filter string for PocketBase relation field
  logger.info('[SUBSCRIPTIONS-USER] Step 2: Building filter string for PocketBase query');
  // CRITICAL: Use 'user' (not 'user.id') for relation field, and 'approval_status' (not 'status')
  const filterString = `user = "${user_id}" && approval_status = "active"`;
  logger.info(`[SUBSCRIPTIONS-USER] ✓ Filter string built: ${filterString}`);
  logger.info('[SUBSCRIPTIONS-USER]   - Relation field: user (not user.id)');
  logger.info('[SUBSCRIPTIONS-USER]   - Status field: approval_status (not status)');
  logger.info('[SUBSCRIPTIONS-USER]   - Status value: "active"');

  // Step 3: Fetch subscription record from PocketBase
  logger.info('[SUBSCRIPTIONS-USER] Step 3: Fetching subscription record from PocketBase');
  logger.info('[SUBSCRIPTIONS-USER]   - Collection: subscriptions');
  logger.info(`[SUBSCRIPTIONS-USER]   - Filter: ${filterString}`);

  let subscription;
  try {
    // Use getFullList with filter to find matching subscriptions
    const subscriptions = await pb.collection('subscriptions').getFullList({
      filter: filterString,
      limit: 1, // Only need the first match
    });

    if (subscriptions && subscriptions.length > 0) {
      subscription = subscriptions[0];
      logger.info('[SUBSCRIPTIONS-USER] ✓ Subscription record found');
      logger.info(`[SUBSCRIPTIONS-USER]   - Subscription ID: ${subscription.id}`);
      logger.info(`[SUBSCRIPTIONS-USER]   - User ID: ${subscription.user}`);
      logger.info(`[SUBSCRIPTIONS-USER]   - Membership Type: ${subscription.membership_type}`);
      logger.info(`[SUBSCRIPTIONS-USER]   - Amount: €${subscription.amount || 0}`);
      logger.info(`[SUBSCRIPTIONS-USER]   - Approval Status: ${subscription.approval_status}`);
    } else {
      logger.info('[SUBSCRIPTIONS-USER] ℹ No subscription record found');
      logger.info(`[SUBSCRIPTIONS-USER]   - User ID: ${user_id}`);
      logger.info('[SUBSCRIPTIONS-USER]   - This is normal for users without active subscriptions');
      subscription = null;
    }
  } catch (error) {
    logger.warn('[SUBSCRIPTIONS-USER] ⚠ Error querying subscriptions');
    logger.warn(`[SUBSCRIPTIONS-USER]   - Error message: ${error.message}`);
    logger.warn('[SUBSCRIPTIONS-USER]   - Treating as no subscription found');
    subscription = null;
  }

  // Step 4: Return response
  logger.info('[SUBSCRIPTIONS-USER] ========================================');
  if (subscription) {
    logger.info('[SUBSCRIPTIONS-USER] ✓ GET USER SUBSCRIPTION COMPLETED SUCCESSFULLY');
    logger.info('[SUBSCRIPTIONS-USER] ========================================');
    logger.info(`[SUBSCRIPTIONS-USER] Subscription ID: ${subscription.id}`);
    logger.info(`[SUBSCRIPTIONS-USER] User ID: ${subscription.user}`);
    logger.info(`[SUBSCRIPTIONS-USER] Membership Type: ${subscription.membership_type}`);

    res.json({
      subscription_id: subscription.id,
      user_id: subscription.user,
      membership_type: subscription.membership_type,
      amount: subscription.amount || 0,
      transaction_id: subscription.transaction_id || null,
      transaction_ref: subscription.transaction_ref || null,
      start_date: subscription.start_date || null,
      end_date: subscription.end_date || null,
      approval_status: subscription.approval_status,
    });
  } else {
    logger.info('[SUBSCRIPTIONS-USER] ℹ GET USER SUBSCRIPTION COMPLETED - NO SUBSCRIPTION FOUND');
    logger.info('[SUBSCRIPTIONS-USER] ========================================');
    logger.info(`[SUBSCRIPTIONS-USER] User ID: ${user_id}`);
    logger.info('[SUBSCRIPTIONS-USER] Result: No active subscription');

    // Return null to indicate no subscription found (status 200, not error)
    res.json(null);
  }
});

export default router;