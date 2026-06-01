import 'dotenv/config';
import nodemailer from 'nodemailer';
import logger from './logger.js';
import { getFieldValue, generateDonationReceiptPDF } from './pdfReceiptGenerator.js';

/**
 * Email Receipt Service - Handles sending receipts via email with PDF attachments
 * Uses Nodemailer with SMTP configuration
 * REFACTORED to use flexible field lookup
 */

let transporter = null;

/**
 * Validate email format
 */
const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return false;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Initialize Nodemailer transporter with SMTP
 */
const initializeTransporter = () => {
  if (transporter) {
    logger.info('[EMAIL-RECEIPT-SERVICE] Using cached transporter instance');
    return transporter;
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  logger.info('[EMAIL-RECEIPT-SERVICE] ========================================');
  logger.info('[EMAIL-RECEIPT-SERVICE] Initializing Nodemailer transporter');
  logger.info('[EMAIL-RECEIPT-SERVICE] ========================================');

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    const missingVars = [];
    if (!smtpHost) missingVars.push('SMTP_HOST');
    if (!smtpPort) missingVars.push('SMTP_PORT');
    if (!smtpUser) missingVars.push('SMTP_USER');
    if (!smtpPass) missingVars.push('SMTP_PASS');
    logger.error(`[EMAIL-RECEIPT-SERVICE] ✗ Missing SMTP configuration: ${missingVars.join(', ')}`);
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

    logger.info('[EMAIL-RECEIPT-SERVICE] ✓ Nodemailer transporter initialized successfully');
    return transporter;
  } catch (error) {
    logger.error(`[EMAIL-RECEIPT-SERVICE] ✗ Failed to initialize transporter: ${error.message}`);
    throw new Error(`Failed to initialize email transporter: ${error.message}`, { cause: error });
  }
};

/**
 * FLEXIBLE - Send pooja booking confirmation email (simple, no PDF)
 */
export const sendPoojaBookingConfirmationEmail = async (bookingRecord) => {
  if (!bookingRecord || typeof bookingRecord !== 'object') {
    throw new Error('Invalid booking record');
  }

  const name = getFieldValue(bookingRecord, ['name', 'customer_name'], 'customer name') || 'Valued Customer';
  const email = getFieldValue(bookingRecord, ['email', 'customer_email'], 'customer email');
  const poojaName = getFieldValue(bookingRecord, ['pooja_name'], 'pooja name') || 'Pooja Service';
  const poojaDate = getFieldValue(bookingRecord, ['pooja_date'], 'pooja date') || 'To be scheduled';
  const timeSlot = getFieldValue(bookingRecord, ['time_slot'], 'time slot') || '';

  if (!email || !isValidEmail(email)) {
    throw new Error('Invalid email address');
  }

  try {
    const transporter = initializeTransporter();
    const fromEmail = process.env.SMTP_FROM_EMAIL || 'noreply@temple.com';
    const fromName = process.env.SMTP_FROM_NAME || 'Sri Sithhi Vinayagar Temple';

    const htmlContent = `
      <div style="font-family: Arial; padding: 20px;">
        <h2>Dear ${name},</h2>
        <p>Your booking for <strong>${poojaName}</strong> on <strong>${poojaDate}</strong> is pending approval.</p>
      </div>
    `;

    await transporter.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to: email,
      subject: 'Pooja Booking Processed - Pending Approval',
      html: htmlContent,
    });

    return { success: true };
  } catch (error) {
    throw new Error(`Failed to send pooja booking confirmation email: ${error.message}`, { cause: error });
  }
};

/**
 * FLEXIBLE - Send donation receipt email with PDF attachment
 */
