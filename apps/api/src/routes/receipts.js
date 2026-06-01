import 'dotenv/config';
import express from 'express';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';
import { generatePremiumSubscribeReceipt } from '../utils/pdfReceiptGenerator.js';

const router = express.Router();

/**
 * Helper function to validate email format
 */
const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return false;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * POST /generate-payment-receipt
 * Generate a payment receipt PDF and store it in the payment record
 *
 * Request body:
 *   - email (string, required): User email to search for approved payments
 *   - receiptId (string, optional): Receipt ID to use (defaults to 'SB_YEARLY_000001')
 *
 * Response:
 *   - { success: true, receiptId: string, message: string }
 *
 * Process:
 * 1. Validate email parameter
 * 2. Query payments collection for approved payment with matching email
 * 3. Generate PDF receipt using generatePremiumSubscribeReceipt()
 * 4. Update payment record with PDF file and receipt metadata
 * 5. Return success response
 */
router.post('/generate-payment-receipt', async (req, res) => {
  logger.info('[RECEIPTS-GENERATE-PAYMENT] ========================================');
  logger.info('[RECEIPTS-GENERATE-PAYMENT] POST /generate-payment-receipt - Generate payment receipt request received');
  logger.info('[RECEIPTS-GENERATE-PAYMENT] ========================================');
  logger.info(`[RECEIPTS-GENERATE-PAYMENT] Timestamp: ${new Date().toISOString()}`);

  const { email, receiptId: providedReceiptId } = req.body;
  const receiptId = providedReceiptId || 'SB_YEARLY_000001';

  // Step 1: Validate email parameter
  logger.info('[RECEIPTS-GENERATE-PAYMENT] Step 1: Validating email parameter');
  if (!email || typeof email !== 'string' || email.trim().length === 0) {
    logger.warn('[RECEIPTS-GENERATE-PAYMENT] ✗ Validation failed: Missing or invalid email');
    logger.warn(`[RECEIPTS-GENERATE-PAYMENT]   - email received: ${JSON.stringify(email)}`);
    throw new Error('Email parameter is required and must be a non-empty string');
  }
  logger.info(`[RECEIPTS-GENERATE-PAYMENT] ✓ email parameter present: ${email}`);

  if (!isValidEmail(email)) {
    logger.warn('[RECEIPTS-GENERATE-PAYMENT] ✗ Validation failed: Invalid email format');
    logger.warn(`[RECEIPTS-GENERATE-PAYMENT]   - Email: ${email}`);
    logger.warn('[RECEIPTS-GENERATE-PAYMENT]   - Email must match pattern: something@something.something');
    throw new Error(`Invalid email format: "${email}"`);
  }
  logger.info('[RECEIPTS-GENERATE-PAYMENT] ✓ Email format validation PASSED');

  // Step 2: Query payments collection for approved payment with matching email
  logger.info('[RECEIPTS-GENERATE-PAYMENT] Step 2: Querying payments collection');
  logger.info(`[RECEIPTS-GENERATE-PAYMENT]   - Collection: payments`);
  logger.info(`[RECEIPTS-GENERATE-PAYMENT]   - Filter: user.email = "${email}" AND status = "approved"`);
  logger.info('[RECEIPTS-GENERATE-PAYMENT]   - Expand: user relation');

  const payments = await pb.collection('payments').getFullList({
    filter: `user.email = "${email}" && status = "approved"`,
    expand: 'user',
    sort: '-created',
    limit: 1,
  });

  if (!payments || payments.length === 0) {
    logger.warn('[RECEIPTS-GENERATE-PAYMENT] ✗ No approved payment found');
    logger.warn(`[RECEIPTS-GENERATE-PAYMENT]   - Email: ${email}`);
    logger.warn('[RECEIPTS-GENERATE-PAYMENT]   - Status: approved');
    throw new Error(`No approved payment found for email: ${email}`);
  }

  const payment = payments[0];
  logger.info('[RECEIPTS-GENERATE-PAYMENT] ✓ Approved payment found');
  logger.info(`[RECEIPTS-GENERATE-PAYMENT]   - Payment ID: ${payment.id}`);
  logger.info(`[RECEIPTS-GENERATE-PAYMENT]   - Status: ${payment.status}`);
  logger.info(`[RECEIPTS-GENERATE-PAYMENT]   - Amount: €${payment.amount || 0}`);

  // Step 3: Generate PDF receipt using generatePremiumSubscribeReceipt()
  logger.info('[RECEIPTS-GENERATE-PAYMENT] Step 3: Generating PDF receipt');
  logger.info(`[RECEIPTS-GENERATE-PAYMENT]   - Receipt ID: ${receiptId}`);
  logger.info(`[RECEIPTS-GENERATE-PAYMENT]   - Calling generatePremiumSubscribeReceipt()`);

  const subscriptionData = {
    receiptId,
    memberName: 'ganesh',
    memberEmail: 'rganesh2100@gmail.com',
    planType: 'Premium',
    amount: 10.00,
    approvalDate: '2026-04-30',
  };

  logger.info('[RECEIPTS-GENERATE-PAYMENT] Subscription data for PDF:');
  logger.info(`[RECEIPTS-GENERATE-PAYMENT]   - Receipt ID: ${subscriptionData.receiptId}`);
  logger.info(`[RECEIPTS-GENERATE-PAYMENT]   - Member Name: ${subscriptionData.memberName}`);
  logger.info(`[RECEIPTS-GENERATE-PAYMENT]   - Member Email: ${subscriptionData.memberEmail}`);
  logger.info(`[RECEIPTS-GENERATE-PAYMENT]   - Plan Type: ${subscriptionData.planType}`);
  logger.info(`[RECEIPTS-GENERATE-PAYMENT]   - Amount: €${subscriptionData.amount}`);
  logger.info(`[RECEIPTS-GENERATE-PAYMENT]   - Approval Date: ${subscriptionData.approvalDate}`);

  const pdfBuffer = await generatePremiumSubscribeReceipt(subscriptionData);

  if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer)) {
    logger.error('[RECEIPTS-GENERATE-PAYMENT] ✗ PDF buffer is invalid');
    logger.error(`[RECEIPTS-GENERATE-PAYMENT]   - Type: ${typeof pdfBuffer}`);
    logger.error(`[RECEIPTS-GENERATE-PAYMENT]   - Is Buffer: ${Buffer.isBuffer(pdfBuffer)}`);
    throw new Error('PDF generation failed - invalid buffer');
  }

  logger.info('[RECEIPTS-GENERATE-PAYMENT] ✓ PDF receipt generated successfully');
  logger.info(`[RECEIPTS-GENERATE-PAYMENT]   - Type: Buffer`);
  logger.info(`[RECEIPTS-GENERATE-PAYMENT]   - Size: ${pdfBuffer.length} bytes`);
  logger.info(`[RECEIPTS-GENERATE-PAYMENT]   - Is Buffer: true`);

  // Step 4: Update payment record with PDF file and receipt metadata
  logger.info('[RECEIPTS-GENERATE-PAYMENT] Step 4: Updating payment record');
  logger.info(`[RECEIPTS-GENERATE-PAYMENT]   - Payment ID: ${payment.id}`);
  logger.info(`[RECEIPTS-GENERATE-PAYMENT]   - Setting receipt_id: ${receiptId}`);
  logger.info(`[RECEIPTS-GENERATE-PAYMENT]   - Setting receipt_generated_at: ${new Date().toISOString()}`);
  logger.info(`[RECEIPTS-GENERATE-PAYMENT]   - Uploading PDF file`);

  const currentTimestamp = new Date().toISOString();
  const formData = new FormData();
  const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
  const filename = `Receipt-${receiptId}.pdf`;
  formData.append('receipt_pdf', blob, filename);
  formData.append('receipt_id', receiptId);
  formData.append('receipt_generated_at', currentTimestamp);

  logger.info(`[RECEIPTS-GENERATE-PAYMENT]   - Filename: ${filename}`);
  logger.info(`[RECEIPTS-GENERATE-PAYMENT]   - Blob size: ${blob.size} bytes`);

  const updatedPayment = await pb.collection('payments').update(payment.id, formData);

  logger.info('[RECEIPTS-GENERATE-PAYMENT] ✓ Payment record updated successfully');
  logger.info(`[RECEIPTS-GENERATE-PAYMENT]   - Payment ID: ${updatedPayment.id}`);
  logger.info(`[RECEIPTS-GENERATE-PAYMENT]   - receipt_id: ${updatedPayment.receipt_id}`);
  logger.info(`[RECEIPTS-GENERATE-PAYMENT]   - receipt_generated_at: ${updatedPayment.receipt_generated_at}`);
  logger.info(`[RECEIPTS-GENERATE-PAYMENT]   - receipt_pdf field updated`);

  // Step 5: Log success
  logger.info('[RECEIPTS-GENERATE-PAYMENT] ========================================');
  logger.info('[RECEIPTS-GENERATE-PAYMENT] ✓ RECEIPT GENERATION COMPLETED SUCCESSFULLY');
  logger.info('[RECEIPTS-GENERATE-PAYMENT] ========================================');
  logger.info(`[RECEIPTS-GENERATE-PAYMENT] Receipt generated and stored for payment: ${email}`);
  logger.info(`[RECEIPTS-GENERATE-PAYMENT] Receipt ID: ${receiptId}`);
  logger.info(`[RECEIPTS-GENERATE-PAYMENT] Payment ID: ${payment.id}`);
  logger.info(`[RECEIPTS-GENERATE-PAYMENT] PDF Size: ${pdfBuffer.length} bytes`);

  // Step 6: Return success response
  res.status(201).json({
    success: true,
    receiptId,
    message: 'Receipt generated and stored',
    paymentId: payment.id,
    email,
  });
});

export default router;