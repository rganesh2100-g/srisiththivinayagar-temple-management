import 'dotenv/config';
import express from 'express';
import crypto from 'crypto';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';
import { sendWelcomeEmailWithCredentials } from '../utils/emailService.js';

const router = express.Router();

logger.info('[PENDING-SUBSCRIPTIONS-ROUTES] ========================================');
logger.info('[PENDING-SUBSCRIPTIONS-ROUTES] Initializing Pending Subscriptions Routes');
logger.info('[PENDING-SUBSCRIPTIONS-ROUTES] ========================================');

/**
 * Helper function to generate a secure random password
 * 12 characters: mix of uppercase, lowercase, numbers, special chars
 * Uses crypto.randomBytes for cryptographic randomness
 * @returns {string} Secure random password
 */
const generateSecurePassword = () => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const specialChars = '!@#$%^&*';
  const allChars = uppercase + lowercase + numbers + specialChars;

  let password = '';
  
  // Ensure at least one of each type using crypto.randomBytes
  const randomBytes = crypto.randomBytes(4);
  password += uppercase[randomBytes[0] % uppercase.length];
  password += lowercase[randomBytes[1] % lowercase.length];
  password += numbers[randomBytes[2] % numbers.length];
  password += specialChars[randomBytes[3] % specialChars.length];

  // Fill the rest randomly using crypto.randomBytes
  const remainingBytes = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) {
    password += allChars[remainingBytes[i] % allChars.length];
  }

  // Shuffle the password using Fisher-Yates algorithm
  const passwordArray = password.split('');
  for (let i = passwordArray.length - 1; i > 0; i--) {
    const randomIndex = crypto.randomInt(0, i + 1);
    [passwordArray[i], passwordArray[randomIndex]] = [passwordArray[randomIndex], passwordArray[i]];
  }

  return passwordArray.join('');
};

/**
 * POST /pending-subscriptions/approve
 * Approve a pending subscription and create a user account
 * SECURITY: Requires admin role
 *
 * Request body:
 *   - subscriptionId (string, required): ID of the pending subscription record
 *
 * Response:
 *   - { success: true, message: '...', emailSent: true/false, userId: string }
 */
