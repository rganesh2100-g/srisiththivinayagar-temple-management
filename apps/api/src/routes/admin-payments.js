import 'dotenv/config';
import express from 'express';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * Helper function to validate admin authorization
 */
const requireAdmin = (req, res, next) => {
  logger.info('[ADMIN-PAYMENTS] Checking admin authorization');
  
  if (!req.user) {
    logger.error('[ADMIN-PAYMENTS] ✗ Authorization failed: User is not authenticated');
    return res.status(401).json({ error: 'Unauthorized: User not authenticated' });
  }

  if (!req.user.role) {
    logger.error('[ADMIN-PAYMENTS] ✗ Authorization failed: User role not found');
    return res.status(401).json({ error: 'Unauthorized: User role not found' });
  }

  if (req.user.role !== 'admin') {
    logger.error('[ADMIN-PAYMENTS] ✗ Authorization failed: User is not admin');
    logger.error(`[ADMIN-PAYMENTS]   - User role: "${req.user.role}"`);
    return res.status(401).json({ error: 'Unauthorized: Admin role required' });
  }

  logger.info('[ADMIN-PAYMENTS] ✓ Admin authorization verified');
  next();
};

/**
 * Helper function to generate receipt ID
 * Format: RCP-YYYY-MM-DD-XXXXX (where XXXXX is a 5-digit random number)
 * Example: RCP-2024-04-15-48291
 */
const generateReceiptId = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
  
  const receiptId = `RCP-${year}-${month}-${day}-${random}`;
  
  logger.info('[ADMIN-PAYMENTS-RECEIPT] Generated receipt ID');
  logger.info(`[ADMIN-PAYMENTS-RECEIPT]   - Receipt ID: ${receiptId}`);
  logger.info(`[ADMIN-PAYMENTS-RECEIPT]   - Format: RCP-YYYY-MM-DD-XXXXX`);
  logger.info(`[ADMIN-PAYMENTS-RECEIPT]   - Date: ${year}-${month}-${day}`);
  logger.info(`[ADMIN-PAYMENTS-RECEIPT]   - Random: ${random}`);
  
  return receiptId;
};

/**
 * GET /pending-payments
 */
router.get('/pending-payments', requireAdmin, async (req, res) => {
  logger.info('[ADMIN-PAYMENTS-PENDING] Fetching pending payments...');
  const pendingSubscriptions = await pb.collection('pending_subscriptions').getFullList({
    filter: 'status="pending"',
    expand: 'user,subscription',
    sort: '-created',
  });

  const mappedSubscriptions = pendingSubscriptions.map((pendingSubscription) => {
    const expandedUser = pendingSubscription.expand?.user || {};
    const expandedSubscription = pendingSubscription.expand?.subscription || {};
    return {
      id: pendingSubscription.id,
      subscription_id: expandedSubscription.id || pendingSubscription.subscription,
      user: {
        id: expandedUser.id || pendingSubscription.user,
        email: expandedUser.email || pendingSubscription.email || 'N/A',
        name: expandedUser.full_name || expandedUser.name || pendingSubscription.full_name || 'N/A',
      },
      full_name: pendingSubscription.full_name || expandedUser.full_name || expandedUser.name || 'N/A',
      contact_number: pendingSubscription.contact_number || expandedUser.phone || 'N/A',
      email: pendingSubscription.email || expandedUser.email || 'N/A',
      plan_type: expandedSubscription.plan_type || pendingSubscription.subscription_type || 'premium',
      subscription_type: pendingSubscription.subscription_type || expandedSubscription.billing_cycle || 'N/A',
      amount: expandedSubscription.amount || 0,
      total_amount: expandedSubscription.total_amount || expandedSubscription.amount || 0,
      transaction_id: pendingSubscription.transaction_id || expandedSubscription.transaction_id || 'N/A',
      transaction_ref: expandedSubscription.transaction_ref || pendingSubscription.transaction_id || 'N/A',
      payment_status: pendingSubscription.payment_status,
      created: pendingSubscription.created,
    };
  });

  res.json({ success: true, data: mappedSubscriptions, total: mappedSubscriptions.length });
});

/**
 * PUT /:paymentId/approve
 * Explicitly requested payment approval workflow handling.
 * 
 * (a) Update payment status to 'approved'
 * (b) Get user_id from payment
 * (c) Update user's account_type to 'Premium Membership'
 * (d) Create or update subscription record
 */