export const sendDonationReceiptEmail = async (donationRecord, pdfBuffer, receiptId) => {
  if (!donationRecord || typeof donationRecord !== 'object') {
    throw new Error('Invalid donation record');
  }

  const donorEmail = getFieldValue(donationRecord, ['donor_email', 'email'], 'donor email');

  if (!donorEmail || !isValidEmail(donorEmail)) {
    throw new Error(`Invalid email address: "${donorEmail}"`);
  }

  try {
    const transporter = initializeTransporter();
    const fromEmail = process.env.SMTP_FROM_EMAIL || 'noreply@temple.com';
    const fromName = process.env.SMTP_FROM_NAME || 'Sri Sithhi Vinayagar Temple';

    await transporter.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to: donorEmail,
      subject: `Your Donation Receipt - ${receiptId}`,
      html: `<p>Please find your receipt attached.</p>`,
      attachments: [{
        filename: `Receipt-${receiptId}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      }],
    });

    return { success: true };
  } catch (error) {
    throw new Error(`Failed to send donation receipt email: ${error.message}`, { cause: error });
  }
};

/**
 * Send a custom email to a donor
 */
export const sendCustomDonationEmail = async (donationRecord, recipientEmail, subject, message, includePdf) => {
  try {
    const transporter = initializeTransporter();
    const fromEmail = process.env.SMTP_FROM_EMAIL || 'noreply@temple.com';
    const fromName = process.env.SMTP_FROM_NAME || 'Sri Sithhi Vinayagar Temple';

    await transporter.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to: recipientEmail,
      subject: subject,
      html: `<div>${message}</div>`,
    });

    return { success: true };
  } catch (error) {
    throw new Error(`Failed to send custom email: ${error.message}`, { cause: error });
  }
};

/**
 * FLEXIBLE - Send pooja booking receipt email with PDF attachment
 */
export const sendPoojaReceiptEmail = async (bookingRecord, pdfBuffer, receiptId) => {
  const email = getFieldValue(bookingRecord, ['email', 'customer_email'], 'customer email');

  if (!email || !isValidEmail(email)) {
    throw new Error(`Invalid email address: "${email}"`);
  }

  try {
    const transporter = initializeTransporter();
    const fromEmail = process.env.SMTP_FROM_EMAIL || 'noreply@temple.com';
    const fromName = process.env.SMTP_FROM_NAME || 'Sri Sithhi Vinayagar Temple';

    await transporter.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to: email,
      subject: `Your Pooja Booking Receipt - ${receiptId}`,
      html: `<p>Your booking is confirmed. Receipt attached.</p>`,
      attachments: [{
        filename: `Receipt-${receiptId}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      }],
    });

    return { success: true };
  } catch (error) {
    throw new Error(`Failed to send pooja receipt email: ${error.message}`, { cause: error });
  }
};

/**
 * Send premium subscription receipt email with PDF attachment
 */
