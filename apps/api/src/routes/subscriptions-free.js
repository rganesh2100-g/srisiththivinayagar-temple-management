import 'dotenv/config';
import express from 'express';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';

const router = express.Router();

logger.info('[SUBSCRIPTIONS-FREE-ROUTES] ========================================');
logger.info('[SUBSCRIPTIONS-FREE-ROUTES] Initializing Free Subscriptions Routes');
logger.info('[SUBSCRIPTIONS-FREE-ROUTES] ========================================');

/**
 * POST /subscriptions/free - Create a free subscription
 * 
 * Request body:
 *   - user_id (string, required): ID of the user
 *   - membership_type (string, required): Must be 'free'
 * 
 * Response:
 *   - { subscription_id: string, approval_status: string, start_date: string, end_date: string, message: string }
 * 
 * Security: No authentication required
 */
router.post('/', async (req, res) => {
  logger.info('[SUBSCRIPTIONS-FREE] ========================================');
  logger.info('[SUBSCRIPTIONS-FREE] POST / - Create free subscription request received');
  logger.info('[SUBSCRIPTIONS-FREE] ========================================');
  logger.info('[SUBSCRIPTIONS-FREE] Request body:', JSON.stringify(req.body, null, 2));

  const { user_id, membership_type } = req.body;

  // Step 1: Validate user_id
  logger.info('[SUBSCRIPTIONS-FREE] Step 1: Validating user_id');
  if (!user_id || typeof user_id !== 'string' || user_id.trim().length === 0) {
    logger.warn('[SUBSCRIPTIONS-FREE] ✗ Validation failed: Missing or invalid user_id');
    logger.warn(`[SUBSCRIPTIONS-FREE]   - user_id received: ${JSON.stringify(user_id)}`);
    throw new Error('user_id is required and must be a non-empty string');
  }
  logger.info(`[SUBSCRIPTIONS-FREE] ✓ user_id validated: ${user_id}`);

  // Step 2: Validate membership_type
  logger.info('[SUBSCRIPTIONS-FREE] Step 2: Validating membership_type');
  if (membership_type !== 'free') {
    logger.warn('[SUBSCRIPTIONS-FREE] ✗ Validation failed: membership_type must be "free"');
    logger.warn(`[SUBSCRIPTIONS-FREE]   - membership_type received: ${JSON.stringify(membership_type)}`);
    throw new Error('membership_type must be "free"');
  }
  logger.info('[SUBSCRIPTIONS-FREE] ✓ membership_type validated: free');

  logger.info('[SUBSCRIPTIONS-FREE] ✓ All input parameters validated successfully');

  // Step 3: Verify user exists
  logger.info('[SUBSCRIPTIONS-FREE] Step 3: Verifying user exists');
  logger.info(`[SUBSCRIPTIONS-FREE]   - User ID to verify: ${user_id}`);
  
  const user = await pb.collection('users').getOne(user_id);
  
  if (!user) {
    logger.warn('[SUBSCRIPTIONS-FREE] ✗ User not found');
    logger.warn(`[SUBSCRIPTIONS-FREE]   - User ID: ${user_id}`);
    throw new Error(`User with ID "${user_id}" not found`);
  }
  
  logger.info('[SUBSCRIPTIONS-FREE] ✓ User verified');
  logger.info(`[SUBSCRIPTIONS-FREE]   - User ID: ${user.id}`);
  logger.info(`[SUBSCRIPTIONS-FREE]   - User email: ${user.email}`);
  logger.info(`[SUBSCRIPTIONS-FREE]   - User name: ${user.name}`);

  // Step 4: Create subscription record in PocketBase
  logger.info('[SUBSCRIPTIONS-FREE] Step 4: Creating subscription record in PocketBase');
  logger.info('[SUBSCRIPTIONS-FREE]   - Collection: subscriptions');
  logger.info('[SUBSCRIPTIONS-FREE]   - REQUIRED FIELDS:');
  logger.info(`[SUBSCRIPTIONS-FREE]     - user: ${user_id} (relation field)`);
  logger.info('[SUBSCRIPTIONS-FREE]     - membership_type: free');
  logger.info('[SUBSCRIPTIONS-FREE]     - amount: 0');
  logger.info('[SUBSCRIPTIONS-FREE]     - approval_status: active');
  logger.info('[SUBSCRIPTIONS-FREE]   - NOTE: start_date and end_date will be auto-populated by hook');

  const subscription = await pb.collection('subscriptions').create({
    user: user_id.trim(),
    membership_type: 'free',
    amount: 0,
    approval_status: 'active',
  });

  logger.info('[SUBSCRIPTIONS-FREE] ✓ Subscription record created successfully');
  logger.info(`[SUBSCRIPTIONS-FREE]   - Subscription ID: ${subscription.id}`);
  logger.info(`[SUBSCRIPTIONS-FREE]   - User ID (relation): ${subscription.user}`);
  logger.info(`[SUBSCRIPTIONS-FREE]   - Membership Type: ${subscription.membership_type}`);
  logger.info(`[SUBSCRIPTIONS-FREE]   - Amount: ${subscription.amount}`);
  logger.info(`[SUBSCRIPTIONS-FREE]   - Approval Status: ${subscription.approval_status}`);
  logger.info(`[SUBSCRIPTIONS-FREE]   - Start Date: ${subscription.start_date || 'N/A (auto-populated by hook)'}`);
  logger.info(`[SUBSCRIPTIONS-FREE]   - End Date: ${subscription.end_date || 'N/A (auto-populated by hook)'}`);

  // Step 5: Return response
  logger.info('[SUBSCRIPTIONS-FREE] ========================================');
  logger.info('[SUBSCRIPTIONS-FREE] ✓ FREE SUBSCRIPTION CREATED SUCCESSFULLY');
  logger.info('[SUBSCRIPTIONS-FREE] ========================================');
  logger.info(`[SUBSCRIPTIONS-FREE] Subscription ID: ${subscription.id}`);
  logger.info(`[SUBSCRIPTIONS-FREE] User ID: ${subscription.user}`);
  logger.info(`[SUBSCRIPTIONS-FREE] Approval Status: ${subscription.approval_status}`);

  res.status(201).json({
    subscription_id: subscription.id,
    approval_status: subscription.approval_status,
    start_date: subscription.start_date || null,
    end_date: subscription.end_date || null,
    message: 'Free subscription created',
  });
});

export default router;