router.put('/:paymentId/approve', requireAdmin, async (req, res) => {
  const { paymentId } = req.params;
  const { admin_notes } = req.body;

  logger.info(`[ADMIN-PAYMENTS-APPROVE] PUT request received for payment ${paymentId}`);

  let payment;
  let pendingSubscription;
  try {
    pendingSubscription = await pb.collection('pending_subscriptions').getOne(paymentId, { expand: 'subscription' });
    payment = pendingSubscription.expand?.subscription || await pb.collection('subscriptions').getOne(pendingSubscription.subscription);
  } catch (e) {
    try {
      payment = await pb.collection('payments').getOne(paymentId);
    } catch (paymentErr) {
      payment = await pb.collection('subscriptions').getOne(paymentId);
    }
  }

  if (!payment) {
    return res.status(404).json({ error: 'Payment not found' });
  }

  // (a) Update payment status
  const updatedPayment = pendingSubscription
    ? await pb.collection('pending_subscriptions').update(paymentId, {
        status: 'approved',
        payment_status: 'completed',
      })
    : await pb.collection(payment.collectionName || 'payments').update(paymentId, {
        status: 'approved',
        admin_notes: admin_notes || 'Approved via admin explicit workflow'
      });

  // (b) Get user_id
  const userId = pendingSubscription?.user || payment.user || payment.userId;
  if (!userId) {
    return res.status(400).json({ error: 'Payment record is missing user association' });
  }

  // (c) Update user's account_type to 'Premium Membership'
  logger.info(`[ADMIN-PAYMENTS-APPROVE] Upgrading user ${userId} to premium membership...`);
  const updatedUser = await pb.collection('users').update(userId, { 
    account_type: 'Premium Member',
    membership_type: 'premium',
    subscription_status: 'premium',
    premium_status: 'Active',
  });

  // (d) Create or update subscription record
  let finalSubscription;
  const existingSubs = pendingSubscription?.subscription
    ? []
    : await pb.collection('subscriptions').getFullList({ filter: `user_id="${userId}"` });
  const durationMonths = payment.duration_months || (String(payment.billing_cycle || '').toLowerCase().includes('month') ? 1 : 12);
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + durationMonths);

  const subPayload = {
    user: userId,
    user_id: userId,
    plan_type: 'premium',
    status: 'active',
    amount: payment.amount || payment.total_amount || 0,
    total_amount: payment.total_amount || payment.amount || 0,
    billing_cycle: payment.billing_cycle || 'yearly',
    duration_months: durationMonths,
    renewal_type: payment.renewal_type || 'manual',
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString()
  };

  if (pendingSubscription?.subscription) {
    finalSubscription = await pb.collection('subscriptions').update(pendingSubscription.subscription, subPayload);
    logger.info(`[ADMIN-PAYMENTS-APPROVE] Approved linked subscription ${finalSubscription.id}`);
  } else if (existingSubs.length > 0) {
    finalSubscription = await pb.collection('subscriptions').update(existingSubs[0].id, subPayload);
    logger.info(`[ADMIN-PAYMENTS-APPROVE] Updated existing subscription ${finalSubscription.id}`);
  } else {
    finalSubscription = await pb.collection('subscriptions').create(subPayload);
    logger.info(`[ADMIN-PAYMENTS-APPROVE] Created new subscription ${finalSubscription.id}`);
  }

  // (e) Return success response
  res.json({
    success: true,
    message: 'Payment approved, user upgraded to premium membership',
    payment: updatedPayment,
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      account_type: updatedUser.account_type
    },
    subscription: finalSubscription
  });
});

router.post('/reject-payment', requireAdmin, async (req, res) => {
  const { payment_id, rejection_reason } = req.body;
  if (!payment_id) return res.status(400).json({ error: 'payment_id required' });

  try {
    const pendingSubscription = await pb.collection('pending_subscriptions').getOne(payment_id);
    const updatedPending = await pb.collection('pending_subscriptions').update(payment_id, {
      status: 'rejected',
    });

    let updatedSubscription = null;
    if (pendingSubscription.subscription) {
      updatedSubscription = await pb.collection('subscriptions').update(pendingSubscription.subscription, {
        status: 'rejected',
        admin_notes: rejection_reason || 'Rejected by admin',
      });
    }

    return res.json({
      success: true,
      message: 'Payment rejected',
      payment: updatedPending,
      subscription: updatedSubscription,
    });
  } catch (pendingErr) {
    const payment = await pb.collection('subscriptions').update(payment_id, {
      status: 'rejected',
      admin_notes: rejection_reason || 'Rejected by admin',
    });

    return res.json({
      success: true,
      message: 'Payment rejected',
      payment,
    });
  }
});

