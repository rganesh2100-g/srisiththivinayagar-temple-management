import 'dotenv/config';
import express from 'express';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';

const router = express.Router();

logger.info('[USERS-ROUTES] ========================================');
logger.info('[USERS-ROUTES] Initializing Users Routes');
logger.info('[USERS-ROUTES] ========================================');

/**
 * GET /users - Fetch all registered users grouped by tier
 *
 * Requires: Admin authentication (req.user.role === 'admin')
 *
 * Response: {
 *   adminUsers: [...],
 *   freeUsers: [...],
 *   premiumUsers: [...],
 *   counts: { admin: N, free: N, premium: N }
 * }
 */
router.get('/', async (req, res) => {
  logger.info('[USERS-GET] ========================================');
  logger.info('[USERS-GET] GET / - Fetch all users request received');
  logger.info('[USERS-GET] ========================================');
  logger.info(`[USERS-GET] Timestamp: ${new Date().toISOString()}`);

  // Step 1: Check authentication
  logger.info('[USERS-GET] Step 1: Checking authentication');

  if (!req.user) {
    logger.error('[USERS-GET] ✗ Authentication check FAILED: User is not authenticated');
    logger.error('[USERS-GET]   - req.user is undefined');
    logger.info('[USERS-GET] ========================================');
    throw new Error('Unauthorized: User not authenticated');
  }

  logger.info('[USERS-GET] ✓ User is authenticated');
  logger.info(`[USERS-GET]   - User ID: ${req.user.id}`);
  logger.info(`[USERS-GET]   - User email: ${req.user.email}`);
  logger.info(`[USERS-GET]   - User role: ${req.user.role}`);

  // Step 2: Check admin role
  logger.info('[USERS-GET] Step 2: Checking admin authorization');

  if (req.user.role !== 'admin') {
    logger.error('[USERS-GET] ✗ Authorization check FAILED: User is not admin');
    logger.error(`[USERS-GET]   - User role: "${req.user.role}"`);
    logger.error('[USERS-GET]   - Required role: "admin"');
    logger.info('[USERS-GET] ========================================');
    throw new Error('Unauthorized: Admin role required');
  }

  logger.info('[USERS-GET] ✓ Admin authorization verified');
  logger.info('[USERS-GET]   - User has admin role');

  // Step 3: Fetch all users from PocketBase
  logger.info('[USERS-GET] Step 3: Fetching all users from PocketBase');
  logger.info('[USERS-GET]   - Collection: users');
  logger.info('[USERS-GET]   - Fields: id, email, role, membership_tier, created');

  const users = await pb.collection('users').getFullList({
    fields: 'id,email,name,role,membership_tier,created',
    sort: '-created',
  });

  logger.info('[USERS-GET] ✓ Users fetched successfully from PocketBase');
  logger.info(`[USERS-GET]   - Total users: ${users.length}`);

  // Step 4: Group users by tier
  logger.info('[USERS-GET] Step 4: Grouping users by tier');

  const adminUsers = [];
  const freeUsers = [];
  const premiumUsers = [];

  users.forEach((user) => {
    const userObj = {
      id: user.id,
      email: user.email,
      name: user.name || 'N/A',
      role: user.role || 'user',
      membership_tier: user.membership_tier || 'free',
      created: user.created,
    };

    if (user.role === 'admin') {
      adminUsers.push(userObj);
    } else if (user.membership_tier === 'premium') {
      premiumUsers.push(userObj);
    } else {
      freeUsers.push(userObj);
    }
  });

  logger.info('[USERS-GET] ✓ Users grouped successfully');
  logger.info(`[USERS-GET]   - Admin users: ${adminUsers.length}`);
  logger.info(`[USERS-GET]   - Free tier users: ${freeUsers.length}`);
  logger.info(`[USERS-GET]   - Premium tier users: ${premiumUsers.length}`);

  // Step 5: Build response
  logger.info('[USERS-GET] Step 5: Building response');

  const response = {
    adminUsers,
    freeUsers,
    premiumUsers,
    counts: {
      admin: adminUsers.length,
      free: freeUsers.length,
      premium: premiumUsers.length,
      total: users.length,
    },
  };

  logger.info('[USERS-GET] ========================================');
  logger.info('[USERS-GET] ✓ GET USERS COMPLETED SUCCESSFULLY');
  logger.info('[USERS-GET] ========================================');
  logger.info(`[USERS-GET] Response counts:`);
  logger.info(`[USERS-GET]   - Admin: ${response.counts.admin}`);
  logger.info(`[USERS-GET]   - Free: ${response.counts.free}`);
  logger.info(`[USERS-GET]   - Premium: ${response.counts.premium}`);
  logger.info(`[USERS-GET]   - Total: ${response.counts.total}`);

  res.json(response);
});

export default router;