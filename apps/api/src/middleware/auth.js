import 'dotenv/config';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';

/**
 * Authentication Middleware
 * 
 * Extracts and validates Bearer tokens from the Authorization header.
 * Sets req.user with authenticated user information for use in routes.
 * 
 * Flow:
 * 1. Extract Authorization header
 * 2. Extract Bearer token (remove 'Bearer ' prefix)
 * 3. Validate token format and expiration
 * 4. Decode token to get user ID
 * 5. Fetch user from PocketBase
 * 6. Set req.user with authenticated user info including role
 * 7. Call next() to pass to next middleware/route
 * 
 * If token is invalid or missing, req.user will be undefined.
 * Routes can check req.user to determine if user is authenticated.
 * 
 * CRITICAL: This middleware does NOT throw errors for missing/invalid tokens.
 * Routes are responsible for checking req.user and throwing errors if needed.
 */

export const authMiddleware = async (req, res, next) => {
  logger.info('[AUTH-MIDDLEWARE] ========================================');
  logger.info('[AUTH-MIDDLEWARE] Authentication Middleware');
  logger.info('[AUTH-MIDDLEWARE] ========================================');
  logger.info(`[AUTH-MIDDLEWARE] Timestamp: ${new Date().toISOString()}`);
  logger.info(`[AUTH-MIDDLEWARE] Request path: ${req.path}`);
  logger.info(`[AUTH-MIDDLEWARE] Request method: ${req.method}`);

  try {
    // Step 1: Extract Authorization header
    logger.info('[AUTH-MIDDLEWARE] Step 1: Extracting Authorization header');
    const authHeader = req.get('Authorization');
    
    if (!authHeader) {
      logger.warn('[AUTH-MIDDLEWARE] ⚠ No Authorization header found');
      logger.warn('[AUTH-MIDDLEWARE]   - Request will proceed without authentication');
      logger.info('[AUTH-MIDDLEWARE] ========================================');
      return next();
    }

    logger.info('[AUTH-MIDDLEWARE] ✓ Authorization header found');
    logger.info(`[AUTH-MIDDLEWARE]   - Header length: ${authHeader.length} characters`);

    // Step 2: Extract Bearer token (remove 'Bearer ' prefix)
    logger.info('[AUTH-MIDDLEWARE] Step 2: Extracting Bearer token');
    
    if (!authHeader.startsWith('Bearer ')) {
      logger.warn('[AUTH-MIDDLEWARE] ⚠ Authorization header does not start with "Bearer "');
      logger.warn(`[AUTH-MIDDLEWARE]   - Header starts with: "${authHeader.substring(0, 20)}..."`);
      logger.warn('[AUTH-MIDDLEWARE]   - Request will proceed without authentication');
      logger.info('[AUTH-MIDDLEWARE] ========================================');
      return next();
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix (7 characters)
    logger.info('[AUTH-MIDDLEWARE] ✓ Bearer token extracted successfully');
    logger.info(`[AUTH-MIDDLEWARE]   - Token length: ${token.length} characters`);

    // Step 3: Validate token format (basic JWT structure check)
    logger.info('[AUTH-MIDDLEWARE] Step 3: Validating token format');
    const tokenParts = token.split('.');
    
    if (tokenParts.length !== 3) {
      logger.warn('[AUTH-MIDDLEWARE] ✗ Token validation FAILED: Invalid JWT format');
      logger.warn(`[AUTH-MIDDLEWARE]   - Expected 3 parts (header.payload.signature), got ${tokenParts.length}`);
      logger.warn('[AUTH-MIDDLEWARE]   - Request will proceed without authentication');
      logger.info('[AUTH-MIDDLEWARE] ========================================');
      return next();
    }

    logger.info('[AUTH-MIDDLEWARE] ✓ Token has valid JWT format (3 parts)');

    // Step 4: Decode token payload to get user ID and check expiration
    logger.info('[AUTH-MIDDLEWARE] Step 4: Decoding token payload');
    let payload;
    try {
      const payloadJson = Buffer.from(tokenParts[1], 'base64').toString();
      payload = JSON.parse(payloadJson);
      logger.info('[AUTH-MIDDLEWARE] ✓ Token payload decoded successfully');
      logger.info(`[AUTH-MIDDLEWARE]   - User ID: ${payload.id || 'N/A'}`);
      logger.info(`[AUTH-MIDDLEWARE]   - Token issued at: ${payload.iat ? new Date(payload.iat * 1000).toISOString() : 'N/A'}`);
      logger.info(`[AUTH-MIDDLEWARE]   - Token expires at: ${payload.exp ? new Date(payload.exp * 1000).toISOString() : 'N/A'}`);
    } catch (decodeError) {
      logger.warn('[AUTH-MIDDLEWARE] ✗ Failed to decode token payload');
      logger.warn(`[AUTH-MIDDLEWARE]   - Error: ${decodeError.message}`);
      logger.warn('[AUTH-MIDDLEWARE]   - Request will proceed without authentication');
      logger.info('[AUTH-MIDDLEWARE] ========================================');
      return next();
    }

    // Step 5: Check token expiration
    logger.info('[AUTH-MIDDLEWARE] Step 5: Checking token expiration');
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      logger.warn('[AUTH-MIDDLEWARE] ✗ Token validation FAILED: Token is expired');
      logger.warn(`[AUTH-MIDDLEWARE]   - Expired at: ${new Date(payload.exp * 1000).toISOString()}`);
      logger.warn('[AUTH-MIDDLEWARE]   - Request will proceed without authentication');
      logger.info('[AUTH-MIDDLEWARE] ========================================');
      return next();
    }

    logger.info('[AUTH-MIDDLEWARE] ✓ Token is not expired');

    // Step 6: Fetch user from PocketBase
    logger.info('[AUTH-MIDDLEWARE] Step 6: Fetching user from PocketBase');
    logger.info(`[AUTH-MIDDLEWARE]   - User ID: ${payload.id}`);
    logger.info('[AUTH-MIDDLEWARE]   - Collection: users');

    let user;
    try {
      user = await pb.collection('users').getOne(payload.id);
      logger.info('[AUTH-MIDDLEWARE] ✓ User record fetched successfully');
      logger.info(`[AUTH-MIDDLEWARE]   - User ID: ${user.id}`);
      logger.info(`[AUTH-MIDDLEWARE]   - Email: ${user.email}`);
      logger.info(`[AUTH-MIDDLEWARE]   - Name: ${user.name || 'N/A'}`);
      logger.info(`[AUTH-MIDDLEWARE]   - Role: ${user.role || 'user'}`);
    } catch (pbError) {
      logger.warn('[AUTH-MIDDLEWARE] ✗ Failed to fetch user from PocketBase');
      logger.warn(`[AUTH-MIDDLEWARE]   - Error: ${pbError.message}`);
      logger.warn('[AUTH-MIDDLEWARE]   - Request will proceed without authentication');
      logger.info('[AUTH-MIDDLEWARE] ========================================');
      return next();
    }

    // Step 7: Set req.user with authenticated user info
    logger.info('[AUTH-MIDDLEWARE] Step 7: Setting req.user with authenticated user info');
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name || 'N/A',
      role: user.role || 'user',
      verified: user.verified || false,
    };

    logger.info('[AUTH-MIDDLEWARE] ✓ req.user populated successfully');
    logger.info('[AUTH-MIDDLEWARE] User details:');
    logger.info(`[AUTH-MIDDLEWARE]   - ID: ${req.user.id}`);
    logger.info(`[AUTH-MIDDLEWARE]   - Email: ${req.user.email}`);
    logger.info(`[AUTH-MIDDLEWARE]   - Name: ${req.user.name}`);
    logger.info(`[AUTH-MIDDLEWARE]   - Role: ${req.user.role}`);
    logger.info(`[AUTH-MIDDLEWARE]   - Verified: ${req.user.verified}`);

    logger.info('[AUTH-MIDDLEWARE] ========================================');
    logger.info('[AUTH-MIDDLEWARE] ✓ AUTHENTICATION SUCCESSFUL');
    logger.info('[AUTH-MIDDLEWARE] ========================================');

    next();
  } catch (error) {
    logger.error('[AUTH-MIDDLEWARE] ========================================');
    logger.error('[AUTH-MIDDLEWARE] ✗ AUTHENTICATION ERROR');
    logger.error('[AUTH-MIDDLEWARE] ========================================');
    logger.error(`[AUTH-MIDDLEWARE] Error message: ${error.message}`);
    logger.error(`[AUTH-MIDDLEWARE] Error name: ${error.name}`);
    logger.error(`[AUTH-MIDDLEWARE] Error stack: ${error.stack}`);
    logger.error('[AUTH-MIDDLEWARE] ========================================');
    logger.warn('[AUTH-MIDDLEWARE] Request will proceed without authentication');
    next();
  }
};

export default authMiddleware;