/*
 * DIAGNOSTIC REPORT: Subscriptions Collection Schema & Creation
 * 
 * 1. Required Fields in 'subscriptions' collection:
 *    - user (relation to users)
 *    - plan_type (select: 'premium')
 *    - status (select: 'pending', 'active', 'rejected')
 *    - billing_cycle (text)
 *    - total_amount (number)
 * 
 * 2. Fields currently sent in POST requests:
 *    - In apps/web/src/pages/SignupPage.jsx: user, plan_type, amount, total_amount, status, billing_cycle, start_date, end_date
 *    - In this file (signup.js): No subscription creation occurs here. This route only creates the user record.
 * 
 * 3. Missing Fields:
 *    - No required fields were missing in the frontend payload, but explicit pre-flight validation 
 *      was added to SignupPage.jsx to guarantee no required fields are ever undefined/null.
 */

import 'dotenv/config';
import express from 'express';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';

const router = express.Router();

logger.info('[SIGNUP-ROUTES] ========================================');
logger.info('[SIGNUP-ROUTES] Initializing Signup Routes');
logger.info('[SIGNUP-ROUTES] ========================================');

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
 * POST /signup - Create a new user account
 * 
 * Request body:
 *   - email (string, required): User's email address
 *   - password (string, required): User's password (min 8 characters)
 *   - name (string, required): User's full name
 *   - phone (string, required): User's phone number
 * 
 * Response:
 *   - { user_id: string, auth_token: string, email: string, message: string }
 * 
 * Security: No authentication required (public endpoint)
 */
