import 'dotenv/config';
import pb from './pocketbaseClient.js';
import logger from './logger.js';

/**
 * Admin User Setup Utility
 * 
 * Creates or updates admin users in the PocketBase users collection.
 * This utility is used to initialize the system with default admin accounts.
 * 
 * CRITICAL: This function ALWAYS ensures admin users have:
 * - role = 'admin' (explicitly set)
 * - verified = true
 * - password set (for login)
 */

const adminUsers = [
  {
    email: 'admin@demo.com',
    password: 'demo123',
    passwordConfirm: 'demo123',
    name: 'Demo Admin',
    role: 'admin',
    verified: true,
  },
  {
    email: 'geeemmtechnology@gmail.com',
    password: 'geeemm123',
    passwordConfirm: 'geeemm123',
    name: 'Admin User',
    role: 'admin',
    verified: true,
  },
  {
    email: 'apuurnan@gmail.com',
    password: 'apuurnan123',
    passwordConfirm: 'apuurnan123',
    name: 'Admin User',
    role: 'admin',
    verified: true,
  },
  {
    email: 'newadmin@tempelvereein.de',
    password: 'TempAdmin@2024',
    passwordConfirm: 'TempAdmin@2024',
    name: 'Temple Admin',
    role: 'admin',
    verified: true,
  },
];

/**
 * Setup admin users in PocketBase
 * Creates new admin users or updates existing ones to ensure they have admin role and verified status
 * 
 * CRITICAL: This function ALWAYS sets role='admin' explicitly, even for existing users
 */
export const setupAdminUsers = async () => {
  logger.info('[ADMIN-USER-SETUP] ========================================');
  logger.info('[ADMIN-USER-SETUP] Setting up admin users');
  logger.info('[ADMIN-USER-SETUP] Timestamp: ' + new Date().toISOString());
  logger.info('[ADMIN-USER-SETUP] ========================================');

  for (const adminUser of adminUsers) {
    try {
      logger.info(`[ADMIN-USER-SETUP] Processing admin user: ${adminUser.email}`);

      // Try to find existing user
      let existingUser = null;
      try {
        const users = await pb.collection('users').getFullList({
          filter: `email = "${adminUser.email}"`,
        });
        if (users.length > 0) {
          existingUser = users[0];
        }
      } catch (error) {
        logger.warn(`[ADMIN-USER-SETUP] Could not search for existing user: ${error.message}`);
      }

      if (existingUser) {
        // Update existing user to ensure admin role and verified status
        logger.info(`[ADMIN-USER-SETUP] ✓ User exists: ${adminUser.email}`);
        logger.info(`[ADMIN-USER-SETUP]   - User ID: ${existingUser.id}`);
        logger.info(`[ADMIN-USER-SETUP]   - Current role: "${existingUser.role || 'user'}"`);
        logger.info(`[ADMIN-USER-SETUP]   - Current verified: ${existingUser.verified}`);
        logger.info(`[ADMIN-USER-SETUP] Updating user to admin role and verified status`);

        // CRITICAL: Always set role='admin' explicitly
        const updatedUser = await pb.collection('users').update(existingUser.id, {
          role: 'admin',
          verified: true,
        });

        logger.info(`[ADMIN-USER-SETUP] ✓ User updated successfully`);
        logger.info(`[ADMIN-USER-SETUP]   - User ID: ${updatedUser.id}`);
        logger.info(`[ADMIN-USER-SETUP]   - Email: ${updatedUser.email}`);
        logger.info(`[ADMIN-USER-SETUP]   - New role: "${updatedUser.role}"`);
        logger.info(`[ADMIN-USER-SETUP]   - New verified: ${updatedUser.verified}`);
        logger.info(`[ADMIN-USER-SETUP]   - Role type: ${typeof updatedUser.role}`);
        logger.info(`[ADMIN-USER-SETUP]   - Role === 'admin': ${updatedUser.role === 'admin'}`);
        logger.info(`[ADMIN-USER-SETUP] ========================================`);
      } else {
        // Create new admin user
        logger.info(`[ADMIN-USER-SETUP] Creating new admin user: ${adminUser.email}`);

        const newUser = await pb.collection('users').create({
          email: adminUser.email,
          password: adminUser.password,
          passwordConfirm: adminUser.passwordConfirm,
          name: adminUser.name,
          role: 'admin',
          verified: true,
        });

        logger.info(`[ADMIN-USER-SETUP] ✓ Admin user created successfully`);
        logger.info(`[ADMIN-USER-SETUP]   - User ID: ${newUser.id}`);
        logger.info(`[ADMIN-USER-SETUP]   - Email: ${newUser.email}`);
        logger.info(`[ADMIN-USER-SETUP]   - Name: ${newUser.name}`);
        logger.info(`[ADMIN-USER-SETUP]   - Role: "${newUser.role}"`);
        logger.info(`[ADMIN-USER-SETUP]   - Verified: ${newUser.verified}`);
        logger.info(`[ADMIN-USER-SETUP]   - Role type: ${typeof newUser.role}`);
        logger.info(`[ADMIN-USER-SETUP]   - Role === 'admin': ${newUser.role === 'admin'}`);
        logger.info(`[ADMIN-USER-SETUP] ========================================`);
      }
    } catch (error) {
      logger.error(`[ADMIN-USER-SETUP] ✗ Error processing admin user: ${adminUser.email}`);
      logger.error(`[ADMIN-USER-SETUP]   - Error message: ${error.message}`);
      logger.error(`[ADMIN-USER-SETUP]   - Error code: ${error.code || 'N/A'}`);
      logger.error(`[ADMIN-USER-SETUP]   - Error status: ${error.status || 'N/A'}`);
      logger.error(`[ADMIN-USER-SETUP]   - Error stack: ${error.stack}`);
      // Continue with next user instead of failing
    }
  }

  logger.info('[ADMIN-USER-SETUP] ========================================');
  logger.info('[ADMIN-USER-SETUP] ✓ Admin user setup completed');
  logger.info('[ADMIN-USER-SETUP] Timestamp: ' + new Date().toISOString());
  logger.info('[ADMIN-USER-SETUP] ========================================');
};

export default {
  setupAdminUsers,
  adminUsers,
};