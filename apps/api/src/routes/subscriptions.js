import 'dotenv/config';
import express from 'express';
import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';
import pb from '../utils/pocketbaseClient.js';

const router = express.Router();

logger.info('[SUBSCRIPTIONS-ROUTES] ========================================');
logger.info('[SUBSCRIPTIONS-ROUTES] Initializing Subscriptions Routes');
logger.info('[SUBSCRIPTIONS-ROUTES] ========================================');

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
 * Helper function to initialize Nodemailer transporter
 */
let transporter = null;
const initializeTransporter = () => {
  if (transporter) {
    logger.info('[SUBSCRIPTIONS-EMAIL] Using cached transporter instance');
    return transporter;
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  logger.info('[SUBSCRIPTIONS-EMAIL] Initializing Nodemailer transporter');
  
  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    const missingVars = [];
    if (!smtpHost) missingVars.push('SMTP_HOST');
    if (!smtpPort) missingVars.push('SMTP_PORT');
    if (!smtpUser) missingVars.push('SMTP_USER');
    if (!smtpPass) missingVars.push('SMTP_PASS');
    logger.error(`[SUBSCRIPTIONS-EMAIL] Missing SMTP configuration: ${missingVars.join(', ')}`);
    throw new Error(`SMTP configuration incomplete. Missing: ${missingVars.join(', ')}`);
  }

  try {
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    logger.info('[SUBSCRIPTIONS-EMAIL] ✓ Nodemailer transporter initialized successfully');
    return transporter;
  } catch (error) {
    logger.error(`[SUBSCRIPTIONS-EMAIL] ✗ Failed to initialize transporter: ${error.message}`);
    throw new Error(`Failed to initialize email transporter: ${error.message}`, { cause: error });
  }
};

/**
 * Helper function to calculate end date based on subscription type
 * @param {string} startDate - Start date (YYYY-MM-DD format)
 * @param {string} subscriptionType - Type of subscription
 * @returns {string} End date (YYYY-MM-DD format)
 */
