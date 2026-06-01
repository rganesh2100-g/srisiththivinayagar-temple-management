import 'dotenv/config';
import express from 'express';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';

const router = express.Router();

logger.info('[SUBSCRIPTION-ROUTES] ========================================');
logger.info('[SUBSCRIPTION-ROUTES] Initializing Subscription Routes');
logger.info('[SUBSCRIPTION-ROUTES] ========================================');

/**
 * Helper function to validate email format
 */
const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return false;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Helper function to validate date format (YYYY-MM-DD)
 */
const isValidDateFormat = (dateString) => {
  if (!dateString || typeof dateString !== 'string') return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

/**
 * Helper function to generate transaction_ref if missing
 * Pattern: REF_{timestamp}_{random6digits}
 */
const generateTransactionRef = () => {
  const timestamp = Date.now();
  const random = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
  return `REF_${timestamp}_${random}`;
};

/**
 * POST /subscription/create - Create a new payment record
 *
 * Request body:
 *   - user (string, required): ID of the user
 *   - amount (number, required): Payment amount
 *   - plan_type (string, optional): Type of plan (defaults to 'premium')
 *   - billing_cycle (string, required): Billing cycle (monthly, quarterly, yearly)
 *   - custom_donation (number, optional): Custom donation amount
 *   - total_amount (number, required): Total amount (amount + custom_donation)
 *   - start_date (string, required): Start date (YYYY-MM-DD)
 *   - end_date (string, required): End date (YYYY-MM-DD)
 *   - transaction_id (string, required): User-provided transaction ID (MUST NOT be empty)
 *   - transaction_ref (string, optional): Transaction reference (auto-generated if missing)
 *
 * Response:
 *   - { success: true, paymentId: string, message: string }
 *
 * Security: No authentication required
 */
router.post('/create', async (req, res) => {
  logger.info('[SUBSCRIPTION-CREATE] ========================================');
  logger.info('[SUBSCRIPTION-CREATE] POST /create - Create payment request received');
  logger.info('[SUBSCRIPTION-CREATE] ========================================');
  logger.info('[SUBSCRIPTION-CREATE] Request body:', JSON.stringify(req.body, null, 2));

  const {
    user,
    amount,
    plan_type,
    billing_cycle,
    custom_donation,
    total_amount,
    start_date,
    end_date,
    transaction_id,
    transaction_ref,
  } = req.body;

  // Step 1: Validate all required fields
  logger.info('[SUBSCRIPTION-CREATE] Step 1: Validating all required fields');

  const userId = typeof user === 'object' ? user?.id : user;
  if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
    logger.warn('[SUBSCRIPTION-CREATE] ✗ Validation failed: Missing or invalid user');
    logger.warn(`[SUBSCRIPTION-CREATE]   - user received: ${JSON.stringify(user)}`);
    throw new Error('User ID is required');
  }
  logger.info(`[SUBSCRIPTION-CREATE] ✓ user validated: ${userId}`);

  if (amount === undefined || amount === null || typeof amount !== 'number' || amount <= 0) {
    logger.warn('[SUBSCRIPTION-CREATE] ✗ Validation failed: Invalid amount');
    throw new Error('Missing required field: amount');
  }
  logger.info(`[SUBSCRIPTION-CREATE] ✓ amount validated: €${amount}`);

  if (!billing_cycle || typeof billing_cycle !== 'string' || billing_cycle.trim().length === 0) {
    logger.warn('[SUBSCRIPTION-CREATE] ✗ Validation failed: Missing or invalid billing_cycle');
    throw new Error('Missing required field: billing_cycle');
  }
  logger.info(`[SUBSCRIPTION-CREATE] ✓ billing_cycle validated: ${billing_cycle}`);

  if (total_amount === undefined || total_amount === null || typeof total_amount !== 'number' || total_amount <= 0) {
    logger.warn('[SUBSCRIPTION-CREATE] ✗ Validation failed: Invalid total_amount');
    throw new Error('Missing required field: total_amount');
  }
  logger.info(`[SUBSCRIPTION-CREATE] ✓ total_amount validated: €${total_amount}`);

  if (!isValidDateFormat(start_date)) {
    logger.warn('[SUBSCRIPTION-CREATE] ✗ Validation failed: Invalid start_date');
    throw new Error('Missing required field: start_date');
  }
  logger.info(`[SUBSCRIPTION-CREATE] ✓ start_date validated: ${start_date}`);

  if (!isValidDateFormat(end_date)) {
    logger.warn('[SUBSCRIPTION-CREATE] ✗ Validation failed: Invalid end_date');
    throw new Error('Missing required field: end_date');
  }
  logger.info(`[SUBSCRIPTION-CREATE] ✓ end_date validated: ${end_date}`);

  // Step 2: Validate transaction_id (CRITICAL - MUST NOT be empty)
  logger.info('[SUBSCRIPTION-CREATE] Step 2: Validating transaction_id (CRITICAL)');
  if (!transaction_id || typeof transaction_id !== 'string' || transaction_id.trim().length === 0) {
    logger.error('[SUBSCRIPTION-CREATE] ✗ VALIDATION FAILED: transaction_id is REQUIRED and MUST NOT be empty');
    logger.error(`[SUBSCRIPTION-CREATE]   - transaction_id received: ${JSON.stringify(transaction_id)}`);
    logger.error('[SUBSCRIPTION-CREATE]   - transaction_id must be a non-empty string');
    throw new Error('Missing required field: transaction_id (MUST NOT be empty)');
  }
  const finalTransactionId = transaction_id.trim();
  logger.info('[SUBSCRIPTION-CREATE] ✓ transaction_id validated (CRITICAL CHECK PASSED)');
  logger.info(`[SUBSCRIPTION-CREATE]   - transaction_id: ${finalTransactionId}`);
  logger.info('[SUBSCRIPTION-CREATE]   - Using user-provided transaction_id AS-IS (no modification)');

  // Step 3: Handle transaction_ref (auto-generate if missing)
  logger.info('[SUBSCRIPTION-CREATE] Step 3: Processing transaction_ref');
  let finalTransactionRef = transaction_ref?.trim();
  
  if (!finalTransactionRef) {
    finalTransactionRef = generateTransactionRef();
    logger.info('[SUBSCRIPTION-CREATE] ✓ transaction_ref auto-generated (was missing)');
    logger.info(`[SUBSCRIPTION-CREATE]   - Generated transaction_ref: ${finalTransactionRef}`);
    logger.info('[SUBSCRIPTION-CREATE]   - Pattern: REF_{timestamp}_{random6digits}');
  } else {
    logger.info('[SUBSCRIPTION-CREATE] ✓ transaction_ref provided in request');
    logger.info(`[SUBSCRIPTION-CREATE]   - Provided transaction_ref: ${finalTransactionRef}`);
  }

  logger.info('[SUBSCRIPTION-CREATE] ✓ All required fields validated successfully');

  // Step 4: Verify user exists in users collection
  logger.info('[SUBSCRIPTION-CREATE] Step 4: Verifying user exists in users collection');
  logger.info(`[SUBSCRIPTION-CREATE]   - User ID to verify: ${userId}`);
  logger.info('[SUBSCRIPTION-CREATE]   - Collection: users');

  let userRecord;
  try {
    userRecord = await pb.collection('users').getOne(userId);
    logger.info('[SUBSCRIPTION-CREATE] ✓ User record found in users collection');
    logger.info(`[SUBSCRIPTION-CREATE]   - User ID: ${userRecord.id}`);
    logger.info(`[SUBSCRIPTION-CREATE]   - User email: ${userRecord.email}`);
    logger.info(`[SUBSCRIPTION-CREATE]   - User name: ${userRecord.name || 'N/A'}`);
  } catch (error) {
    logger.error('[SUBSCRIPTION-CREATE] ✗ User record NOT found in users collection');
    logger.error(`[SUBSCRIPTION-CREATE]   - User ID: ${userId}`);
    logger.error(`[SUBSCRIPTION-CREATE]   - Error: ${error.message}`);
    logger.error(`[SUBSCRIPTION-CREATE]   - Error status: ${error.status || 'unknown'}`);
    throw new Error(`User with ID "${userId}" not found in users collection`, { cause: error });
  }

  // Step 5: Create subscription record in 'subscriptions' collection
  logger.info('[SUBSCRIPTION-CREATE] Step 5: Creating subscription record in PocketBase');
  logger.info('[SUBSCRIPTION-CREATE]   - Collection: subscriptions');
  logger.info('[SUBSCRIPTION-CREATE]   - Fields to create:');
  logger.info(`[SUBSCRIPTION-CREATE]     - user (relation): ${userId}`);
  logger.info(`[SUBSCRIPTION-CREATE]     - amount: €${amount}`);
  logger.info(`[SUBSCRIPTION-CREATE]     - plan_type: ${plan_type || 'premium'}`);
  logger.info('[SUBSCRIPTION-CREATE]     - status: pending');
  logger.info(`[SUBSCRIPTION-CREATE]     - transaction_id: ${finalTransactionId} (USER-PROVIDED, AS-IS)`);
  logger.info(`[SUBSCRIPTION-CREATE]     - transaction_ref: ${finalTransactionRef} (AUTO-GENERATED if needed)`);
  logger.info(`[SUBSCRIPTION-CREATE]     - billing_cycle: ${billing_cycle}`);
  logger.info(`[SUBSCRIPTION-CREATE]     - custom_donation: €${custom_donation || 0}`);
  logger.info(`[SUBSCRIPTION-CREATE]     - total_amount: €${total_amount}`);
  logger.info(`[SUBSCRIPTION-CREATE]     - start_date: ${start_date}`);
  logger.info(`[SUBSCRIPTION-CREATE]     - end_date: ${end_date}`);

  const subscriptionRecord = await pb.collection('subscriptions').create({
    user: userId.trim(),
    amount: amount,
    plan_type: plan_type || 'premium',
    status: 'pending',
    transaction_id: finalTransactionId,
    transaction_ref: finalTransactionRef,
    billing_cycle: billing_cycle.trim(),
    custom_donation: custom_donation || 0,
    total_amount: total_amount,
    start_date: start_date,
    end_date: end_date,
  });

  logger.info('[SUBSCRIPTION-CREATE] ✓ Subscription record created successfully');
  logger.info(`[SUBSCRIPTION-CREATE]   - Subscription ID: ${subscriptionRecord.id}`);
  logger.info(`[SUBSCRIPTION-CREATE]   - User (relation): ${subscriptionRecord.user}`);
  logger.info(`[SUBSCRIPTION-CREATE]   - Amount: €${subscriptionRecord.amount}`);
  logger.info(`[SUBSCRIPTION-CREATE]   - Status: ${subscriptionRecord.status}`);
  logger.info(`[SUBSCRIPTION-CREATE]   - Transaction ID: ${subscriptionRecord.transaction_id}`);
  logger.info(`[SUBSCRIPTION-CREATE]   - Transaction Ref: ${subscriptionRecord.transaction_ref}`);
  logger.info(`[SUBSCRIPTION-CREATE]   - Billing Cycle: ${subscriptionRecord.billing_cycle}`);
  logger.info(`[SUBSCRIPTION-CREATE]   - Custom Donation: €${subscriptionRecord.custom_donation}`);
  logger.info(`[SUBSCRIPTION-CREATE]   - Total Amount: €${subscriptionRecord.total_amount}`);
  logger.info(`[SUBSCRIPTION-CREATE]   - Start Date: ${subscriptionRecord.start_date}`);
  logger.info(`[SUBSCRIPTION-CREATE]   - End Date: ${subscriptionRecord.end_date}`);

  // Step 6: Return success response
  logger.info('[SUBSCRIPTION-CREATE] ========================================');
  logger.info('[SUBSCRIPTION-CREATE] ✓ SUBSCRIPTION CREATED SUCCESSFULLY');
  logger.info('[SUBSCRIPTION-CREATE] ========================================');
  logger.info(`[SUBSCRIPTION-CREATE] Subscription ID: ${subscriptionRecord.id}`);
  logger.info(`[SUBSCRIPTION-CREATE] User ID: ${userId}`);
  logger.info(`[SUBSCRIPTION-CREATE] Amount: €${amount}`);
  logger.info(`[SUBSCRIPTION-CREATE] Status: pending`);
  logger.info(`[SUBSCRIPTION-CREATE] Transaction ID: ${finalTransactionId} (USER-PROVIDED)`);
  logger.info(`[SUBSCRIPTION-CREATE] Transaction Ref: ${finalTransactionRef} (AUTO-GENERATED if needed)`);

  res.status(201).json({
    success: true,
    paymentId: subscriptionRecord.id,
    message: 'Subscription created successfully',
    subscription: {
      id: subscriptionRecord.id,
      user_id: subscriptionRecord.user,
      amount: subscriptionRecord.amount,
      plan_type: subscriptionRecord.plan_type,
      status: subscriptionRecord.status,
      transaction_id: subscriptionRecord.transaction_id,
      transaction_ref: subscriptionRecord.transaction_ref,
      billing_cycle: subscriptionRecord.billing_cycle,
      custom_donation: subscriptionRecord.custom_donation,
      total_amount: subscriptionRecord.total_amount,
      start_date: subscriptionRecord.start_date,
      end_date: subscriptionRecord.end_date,
      created: subscriptionRecord.created,
    },
  });
});

export default router;