router.post('/approve', async (req, res) => {
  logger.info('[PENDING-SUBSCRIPTIONS-APPROVE] ========================================');
  logger.info('[PENDING-SUBSCRIPTIONS-APPROVE] POST /approve - Approve subscription request received');
  logger.info('[PENDING-SUBSCRIPTIONS-APPROVE] ========================================');
  logger.info('[PENDING-SUBSCRIPTIONS-APPROVE] Request body:', JSON.stringify(req.body, null, 2));

  // SECURITY: Check admin role
  logger.info('[PENDING-SUBSCRIPTIONS-APPROVE] Step 0: Checking admin authorization');
  const userRole = req.auth?.role;
  logger.info(`[PENDING-SUBSCRIPTIONS-APPROVE]   - User role: ${userRole || 'not authenticated'}`);
  
  if (!req.auth || req.auth.role !== 'admin') {
    logger.warn('[PENDING-SUBSCRIPTIONS-APPROVE] ✗ Authorization failed: User is not admin');
    return res.status(403).json({
      success: false,
      message: 'Unauthorized: Admin role required',
    });
  }
  logger.info('[PENDING-SUBSCRIPTIONS-APPROVE] ✓ Admin authorization verified');

  const { subscriptionId } = req.body;

  // Step 1: Validate subscriptionId parameter
  logger.info('[PENDING-SUBSCRIPTIONS-APPROVE] Step 1: Validating subscriptionId parameter');
  if (!subscriptionId || typeof subscriptionId !== 'string' || subscriptionId.trim().length === 0) {
    logger.warn('[PENDING-SUBSCRIPTIONS-APPROVE] ✗ Validation failed: Missing or invalid subscriptionId');
    logger.warn(`[PENDING-SUBSCRIPTIONS-APPROVE]   - subscriptionId received: ${JSON.stringify(subscriptionId)}`);
    return res.status(400).json({
      success: false,
      message: 'subscriptionId is required and must be a non-empty string',
    });
  }
  logger.info(`[PENDING-SUBSCRIPTIONS-APPROVE] ✓ subscriptionId validated: ${subscriptionId}`);

  // Step 2: Fetch pending subscription record from PocketBase
  logger.info('[PENDING-SUBSCRIPTIONS-APPROVE] Step 2: Fetching pending subscription record from PocketBase');
  logger.info(`[PENDING-SUBSCRIPTIONS-APPROVE]   - Collection: pending_subscriptions`);
  logger.info(`[PENDING-SUBSCRIPTIONS-APPROVE]   - ID: ${subscriptionId}`);

  const pendingSubscription = await pb.collection('pending_subscriptions').getOne(subscriptionId);

  if (!pendingSubscription) {
    logger.warn(`[PENDING-SUBSCRIPTIONS-APPROVE] ✗ Pending subscription not found: ${subscriptionId}`);
    throw new Error(`Subscription not found`);
  }

  logger.info('[PENDING-SUBSCRIPTIONS-APPROVE] ✓ Pending subscription record fetched successfully');
  logger.info('[PENDING-SUBSCRIPTIONS-APPROVE] Pending subscription details:');
  logger.info(`[PENDING-SUBSCRIPTIONS-APPROVE]   - ID: ${pendingSubscription.id}`);
  logger.info(`[PENDING-SUBSCRIPTIONS-APPROVE]   - Email: ${pendingSubscription.email}`);
  logger.info(`[PENDING-SUBSCRIPTIONS-APPROVE]   - Full Name: ${pendingSubscription.full_name}`);
  logger.info(`[PENDING-SUBSCRIPTIONS-APPROVE]   - Subscription Type: ${pendingSubscription.subscription_type}`);
  logger.info(`[PENDING-SUBSCRIPTIONS-APPROVE]   - Status: ${pendingSubscription.status}`);

  // Step 3: Extract required fields
  logger.info('[PENDING-SUBSCRIPTIONS-APPROVE] Step 3: Extracting required fields from subscription record');
  const email = pendingSubscription.email;
  const fullName = pendingSubscription.full_name;
  const subscriptionType = pendingSubscription.subscription_type;
  const transactionId = pendingSubscription.transaction_id;
  
  logger.info(`[PENDING-SUBSCRIPTIONS-APPROVE]   - Email: ${email}`);
  logger.info(`[PENDING-SUBSCRIPTIONS-APPROVE]   - Full Name: ${fullName}`);
  logger.info(`[PENDING-SUBSCRIPTIONS-APPROVE]   - Subscription Type: ${subscriptionType}`);
  logger.info(`[PENDING-SUBSCRIPTIONS-APPROVE]   - Transaction ID: ${transactionId}`);

  // Step 4: Generate secure random password
  logger.info('[PENDING-SUBSCRIPTIONS-APPROVE] Step 4: Generating secure random password');
  const securePassword = generateSecurePassword();
  logger.info('[PENDING-SUBSCRIPTIONS-APPROVE] ✓ Secure password generated');
  logger.info(`[PENDING-SUBSCRIPTIONS-APPROVE]   - Length: ${securePassword.length} characters`);
  logger.info('[PENDING-SUBSCRIPTIONS-APPROVE]   - Contains: uppercase, lowercase, numbers, special chars');
  logger.info('[PENDING-SUBSCRIPTIONS-APPROVE]   - Generated using crypto.randomBytes for cryptographic randomness');

  // Step 5: Create new user account in users collection
  logger.info('[PENDING-SUBSCRIPTIONS-APPROVE] Step 5: Creating new user account in users collection');
  logger.info(`[PENDING-SUBSCRIPTIONS-APPROVE]   - Email: ${email}`);
  logger.info(`[PENDING-SUBSCRIPTIONS-APPROVE]   - Name: ${fullName}`);
  logger.info('[PENDING-SUBSCRIPTIONS-APPROVE]   - Role: user');
  logger.info('[PENDING-SUBSCRIPTIONS-APPROVE]   - Verified: true');

  const newUser = await pb.collection('users').create({
    email: email,
    password: securePassword,
    passwordConfirm: securePassword,
    name: fullName,
    role: 'user',
    verified: true,
  });

  logger.info('[PENDING-SUBSCRIPTIONS-APPROVE] ✓ User account created successfully');
  logger.info(`[PENDING-SUBSCRIPTIONS-APPROVE]   - User ID: ${newUser.id}`);
  logger.info(`[PENDING-SUBSCRIPTIONS-APPROVE]   - Email: ${newUser.email}`);
  logger.info(`[PENDING-SUBSCRIPTIONS-APPROVE]   - Name: ${newUser.name}`);

  // Step 6: Update pending subscription record
  logger.info('[PENDING-SUBSCRIPTIONS-APPROVE] Step 6: Updating pending subscription record');
  const approvalDate = new Date().toISOString().split('T')[0];
  const subscriptionStartDate = new Date().toISOString().split('T')[0];

  const updatedSubscription = await pb.collection('pending_subscriptions').update(subscriptionId, {
    status: 'approved',
    user_id: newUser.id,
    approval_date: approvalDate,
  });

  logger.info('[PENDING-SUBSCRIPTIONS-APPROVE] ✓ Pending subscription record updated');
  logger.info(`[PENDING-SUBSCRIPTIONS-APPROVE]   - Status: ${updatedSubscription.status}`);
  logger.info(`[PENDING-SUBSCRIPTIONS-APPROVE]   - User ID: ${updatedSubscription.user_id}`);
  logger.info(`[PENDING-SUBSCRIPTIONS-APPROVE]   - Approval Date: ${updatedSubscription.approval_date}`);

  // Step 7: Send welcome email with credentials
  logger.info('[PENDING-SUBSCRIPTIONS-APPROVE] Step 7: Sending welcome email with credentials');
  logger.info(`[PENDING-SUBSCRIPTIONS-APPROVE]   - Recipient: ${email}`);
  logger.info(`[PENDING-SUBSCRIPTIONS-APPROVE]   - Full Name: ${fullName}`);
  logger.info(`[PENDING-SUBSCRIPTIONS-APPROVE]   - Subscription Type: ${subscriptionType}`);
  logger.info(`[PENDING-SUBSCRIPTIONS-APPROVE]   - Amount: €${pendingSubscription.amount || 0}`);

  const loginUrl = `${process.env.FRONTEND_URL || 'https://srisiththivinayagar.com'}/login`;

  let emailSent = false;
  let emailError = null;

  try {
    const emailResult = await sendWelcomeEmailWithCredentials({
      email: email,
      fullName: fullName,
      password: securePassword,
      subscriptionType: subscriptionType,
      transactionId: transactionId,
      amount: pendingSubscription.amount,
      approvalDate: approvalDate,
      subscriptionStartDate: subscriptionStartDate,
      loginUrl: loginUrl,
    });

    if (emailResult) {
      emailSent = true;
      logger.info('[PENDING-SUBSCRIPTIONS-APPROVE] ✓ Welcome email sent successfully');
    } else {
      logger.warn('[PENDING-SUBSCRIPTIONS-APPROVE] ⚠ Welcome email failed to send');
      emailError = 'Email failed to send';
    }
  } catch (emailErr) {
    logger.error('[PENDING-SUBSCRIPTIONS-APPROVE] ✗ Error sending welcome email');
    logger.error(`[PENDING-SUBSCRIPTIONS-APPROVE]   - Error: ${emailErr.message}`);
    emailError = emailErr.message;
  }

  // Step 8: Return response
  logger.info('[PENDING-SUBSCRIPTIONS-APPROVE] ========================================');
  logger.info('[PENDING-SUBSCRIPTIONS-APPROVE] ✓ SUBSCRIPTION APPROVED SUCCESSFULLY');
  logger.info('[PENDING-SUBSCRIPTIONS-APPROVE] ========================================');
  logger.info(`[PENDING-SUBSCRIPTIONS-APPROVE] Subscription ID: ${subscriptionId}`);
  logger.info(`[PENDING-SUBSCRIPTIONS-APPROVE] User ID: ${newUser.id}`);
  logger.info(`[PENDING-SUBSCRIPTIONS-APPROVE] Email: ${email}`);
  logger.info(`[PENDING-SUBSCRIPTIONS-APPROVE] Email Sent: ${emailSent}`);

  res.json({
    success: true,
    message: emailSent 
      ? 'Subscription approved and welcome email sent' 
      : 'Subscription approved but welcome email could not be sent',
    emailSent: emailSent,
    error: emailError || undefined,
    userId: newUser.id,
    subscriptionId: subscriptionId,
  });
});

export default router;