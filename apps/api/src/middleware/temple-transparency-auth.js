import 'dotenv/config';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';

/**
 * Temple Transparency Authentication Middleware
 *
 * Enforces access control for temple transparency features:
 * 1. Verifies user is authenticated
 * 2. Checks membership_type === 'premium'
 * 3. Allows access if approval_status is 'pending' (frontend shows overlay)
 * 4. Logs all access attempts for audit trail
 * 5. Throws errors for errorMiddleware to catch
 *
 * Usage in routes:
 * router.get('/transparency', templeTransparencyAuth, async (req, res) => { ... })
 *
 * Access Control Rules:
 * - Non-authenticated users: 401 Unauthorized
 * - Non-premium users: 403 Forbidden
 * - Premium users with pending approval: 200 OK (frontend shows overlay)
 * - Premium users with approved status: 200 OK (full access)
 */

const templeTransparencyAuth = async (req, res, next) => {
  logger.info('[TEMPLE-TRANSPARENCY-AUTH] ========================================');
  logger.info('[TEMPLE-TRANSPARENCY-AUTH] Temple Transparency Access Control');
  logger.info('[TEMPLE-TRANSPARENCY-AUTH] ========================================');
  logger.info(`[TEMPLE-TRANSPARENCY-AUTH] Timestamp: ${new Date().toISOString()}`);
  logger.info(`[TEMPLE-TRANSPARENCY-AUTH] Request path: ${req.path}`);
  logger.info(`[TEMPLE-TRANSPARENCY-AUTH] Request method: ${req.method}`);
  logger.info(`[TEMPLE-TRANSPARENCY-AUTH] Client IP: ${req.ip || 'unknown'}`);

  try {
    // Step 1: Check if user is authenticated
    logger.info('[TEMPLE-TRANSPARENCY-AUTH] Step 1: Checking user authentication');

    if (!req.user) {
      logger.warn('[TEMPLE-TRANSPARENCY-AUTH] ✗ Authentication check FAILED');
      logger.warn('[TEMPLE-TRANSPARENCY-AUTH]   - req.user is undefined');
      logger.warn('[TEMPLE-TRANSPARENCY-AUTH]   - User is not authenticated');
      logger.info('[TEMPLE-TRANSPARENCY-AUTH] ========================================');
      throw new Error('Unauthorized: User not authenticated');
    }

    const userId = req.user.id;
    const userEmail = req.user.email || 'unknown';

    logger.info('[TEMPLE-TRANSPARENCY-AUTH] ✓ User is authenticated');
    logger.info(`[TEMPLE-TRANSPARENCY-AUTH]   - User ID: ${userId}`);
    logger.info(`[TEMPLE-TRANSPARENCY-AUTH]   - User email: ${userEmail}`);

    // Step 2: Fetch user record from PocketBase to verify membership_type
    logger.info('[TEMPLE-TRANSPARENCY-AUTH] Step 2: Fetching user record from PocketBase');
    logger.info(`[TEMPLE-TRANSPARENCY-AUTH]   - Collection: users`);
    logger.info(`[TEMPLE-TRANSPARENCY-AUTH]   - User ID: ${userId}`);

    let userRecord;
    try {
      userRecord = await pb.collection('users').getOne(userId);
      logger.info('[TEMPLE-TRANSPARENCY-AUTH] ✓ User record fetched successfully');
    } catch (pbError) {
      logger.error('[TEMPLE-TRANSPARENCY-AUTH] ✗ Failed to fetch user record from PocketBase');
      logger.error(`[TEMPLE-TRANSPARENCY-AUTH]   - Error: ${pbError.message}`);
      logger.error(`[TEMPLE-TRANSPARENCY-AUTH]   - Error status: ${pbError.status || 'unknown'}`);
      logger.error(`[TEMPLE-TRANSPARENCY-AUTH]   - User ID: ${userId}`);
      logger.info('[TEMPLE-TRANSPARENCY-AUTH] ========================================');
      throw new Error('Failed to verify user membership', { cause: pbError });
    }

    if (!userRecord) {
      logger.error('[TEMPLE-TRANSPARENCY-AUTH] ✗ User record not found in PocketBase');
      logger.error(`[TEMPLE-TRANSPARENCY-AUTH]   - User ID: ${userId}`);
      logger.info('[TEMPLE-TRANSPARENCY-AUTH] ========================================');
      throw new Error('User record not found');
    }

    logger.info('[TEMPLE-TRANSPARENCY-AUTH] User record details:');
    logger.info(`[TEMPLE-TRANSPARENCY-AUTH]   - ID: ${userRecord.id}`);
    logger.info(`[TEMPLE-TRANSPARENCY-AUTH]   - Email: ${userRecord.email}`);
    logger.info(`[TEMPLE-TRANSPARENCY-AUTH]   - Name: ${userRecord.name || 'N/A'}`);
    logger.info(`[TEMPLE-TRANSPARENCY-AUTH]   - membership_type: "${userRecord.membership_type || 'not set'}"`);
    logger.info(`[TEMPLE-TRANSPARENCY-AUTH]   - approval_status: "${userRecord.approval_status || 'not set'}"`);

    // Step 3: Verify membership_type === 'premium'
    logger.info('[TEMPLE-TRANSPARENCY-AUTH] Step 3: Verifying premium membership');
    logger.info(`[TEMPLE-TRANSPARENCY-AUTH]   - Required: membership_type === 'premium'`);
    logger.info(`[TEMPLE-TRANSPARENCY-AUTH]   - Actual: membership_type === "${userRecord.membership_type || 'not set'}"`);

    const membershipType = userRecord.membership_type || '';

    if (membershipType !== 'premium') {
      logger.warn('[TEMPLE-TRANSPARENCY-AUTH] ✗ Premium membership check FAILED');
      logger.warn(`[TEMPLE-TRANSPARENCY-AUTH]   - User membership_type: "${membershipType}"`);
      logger.warn(`[TEMPLE-TRANSPARENCY-AUTH]   - Expected: "premium"`);
      logger.warn(`[TEMPLE-TRANSPARENCY-AUTH]   - User ID: ${userId}`);
      logger.warn(`[TEMPLE-TRANSPARENCY-AUTH]   - User email: ${userEmail}`);
      logger.warn('[TEMPLE-TRANSPARENCY-AUTH]   - Access denied: User is not premium member');
      logger.info('[TEMPLE-TRANSPARENCY-AUTH] ========================================');
      throw new Error('Forbidden: Premium membership required');
    }

    logger.info('[TEMPLE-TRANSPARENCY-AUTH] ✓ Premium membership verified');
    logger.info(`[TEMPLE-TRANSPARENCY-AUTH]   - User has premium membership`);

    // Step 4: Check approval_status
    logger.info('[TEMPLE-TRANSPARENCY-AUTH] Step 4: Checking approval status');
    logger.info(`[TEMPLE-TRANSPARENCY-AUTH]   - Approval status: "${userRecord.approval_status || 'not set'}"`);

    const approvalStatus = userRecord.approval_status || '';
    let accessLevel = 'full';

    if (approvalStatus === 'pending') {
      logger.warn('[TEMPLE-TRANSPARENCY-AUTH] ⚠ User has pending approval status');
      logger.warn(`[TEMPLE-TRANSPARENCY-AUTH]   - User ID: ${userId}`);
      logger.warn(`[TEMPLE-TRANSPARENCY-AUTH]   - Approval status: "pending"`);
      logger.warn('[TEMPLE-TRANSPARENCY-AUTH]   - Access allowed: YES (frontend will show overlay)');
      accessLevel = 'pending';
    } else if (approvalStatus === 'approved') {
      logger.info('[TEMPLE-TRANSPARENCY-AUTH] ✓ User has approved status');
      logger.info(`[TEMPLE-TRANSPARENCY-AUTH]   - User ID: ${userId}`);
      logger.info(`[TEMPLE-TRANSPARENCY-AUTH]   - Approval status: "approved"`);
      logger.info('[TEMPLE-TRANSPARENCY-AUTH]   - Access level: FULL');
      accessLevel = 'approved';
    } else {
      logger.warn('[TEMPLE-TRANSPARENCY-AUTH] ⚠ User has unknown approval status');
      logger.warn(`[TEMPLE-TRANSPARENCY-AUTH]   - Approval status: "${approvalStatus}"`);
      logger.warn('[TEMPLE-TRANSPARENCY-AUTH]   - Treating as pending (frontend will show overlay)');
      accessLevel = 'pending';
    }

    // Step 5: Log access attempt for audit trail
    logger.info('[TEMPLE-TRANSPARENCY-AUTH] Step 5: Logging access attempt for audit trail');
    logger.info('[TEMPLE-TRANSPARENCY-AUTH] ========================================');
    logger.info('[TEMPLE-TRANSPARENCY-AUTH] ✓ TEMPLE TRANSPARENCY ACCESS GRANTED');
    logger.info('[TEMPLE-TRANSPARENCY-AUTH] ========================================');
    logger.info(`[TEMPLE-TRANSPARENCY-AUTH] User ID: ${userId}`);
    logger.info(`[TEMPLE-TRANSPARENCY-AUTH] User email: ${userEmail}`);
    logger.info(`[TEMPLE-TRANSPARENCY-AUTH] Membership type: premium`);
    logger.info(`[TEMPLE-TRANSPARENCY-AUTH] Approval status: ${approvalStatus}`);
    logger.info(`[TEMPLE-TRANSPARENCY-AUTH] Access level: ${accessLevel}`);
    logger.info(`[TEMPLE-TRANSPARENCY-AUTH] Request path: ${req.path}`);
    logger.info(`[TEMPLE-TRANSPARENCY-AUTH] Request method: ${req.method}`);
    logger.info(`[TEMPLE-TRANSPARENCY-AUTH] Client IP: ${req.ip || 'unknown'}`);
    logger.info(`[TEMPLE-TRANSPARENCY-AUTH] Timestamp: ${new Date().toISOString()}`);
    logger.info('[TEMPLE-TRANSPARENCY-AUTH] ========================================');

    // Attach user data and access level to request for use in route handlers
    req.templeTransparency = {
      userId,
      userEmail,
      membershipType: 'premium',
      approvalStatus,
      accessLevel,
      grantedAt: new Date().toISOString(),
    };

    // Continue to next middleware/route
    next();
  } catch (error) {
    // Log error for audit trail
    logger.error('[TEMPLE-TRANSPARENCY-AUTH] ========================================');
    logger.error('[TEMPLE-TRANSPARENCY-AUTH] ✗ TEMPLE TRANSPARENCY ACCESS DENIED');
    logger.error('[TEMPLE-TRANSPARENCY-AUTH] ========================================');
    logger.error(`[TEMPLE-TRANSPARENCY-AUTH] Error message: ${error.message}`);
    logger.error(`[TEMPLE-TRANSPARENCY-AUTH] Error name: ${error.name}`);
    logger.error(`[TEMPLE-TRANSPARENCY-AUTH] Error cause: ${error.cause?.message || 'none'}`);
    logger.error(`[TEMPLE-TRANSPARENCY-AUTH] Request path: ${req.path}`);
    logger.error(`[TEMPLE-TRANSPARENCY-AUTH] Request method: ${req.method}`);
    logger.error(`[TEMPLE-TRANSPARENCY-AUTH] Client IP: ${req.ip || 'unknown'}`);
    logger.error(`[TEMPLE-TRANSPARENCY-AUTH] User ID: ${req.user?.id || 'not authenticated'}`);
    logger.error(`[TEMPLE-TRANSPARENCY-AUTH] User email: ${req.user?.email || 'not authenticated'}`);
    logger.error(`[TEMPLE-TRANSPARENCY-AUTH] Timestamp: ${new Date().toISOString()}`);
    logger.error('[TEMPLE-TRANSPARENCY-AUTH] ========================================');

    // Throw error for errorMiddleware to catch and return appropriate HTTP response
    throw error;
  }
};

export default templeTransparencyAuth;