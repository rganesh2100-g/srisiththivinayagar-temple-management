import 'dotenv/config';
import express from 'express';
import logger from '../utils/logger.js';

const router = express.Router();

logger.info('[ACCOUNT-TYPES-ROUTES] ========================================');
logger.info('[ACCOUNT-TYPES-ROUTES] Initializing Account Types Routes');
logger.info('[ACCOUNT-TYPES-ROUTES] ========================================');

/**
 * GET /account-types - Get all account types
 *
 * Returns hardcoded array of account types.
 * No authentication required.
 *
 * Response: Array of account types
 * Each item: { id, name, description, features }
 *
 * Security: Public endpoint
 */
router.get('/', async (req, res) => {
  logger.info('[ACCOUNT-TYPES-GET] ========================================');
  logger.info('[ACCOUNT-TYPES-GET] GET / - Get all account types request received');
  logger.info('[ACCOUNT-TYPES-GET] ========================================');
  logger.info(`[ACCOUNT-TYPES-GET] Timestamp: ${new Date().toISOString()}`);

  try {
    // Step 1: Define hardcoded account types
    logger.info('[ACCOUNT-TYPES-GET] Step 1: Preparing hardcoded account types');

    const accountTypes = [
      {
        id: 1,
        name: 'Free',
        description: 'Free tier with basic features',
        features: [
          'Basic access',
          'Limited features',
          'Community support',
        ],
      },
      {
        id: 2,
        name: 'Premium',
        description: 'Premium tier with advanced features',
        features: [
          'Full access',
          'Advanced features',
          'Priority support',
          'Custom integrations',
        ],
      },
      {
        id: 3,
        name: 'Admin',
        description: 'Admin tier with full control',
        features: [
          'Full access',
          'All features',
          'Dedicated support',
          'Custom integrations',
          'Admin dashboard',
          'User management',
        ],
      },
    ];

    logger.info('[ACCOUNT-TYPES-GET] ✓ Account types prepared');
    logger.info(`[ACCOUNT-TYPES-GET]   - Total types: ${accountTypes.length}`);
    accountTypes.forEach((type) => {
      logger.info(`[ACCOUNT-TYPES-GET]   - ${type.name}: ${type.description}`);
    });

    // Step 2: Return account types
    logger.info('[ACCOUNT-TYPES-GET] Step 2: Returning account types');

    logger.info('[ACCOUNT-TYPES-GET] ========================================');
    logger.info('[ACCOUNT-TYPES-GET] ✓ GET ACCOUNT TYPES COMPLETED SUCCESSFULLY');
    logger.info('[ACCOUNT-TYPES-GET] ========================================');

    res.json(accountTypes);
  } catch (error) {
    logger.error('[ACCOUNT-TYPES-GET] ========================================');
    logger.error('[ACCOUNT-TYPES-GET] ✗ ERROR IN GET ACCOUNT TYPES');
    logger.error('[ACCOUNT-TYPES-GET] ========================================');
    logger.error(`[ACCOUNT-TYPES-GET] Error message: ${error.message}`);
    logger.error(`[ACCOUNT-TYPES-GET] Error name: ${error.name}`);
    logger.error(`[ACCOUNT-TYPES-GET] Error stack: ${error.stack}`);

    res.status(500).json({
      error: 'Failed to retrieve account types',
      message: error.message,
    });
  }
});

export default router;