router.post('/', async (req, res) => {
  logger.info('[SIGNUP] ========================================');
  logger.info('[SIGNUP] POST / - Signup request received');
  logger.info('[SIGNUP] ========================================');
  logger.info('[SIGNUP] Request body:', JSON.stringify(req.body, null, 2));

  const { email, password, name, phone } = req.body;

  // Step 1: Validate email format
  logger.info('[SIGNUP] Step 1: Validating email format');
  if (!email || typeof email !== 'string' || email.trim().length === 0) {
    logger.warn('[SIGNUP] ✗ Validation failed: Missing or invalid email');
    logger.warn(`[SIGNUP]   - Email received: ${JSON.stringify(email)}`);
    throw new Error('Email is required and must be a non-empty string');
  }
  logger.info(`[SIGNUP] ✓ Email parameter present: ${email}`);

  if (!isValidEmail(email)) {
    logger.warn('[SIGNUP] ✗ Validation failed: Invalid email format');
    logger.warn(`[SIGNUP]   - Email: ${email}`);
    logger.warn('[SIGNUP]   - Email must match pattern: something@something.something');
    throw new Error(`Invalid email format: "${email}"`);
  }
  logger.info('[SIGNUP] ✓ Email format validation PASSED');

  // Step 2: Validate password length
  logger.info('[SIGNUP] Step 2: Validating password');
  if (!password || typeof password !== 'string' || password.length < 8) {
    logger.warn('[SIGNUP] ✗ Validation failed: Invalid password');
    logger.warn(`[SIGNUP]   - Password length: ${password ? password.length : 0}`);
    logger.warn('[SIGNUP]   - Password must be at least 8 characters');
    throw new Error('Password must be at least 8 characters long');
  }
  logger.info('[SIGNUP] ✓ Password validation PASSED');
  logger.info(`[SIGNUP]   - Password length: ${password.length} characters`);

  // Step 3: Validate name
  logger.info('[SIGNUP] Step 3: Validating name');
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    logger.warn('[SIGNUP] ✗ Validation failed: Missing or invalid name');
    logger.warn(`[SIGNUP]   - Name received: ${JSON.stringify(name)}`);
    throw new Error('Name is required and must be a non-empty string');
  }
  logger.info(`[SIGNUP] ✓ Name validated: ${name}`);

  // Step 4: Validate phone
  logger.info('[SIGNUP] Step 4: Validating phone');
  if (!phone || typeof phone !== 'string' || phone.trim().length === 0) {
    logger.warn('[SIGNUP] ✗ Validation failed: Missing or invalid phone');
    logger.warn(`[SIGNUP]   - Phone received: ${JSON.stringify(phone)}`);
    throw new Error('Phone is required and must be a non-empty string');
  }
  logger.info(`[SIGNUP] ✓ Phone validated: ${phone}`);

  logger.info('[SIGNUP] ✓ All input parameters validated successfully');

  // Step 5: Check if email already exists
  logger.info('[SIGNUP] Step 5: Checking if email already exists');
  logger.info(`[SIGNUP]   - Email to check: ${email}`);
  logger.info('[SIGNUP]   - Collection: users');
  logger.info('[SIGNUP]   - Query: Searching for existing user with this email');
  
  try {
    // Use getList with filter to check if email exists
    const existingUsers = await pb.collection('users').getList(1, 1, {
      filter: `email = "${email.trim()}"`,
    });
    
    if (existingUsers.items && existingUsers.items.length > 0) {
      logger.warn('[SIGNUP] ✗ Email already registered');
      logger.warn(`[SIGNUP]   - Email: ${email}`);
      throw new Error('Email already registered');
    }
    
    logger.info('[SIGNUP] ✓ Email is available (not registered)');
  } catch (error) {
    // If error is "Email already registered", re-throw it
    if (error.message === 'Email already registered') {
      throw error;
    }
    
    // If error is a 404 or "no matching record found", that's expected - email doesn't exist
    if (error.status === 404 || (error.message && error.message.includes('no matching record'))) {
      logger.info('[SIGNUP] ✓ Email is available (not registered)');
    } else {
      // Any other error should be thrown
      logger.error('[SIGNUP] ✗ Error checking if email exists');
      logger.error(`[SIGNUP]   - Error message: ${error.message}`);
      logger.error(`[SIGNUP]   - Error status: ${error.status || 'unknown'}`);
      throw error;
    }
  }

  // Step 6: Create user record in PocketBase
  logger.info('[SIGNUP] Step 6: Creating user record in PocketBase');
  logger.info('[SIGNUP]   - Collection: users');
  logger.info(`[SIGNUP]   - Email: ${email}`);
  logger.info(`[SIGNUP]   - Name: ${name}`);
  logger.info(`[SIGNUP]   - Phone: ${phone}`);

  const newUser = await pb.collection('users').create({
    email: email.trim(),
    password: password,
    passwordConfirm: password,
    name: name.trim(),
    phone: phone.trim(),
    role: 'user',
    verified: false,
  });

  logger.info('[SIGNUP] ✓ User record created successfully');
  logger.info(`[SIGNUP]   - User ID: ${newUser.id}`);
  logger.info(`[SIGNUP]   - Email: ${newUser.email}`);
  logger.info(`[SIGNUP]   - Name: ${newUser.name}`);
  logger.info(`[SIGNUP]   - Role: ${newUser.role}`);

  // Note: Subscription creation is handled entirely by the frontend (SignupPage.jsx)
  // or via specific subscription routes (/api/subscriptions/free, /api/subscriptions/premium).
  // No subscription is created in this endpoint to maintain separation of concerns.
  logger.info('[SIGNUP] Note: Subscription creation deferred to frontend/subscription routes.');

  // Step 7: Authenticate the user
  logger.info('[SIGNUP] Step 7: Authenticating user');
  logger.info(`[SIGNUP]   - Email: ${email}`);

  const authData = await pb.collection('users').authWithPassword(email.trim(), password);

  logger.info('[SIGNUP] ✓ User authenticated successfully');
  logger.info(`[SIGNUP]   - User ID: ${authData.record.id}`);
  logger.info(`[SIGNUP]   - Token length: ${authData.token.length} characters`);

  // Step 8: Return response
  logger.info('[SIGNUP] ========================================');
  logger.info('[SIGNUP] ✓ SIGNUP COMPLETED SUCCESSFULLY');
  logger.info('[SIGNUP] ========================================');
  logger.info(`[SIGNUP] User ID: ${authData.record.id}`);
  logger.info(`[SIGNUP] Email: ${authData.record.email}`);
  logger.info(`[SIGNUP] Name: ${authData.record.name}`);

  res.status(201).json({
    user_id: authData.record.id,
    auth_token: authData.token,
    email: authData.record.email,
    message: 'User created successfully',
  });
});

export default router;