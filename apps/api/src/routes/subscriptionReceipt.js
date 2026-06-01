import 'dotenv/config';
import express from 'express';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';
import { generateSubscriptionReceipt } from '../utils/pdfReceiptGenerator.js';
import { generatePremiumSubscriptionReceiptId } from '../utils/receiptIdGenerator.js';

const router = express.Router();

logger.info('[SUBSCRIPTION-RECEIPT-ROUTES] Initializing Subscription Receipt Routes');

/**
 * POST /subscription-receipt/generate
 * Generate receipt for a subscription by email
 * 
 * Request body:
 *   - email (string, required): User email to query subscriptions
 *   - subscriptionId (string, optional): Specific subscription ID to generate receipt for
 * 
 * Response:
 *   - { success: true, receiptId: string, message: string }
 */
router.post('/generate', async (req, res) => {
  logger.info('[SUBSCRIPTION-RECEIPT-GENERATE] ========================================');
  logger.info('[SUBSCRIPTION-RECEIPT-GENERATE] POST /generate - Generate receipt request received');
  logger.info('[SUBSCRIPTION-RECEIPT-GENERATE] ========================================');
  logger.info('[SUBSCRIPTION-RECEIPT-GENERATE] Request body:', JSON.stringify(req.body, null, 2));

  const { email, subscriptionId } = req.body;

  // Step 1: Validate input parameters
  logger.info('[SUBSCRIPTION-RECEIPT-GENERATE] Step 1: Validating input parameters');

  if (!email || typeof email !== 'string' || email.trim().length === 0) {
    logger.warn('[SUBSCRIPTION-RECEIPT-GENERATE] ✗ Validation failed: Missing or invalid email');
    logger.warn(`[SUBSCRIPTION-RECEIPT-GENERATE]   - email received: ${JSON.stringify(email)}`);
    throw new Error('Email parameter is required and must be a non-empty string');
  }
  logger.info(`[SUBSCRIPTION-RECEIPT-GENERATE] ✓ email validated: ${email}`);

  logger.info('[SUBSCRIPTION-RECEIPT-GENERATE] ✓ All input parameters validated successfully');

  // Step 2: Query subscriptions by email
  logger.info('[SUBSCRIPTION-RECEIPT-GENERATE] Step 2: Querying subscriptions by email');
  logger.info(`[SUBSCRIPTION-RECEIPT-GENERATE]   - Email to query: ${email}`);
  logger.info('[SUBSCRIPTION-RECEIPT-GENERATE]   - Collection: subscriptions');
  logger.info('[SUBSCRIPTION-RECEIPT-GENERATE]   - Filter: Expand user relation and match email');

  let subscriptions;
  try {
    // Query subscriptions and expand the user relation to access user.email
    subscriptions = await pb.collection('subscriptions').getFullList({
      expand: 'user',
      filter: `user.email = "${email}"`,
    });

    logger.info(`[SUBSCRIPTION-RECEIPT-GENERATE] ✓ Subscriptions queried successfully`);
    logger.info(`[SUBSCRIPTION-RECEIPT-GENERATE]   - Total subscriptions found: ${subscriptions.length}`);

    if (subscriptions.length === 0) {
      logger.warn(`[SUBSCRIPTION-RECEIPT-GENERATE] ⚠ No subscriptions found for email: ${email}`);
      throw new Error(`No subscriptions found for email: ${email}`);
    }

    subscriptions.forEach((sub, index) => {
      logger.info(`[SUBSCRIPTION-RECEIPT-GENERATE] Subscription ${index + 1}:`);
      logger.info(`[SUBSCRIPTION-RECEIPT-GENERATE]   - ID: ${sub.id}`);
      logger.info(`[SUBSCRIPTION-RECEIPT-GENERATE]   - Status: ${sub.status || 'N/A'}`);
      logger.info(`[SUBSCRIPTION-RECEIPT-GENERATE]   - Approval Status: ${sub.approval_status || 'N/A'}`);
      logger.info(`[SUBSCRIPTION-RECEIPT-GENERATE]   - Amount: €${sub.amount || 0}`);
    });
  } catch (error) {
    logger.error('[SUBSCRIPTION-RECEIPT-GENERATE] ✗ Error querying subscriptions');
    logger.error(`[SUBSCRIPTION-RECEIPT-GENERATE]   - Error message: ${error.message}`);
    logger.error(`[SUBSCRIPTION-RECEIPT-GENERATE]   - Error status: ${error.status || 'unknown'}`);
    throw error;
  }

  // Step 3: Filter for approved subscriptions
  logger.info('[SUBSCRIPTION-RECEIPT-GENERATE] Step 3: Filtering for approved subscriptions');

  let targetSubscription;
  if (subscriptionId) {
    // If specific subscription ID provided, find it
    targetSubscription = subscriptions.find(sub => sub.id === subscriptionId);
    if (!targetSubscription) {
      logger.warn(`[SUBSCRIPTION-RECEIPT-GENERATE] ✗ Subscription not found: ${subscriptionId}`);
      throw new Error(`Subscription with ID ${subscriptionId} not found for email ${email}`);
    }
  } else {
    // Otherwise, find first approved subscription
    targetSubscription = subscriptions.find(sub => sub.approval_status === 'approved' || sub.status === 'active');
    if (!targetSubscription) {
      logger.warn(`[SUBSCRIPTION-RECEIPT-GENERATE] ⚠ No approved subscriptions found for email: ${email}`);
      throw new Error(`No approved subscriptions found for email: ${email}`);
    }
  }

  logger.info('[SUBSCRIPTION-RECEIPT-GENERATE] ✓ Target subscription found');
  logger.info(`[SUBSCRIPTION-RECEIPT-GENERATE]   - Subscription ID: ${targetSubscription.id}`);
  logger.info(`[SUBSCRIPTION-RECEIPT-GENERATE]   - Status: ${targetSubscription.status || 'N/A'}`);
  logger.info(`[SUBSCRIPTION-RECEIPT-GENERATE]   - Approval Status: ${targetSubscription.approval_status || 'N/A'}`);

  // Step 4: Generate receipt ID
  logger.info('[SUBSCRIPTION-RECEIPT-GENERATE] Step 4: Generating receipt ID');
  const receiptId = generatePremiumSubscriptionReceiptId();
  logger.info(`[SUBSCRIPTION-RECEIPT-GENERATE] ✓ Receipt ID generated: ${receiptId}`);

  // Step 5: Generate PDF receipt
  logger.info('[SUBSCRIPTION-RECEIPT-GENERATE] Step 5: Generating PDF receipt');
  logger.info(`[SUBSCRIPTION-RECEIPT-GENERATE]   - Subscription ID: ${targetSubscription.id}`);
  logger.info(`[SUBSCRIPTION-RECEIPT-GENERATE]   - Receipt ID: ${receiptId}`);

  let pdfBuffer;
  try {
    const subscriptionData = {
      receiptId,
      subscriptionId: targetSubscription.id,
      memberName: targetSubscription.member_name || targetSubscription.full_name || 'Valued Member',
      memberEmail: email,
      subscriptionType: targetSubscription.subscription_type || targetSubscription.plan_type || 'Standard',
      amount: targetSubscription.amount || 0,
      approvalStatus: targetSubscription.approval_status || targetSubscription.status || 'pending',
      transactionId: targetSubscription.transaction_id || targetSubscription.transaction_reference || 'N/A',
      createdAt: targetSubscription.created || new Date().toISOString(),
      renewalDate: targetSubscription.renewal_date || 'N/A',
      nextRenewalDate: targetSubscription.next_renewal_date || 'N/A',
      billingCycle: targetSubscription.billing_cycle || 'monthly',
      startDate: targetSubscription.start_date || new Date().toISOString().split('T')[0],
      endDate: targetSubscription.end_date || 'N/A',
      totalAmount: targetSubscription.total_amount || targetSubscription.amount || 0,
    };

    pdfBuffer = await generateSubscriptionReceipt(subscriptionData);

    logger.info('[SUBSCRIPTION-RECEIPT-GENERATE] ✓ PDF receipt generated successfully');
    logger.info(`[SUBSCRIPTION-RECEIPT-GENERATE]   - Type: Buffer`);
    logger.info(`[SUBSCRIPTION-RECEIPT-GENERATE]   - Size: ${pdfBuffer.length} bytes`);
    logger.info(`[SUBSCRIPTION-RECEIPT-GENERATE]   - Is Buffer: true`);
  } catch (error) {
    logger.error('[SUBSCRIPTION-RECEIPT-GENERATE] ✗ Error generating PDF receipt');
    logger.error(`[SUBSCRIPTION-RECEIPT-GENERATE]   - Error message: ${error.message}`);
    logger.error(`[SUBSCRIPTION-RECEIPT-GENERATE]   - Error stack: ${error.stack}`);
    throw error;
  }

  // Step 6: Update subscription record with receipt ID and timestamp
  logger.info('[SUBSCRIPTION-RECEIPT-GENERATE] Step 6: Updating subscription record');
  logger.info(`[SUBSCRIPTION-RECEIPT-GENERATE]   - Subscription ID: ${targetSubscription.id}`);
  logger.info(`[SUBSCRIPTION-RECEIPT-GENERATE]   - Receipt ID: ${receiptId}`);
  logger.info(`[SUBSCRIPTION-RECEIPT-GENERATE]   - Receipt Generated At: ${new Date().toISOString()}`);

  try {
    const updatedSubscription = await pb.collection('subscriptions').update(targetSubscription.id, {
      receipt_id: receiptId,
      receipt_generated_at: new Date().toISOString(),
    });

    logger.info('[SUBSCRIPTION-RECEIPT-GENERATE] ✓ Subscription record updated successfully');
    logger.info(`[SUBSCRIPTION-RECEIPT-GENERATE]   - Subscription ID: ${updatedSubscription.id}`);
    logger.info(`[SUBSCRIPTION-RECEIPT-GENERATE]   - Receipt ID: ${updatedSubscription.receipt_id}`);
    logger.info(`[SUBSCRIPTION-RECEIPT-GENERATE]   - Receipt Generated At: ${updatedSubscription.receipt_generated_at}`);
  } catch (error) {
    logger.error('[SUBSCRIPTION-RECEIPT-GENERATE] ✗ Error updating subscription record');
    logger.error(`[SUBSCRIPTION-RECEIPT-GENERATE]   - Error message: ${error.message}`);
    logger.error(`[SUBSCRIPTION-RECEIPT-GENERATE]   - Error status: ${error.status || 'unknown'}`);
    throw error;
  }

  // Step 7: Return success response
  logger.info('[SUBSCRIPTION-RECEIPT-GENERATE] ========================================');
  logger.info('[SUBSCRIPTION-RECEIPT-GENERATE] ✓ RECEIPT GENERATION COMPLETED SUCCESSFULLY');
  logger.info('[SUBSCRIPTION-RECEIPT-GENERATE] ========================================');
  logger.info(`[SUBSCRIPTION-RECEIPT-GENERATE] Email: ${email}`);
  logger.info(`[SUBSCRIPTION-RECEIPT-GENERATE] Subscription ID: ${targetSubscription.id}`);
  logger.info(`[SUBSCRIPTION-RECEIPT-GENERATE] Receipt ID: ${receiptId}`);
  logger.info(`[SUBSCRIPTION-RECEIPT-GENERATE] PDF Size: ${pdfBuffer.length} bytes`);

  res.json({
    success: true,
    receiptId,
    subscriptionId: targetSubscription.id,
    email,
    message: `Receipt generated successfully for ${email}`,
  });
});

export default router;