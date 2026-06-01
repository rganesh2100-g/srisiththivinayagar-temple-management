import 'dotenv/config';
import express from 'express';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';

const router = express.Router();

logger.info('[ADMIN-SUBSCRIPTIONS-ROUTES] ========================================');
logger.info('[ADMIN-SUBSCRIPTIONS-ROUTES] Initializing Admin Subscriptions Routes');
logger.info('[ADMIN-SUBSCRIPTIONS-ROUTES] ========================================');

/**
 * GET /admin/subscriptions - Fetch all subscriptions with user details
 *
 * Requires: Admin authentication (req.user.role === 'admin')
 * Authentication: Bearer token in Authorization header
 *
 * Response: Array of subscriptions with expanded user information
 * Each item: { id, user: { email, name, role }, plan_type, amount, status, created }
 *
 * Security: Admin only
 */
router.get('/', async (req, res) => {
  logger.info('[ADMIN-SUBSCRIPTIONS-GET] ========================================');
  logger.info('[ADMIN-SUBSCRIPTIONS-GET] GET / - Fetch all subscriptions request received');
  logger.info('[ADMIN-SUBSCRIPTIONS-GET] ========================================');
  logger.info(`[ADMIN-SUBSCRIPTIONS-GET] Timestamp: ${new Date().toISOString()}`);

  // Step 1: Check authentication
  logger.info('[ADMIN-SUBSCRIPTIONS-GET] Step 1: Checking authentication');

  if (!req.user) {
    logger.error('[ADMIN-SUBSCRIPTIONS-GET] ✗ Authentication check FAILED: User is not authenticated');
    logger.error('[ADMIN-SUBSCRIPTIONS-GET]   - req.user is undefined');
    logger.info('[ADMIN-SUBSCRIPTIONS-GET] ========================================');
    throw new Error('Unauthorized: User not authenticated');
  }

  logger.info('[ADMIN-SUBSCRIPTIONS-GET] ✓ User is authenticated');
  logger.info(`[ADMIN-SUBSCRIPTIONS-GET]   - User ID: ${req.user.id}`);
  logger.info(`[ADMIN-SUBSCRIPTIONS-GET]   - User email: ${req.user.email}`);
  logger.info(`[ADMIN-SUBSCRIPTIONS-GET]   - User role: ${req.user.role}`);

  // Step 2: Check admin role
  logger.info('[ADMIN-SUBSCRIPTIONS-GET] Step 2: Checking admin authorization');

  if (req.user.role !== 'admin') {
    logger.error('[ADMIN-SUBSCRIPTIONS-GET] ✗ Authorization check FAILED: User is not admin');
    logger.error(`[ADMIN-SUBSCRIPTIONS-GET]   - User role: "${req.user.role}"`);
    logger.error('[ADMIN-SUBSCRIPTIONS-GET]   - Required role: "admin"');
    logger.info('[ADMIN-SUBSCRIPTIONS-GET] ========================================');
    throw new Error('Unauthorized: Admin role required');
  }

  logger.info('[ADMIN-SUBSCRIPTIONS-GET] ✓ Admin authorization verified');
  logger.info('[ADMIN-SUBSCRIPTIONS-GET]   - User has admin role');

  // Step 3: Fetch all subscriptions from PocketBase
  logger.info('[ADMIN-SUBSCRIPTIONS-GET] Step 3: Fetching all subscriptions from PocketBase');
  logger.info('[ADMIN-SUBSCRIPTIONS-GET]   - Collection: subscriptions');
  logger.info('[ADMIN-SUBSCRIPTIONS-GET]   - Expand: user');
  logger.info('[ADMIN-SUBSCRIPTIONS-GET]   - Sort: -created (newest first)');

  const subscriptions = await pb.collection('subscriptions').getFullList({
    expand: 'user',
    sort: '-created',
  });

  logger.info('[ADMIN-SUBSCRIPTIONS-GET] ✓ Subscriptions fetched successfully from PocketBase');
  logger.info(`[ADMIN-SUBSCRIPTIONS-GET]   - Total subscriptions: ${subscriptions.length}`);

  // Step 4: Map subscriptions to clean format
  logger.info('[ADMIN-SUBSCRIPTIONS-GET] Step 4: Mapping subscriptions to clean format');

  const cleanData = subscriptions.map((sub) => {
    const expandedUser = sub.expand?.user || {};
    return {
      id: sub.id,
      user: {
        email: expandedUser.email || 'N/A',
        name: expandedUser.name || 'N/A',
        role: expandedUser.role || 'user',
      },
      plan_type: sub.plan_type || 'N/A',
      amount: sub.amount || 0,
      status: sub.status || 'N/A',
      created: sub.created,
    };
  });

  logger.info('[ADMIN-SUBSCRIPTIONS-GET] ✓ Subscriptions mapped successfully');
  logger.info(`[ADMIN-SUBSCRIPTIONS-GET]   - Total mapped subscriptions: ${cleanData.length}`);

  // Step 5: Return response
  logger.info('[ADMIN-SUBSCRIPTIONS-GET] ========================================');
  logger.info('[ADMIN-SUBSCRIPTIONS-GET] ✓ GET SUBSCRIPTIONS COMPLETED SUCCESSFULLY');
  logger.info('[ADMIN-SUBSCRIPTIONS-GET] ========================================');
  logger.info(`[ADMIN-SUBSCRIPTIONS-GET] Response counts:`);
  logger.info(`[ADMIN-SUBSCRIPTIONS-GET]   - Total: ${cleanData.length}`);

  res.json(cleanData);
});

