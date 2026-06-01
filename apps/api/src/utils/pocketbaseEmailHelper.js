import 'dotenv/config';
import logger from './logger.js';

/**
 * PocketBase Email Helper
 * 
 * This utility provides helper functions for email operations in PocketBase hooks.
 * Use this in your PocketBase hook files to send emails reliably.
 * 
 * IMPORTANT: This file is for reference and documentation.
 * The actual email sending happens in PocketBase hooks (server-side).
 * 
 * PocketBase Hook Example:
 * ```javascript
 * // In donation-receipt-email.pb.js hook
 * routerAdd('post', '/api/collections/donations/records/:id/email', (c) => {
 *   const donation = c.get('donation');
 *   const mailClient = $app.newMailClient();
 *   
 *   const message = new MailerMessage({
 *     from: { address: $app.settings().meta.senderAddress },
 *     to: [{ address: donation.donorEmail }],
 *     subject: 'Donation Receipt',
 *     html: emailHtml,
 *   });
 *   
 *   return mailClient.send(message);
 * }, $apis.requireRecordAuth());
 * ```
 */

/**
 * Helper function to validate email address
 * @param {string} email - Email address to validate
 * @returns {boolean} True if email is valid
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Helper function to log email sending attempt
 * @param {string} recipient - Recipient email
 * @param {string} subject - Email subject
 * @param {string} context - Context/source of email
 */
export const logEmailAttempt = (recipient, subject, context = 'EMAIL') => {
  logger.info(`[${context}] Attempting to send email`);
  logger.info(`[${context}] Recipient: ${recipient}`);
  logger.info(`[${context}] Subject: ${subject}`);
};

/**
 * Helper function to log email success
 * @param {string} recipient - Recipient email
 * @param {string} messageId - Message ID from mail client
 * @param {string} context - Context/source of email
 */
export const logEmailSuccess = (recipient, messageId, context = 'EMAIL') => {
  logger.info(`[${context}] ✓ Email sent successfully`);
  logger.info(`[${context}] Recipient: ${recipient}`);
  logger.info(`[${context}] Message ID: ${messageId}`);
};

/**
 * Helper function to log email failure
 * @param {string} recipient - Recipient email
 * @param {Error} error - Error object
 * @param {string} context - Context/source of email
 */
export const logEmailError = (recipient, error, context = 'EMAIL') => {
  logger.error(`[${context}] ✗ Failed to send email`);
  logger.error(`[${context}] Recipient: ${recipient}`);
  logger.error(`[${context}] Error: ${error.message}`);
  logger.error(`[${context}] Stack: ${error.stack}`);
};

/**
 * Helper function to validate email payload
 * @param {Object} payload - Email payload
 * @returns {Object} Validation result { valid: boolean, errors: string[] }
 */
export const validateEmailPayload = (payload) => {
  const errors = [];

  if (!payload.recipient || !isValidEmail(payload.recipient)) {
    errors.push('Invalid or missing recipient email');
  }

  if (!payload.subject || payload.subject.trim().length === 0) {
    errors.push('Missing email subject');
  }

  if (!payload.html || payload.html.trim().length === 0) {
    errors.push('Missing email HTML content');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Helper function to log email payload (for debugging)
 * @param {Object} payload - Email payload
 * @param {string} context - Context/source of email
 */
export const logEmailPayload = (payload, context = 'EMAIL') => {
  logger.info(`[${context}] Email Payload:`);
  logger.info(`[${context}]   Recipient: ${payload.recipient}`);
  logger.info(`[${context}]   Subject: ${payload.subject}`);
  logger.info(`[${context}]   HTML Length: ${payload.html ? payload.html.length : 0} characters`);
  logger.info(`[${context}]   Has Attachments: ${payload.attachments ? payload.attachments.length > 0 : false}`);
};

export default {
  isValidEmail,
  logEmailAttempt,
  logEmailSuccess,
  logEmailError,
  validateEmailPayload,
  logEmailPayload,
};