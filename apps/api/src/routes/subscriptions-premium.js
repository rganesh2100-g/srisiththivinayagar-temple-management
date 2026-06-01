import 'dotenv/config';
import express from 'express';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';

const router = express.Router();

logger.info('[SUBSCRIPTIONS-PREMIUM-ROUTES] ========================================');
logger.info('[SUBSCRIPTIONS-PREMIUM-ROUTES] Initializing Premium Subscriptions Routes');
logger.info('[SUBSCRIPTIONS-PREMIUM-ROUTES] ========================================');

/**
 * POST /subscriptions/premium - Create a premium subscription
 * 
 * Request body:
 *   - user (string, required): ID of the user (relation field)
 *   - plan_type (string, required): Must be 'premium'
 *   - billing_cycle (string, required): 'monthly' or 'yearly'
 *   - amount (number, required): Base subscription amount
 *   - total_amount (number, required): Total amount including custom donation
 *   - transaction_id (string, required): Transaction ID
 *   - transaction_ref (string, required): Transaction reference
 * 
 * Response:
 *   - { subscription_id: string, status: string, start_date: string, end_date: string, message: string }
 */
router.post('/', async (req, res) => {
  logger.info('[SUBSCRIPTIONS-PREMIUM] ========================================');
  logger.info('[SUBSCRIPTIONS-PREMIUM] POST / - Create premium subscription request received');
  logger.info('[SUBSCRIPTIONS-PREMIUM] Request body:', JSON.stringify(req.body, null, 2));

  const incomingUser = req.body.user || req.body.user_id || req.body.userId;
  const { plan_type, billing_cycle, amount, total_amount, transaction_id, transaction_ref, custom_donation } = req.body;

  // Step 1: Validate all required fields strictly
  logger.info('[SUBSCRIPTIONS-PREMIUM] Step 1: Validating all required fields');
  
  const userId = typeof incomingUser === 'object' ? incomingUser?.id : incomingUser;
  
  const missingFields = [];
  if (!userId || typeof userId !== 'string' || userId.trim().length === 0) missingFields.push('user (relation ID)');
  if (!plan_type || plan_type !== 'premium') missingFields.push("plan_type (must be 'premium')");
  if (!billing_cycle) missingFields.push('billing_cycle');
  if (amount === undefined || amount === null || typeof amount !== 'number' || amount <= 0) missingFields.push('amount (positive number)');
  if (total_amount === undefined || total_amount === null || typeof total_amount !== 'number' || total_amount <= 0) missingFields.push('total_amount (positive number)');
  if (!transaction_id || typeof transaction_id !== 'string' || transaction_id.trim().length === 0) missingFields.push('transaction_id');
  if (!transaction_ref || typeof transaction_ref !== 'string' || transaction_ref.trim().length === 0) missingFields.push('transaction_ref');

  if (missingFields.length > 0) {
    logger.warn(`[SUBSCRIPTIONS-PREMIUM] ✗ Validation failed. Missing required fields: ${missingFields.join(', ')}`);
    return res.status(400).json({ 
      error: 'Validation Failed', 
      message: `Missing or invalid required fields: ${missingFields.join(', ')}` 
    });
  }

  logger.info('[SUBSCRIPTIONS-PREMIUM] ✓ All required fields validated successfully');

  // Step 2: Verify user exists
  logger.info('[SUBSCRIPTIONS-PREMIUM] Step 2: Verifying user exists');
  
  let userRecord;
  try {
    userRecord = await pb.collection('users').getOne(userId, { $autoCancel: false });
    logger.info(`[SUBSCRIPTIONS-PREMIUM] ✓ User verified: ${userRecord.id} (${userRecord.email})`);
  } catch (err) {
    logger.warn(`[SUBSCRIPTIONS-PREMIUM] ✗ User not found: ${userId}`);
    return res.status(404).json({ error: 'Not Found', message: `User with ID "${userId}" not found` });
  }

  // Step 3: Create subscription record in PocketBase
  logger.info('[SUBSCRIPTIONS-PREMIUM] Step 3: Creating subscription record in PocketBase');
  
  const payload = {
    user: userId.trim(),
    plan_type: plan_type,
    billing_cycle: billing_cycle,
    amount: amount,
    custom_donation: custom_donation || (total_amount > amount ? total_amount - amount : 0),
    total_amount: total_amount,
    transaction_id: transaction_id.trim(),
    transaction_ref: transaction_ref.trim(),
    status: 'pending',
  };

  logger.info('[SUBSCRIPTIONS-PREMIUM] Payload to insert:', JSON.stringify(payload, null, 2));

  let subscription;
  try {
    subscription = await pb.collection('subscriptions').create(payload, { $autoCancel: false });
  } catch (pbError) {
    logger.error('[SUBSCRIPTIONS-PREMIUM] ✗ POCKETBASE ERROR - SUBSCRIPTION CREATION FAILED');
    logger.error(`[SUBSCRIPTIONS-PREMIUM] Error message: ${pbError.message}`);
    
    if (pbError.data && pbError.data.data) {
      logger.error('[SUBSCRIPTIONS-PREMIUM] Validation errors:', JSON.stringify(pbError.data.data, null, 2));
    }
    
    return res.status(500).json({ 
      error: 'Database Error', 
      message: 'Failed to create subscription record.', 
      details: pbError.data?.data || pbError.message 
    });
  }

  logger.info('[SUBSCRIPTIONS-PREMIUM] ✓ Subscription record created successfully');
  logger.info(`[SUBSCRIPTIONS-PREMIUM]   - Subscription ID: ${subscription.id}`);

  // Step 4: Return response
  res.status(201).json({
    subscription_id: subscription.id,
    status: subscription.status,
    start_date: subscription.start_date || null,
    end_date: subscription.end_date || null,
    message: 'Premium subscription created. Awaiting admin approval.',
  });
});

export default router;