export const sendPremiumSubscribeReceiptEmail = async (memberEmail, subscriptionData, pdfBuffer) => {
  if (!memberEmail || !isValidEmail(memberEmail)) {
    return { success: true, skipped: true };
  }

  try {
    const transporter = initializeTransporter();
    const fromEmail = process.env.SMTP_FROM_EMAIL || 'noreply@temple.com';
    const fromName = process.env.SMTP_FROM_NAME || 'Sri Sithhi Vinayagar Temple';

    await transporter.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to: memberEmail,
      subject: `Your Premium Subscription Receipt`,
      html: `<p>Subscription confirmed. Receipt attached.</p>`,
      attachments: [{
        filename: `Receipt.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      }],
    });

    return { success: true };
  } catch (error) {
    throw new Error(`Failed to send premium subscription receipt email: ${error.message}`, { cause: error });
  }
};

/**
 * Send payment received email to user or admin
 * Used for subscription payment notifications
 */
export const sendPaymentReceivedEmail = async (params) => {
  logger.info('[EMAIL-RECEIPT-SERVICE] ========================================');
  logger.info('[EMAIL-RECEIPT-SERVICE] sendPaymentReceivedEmail() CALLED');
  logger.info('[EMAIL-RECEIPT-SERVICE] ========================================');

  const {
    recipientEmail,
    recipientName,
    subscriptionType,
    amount,
    transactionReference,
    paymentDate,
    paymentId,
    isAdminNotification = false,
    payerName = null,
    payerEmail = null,
  } = params;

  logger.info('[EMAIL-RECEIPT-SERVICE] Parameters received:');
  logger.info(`[EMAIL-RECEIPT-SERVICE]   - recipientEmail: ${recipientEmail}`);
  logger.info(`[EMAIL-RECEIPT-SERVICE]   - recipientName: ${recipientName}`);
  logger.info(`[EMAIL-RECEIPT-SERVICE]   - subscriptionType: ${subscriptionType}`);
  logger.info(`[EMAIL-RECEIPT-SERVICE]   - amount: €${amount}`);
  logger.info(`[EMAIL-RECEIPT-SERVICE]   - transactionReference: ${transactionReference}`);
  logger.info(`[EMAIL-RECEIPT-SERVICE]   - paymentDate: ${paymentDate}`);
  logger.info(`[EMAIL-RECEIPT-SERVICE]   - paymentId: ${paymentId}`);
  logger.info(`[EMAIL-RECEIPT-SERVICE]   - isAdminNotification: ${isAdminNotification}`);
  if (isAdminNotification) {
    logger.info(`[EMAIL-RECEIPT-SERVICE]   - payerName: ${payerName}`);
    logger.info(`[EMAIL-RECEIPT-SERVICE]   - payerEmail: ${payerEmail}`);
  }

  // Validate inputs
  logger.info('[EMAIL-RECEIPT-SERVICE] Step 1: Validating input parameters');

  if (!recipientEmail || typeof recipientEmail !== 'string') {
    logger.error('[EMAIL-RECEIPT-SERVICE] ✗ VALIDATION FAILED: Invalid recipientEmail');
    logger.error(`[EMAIL-RECEIPT-SERVICE]   - Received: ${JSON.stringify(recipientEmail)}`);
    throw new Error('Invalid recipient email address');
  }

  if (!isValidEmail(recipientEmail)) {
    logger.error('[EMAIL-RECEIPT-SERVICE] ✗ VALIDATION FAILED: Invalid email format');
    logger.error(`[EMAIL-RECEIPT-SERVICE]   - Email: ${recipientEmail}`);
    throw new Error(`Invalid email format: "${recipientEmail}"`);
  }
  logger.info('[EMAIL-RECEIPT-SERVICE] ✓ recipientEmail validated');

  if (!recipientName || typeof recipientName !== 'string') {
    logger.error('[EMAIL-RECEIPT-SERVICE] ✗ VALIDATION FAILED: Invalid recipientName');
    throw new Error('Invalid recipient name');
  }
  logger.info('[EMAIL-RECEIPT-SERVICE] ✓ recipientName validated');

  if (typeof amount !== 'number' || amount <= 0) {
    logger.error('[EMAIL-RECEIPT-SERVICE] ✗ VALIDATION FAILED: Invalid amount');
    throw new Error('Invalid payment amount');
  }
  logger.info('[EMAIL-RECEIPT-SERVICE] ✓ amount validated');

  logger.info('[EMAIL-RECEIPT-SERVICE] ✓ All input parameters validated successfully');

  try {
    logger.info('[EMAIL-RECEIPT-SERVICE] Step 2: Initializing email transporter');
    const emailTransporter = initializeTransporter();
    logger.info('[EMAIL-RECEIPT-SERVICE] ✓ Transporter initialized');

    const fromEmail = process.env.SMTP_FROM_EMAIL || 'noreply@temple.com';
    const fromName = process.env.SMTP_FROM_NAME || 'Sri Sithhi Vinayagar Temple';

    logger.info('[EMAIL-RECEIPT-SERVICE] Step 3: Preparing email content');
    logger.info(`[EMAIL-RECEIPT-SERVICE]   - From: ${fromName} <${fromEmail}>`);
    logger.info(`[EMAIL-RECEIPT-SERVICE]   - To: ${recipientEmail}`);

    const formattedAmount = `€${parseFloat(amount).toFixed(2)}`;

    let htmlContent;
    let subject;

    if (isAdminNotification) {
      // Admin notification email
      subject = `New Payment Received - ${transactionReference}`;
      htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Notification</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #8B0000 0%, #A52A2A 100%); color: #ffffff; padding: 30px; text-align: center; border-radius: 4px; margin-bottom: 30px; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
            .header p { margin: 5px 0 0 0; font-size: 14px; opacity: 0.95; }
            .content { margin: 20px 0; }
            .section-title { color: #8B0000; font-size: 16px; font-weight: 600; margin-top: 25px; margin-bottom: 12px; }
            .summary-box { background-color: #f8f9fa; border-left: 4px solid #8B0000; padding: 20px; margin: 20px 0; border-radius: 4px; }
            .summary-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e0e0e0; }
            .summary-row:last-child { border-bottom: none; }
            .summary-label { color: #666; font-weight: 500; }
            .summary-value { color: #333; font-weight: 600; }
            .amount-section { background: linear-gradient(135deg, #fff3cd 0%, #fffbea 100%); border: 2px solid #ffc107; padding: 20px; margin: 20px 0; border-radius: 6px; text-align: center; }
            .amount-label { color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; font-weight: 600; }
            .amount-value { color: #8B0000; font-size: 32px; font-weight: 700; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 20px; }
            .footer-title { color: #8B0000; font-weight: 600; margin-bottom: 5px; }
            .footer-text { margin: 3px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✓ New Payment Received</h1>
              <p>Subscription payment notification</p>
            </div>
            <div class="content">
              <h2 style="color: #8B0000; font-size: 20px; margin-bottom: 10px; font-weight: 600;">Payment Details</h2>
              <p style="color: #555; font-size: 15px; line-height: 1.8;">A new subscription payment has been received and is awaiting approval.</p>
              
              <div class="summary-box">
                <h3 style="color: #8B0000; font-size: 16px; margin-top: 0; margin-bottom: 15px; font-weight: 600;">Payer Information</h3>
                <div class="summary-row">
                  <span class="summary-label">Payer Name</span>
                  <span class="summary-value">${payerName || 'N/A'}</span>
                </div>
                <div class="summary-row">
                  <span class="summary-label">Payer Email</span>
                  <span class="summary-value">${payerEmail || 'N/A'}</span>
                </div>
              </div>
              
              <div class="summary-box">
                <h3 style="color: #8B0000; font-size: 16px; margin-top: 0; margin-bottom: 15px; font-weight: 600;">Payment Information</h3>
                <div class="summary-row">
                  <span class="summary-label">Payment ID</span>
                  <span class="summary-value">${paymentId}</span>
                </div>
                <div class="summary-row">
                  <span class="summary-label">Transaction Reference</span>
                  <span class="summary-value">${transactionReference}</span>
                </div>
                <div class="summary-row">
                  <span class="summary-label">Subscription Type</span>
                  <span class="summary-value">${subscriptionType}</span>
                </div>
                <div class="summary-row">
                  <span class="summary-label">Payment Date</span>
                  <span class="summary-value">${paymentDate}</span>
                </div>
              </div>
              
              <div class="amount-section">
                <div class="amount-label">Payment Amount</div>
                <div class="amount-value">${formattedAmount}</div>
              </div>
              
              <h3 class="section-title">Action Required</h3>
              <p style="color: #666; font-size: 14px; line-height: 1.8; margin-top: 15px;">
                Please review this payment and approve or reject it in the admin panel. The payer will receive a confirmation email once the payment is processed.
              </p>
            </div>
            <div class="footer">
              <div class="footer-title">Sri Sithhi Vinayagar Tempel Kultur Verein e.V</div>
              <div class="footer-text">Humboldt Str. 103, 90459 Nürnberg</div>
              <div class="footer-text">Tel. No. 0911 43958088</div>
              <div style="margin-top: 10px; font-size: 11px; color: #999;">
                <p style="margin: 5px 0;">This is an automated notification from the temple administration system.</p>
                <p style="margin: 5px 0;">&copy; ${new Date().getFullYear()} Sri Sithhi Vinayagar Tempel Kultur Verein e.V. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
    } else {
      // User payment received email
      subject = `Your Payment Has Been Received - ${transactionReference}`;
      htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Received</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #8B0000 0%, #A52A2A 100%); color: #ffffff; padding: 30px; text-align: center; border-radius: 4px; margin-bottom: 30px; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
            .header p { margin: 5px 0 0 0; font-size: 14px; opacity: 0.95; }
            .content { margin: 20px 0; }
            .greeting h2 { color: #8B0000; font-size: 20px; margin-bottom: 10px; font-weight: 600; }
            .greeting p { color: #555; font-size: 15px; line-height: 1.8; }
            .summary-box { background-color: #f8f9fa; border-left: 4px solid #8B0000; padding: 20px; margin: 20px 0; border-radius: 4px; }
            .summary-box h3 { color: #8B0000; font-size: 16px; margin-top: 0; margin-bottom: 15px; font-weight: 600; }
            .summary-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e0e0e0; }
            .summary-row:last-child { border-bottom: none; }
            .summary-label { color: #666; font-weight: 500; }
            .summary-value { color: #333; font-weight: 600; }
            .amount-section { background: linear-gradient(135deg, #fff3cd 0%, #fffbea 100%); border: 2px solid #ffc107; padding: 20px; margin: 20px 0; border-radius: 6px; text-align: center; }
            .amount-label { color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; font-weight: 600; }
            .amount-value { color: #8B0000; font-size: 32px; font-weight: 700; }
            .status-badge { display: inline-block; background-color: #ffc107; color: #333; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 20px; }
            .footer-title { color: #8B0000; font-weight: 600; margin-bottom: 5px; }
            .footer-text { margin: 3px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✓ Your Payment Has Been Received!</h1>
              <p>Thank you for your subscription payment</p>
            </div>
            <div class="content">
              <div class="greeting">
                <h2>Dear ${recipientName},</h2>
                <p>We are delighted to confirm that we have received your subscription payment. Your payment is now being processed and awaiting admin approval.</p>
              </div>
              
              <div style="text-align: center;">
                <span class="status-badge">⏳ Pending Approval</span>
              </div>
              
              <div class="summary-box">
                <h3>Payment Details</h3>
                <div class="summary-row">
                  <span class="summary-label">Payment ID</span>
                  <span class="summary-value">${paymentId}</span>
                </div>
                <div class="summary-row">
                  <span class="summary-label">Transaction Reference</span>
                  <span class="summary-value">${transactionReference}</span>
                </div>
                <div class="summary-row">
                  <span class="summary-label">Subscription Type</span>
                  <span class="summary-value">${subscriptionType}</span>
                </div>
                <div class="summary-row">
                  <span class="summary-label">Payment Date</span>
                  <span class="summary-value">${paymentDate}</span>
                </div>
              </div>
              
              <div class="amount-section">
                <div class="amount-label">Payment Amount</div>
                <div class="amount-value">${formattedAmount}</div>
              </div>
              
              <p style="color: #666; font-size: 14px; line-height: 1.8; margin-top: 20px;">
                Your payment has been recorded in our system and is awaiting admin approval. You will receive a confirmation email once your payment has been approved. Thank you for your patience and support!
              </p>
            </div>
            <div class="footer">
              <div class="footer-title">Sri Sithhi Vinayagar Tempel Kultur Verein e.V</div>
              <div class="footer-text">Humboldt Str. 103, 90459 Nürnberg</div>
              <div class="footer-text">Tel. No. 0911 43958088</div>
              <div style="margin-top: 10px; font-size: 11px; color: #999;">
                <p style="margin: 5px 0;">This is an automated confirmation email. Please do not reply to this message.</p>
                <p style="margin: 5px 0;">&copy; ${new Date().getFullYear()} Sri Sithhi Vinayagar Tempel Kultur Verein e.V. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
    }

    const mailOptions = {
      from: `${fromName} <${fromEmail}>`,
      to: recipientEmail,
      subject: subject,
      html: htmlContent,
    };

    logger.info('[EMAIL-RECEIPT-SERVICE] Step 4: Sending email via Nodemailer');
    const info = await emailTransporter.sendMail(mailOptions);

    logger.info('[EMAIL-RECEIPT-SERVICE] ========================================');
    logger.info('[EMAIL-RECEIPT-SERVICE] ✓ PAYMENT EMAIL SENT SUCCESSFULLY');
    logger.info('[EMAIL-RECEIPT-SERVICE] ========================================');
    logger.info(`[EMAIL-RECEIPT-SERVICE] Message ID: ${info.messageId}`);
    logger.info(`[EMAIL-RECEIPT-SERVICE] Response: ${info.response}`);
    logger.info(`[EMAIL-RECEIPT-SERVICE] Recipient: ${recipientEmail}`);
    logger.info(`[EMAIL-RECEIPT-SERVICE] Is Admin Notification: ${isAdminNotification}`);

    return {
      success: true,
      message: `Payment email sent to ${recipientEmail}`,
      messageId: info.messageId,
    };
  } catch (error) {
    logger.error('[EMAIL-RECEIPT-SERVICE] ========================================');
    logger.error('[EMAIL-RECEIPT-SERVICE] ✗ PAYMENT EMAIL SENDING FAILED');
    logger.error('[EMAIL-RECEIPT-SERVICE] ========================================');
    logger.error(`[EMAIL-RECEIPT-SERVICE] Error message: ${error.message}`);
    logger.error(`[EMAIL-RECEIPT-SERVICE] Error name: ${error.name}`);
    logger.error(`[EMAIL-RECEIPT-SERVICE] Error code: ${error.code || 'N/A'}`);
    logger.error(`[EMAIL-RECEIPT-SERVICE] Error stack: ${error.stack}`);
    logger.error(`[EMAIL-RECEIPT-SERVICE] Recipient: ${recipientEmail}`);

    throw new Error(`Failed to send payment email: ${error.message}`, { cause: error });
  }
};

export default {
  sendPoojaBookingConfirmationEmail,
  sendDonationReceiptEmail,
  sendCustomDonationEmail,
  sendPoojaReceiptEmail,
  sendPremiumSubscribeReceiptEmail,
  sendPaymentReceivedEmail,
};