const calculateEndDate = (startDate, subscriptionType) => {
  const start = new Date(startDate);
  let daysToAdd = 30; // Default: 30 days

  const normalizedType = (subscriptionType || '').toLowerCase().trim();

  if (normalizedType === 'yearly' || normalizedType === 'annual') {
    daysToAdd = 365;
  } else if (normalizedType === 'quarterly') {
    daysToAdd = 90;
  } else if (normalizedType === 'basic' || normalizedType === 'monthly' || normalizedType === 'premium' || normalizedType === 'standard') {
    daysToAdd = 30;
  }

  const end = new Date(start);
  end.setDate(end.getDate() + daysToAdd);

  const year = end.getFullYear();
  const month = String(end.getMonth() + 1).padStart(2, '0');
  const day = String(end.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

/**
 * PUT /subscriptions/:id/approve
 * Approve a subscription and set approval/start/end dates
 */
router.put('/:id/approve', async (req, res) => {
  logger.info('[SUBSCRIPTIONS-APPROVE] ========================================');
  logger.info('[SUBSCRIPTIONS-APPROVE] PUT /:id/approve - Approve subscription request received');
  logger.info('[SUBSCRIPTIONS-APPROVE] ========================================');
  logger.info(`[SUBSCRIPTIONS-APPROVE] Timestamp: ${new Date().toISOString()}`);

  const { id } = req.params;

  logger.info('[SUBSCRIPTIONS-APPROVE] Step 1: Validating id parameter');
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    logger.warn('[SUBSCRIPTIONS-APPROVE] ✗ Validation failed: Missing or invalid id');
    return res.status(400).json({ error: 'id is required and must be a non-empty string' });
  }
  logger.info(`[SUBSCRIPTIONS-APPROVE] ✓ id validated: ${id}`);

  try {
    logger.info('[SUBSCRIPTIONS-APPROVE] Step 2: Fetching payments record from PocketBase');
    const record = await pb.collection('payments').getOne(id);

    if (!record) {
      logger.warn(`[SUBSCRIPTIONS-APPROVE] ✗ Payment record not found: ${id}`);
      return res.status(404).json({ error: `Payment record with ID ${id} not found` });
    }

    logger.info('[SUBSCRIPTIONS-APPROVE] ✓ Payment record fetched successfully');
    logger.info(`[SUBSCRIPTIONS-APPROVE]   - User ID: ${record.user || record.userId || 'N/A'}`);
    logger.info(`[SUBSCRIPTIONS-APPROVE]   - Amount: €${record.amount || record.total_amount || 0}`);

    logger.info('[SUBSCRIPTIONS-APPROVE] Step 3: Calculating approval and subscription dates');
    const approvalDate = new Date().toISOString().split('T')[0]; 
    const startDate = approvalDate; 
    const endDate = calculateEndDate(startDate, record.plan_type || record.billing_cycle);

    logger.info('[SUBSCRIPTIONS-APPROVE] Step 4: Updating payments record in PocketBase');
    const updatedRecord = await pb.collection('payments').update(id, {
      status: 'approved',
      approved_at: new Date().toISOString(),
      start_date: startDate,
      end_date: endDate,
    });

    logger.info('[SUBSCRIPTIONS-APPROVE] ✓ Payment record updated successfully');
    
    res.status(200).json({
      success: true,
      message: 'Subscription approved successfully',
      record: {
        id: updatedRecord.id,
        user: updatedRecord.user,
        plan_type: updatedRecord.plan_type,
        amount: updatedRecord.amount,
        status: updatedRecord.status,
        start_date: updatedRecord.start_date,
        end_date: updatedRecord.end_date,
      },
    });
  } catch (error) {
    logger.error(`[SUBSCRIPTIONS-APPROVE] ✗ Error approving subscription: ${error.message}`);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

/**
 * POST /subscriptions/send-approval-email
 */
router.post('/send-approval-email', async (req, res) => {
  logger.info('[SUBSCRIPTIONS-APPROVAL] Approval email request received');
  const { userId, userEmail, subscriptionType, user } = req.body;

  const targetUserId = userId || user;
  
  const missingFields = [];
  if (!targetUserId) missingFields.push('userId/user');
  if (!userEmail) missingFields.push('userEmail');
  if (!isValidEmail(userEmail)) missingFields.push('valid userEmail');
  if (!subscriptionType) missingFields.push('subscriptionType');

  if (missingFields.length > 0) {
    logger.warn(`[SUBSCRIPTIONS-APPROVAL] ✗ Validation failed. Missing fields: ${missingFields.join(', ')}`);
    return res.status(400).json({ error: `Missing or invalid required fields: ${missingFields.join(', ')}` });
  }

  logger.info(`[SUBSCRIPTIONS-APPROVAL] Preparing to send approval email to user ${targetUserId} (${userEmail})`);

  try {
    const emailTransporter = initializeTransporter();
    const fromEmail = process.env.SMTP_FROM_EMAIL || 'noreply@temple.com';
    const fromName = process.env.SMTP_FROM_NAME || 'Sri Sithhi Vinayagar Temple';

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 8px; }
          .header { background: linear-gradient(135deg, #8B0000 0%, #A52A2A 100%); color: #ffffff; padding: 30px; text-align: center; }
          .details-box { background-color: #f8f9fa; border-left: 4px solid #8B0000; padding: 20px; margin: 20px 0; }
          .status-badge { display: inline-block; background-color: #28a745; color: #ffffff; padding: 8px 16px; border-radius: 20px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>Premium Membership Approved!</h1></div>
          <div class="content">
            <h2>Congratulations!</h2>
            <p>Your premium membership is now active.</p>
            <div style="text-align: center;"><span class="status-badge">✓ Active</span></div>
            <div class="details-box">
              <p><strong>Membership Type:</strong> ${subscriptionType}</p>
              <p><strong>Activation Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await emailTransporter.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to: userEmail,
      subject: 'Premium Membership Approved!',
      html: htmlContent,
    });

    logger.info(`[SUBSCRIPTIONS-APPROVAL] ✓ Email successfully sent to ${userEmail}`);
    res.json({ success: true, message: 'Email sent' });
  } catch (error) {
    logger.error(`[SUBSCRIPTIONS-APPROVAL] ✗ Error sending email: ${error.message}`);
    res.status(500).json({ error: 'Failed to send approval email' });
  }
});

/**
 * POST /subscriptions/send-rejection-email
 */
router.post('/send-rejection-email', async (req, res) => {
  const { userId, userEmail, user } = req.body;
  const targetUserId = userId || user;

  const missingFields = [];
  if (!targetUserId) missingFields.push('userId/user');
  if (!userEmail) missingFields.push('userEmail');
  if (!isValidEmail(userEmail)) missingFields.push('valid userEmail');

  if (missingFields.length > 0) {
    logger.warn(`[SUBSCRIPTIONS-REJECTION] ✗ Validation failed. Missing fields: ${missingFields.join(', ')}`);
    return res.status(400).json({ error: `Missing or invalid required fields: ${missingFields.join(', ')}` });
  }

  logger.info(`[SUBSCRIPTIONS-REJECTION] Preparing to send rejection email to user ${targetUserId} (${userEmail})`);

  try {
    const emailTransporter = initializeTransporter();
    const fromEmail = process.env.SMTP_FROM_EMAIL || 'noreply@temple.com';
    const fromName = process.env.SMTP_FROM_NAME || 'Sri Sithhi Vinayagar Temple';

    const htmlContent = `
      <div style="font-family: Arial; padding: 20px;">
        <h2 style="color: #8B0000;">Membership Request Update</h2>
        <p>Your premium membership request was not approved at this time.</p>
        <p>You can submit a new request anytime. Please contact support if you have questions.</p>
      </div>
    `;

    await emailTransporter.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to: userEmail,
      subject: 'Premium Membership Request Rejected',
      html: htmlContent,
    });

    logger.info(`[SUBSCRIPTIONS-REJECTION] ✓ Email successfully sent to ${userEmail}`);
    res.json({ success: true, message: 'Email sent' });
  } catch (error) {
    logger.error(`[SUBSCRIPTIONS-REJECTION] ✗ Error sending email: ${error.message}`);
    res.status(500).json({ error: 'Failed to send rejection email' });
  }
});

/**
 * POST /subscriptions/send-renewal-reminder
 */
router.post('/send-renewal-reminder', async (req, res) => {
  const { userId, userEmail, expiryDate, user } = req.body;
  const targetUserId = userId || user;

  const missingFields = [];
  if (!targetUserId) missingFields.push('userId/user');
  if (!userEmail) missingFields.push('userEmail');
  if (!isValidEmail(userEmail)) missingFields.push('valid userEmail');
  if (!expiryDate) missingFields.push('expiryDate');

  if (missingFields.length > 0) {
    logger.warn(`[SUBSCRIPTIONS-RENEWAL] ✗ Validation failed. Missing fields: ${missingFields.join(', ')}`);
    return res.status(400).json({ error: `Missing or invalid required fields: ${missingFields.join(', ')}` });
  }

  logger.info(`[SUBSCRIPTIONS-RENEWAL] Preparing to send renewal reminder to user ${targetUserId} (${userEmail})`);

  try {
    const emailTransporter = initializeTransporter();
    const fromEmail = process.env.SMTP_FROM_EMAIL || 'noreply@temple.com';
    const fromName = process.env.SMTP_FROM_NAME || 'Sri Sithhi Vinayagar Temple';

    const htmlContent = `
      <div style="font-family: Arial; padding: 20px;">
        <h2 style="color: #8B0000;">Renewal Reminder</h2>
        <p>Your premium membership will expire on <strong>${expiryDate}</strong>.</p>
        <p>Please renew soon to continue enjoying your benefits.</p>
      </div>
    `;

    await emailTransporter.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to: userEmail,
      subject: 'Your Premium Membership is Expiring Soon',
      html: htmlContent,
    });

    logger.info(`[SUBSCRIPTIONS-RENEWAL] ✓ Email successfully sent to ${userEmail}`);
    res.json({ success: true, message: 'Email sent' });
  } catch (error) {
    logger.error(`[SUBSCRIPTIONS-RENEWAL] ✗ Error sending email: ${error.message}`);
    res.status(500).json({ error: 'Failed to send renewal reminder email' });
  }
});

export default router;