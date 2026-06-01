import 'dotenv/config';
import logger from './logger.js';

/**
 * Receipt ID Generator Utility
 * 
 * Generates unique receipt IDs for different transaction types.
 * Each ID is generated ONCE and stored in the database.
 * IDs are never regenerated for the same transaction.
 * 
 * Format:
 * - Donations: DONATION_{timestamp}_{random6digits}
 * - Pooja Bookings: POOJA_{timestamp}_{random6digits}
 * - Premium Subscriptions: PS_{timestamp}_{random6digits}
 * 
 * Example:
 * - DONATION_1712275200_482916
 * - POOJA_1712275200_482916
 * - PS_1712275200_482916
 */

/**
 * Generate a random 6-digit number
 * @returns {string} Random 6-digit number as string (e.g., "482916")
 */
const generateRandom6Digits = () => {
  return String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
};

/**
 * Generate a unique donation receipt ID
 * Format: DONATION_{timestamp}_{random6digits}
 * Example: DONATION_1712275200_482916
 * 
 * @returns {string} Unique donation receipt ID
 */
export const generateDonationReceiptId = () => {
  const timestamp = Math.floor(Date.now() / 1000); // Unix timestamp in seconds
  const random = generateRandom6Digits();
  const receiptId = `DONATION_${timestamp}_${random}`;
  
  logger.info('[RECEIPT-ID-GENERATOR] ========================================');
  logger.info('[RECEIPT-ID-GENERATOR] Generated donation receipt ID');
  logger.info(`[RECEIPT-ID-GENERATOR]   - Receipt ID: ${receiptId}`);
  logger.info(`[RECEIPT-ID-GENERATOR]   - Format: DONATION_{timestamp}_{random6digits}`);
  logger.info(`[RECEIPT-ID-GENERATOR]   - Timestamp: ${timestamp}`);
  logger.info(`[RECEIPT-ID-GENERATOR]   - Random: ${random}`);
  logger.info('[RECEIPT-ID-GENERATOR]   - This ID will be stored once and never regenerated');
  logger.info('[RECEIPT-ID-GENERATOR] ========================================');
  
  return receiptId;
};

/**
 * Generate a unique pooja booking receipt ID
 * Format: POOJA_{timestamp}_{random6digits}
 * Example: POOJA_1712275200_482916
 * 
 * @returns {string} Unique pooja receipt ID
 */
export const generatePoojaReceiptId = () => {
  const timestamp = Math.floor(Date.now() / 1000); // Unix timestamp in seconds
  const random = generateRandom6Digits();
  const receiptId = `POOJA_${timestamp}_${random}`;
  
  logger.info('[RECEIPT-ID-GENERATOR] ========================================');
  logger.info('[RECEIPT-ID-GENERATOR] Generated pooja receipt ID');
  logger.info(`[RECEIPT-ID-GENERATOR]   - Receipt ID: ${receiptId}`);
  logger.info(`[RECEIPT-ID-GENERATOR]   - Format: POOJA_{timestamp}_{random6digits}`);
  logger.info(`[RECEIPT-ID-GENERATOR]   - Timestamp: ${timestamp}`);
  logger.info(`[RECEIPT-ID-GENERATOR]   - Random: ${random}`);
  logger.info('[RECEIPT-ID-GENERATOR]   - This ID will be stored once and never regenerated');
  logger.info('[RECEIPT-ID-GENERATOR] ========================================');
  
  return receiptId;
};

/**
 * Generate a unique premium subscription receipt ID
 * Format: PS_{timestamp}_{random6digits}
 * Example: PS_1712275200_482916
 * 
 * @returns {string} Unique premium subscription receipt ID
 */
export const generatePremiumSubscriptionReceiptId = () => {
  const timestamp = Math.floor(Date.now() / 1000); // Unix timestamp in seconds
  const random = generateRandom6Digits();
  const receiptId = `PS_${timestamp}_${random}`;
  
  logger.info('[RECEIPT-ID-GENERATOR] ========================================');
  logger.info('[RECEIPT-ID-GENERATOR] Generated premium subscription receipt ID');
  logger.info(`[RECEIPT-ID-GENERATOR]   - Receipt ID: ${receiptId}`);
  logger.info(`[RECEIPT-ID-GENERATOR]   - Format: PS_{timestamp}_{random6digits}`);
  logger.info(`[RECEIPT-ID-GENERATOR]   - Timestamp: ${timestamp}`);
  logger.info(`[RECEIPT-ID-GENERATOR]   - Random: ${random}`);
  logger.info('[RECEIPT-ID-GENERATOR]   - This ID will be stored once and never regenerated');
  logger.info('[RECEIPT-ID-GENERATOR] ========================================');
  
  return receiptId;
};

export default {
  generateDonationReceiptId,
  generatePoojaReceiptId,
  generatePremiumSubscriptionReceiptId,
};