/**
 * POST /admin-payments/:paymentId/generate-receipt
 * 
 * Generate a receipt for a payment.
 * 
 * Flow:
 * 1. Fetch payment record by paymentId from payments collection
 * 2. If payment not found, return 404
 * 3. Check if receipt already exists for this payment
 * 4. If receipt exists, return existing receipt (no duplicate)
 * 5. Generate receipt_id in format RCP-YYYY-MM-DD-XXXXX
 * 6. Create receipt record in receipts collection
 * 7. Return { success: true, receipt: { id, receipt_id, receipt_generated_at } }
 */
router.post('/:paymentId/generate-receipt', requireAdmin, async (req, res) => {
  logger.info('[ADMIN-PAYMENTS-RECEIPT] ========================================');
  logger.info('[ADMIN-PAYMENTS-RECEIPT] POST /:paymentId/generate-receipt');
  logger.info('[ADMIN-PAYMENTS-RECEIPT] ========================================');
  logger.info(`[ADMIN-PAYMENTS-RECEIPT] Timestamp: ${new Date().toISOString()}`);

  const { paymentId } = req.params;

  // Step 1: Validate paymentId parameter
  logger.info('[ADMIN-PAYMENTS-RECEIPT] Step 1: Validating paymentId parameter');
  if (!paymentId || typeof paymentId !== 'string' || paymentId.trim().length === 0) {
    logger.warn('[ADMIN-PAYMENTS-RECEIPT] ✗ Validation failed: Missing or invalid paymentId');
    logger.warn(`[ADMIN-PAYMENTS-RECEIPT]   - paymentId received: ${JSON.stringify(paymentId)}`);
    return res.status(400).json({ error: 'paymentId is required and must be a non-empty string' });
  }
  logger.info(`[ADMIN-PAYMENTS-RECEIPT] ✓ paymentId validated: ${paymentId}`);

  // Step 2: Fetch payment record from PocketBase
  logger.info('[ADMIN-PAYMENTS-RECEIPT] Step 2: Fetching payment record from PocketBase');
  logger.info(`[ADMIN-PAYMENTS-RECEIPT]   - Collection: payments`);
  logger.info(`[ADMIN-PAYMENTS-RECEIPT]   - Payment ID: ${paymentId}`);

  let payment;
  try {
    payment = await pb.collection('payments').getOne(paymentId);
  } catch (error) {
    logger.warn(`[ADMIN-PAYMENTS-RECEIPT] ✗ Payment not found: ${paymentId}`);
    logger.warn(`[ADMIN-PAYMENTS-RECEIPT]   - Error: ${error.message}`);
    return res.status(404).json({ error: 'Payment not found' });
  }

  if (!payment) {
    logger.warn(`[ADMIN-PAYMENTS-RECEIPT] ✗ Payment not found: ${paymentId}`);
    return res.status(404).json({ error: 'Payment not found' });
  }

  logger.info('[ADMIN-PAYMENTS-RECEIPT] ✓ Payment record fetched successfully');
  logger.info(`[ADMIN-PAYMENTS-RECEIPT]   - Payment ID: ${payment.id}`);
  logger.info(`[ADMIN-PAYMENTS-RECEIPT]   - Amount: €${payment.amount || 0}`);
  logger.info(`[ADMIN-PAYMENTS-RECEIPT]   - Status: ${payment.status || 'N/A'}`);

  // Step 3: Check if receipt already exists for this payment
  logger.info('[ADMIN-PAYMENTS-RECEIPT] Step 3: Checking if receipt already exists for this payment');
  logger.info(`[ADMIN-PAYMENTS-RECEIPT]   - Collection: receipts`);
  logger.info(`[ADMIN-PAYMENTS-RECEIPT]   - Filter: payment = "${paymentId}"`);

  let existingReceipt;
  try {
    const receipts = await pb.collection('receipts').getFullList({
      filter: `payment = "${paymentId}"`,
      limit: 1,
    });

    if (receipts && receipts.length > 0) {
      existingReceipt = receipts[0];
      logger.info('[ADMIN-PAYMENTS-RECEIPT] ✓ Receipt already exists for this payment');
      logger.info(`[ADMIN-PAYMENTS-RECEIPT]   - Receipt ID: ${existingReceipt.id}`);
      logger.info(`[ADMIN-PAYMENTS-RECEIPT]   - Receipt Number: ${existingReceipt.receipt_id}`);
      logger.info(`[ADMIN-PAYMENTS-RECEIPT]   - Generated At: ${existingReceipt.receipt_generated_at}`);
      logger.info('[ADMIN-PAYMENTS-RECEIPT] Returning existing receipt (no duplicate created)');

      return res.json({
        success: true,
        message: 'Receipt already exists for this payment',
        receipt: {
          id: existingReceipt.id,
          receipt_id: existingReceipt.receipt_id,
          receipt_generated_at: existingReceipt.receipt_generated_at,
        },
      });
    }
  } catch (error) {
    logger.warn('[ADMIN-PAYMENTS-RECEIPT] ⚠ Error checking for existing receipt');
    logger.warn(`[ADMIN-PAYMENTS-RECEIPT]   - Error: ${error.message}`);
    logger.warn('[ADMIN-PAYMENTS-RECEIPT] Proceeding to create new receipt');
  }

  logger.info('[ADMIN-PAYMENTS-RECEIPT] ✓ No existing receipt found');
  logger.info('[ADMIN-PAYMENTS-RECEIPT] Proceeding to create new receipt');

  // Step 4: Generate receipt_id
  logger.info('[ADMIN-PAYMENTS-RECEIPT] Step 4: Generating receipt_id');
  const receiptId = generateReceiptId();
  logger.info(`[ADMIN-PAYMENTS-RECEIPT] ✓ Receipt ID generated: ${receiptId}`);

  // Step 5: Create receipt record in receipts collection
  logger.info('[ADMIN-PAYMENTS-RECEIPT] Step 5: Creating receipt record in PocketBase');
  logger.info(`[ADMIN-PAYMENTS-RECEIPT]   - Collection: receipts`);
  logger.info(`[ADMIN-PAYMENTS-RECEIPT]   - Receipt ID: ${receiptId}`);
  logger.info(`[ADMIN-PAYMENTS-RECEIPT]   - Payment ID: ${paymentId}`);

  const receiptGeneratedAt = new Date().toISOString();
  const newReceipt = await pb.collection('receipts').create({
    receipt_id: receiptId,
    payment: paymentId,
    receipt_generated_at: receiptGeneratedAt,
  });

  logger.info('[ADMIN-PAYMENTS-RECEIPT] ✓ Receipt record created successfully');
  logger.info(`[ADMIN-PAYMENTS-RECEIPT]   - Receipt Record ID: ${newReceipt.id}`);
  logger.info(`[ADMIN-PAYMENTS-RECEIPT]   - Receipt Number: ${newReceipt.receipt_id}`);
  logger.info(`[ADMIN-PAYMENTS-RECEIPT]   - Generated At: ${newReceipt.receipt_generated_at}`);

  // Step 6: Return success response
  logger.info('[ADMIN-PAYMENTS-RECEIPT] ========================================');
  logger.info('[ADMIN-PAYMENTS-RECEIPT] ✓ RECEIPT GENERATION COMPLETED SUCCESSFULLY');
  logger.info('[ADMIN-PAYMENTS-RECEIPT] ========================================');
  logger.info(`[ADMIN-PAYMENTS-RECEIPT] Payment ID: ${paymentId}`);
  logger.info(`[ADMIN-PAYMENTS-RECEIPT] Receipt ID: ${receiptId}`);
  logger.info(`[ADMIN-PAYMENTS-RECEIPT] Receipt Record ID: ${newReceipt.id}`);

  res.status(201).json({
    success: true,
    message: 'Receipt generated successfully',
    receipt: {
      id: newReceipt.id,
      receipt_id: newReceipt.receipt_id,
      receipt_generated_at: newReceipt.receipt_generated_at,
    },
  });
});

/**
 * POST /approve-payment (Legacy compatibility wrapper)
 */
router.post('/approve-payment', requireAdmin, async (req, res) => {
  const { payment_id, admin_notes } = req.body;
  if (!payment_id) return res.status(400).json({ error: 'payment_id required' });
  
  // Forward to new PUT workflow
  req.params.paymentId = payment_id;
  return router.handle({ ...req, method: 'PUT', url: `/${payment_id}/approve` }, res);
});

export default router;
