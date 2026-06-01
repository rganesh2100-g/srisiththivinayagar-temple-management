import 'dotenv/config';
import express from 'express';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';

const router = express.Router();

logger.info('[RECEIPTS-GENERATOR-ROUTES] Initializing Receipts Generator Routes');

/**
 * POST /generate-receipt - Generate and store receipt for approved payment
 *
 * Request body:
 *   - email (string, required): Email address to search for in payments collection
 *
 * Response:
 *   - { success: true, receiptId, receiptData } on success
 *   - { success: false, error: 'message' } on failure
 *
 * Flow:
 * 1. Validate email parameter
 * 2. Query payments collection for records where email matches AND status='approved'
 * 3. Use first matching record
 * 4. Generate receipt ID (RCP-{timestamp})
 * 5. Create receipt data object with all transaction details
 * 6. Store receipt_data as JSON on the payments record
 * 7. Return success response with receiptId and receiptData
 *
 * Security: No authentication required (public endpoint)
 */
router.post('/', async (req, res) => {
  logger.info('[RECEIPTS-GENERATOR] ========================================');
  logger.info('[RECEIPTS-GENERATOR] POST / - Generate receipt request received');
  logger.info('[RECEIPTS-GENERATOR] ========================================');
  logger.info(`[RECEIPTS-GENERATOR] Timestamp: ${new Date().toISOString()}`);
  logger.info('[RECEIPTS-GENERATOR] Request body:', JSON.stringify(req.body, null, 2));

  const { email } = req.body;

  // Step 1: Validate email parameter
  logger.info('[RECEIPTS-GENERATOR] Step 1: Validating email parameter');

  if (!email || typeof email !== 'string' || email.trim().length === 0) {
    logger.warn('[RECEIPTS-GENERATOR] ✗ Validation failed: Missing or invalid email');
    logger.warn(`[RECEIPTS-GENERATOR]   - email received: ${JSON.stringify(email)}`);
    throw new Error('Email parameter is required and must be a non-empty string');
  }

  const trimmedEmail = email.trim();
  logger.info(`[RECEIPTS-GENERATOR] ✓ email parameter validated: ${trimmedEmail}`);

  // Step 2: Query payments collection for approved records with matching email
  logger.info('[RECEIPTS-GENERATOR] Step 2: Querying payments collection');
  logger.info(`[RECEIPTS-GENERATOR]   - Collection: payments`);
  logger.info(`[RECEIPTS-GENERATOR]   - Filter: email = "${trimmedEmail}" AND status = "approved"`);
  logger.info('[RECEIPTS-GENERATOR]   - Sort: -created (newest first)');
  logger.info('[RECEIPTS-GENERATOR]   - Limit: 1 (first matching record)');

  let payments;
  try {
    payments = await pb.collection('payments').getFullList({
      filter: `email = "${trimmedEmail}" && status = "approved"`,
      sort: '-created',
      limit: 1,
    });
    logger.info('[RECEIPTS-GENERATOR] ✓ Payments query completed');
    logger.info(`[RECEIPTS-GENERATOR]   - Records found: ${payments.length}`);
  } catch (error) {
    logger.error('[RECEIPTS-GENERATOR] ✗ Error querying payments collection');
    logger.error(`[RECEIPTS-GENERATOR]   - Error message: ${error.message}`);
    logger.error(`[RECEIPTS-GENERATOR]   - Error status: ${error.status || 'unknown'}`);
    throw new Error(`Failed to query payments collection: ${error.message}`, { cause: error });
  }

  // Step 3: Check if any approved payment found
  logger.info('[RECEIPTS-GENERATOR] Step 3: Checking if approved payment exists');

  if (!payments || payments.length === 0) {
    logger.warn('[RECEIPTS-GENERATOR] ✗ No approved payment found');
    logger.warn(`[RECEIPTS-GENERATOR]   - Email: ${trimmedEmail}`);
    logger.warn('[RECEIPTS-GENERATOR]   - Status: approved');
    throw new Error(`No approved payment found for email: ${trimmedEmail}`);
  }

  const payment = payments[0];
  logger.info('[RECEIPTS-GENERATOR] ✓ Approved payment found');
  logger.info(`[RECEIPTS-GENERATOR]   - Payment ID: ${payment.id}`);
  logger.info(`[RECEIPTS-GENERATOR]   - Email: ${payment.email}`);
  logger.info(`[RECEIPTS-GENERATOR]   - Amount: €${payment.amount || 0}`);
  logger.info(`[RECEIPTS-GENERATOR]   - Plan Type: ${payment.plan_type || 'N/A'}`);
  logger.info(`[RECEIPTS-GENERATOR]   - Status: ${payment.status}`);
  logger.info(`[RECEIPTS-GENERATOR]   - Created: ${payment.created}`);

  // Step 4: Generate receipt ID
  logger.info('[RECEIPTS-GENERATOR] Step 4: Generating receipt ID');

  const timestamp = Date.now();
  const receiptId = `RCP-${timestamp}`;

  logger.info('[RECEIPTS-GENERATOR] ✓ Receipt ID generated');
  logger.info(`[RECEIPTS-GENERATOR]   - Receipt ID: ${receiptId}`);
  logger.info(`[RECEIPTS-GENERATOR]   - Format: RCP-{timestamp}`);
  logger.info(`[RECEIPTS-GENERATOR]   - Timestamp: ${timestamp}`);

  // Step 5: Create receipt data object
  logger.info('[RECEIPTS-GENERATOR] Step 5: Creating receipt data object');

  const receiptData = {
    receiptId,
    email: payment.email || '',
    amount: payment.amount || 0,
    planType: payment.plan_type || 'N/A',
    approvalDate: payment.updated || payment.created || new Date().toISOString(),
    transactionId: payment.transaction_id || payment.id || 'N/A',
    generatedAt: new Date().toISOString(),
    paymentId: payment.id,
  };

  logger.info('[RECEIPTS-GENERATOR] ✓ Receipt data object created');
  logger.info('[RECEIPTS-GENERATOR] Receipt data:');
  logger.info('[RECEIPTS-GENERATOR]', JSON.stringify(receiptData, null, 2));

  // Step 6: Store receipt_data on the payments record
  logger.info('[RECEIPTS-GENERATOR] Step 6: Storing receipt_data on payments record');
  logger.info(`[RECEIPTS-GENERATOR]   - Payment ID: ${payment.id}`);
  logger.info('[RECEIPTS-GENERATOR]   - Field: receipt_data');
  logger.info('[RECEIPTS-GENERATOR]   - Data type: JSON object');

  let updatedPayment;
  try {
    updatedPayment = await pb.collection('payments').update(payment.id, {
      receipt_data: receiptData,
    });
    logger.info('[RECEIPTS-GENERATOR] ✓ Receipt data stored successfully');
    logger.info(`[RECEIPTS-GENERATOR]   - Payment ID: ${updatedPayment.id}`);
    logger.info(`[RECEIPTS-GENERATOR]   - receipt_data field updated`);
  } catch (error) {
    logger.error('[RECEIPTS-GENERATOR] ✗ Error storing receipt_data on payments record');
    logger.error(`[RECEIPTS-GENERATOR]   - Payment ID: ${payment.id}`);
    logger.error(`[RECEIPTS-GENERATOR]   - Error message: ${error.message}`);
    logger.error(`[RECEIPTS-GENERATOR]   - Error status: ${error.status || 'unknown'}`);
    throw new Error(`Failed to store receipt data: ${error.message}`, { cause: error });
  }

  // Step 7: Return success response
  logger.info('[RECEIPTS-GENERATOR] ========================================');
  logger.info('[RECEIPTS-GENERATOR] ✓ RECEIPT GENERATION COMPLETED SUCCESSFULLY');
  logger.info('[RECEIPTS-GENERATOR] ========================================');
  logger.info(`[RECEIPTS-GENERATOR] Receipt ID: ${receiptId}`);
  logger.info(`[RECEIPTS-GENERATOR] Email: ${payment.email}`);
  logger.info(`[RECEIPTS-GENERATOR] Amount: €${payment.amount || 0}`);
  logger.info(`[RECEIPTS-GENERATOR] Plan Type: ${payment.plan_type || 'N/A'}`);
  logger.info(`[RECEIPTS-GENERATOR] Payment ID: ${payment.id}`);

  res.status(201).json({
    success: true,
    receiptId,
    receiptData,
  });
});

export default router;