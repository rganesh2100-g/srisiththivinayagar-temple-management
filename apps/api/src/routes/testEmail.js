import 'dotenv/config';
import express from 'express';
import logger from '../utils/logger.js';
import { sendTestEmail } from '../utils/emailService.js';

const router = express.Router();

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Helper function to validate email format
const isValidEmail = (email) => {
  return EMAIL_REGEX.test(email);
};

// POST /test-email - Send test email to verify email system
router.post('/', async (req, res) => {
  logger.info('[TEST-EMAIL] ========================================');
  logger.info('[TEST-EMAIL] POST / - Test email request received');
  logger.info('[TEST-EMAIL] ========================================');
  logger.info(`[TEST-EMAIL] Request body:`, JSON.stringify(req.body, null, 2));

  const { email } = req.body;

  // Input validation
  logger.info('[TEST-EMAIL] Step 1: Validating input parameters');

  if (!email) {
    logger.warn('[TEST-EMAIL] ✗ Validation failed: Missing email parameter');
    return res.status(400).json({ error: 'email parameter is required' });
  }
  logger.info(`[TEST-EMAIL] ✓ email parameter present: ${email}`);

  if (typeof email !== 'string') {
    logger.warn('[TEST-EMAIL] ✗ Validation failed: Email is not a string');
    logger.warn(`[TEST-EMAIL]   - Type received: ${typeof email}`);
    return res.status(400).json({ error: 'email must be a string' });
  }
  logger.info('[TEST-EMAIL] ✓ email is a string');

  const trimmedEmail = email.trim();
  logger.info(`[TEST-EMAIL] Trimmed email: ${trimmedEmail}`);

  if (!isValidEmail(trimmedEmail)) {
    logger.warn(`[TEST-EMAIL] ✗ Validation failed: Invalid email format`);
    logger.warn(`[TEST-EMAIL]   - Email: ${trimmedEmail}`);
    return res.status(400).json({ error: 'Invalid email format' });
  }
  logger.info('[TEST-EMAIL] ✓ email format is valid');

  logger.info(`[TEST-EMAIL] ✓ All input parameters validated successfully`);
  logger.info(`[TEST-EMAIL] Test email request validated for: ${trimmedEmail}`);

  try {
    // Send test email
    logger.info(`[TEST-EMAIL] Step 2: Calling emailService.sendTestEmail()`);
    logger.info(`[TEST-EMAIL]   - Recipient: ${trimmedEmail}`);

    const result = await sendTestEmail(trimmedEmail);

    logger.info('[TEST-EMAIL] ========================================');
    logger.info('[TEST-EMAIL] ✓ TEST EMAIL SENT SUCCESSFULLY');
    logger.info('[TEST-EMAIL] ========================================');
    logger.info(`[TEST-EMAIL] Recipient: ${trimmedEmail}`);
    logger.info(`[TEST-EMAIL] Message ID: ${result.messageId}`);
    logger.info(`[TEST-EMAIL] Message: ${result.message}`);

    res.json({
      success: true,
      message: result.message,
      messageId: result.messageId,
    });
  } catch (error) {
    logger.error('[TEST-EMAIL] ========================================');
    logger.error('[TEST-EMAIL] ✗ TEST EMAIL FAILED');
    logger.error('[TEST-EMAIL] ========================================');
    logger.error(`[TEST-EMAIL] Error message: ${error.message}`);
    logger.error(`[TEST-EMAIL] Error name: ${error.name}`);
    logger.error(`[TEST-EMAIL] Error stack: ${error.stack}`);

    res.status(500).json({
      error: 'Failed to send test email',
      details: error.message,
    });
  }
});

export default router;