/**
 * POST /admin/subscriptions/:subscriptionId/approve - Approve a pending subscription
 *
 * Requires: Admin authentication (req.user.role === 'admin')
 *
 * Request body:
 *   - subscriptionId (string, required): ID of the subscription to approve
 *
 * Response:
 *   - { success: true, message: '...', subscription: {...}, user: {...} }
 *
 * Security: Admin only
 * 
 * CRITICAL: User ID is extracted from the subscription record's `user` field,
 * NOT from the request body. This ensures data integrity and prevents
 * unauthorized user ID manipulation.
 */
router.post('/:subscriptionId/approve', async (req, res) => {
  logger.info('[ADMIN-SUBSCRIPTIONS-APPROVE] ========================================');
  logger.info('[ADMIN-SUBSCRIPTIONS-APPROVE] POST /:subscriptionId/approve - Approve subscription request received');
  logger.info('[ADMIN-SUBSCRIPTIONS-APPROVE] ========================================');
  logger.info(`[ADMIN-SUBSCRIPTIONS-APPROVE] Timestamp: ${new Date().toISOString()}`);

  const { subscriptionId } = req.params;

  // Step 1: Check authentication
  logger.info('[ADMIN-SUBSCRIPTIONS-APPROVE] Step 1: Checking authentication');

  if (!req.user) {
    logger.error('[ADMIN-SUBSCRIPTIONS-APPROVE] ✗ Authentication check FAILED: User is not authenticated');
    logger.error('[ADMIN-SUBSCRIPTIONS-APPROVE]   - req.user is undefined');
    logger.info('[ADMIN-SUBSCRIPTIONS-APPROVE] ========================================');
    throw new Error('Unauthorized: User not authenticated');
  }

  logger.info('[ADMIN-SUBSCRIPTIONS-APPROVE] ✓ User is authenticated');
  logger.info(`[ADMIN-SUBSCRIPTIONS-APPROVE]   - User ID: ${req.user.id}`);
  logger.info(`[ADMIN-SUBSCRIPTIONS-APPROVE]   - User email: ${req.user.email}`);
  logger.info(`[ADMIN-SUBSCRIPTIONS-APPROVE]   - User role: ${req.user.role}`);

  // Step 2: Check admin role
  logger.info('[ADMIN-SUBSCRIPTIONS-APPROVE] Step 2: Checking admin authorization');

  if (req.user.role !== 'admin') {
    logger.error('[ADMIN-SUBSCRIPTIONS-APPROVE] ✗ Authorization check FAILED: User is not admin');
    logger.error(`[ADMIN-SUBSCRIPTIONS-APPROVE]   - User role: "${req.user.role}"`);
    logger.error('[ADMIN-SUBSCRIPTIONS-APPROVE]   - Required role: "admin"');
    logger.info('[ADMIN-SUBSCRIPTIONS-APPROVE] ========================================');
    throw new Error('Unauthorized: Admin role required');
  }

  logger.info('[ADMIN-SUBSCRIPTIONS-APPROVE] ✓ Admin authorization verified');
  logger.info('[ADMIN-SUBSCRIPTIONS-APPROVE]   - User has admin role');

  // Step 3: Validate subscriptionId parameter
  logger.info('[ADMIN-SUBSCRIPTIONS-APPROVE] Step 3: Validating subscriptionId parameter');
  if (!subscriptionId || typeof subscriptionId !== 'string' || subscriptionId.trim().length === 0) {
    logger.warn('[ADMIN-SUBSCRIPTIONS-APPROVE] ✗ Validation failed: Missing or invalid subscriptionId');
    logger.warn(`[ADMIN-SUBSCRIPTIONS-APPROVE]   - subscriptionId received: ${JSON.stringify(subscriptionId)}`);
    throw new Error('subscriptionId is required and must be a non-empty string');
  }
  logger.info(`[ADMIN-SUBSCRIPTIONS-APPROVE] ✓ subscriptionId validated: ${subscriptionId}`);

  // Step 4: Fetch subscription record from PocketBase
  logger.info('[ADMIN-SUBSCRIPTIONS-APPROVE] Step 4: Fetching subscription record from PocketBase');
  logger.info(`[ADMIN-SUBSCRIPTIONS-APPROVE]   - Collection: subscriptions`);
  logger.info(`[ADMIN-SUBSCRIPTIONS-APPROVE]   - ID: ${subscriptionId}`);

  const subscription = await pb.collection('subscriptions').getOne(subscriptionId);

  if (!subscription) {
    logger.warn(`[ADMIN-SUBSCRIPTIONS-APPROVE] ✗ Subscription not found: ${subscriptionId}`);
    throw new Error(`Subscription with ID ${subscriptionId} not found`);
  }

  logger.info('[ADMIN-SUBSCRIPTIONS-APPROVE] ✓ Subscription record fetched successfully');
  logger.info('[ADMIN-SUBSCRIPTIONS-APPROVE] Subscription record details:');
  logger.info(`[ADMIN-SUBSCRIPTIONS-APPROVE]   - ID: ${subscription.id}`);
  logger.info(`[ADMIN-SUBSCRIPTIONS-APPROVE]   - User ID (relation field): ${subscription.user || 'NULL'}`);
  logger.info(`[ADMIN-SUBSCRIPTIONS-APPROVE]   - Plan Type: ${subscription.plan_type || 'N/A'}`);
  logger.info(`[ADMIN-SUBSCRIPTIONS-APPROVE]   - Amount: €${subscription.amount || 0}`);
  logger.info(`[ADMIN-SUBSCRIPTIONS-APPROVE]   - Status: ${subscription.status || 'N/A'}`);
  logger.info(`[ADMIN-SUBSCRIPTIONS-APPROVE]   - Approval Status: ${subscription.approval_status || 'N/A'}`);

  // Step 5: CRITICAL - Extract user ID from subscription record (NOT from request body)
  logger.info('[ADMIN-SUBSCRIPTIONS-APPROVE] Step 5: CRITICAL - Extracting user ID from subscription record');
  logger.info('[ADMIN-SUBSCRIPTIONS-APPROVE]   - Source: subscription.user field (relation field)');
  logger.info('[ADMIN-SUBSCRIPTIONS-APPROVE]   - NOT from request body (prevents unauthorized manipulation)');

  const userId = subscription.user;

  logger.info(`[ADMIN-SUBSCRIPTIONS-APPROVE] User ID extraction result:`);
  logger.info(`[ADMIN-SUBSCRIPTIONS-APPROVE]   - subscription.user value: ${userId || 'NULL'}`);
  logger.info(`[ADMIN-SUBSCRIPTIONS-APPROVE]   - Type: ${typeof userId}`);
  logger.info(`[ADMIN-SUBSCRIPTIONS-APPROVE]   - Is null: ${userId === null}`);
  logger.info(`[ADMIN-SUBSCRIPTIONS-APPROVE]   - Is undefined: ${userId === undefined}`);
  logger.info(`[ADMIN-SUBSCRIPTIONS-APPROVE]   - Is empty string: ${userId === ''}`);

  // Step 6: CRITICAL - Validate user ID is not null or undefined
  logger.info('[ADMIN-SUBSCRIPTIONS-APPROVE] Step 6: CRITICAL - Validating user ID is not null/undefined');

  if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
    logger.error('[ADMIN-SUBSCRIPTIONS-APPROVE] ✗ CRITICAL VALIDATION FAILED: User ID is missing or invalid');
    logger.error(`[ADMIN-SUBSCRIPTIONS-APPROVE]   - User ID value: ${userId || 'NULL'}`);
    logger.error(`[ADMIN-SUBSCRIPTIONS-APPROVE]   - Type: ${typeof userId}`);
    logger.error('[ADMIN-SUBSCRIPTIONS-APPROVE]   - This subscription cannot be approved without a valid user ID');
    logger.error('[ADMIN-SUBSCRIPTIONS-APPROVE]   - Subscription ID: ' + subscriptionId);
    logger.error('[ADMIN-SUBSCRIPTIONS-APPROVE] ========================================');
    throw new Error('Cannot approve subscription: user ID is missing or invalid');
  }

  const validatedUserId = userId.trim();
  logger.info('[ADMIN-SUBSCRIPTIONS-APPROVE] ✓ User ID validation PASSED');
  logger.info(`[ADMIN-SUBSCRIPTIONS-APPROVE]   - Validated user ID: ${validatedUserId}`);
  logger.info('[ADMIN-SUBSCRIPTIONS-APPROVE]   - Ready for database operations');

  // Step 7: Verify user exists in users collection
  logger.info('[ADMIN-SUBSCRIPTIONS-APPROVE] Step 7: Verifying user exists in users collection');
  logger.info(`[ADMIN-SUBSCRIPTIONS-APPROVE]   - User ID to verify: ${validatedUserId}`);
  logger.info('[ADMIN-SUBSCRIPTIONS-APPROVE]   - Collection: users');

  let userRecord;
  try {
    userRecord = await pb.collection('users').getOne(validatedUserId);
    logger.info('[ADMIN-SUBSCRIPTIONS-APPROVE] ✓ User record found in users collection');
    logger.info(`[ADMIN-SUBSCRIPTIONS-APPROVE]   - User ID: ${userRecord.id}`);
    logger.info(`[ADMIN-SUBSCRIPTIONS-APPROVE]   - User email: ${userRecord.email}`);
    logger.info(`[ADMIN-SUBSCRIPTIONS-APPROVE]   - User name: ${userRecord.name || 'N/A'}`);
  } catch (error) {
    logger.error('[ADMIN-SUBSCRIPTIONS-APPROVE] ✗ User record NOT found in users collection');
    logger.error(`[ADMIN-SUBSCRIPTIONS-APPROVE]   - User ID: ${validatedUserId}`);
    logger.error(`[ADMIN-SUBSCRIPTIONS-APPROVE]   - Error: ${error.message}`);
    logger.error(`[ADMIN-SUBSCRIPTIONS-APPROVE]   - Error status: ${error.status || 'unknown'}`);
    throw new Error(`User with ID "${validatedUserId}" not found in users collection`, { cause: error });
  }

  // Step 8: Update subscription record to mark as approved
  logger.info('[ADMIN-SUBSCRIPTIONS-APPROVE] Step 8: Updating subscription record to mark as approved');
  logger.info(`[ADMIN-SUBSCRIPTIONS-APPROVE]   - Subscription ID: ${subscriptionId}`);
  logger.info('[ADMIN-SUBSCRIPTIONS-APPROVE]   - New status: active');
  logger.info('[ADMIN-SUBSCRIPTIONS-APPROVE]   - New approval_status: approved');

  const approvalDate = new Date().toISOString().split('T')[0];
  const startDate = approvalDate;
  const endDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0];

  logger.info(`[ADMIN-SUBSCRIPTIONS-APPROVE]   - Approval Date: ${approvalDate}`);
  logger.info(`[ADMIN-SUBSCRIPTIONS-APPROVE]   - Start Date: ${startDate}`);
  logger.info(`[ADMIN-SUBSCRIPTIONS-APPROVE]   - End Date: ${endDate}`);

  let updatedSubscription;
  try {
    updatedSubscription = await pb.collection('subscriptions').update(subscriptionId, {
      status: 'active',
      approval_status: 'approved',
      approved_date: approvalDate,
      start_date: startDate,
      end_date: endDate,
    });
  } catch (pbError) {
    logger.error('[ADMIN-SUBSCRIPTIONS-APPROVE] ========================================');
    logger.error('[ADMIN-SUBSCRIPTIONS-APPROVE] ✗ POCKETBASE ERROR - SUBSCRIPTION UPDATE FAILED');
    logger.error('[ADMIN-SUBSCRIPTIONS-APPROVE] ========================================');
    logger.error(`[ADMIN-SUBSCRIPTIONS-APPROVE] Error message: ${pbError.message}`);
    logger.error(`[ADMIN-SUBSCRIPTIONS-APPROVE] Error name: ${pbError.name}`);
    logger.error(`[ADMIN-SUBSCRIPTIONS-APPROVE] Error status: ${pbError.status || 'unknown'}`);
    logger.error(`[ADMIN-SUBSCRIPTIONS-APPROVE] Error code: ${pbError.code || 'unknown'}`);
    logger.error('[ADMIN-SUBSCRIPTIONS-APPROVE] Full error object:');
    logger.error('[ADMIN-SUBSCRIPTIONS-APPROVE]', JSON.stringify(pbError, null, 2));
    
    if (pbError.data && pbError.data.data) {
      logger.error('[ADMIN-SUBSCRIPTIONS-APPROVE] Validation errors:');
      Object.entries(pbError.data.data).forEach(([field, fieldError]) => {
        logger.error(`[ADMIN-SUBSCRIPTIONS-APPROVE]   - ${field}: ${JSON.stringify(fieldError)}`);
      });
    }
    
    logger.error('[ADMIN-SUBSCRIPTIONS-APPROVE] Update payload that caused error:');
    logger.error('[ADMIN-SUBSCRIPTIONS-APPROVE]', JSON.stringify({
      status: 'active',
      approval_status: 'approved',
      approved_date: approvalDate,
      start_date: startDate,
      end_date: endDate,
    }, null, 2));
    
    throw pbError;
  }

  logger.info('[ADMIN-SUBSCRIPTIONS-APPROVE] ✓ Subscription record updated successfully');
  logger.info(`[ADMIN-SUBSCRIPTIONS-APPROVE]   - Subscription ID: ${updatedSubscription.id}`);
  logger.info(`[ADMIN-SUBSCRIPTIONS-APPROVE]   - Status: ${updatedSubscription.status}`);
  logger.info(`[ADMIN-SUBSCRIPTIONS-APPROVE]   - Approval Status: ${updatedSubscription.approval_status}`);
  logger.info(`[ADMIN-SUBSCRIPTIONS-APPROVE]   - Start Date: ${updatedSubscription.start_date}`);
  logger.info(`[ADMIN-SUBSCRIPTIONS-APPROVE]   - End Date: ${updatedSubscription.end_date}`);

  // Step 9: Update user record to set account_type to Premium Membership
  logger.info('[ADMIN-SUBSCRIPTIONS-APPROVE] Step 9: Updating user record to set account_type to Premium Membership');
  logger.info(`[ADMIN-SUBSCRIPTIONS-APPROVE]   - User ID: ${validatedUserId}`);
  logger.info('[ADMIN-SUBSCRIPTIONS-APPROVE]   - New account_type: Premium Membership');

  let updatedUser;
  try {
    updatedUser = await pb.collection('users').update(validatedUserId, {
      account_type: 'Premium Membership',
    });
  } catch (pbError) {
    logger.error('[ADMIN-SUBSCRIPTIONS-APPROVE] ========================================');
    logger.error('[ADMIN-SUBSCRIPTIONS-APPROVE] ✗ POCKETBASE ERROR - USER UPDATE FAILED');
    logger.error('[ADMIN-SUBSCRIPTIONS-APPROVE] ========================================');
    logger.error(`[ADMIN-SUBSCRIPTIONS-APPROVE] Error message: ${pbError.message}`);
    logger.error(`[ADMIN-SUBSCRIPTIONS-APPROVE] Error name: ${pbError.name}`);
    logger.error(`[ADMIN-SUBSCRIPTIONS-APPROVE] Error status: ${pbError.status || 'unknown'}`);
    logger.error(`[ADMIN-SUBSCRIPTIONS-APPROVE] Error code: ${pbError.code || 'unknown'}`);
    logger.error('[ADMIN-SUBSCRIPTIONS-APPROVE] Full error object:');
    logger.error('[ADMIN-SUBSCRIPTIONS-APPROVE]', JSON.stringify(pbError, null, 2));
    
    if (pbError.data && pbError.data.data) {
      logger.error('[ADMIN-SUBSCRIPTIONS-APPROVE] Validation errors:');
      Object.entries(pbError.data.data).forEach(([field, fieldError]) => {
        logger.error(`[ADMIN-SUBSCRIPTIONS-APPROVE]   - ${field}: ${JSON.stringify(fieldError)}`);
      });
    }
    
    throw pbError;
  }

  logger.info('[ADMIN-SUBSCRIPTIONS-APPROVE] ✓ User record updated successfully');
  logger.info(`[ADMIN-SUBSCRIPTIONS-APPROVE]   - User ID: ${updatedUser.id}`);
  logger.info(`[ADMIN-SUBSCRIPTIONS-APPROVE]   - Email: ${updatedUser.email}`);
  logger.info(`[ADMIN-SUBSCRIPTIONS-APPROVE]   - Account Type: ${updatedUser.account_type}`);

  // Step 10: Return success response
  logger.info('[ADMIN-SUBSCRIPTIONS-APPROVE] ========================================');
  logger.info('[ADMIN-SUBSCRIPTIONS-APPROVE] ✓ SUBSCRIPTION APPROVAL COMPLETED SUCCESSFULLY');
  logger.info('[ADMIN-SUBSCRIPTIONS-APPROVE] ========================================');
  logger.info(`[ADMIN-SUBSCRIPTIONS-APPROVE] Subscription ID: ${subscriptionId}`);
  logger.info(`[ADMIN-SUBSCRIPTIONS-APPROVE] User ID: ${validatedUserId}`);
  logger.info(`[ADMIN-SUBSCRIPTIONS-APPROVE] Status: active`);
  logger.info(`[ADMIN-SUBSCRIPTIONS-APPROVE] Approval Status: approved`);
  logger.info(`[ADMIN-SUBSCRIPTIONS-APPROVE] Account Type: Premium Membership`);

  res.json({
    success: true,
    message: 'Subscription approved successfully',
    subscription: {
      id: updatedSubscription.id,
      user_id: updatedSubscription.user,
      plan_type: updatedSubscription.plan_type,
      amount: updatedSubscription.amount,
      status: updatedSubscription.status,
      approval_status: updatedSubscription.approval_status,
      start_date: updatedSubscription.start_date,
      end_date: updatedSubscription.end_date,
      approved_date: updatedSubscription.approved_date,
    },
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      account_type: updatedUser.account_type,
    },
  });
});

export default router;