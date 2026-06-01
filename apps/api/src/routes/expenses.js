import 'dotenv/config';
import express from 'express';
import nodemailer from 'nodemailer';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';
import { generatePaymentVoucherPDF } from '../utils/pdfReceiptGenerator.js';

const router = express.Router();

logger.info('[EXPENSES-ROUTES] ========================================');
logger.info('[EXPENSES-ROUTES] Initializing Expenses Routes');
logger.info('[EXPENSES-ROUTES] ========================================');

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
 * @returns {Object} Nodemailer transporter instance
 */
let transporter = null;
const initializeTransporter = () => {
  if (transporter) {
    logger.info('[EXPENSE-EMAIL] Using cached transporter instance');
    return transporter;
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  logger.info('[EXPENSE-EMAIL] Initializing Nodemailer transporter');
  logger.info(`[EXPENSE-EMAIL] SMTP Host: ${smtpHost}`);
  logger.info(`[EXPENSE-EMAIL] SMTP Port: ${smtpPort}`);
  logger.info(`[EXPENSE-EMAIL] SMTP User: ${smtpUser}`);

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    const missingVars = [];
    if (!smtpHost) missingVars.push('SMTP_HOST');
    if (!smtpPort) missingVars.push('SMTP_PORT');
    if (!smtpUser) missingVars.push('SMTP_USER');
    if (!smtpPass) missingVars.push('SMTP_PASS');
    logger.error(`[EXPENSE-EMAIL] Missing SMTP configuration: ${missingVars.join(', ')}`);
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

    logger.info('[EXPENSE-EMAIL] ✓ Nodemailer transporter initialized successfully');
    return transporter;
  } catch (error) {
    logger.error(`[EXPENSE-EMAIL] ✗ Failed to initialize transporter: ${error.message}`);
    logger.error(`[EXPENSE-EMAIL] Error stack: ${error.stack}`);
    throw new Error(`Failed to initialize email transporter: ${error.message}`, { cause: error });
  }
};

/**
 * Helper function to format currency
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string (e.g., "€100.00")
 */
const formatCurrency = (amount) => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '€0.00';
  }
  return `€${parseFloat(amount).toFixed(2)}`;
};

/**
 * Helper function to format date
 * @param {string|Date} dateString - Date to format
 * @returns {string} Formatted date (e.g., "January 15, 2024")
 */
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * POST /expenses/generate-voucher
 * Generate a payment voucher for an expense
 * 
 * Request body:
 *   - expenseId (string, required): ID of the expense record
 *   - amount (number, required): Voucher amount
 *   - category (string, required): Expense category
 *   - paidTo (string, required): Name of payee
 *   - date (string, required): Voucher date
 *   - description (string, optional): Voucher description
 * 
 * Response:
 *   - { voucherId: string, voucherPdf: string (base64) }
 */
router.post('/generate-voucher', async (req, res) => {
  logger.info('[EXPENSE-VOUCHER] ========================================');
  logger.info('[EXPENSE-VOUCHER] POST /generate-voucher - Generate voucher request received');
  logger.info('[EXPENSE-VOUCHER] ========================================');
  logger.info('[EXPENSE-VOUCHER] Request body:', JSON.stringify(req.body, null, 2));

  const { expenseId, amount, category, paidTo, date, description } = req.body;

  // Step 1: Validate input parameters
  logger.info('[EXPENSE-VOUCHER] Step 1: Validating input parameters');

  if (!expenseId || typeof expenseId !== 'string' || expenseId.trim().length === 0) {
    logger.warn('[EXPENSE-VOUCHER] ✗ Validation failed: Missing or invalid expenseId');
    return res.status(400).json({ error: 'expenseId is required and must be a non-empty string' });
  }
  logger.info(`[EXPENSE-VOUCHER] ✓ expenseId validated: ${expenseId}`);

  if (amount === undefined || amount === null || typeof amount !== 'number' || amount <= 0) {
    logger.warn('[EXPENSE-VOUCHER] ✗ Validation failed: Invalid amount');
    return res.status(400).json({ error: 'amount is required and must be a positive number' });
  }
  logger.info(`[EXPENSE-VOUCHER] ✓ amount validated: €${amount}`);

  if (!category || typeof category !== 'string' || category.trim().length === 0) {
    logger.warn('[EXPENSE-VOUCHER] ✗ Validation failed: Missing or invalid category');
    return res.status(400).json({ error: 'category is required and must be a non-empty string' });
  }
  logger.info(`[EXPENSE-VOUCHER] ✓ category validated: ${category}`);

  if (!paidTo || typeof paidTo !== 'string' || paidTo.trim().length === 0) {
    logger.warn('[EXPENSE-VOUCHER] ✗ Validation failed: Missing or invalid paidTo');
    return res.status(400).json({ error: 'paidTo is required and must be a non-empty string' });
  }
  logger.info(`[EXPENSE-VOUCHER] ✓ paidTo validated: ${paidTo}`);

  if (!date || typeof date !== 'string' || date.trim().length === 0) {
    logger.warn('[EXPENSE-VOUCHER] ✗ Validation failed: Missing or invalid date');
    return res.status(400).json({ error: 'date is required and must be a non-empty string' });
  }
  logger.info(`[EXPENSE-VOUCHER] ✓ date validated: ${date}`);

  logger.info('[EXPENSE-VOUCHER] ✓ All input parameters validated successfully');

  // Step 2: Fetch expense record from PocketBase
  logger.info('[EXPENSE-VOUCHER] Step 2: Fetching expense record from PocketBase');
  logger.info(`[EXPENSE-VOUCHER]   - Collection: expenses`);
  logger.info(`[EXPENSE-VOUCHER]   - ID: ${expenseId}`);

  const expense = await pb.collection('expenses').getOne(expenseId);

  if (!expense) {
    logger.error(`[EXPENSE-VOUCHER] ✗ Expense not found: ${expenseId}`);
    throw new Error(`Expense with ID ${expenseId} not found`);
  }

  logger.info('[EXPENSE-VOUCHER] ✓ Expense record fetched successfully');
  logger.info('[EXPENSE-VOUCHER] Expense record details:');
  logger.info(`[EXPENSE-VOUCHER]   - ID: ${expense.id}`);
  logger.info(`[EXPENSE-VOUCHER]   - Category: ${expense.category || 'N/A'}`);
  logger.info(`[EXPENSE-VOUCHER]   - Amount: €${expense.amount || 0}`);

  // Step 3: Generate unique voucher ID
  logger.info('[EXPENSE-VOUCHER] Step 3: Generating unique voucher ID');
  logger.info('[EXPENSE-VOUCHER]   - Querying existing vouchers to determine next ID');

  let nextVoucherNumber = 1;
  try {
    const existingVouchers = await pb.collection('vouchers').getFullList({
      sort: '-created',
      fields: 'voucher_id',
    });

    if (existingVouchers.length > 0) {
      logger.info(`[EXPENSE-VOUCHER]   - Found ${existingVouchers.length} existing vouchers`);
      // Extract the highest number from existing vouchers
      const voucherNumbers = existingVouchers
        .map(v => {
          const match = v.voucher_id.match(/PAID_VO_(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(n => n > 0);

      if (voucherNumbers.length > 0) {
        nextVoucherNumber = Math.max(...voucherNumbers) + 1;
        logger.info(`[EXPENSE-VOUCHER]   - Highest existing number: ${Math.max(...voucherNumbers)}`);
      }
    } else {
      logger.info('[EXPENSE-VOUCHER]   - No existing vouchers found, starting from 1');
    }
  } catch (error) {
    logger.warn(`[EXPENSE-VOUCHER] ⚠ Warning: Could not query existing vouchers: ${error.message}`);
    logger.warn('[EXPENSE-VOUCHER]   - Using default starting number: 1');
  }

  const voucherId = `PAID_VO_${String(nextVoucherNumber).padStart(5, '0')}`;
  logger.info(`[EXPENSE-VOUCHER] ✓ Voucher ID generated: ${voucherId}`);
  logger.info(`[EXPENSE-VOUCHER]   - Format: PAID_VO_XXXXX`);
  logger.info(`[EXPENSE-VOUCHER]   - Number: ${nextVoucherNumber}`);

  // Step 4: Create voucher record in PocketBase
  logger.info('[EXPENSE-VOUCHER] Step 4: Creating voucher record in PocketBase');
  logger.info(`[EXPENSE-VOUCHER]   - Collection: vouchers`);
  logger.info(`[EXPENSE-VOUCHER]   - Voucher ID: ${voucherId}`);

  const voucherRecord = await pb.collection('vouchers').create({
    voucher_id: voucherId,
    expense_id: expenseId,
    amount: amount,
    category: category,
    paid_to: paidTo,
    date: date,
    description: description || '',
    status: 'generated',
  });

  logger.info('[EXPENSE-VOUCHER] ✓ Voucher record created successfully');
  logger.info(`[EXPENSE-VOUCHER]   - Record ID: ${voucherRecord.id}`);
  logger.info(`[EXPENSE-VOUCHER]   - Voucher ID: ${voucherRecord.voucher_id}`);

  // Step 5: Generate PDF voucher
  logger.info('[EXPENSE-VOUCHER] Step 5: Generating PDF voucher');
  logger.info(`[EXPENSE-VOUCHER]   - Calling generatePaymentVoucherPDF()`);

  const pdfBuffer = await generatePaymentVoucherPDF({
    voucherId: voucherId,
    expenseId: expenseId,
    amount: amount,
    category: category,
    paidTo: paidTo,
    date: date,
    description: description || '',
  });

  if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer)) {
    logger.error('[EXPENSE-VOUCHER] ✗ PDF buffer is invalid');
    throw new Error('PDF generation failed - invalid buffer');
  }

  logger.info('[EXPENSE-VOUCHER] ✓ PDF voucher generated successfully');
  logger.info(`[EXPENSE-VOUCHER]   - Size: ${pdfBuffer.length} bytes`);
  logger.info(`[EXPENSE-VOUCHER]   - Is Buffer: ${Buffer.isBuffer(pdfBuffer)}`);

  // Step 6: Convert PDF to base64
  logger.info('[EXPENSE-VOUCHER] Step 6: Converting PDF to base64');
  const voucherPdfBase64 = pdfBuffer.toString('base64');
  logger.info(`[EXPENSE-VOUCHER] ✓ PDF converted to base64`);
  logger.info(`[EXPENSE-VOUCHER]   - Base64 length: ${voucherPdfBase64.length} characters`);

  logger.info('[EXPENSE-VOUCHER] ========================================');
  logger.info('[EXPENSE-VOUCHER] ✓ VOUCHER GENERATED SUCCESSFULLY');
  logger.info('[EXPENSE-VOUCHER] ========================================');
  logger.info(`[EXPENSE-VOUCHER] Voucher ID: ${voucherId}`);
  logger.info(`[EXPENSE-VOUCHER] Expense ID: ${expenseId}`);
  logger.info(`[EXPENSE-VOUCHER] Amount: €${amount}`);
  logger.info(`[EXPENSE-VOUCHER] Category: ${category}`);
  logger.info(`[EXPENSE-VOUCHER] Paid To: ${paidTo}`);
  logger.info(`[EXPENSE-VOUCHER] PDF Size: ${pdfBuffer.length} bytes`);

  res.json({
    success: true,
    voucherId: voucherId,
    voucherPdf: voucherPdfBase64,
  });
});

/**
 * POST /expenses/send-email-with-attachments
 * Send expense details via email with bill and voucher attachments
 * 
 * Request body:
 *   - expenseId (string, required): ID of the expense record
 *   - recipientEmail (string, required): Email address to send to
 *   - billFileName (string, required): Name of the bill file
 *   - voucherBase64 (string, required): Base64-encoded voucher PDF
 * 
 * Response:
 *   - { success: true, message: 'Email sent with attachments' }
 */
router.post('/send-email-with-attachments', async (req, res) => {
  logger.info('[EXPENSE-EMAIL-ATTACHMENTS] ========================================');
  logger.info('[EXPENSE-EMAIL-ATTACHMENTS] POST /send-email-with-attachments - Send email request received');
  logger.info('[EXPENSE-EMAIL-ATTACHMENTS] ========================================');
  logger.info('[EXPENSE-EMAIL-ATTACHMENTS] Request body:', JSON.stringify(req.body, null, 2));

  const { expenseId, recipientEmail, billFileName, voucherBase64 } = req.body;

  // Step 1: Validate input parameters
  logger.info('[EXPENSE-EMAIL-ATTACHMENTS] Step 1: Validating input parameters');

  if (!expenseId || typeof expenseId !== 'string' || expenseId.trim().length === 0) {
    logger.warn('[EXPENSE-EMAIL-ATTACHMENTS] ✗ Validation failed: Missing or invalid expenseId');
    return res.status(400).json({ error: 'expenseId is required and must be a non-empty string' });
  }
  logger.info(`[EXPENSE-EMAIL-ATTACHMENTS] ✓ expenseId validated: ${expenseId}`);

  if (!recipientEmail || typeof recipientEmail !== 'string' || recipientEmail.trim().length === 0) {
    logger.warn('[EXPENSE-EMAIL-ATTACHMENTS] ✗ Validation failed: Missing or invalid recipientEmail');
    return res.status(400).json({ error: 'recipientEmail is required and must be a non-empty string' });
  }
  logger.info(`[EXPENSE-EMAIL-ATTACHMENTS] ✓ recipientEmail parameter present: ${recipientEmail}`);

  if (!isValidEmail(recipientEmail)) {
    logger.warn('[EXPENSE-EMAIL-ATTACHMENTS] ✗ Validation failed: Invalid email format');
    logger.warn(`[EXPENSE-EMAIL-ATTACHMENTS]   - Email: ${recipientEmail}`);
    return res.status(400).json({ error: `Invalid email format: "${recipientEmail}"` });
  }
  logger.info(`[EXPENSE-EMAIL-ATTACHMENTS] ✓ Email format validation PASSED: "${recipientEmail}"`);

  if (!billFileName || typeof billFileName !== 'string' || billFileName.trim().length === 0) {
    logger.warn('[EXPENSE-EMAIL-ATTACHMENTS] ✗ Validation failed: Missing or invalid billFileName');
    return res.status(400).json({ error: 'billFileName is required and must be a non-empty string' });
  }
  logger.info(`[EXPENSE-EMAIL-ATTACHMENTS] ✓ billFileName validated: ${billFileName}`);

  if (!voucherBase64 || typeof voucherBase64 !== 'string' || voucherBase64.trim().length === 0) {
    logger.warn('[EXPENSE-EMAIL-ATTACHMENTS] ✗ Validation failed: Missing or invalid voucherBase64');
    return res.status(400).json({ error: 'voucherBase64 is required and must be a non-empty string' });
  }
  logger.info(`[EXPENSE-EMAIL-ATTACHMENTS] ✓ voucherBase64 validated (length: ${voucherBase64.length} characters)`);

  logger.info('[EXPENSE-EMAIL-ATTACHMENTS] ✓ All input parameters validated successfully');

  // Step 2: Fetch expense record from PocketBase
  logger.info('[EXPENSE-EMAIL-ATTACHMENTS] Step 2: Fetching expense record from PocketBase');
  logger.info(`[EXPENSE-EMAIL-ATTACHMENTS]   - Collection: expenses`);
  logger.info(`[EXPENSE-EMAIL-ATTACHMENTS]   - ID: ${expenseId}`);

  const expenseRecord = await pb.collection('expenses').getOne(expenseId);

  if (!expenseRecord) {
    logger.error(`[EXPENSE-EMAIL-ATTACHMENTS] ✗ Expense not found: ${expenseId}`);
    throw new Error(`Expense with ID ${expenseId} not found`);
  }

  logger.info('[EXPENSE-EMAIL-ATTACHMENTS] ✓ Expense record fetched successfully');
  logger.info('[EXPENSE-EMAIL-ATTACHMENTS] Expense record details:');
  logger.info(`[EXPENSE-EMAIL-ATTACHMENTS]   - ID: ${expenseRecord.id}`);
  logger.info(`[EXPENSE-EMAIL-ATTACHMENTS]   - Category: ${expenseRecord.category || 'N/A'}`);
  logger.info(`[EXPENSE-EMAIL-ATTACHMENTS]   - Amount: €${expenseRecord.amount || 0}`);
  logger.info(`[EXPENSE-EMAIL-ATTACHMENTS]   - Bill File: ${expenseRecord.bill_file || 'N/A'}`);

  // Step 3: Get bill file from PocketBase
  logger.info('[EXPENSE-EMAIL-ATTACHMENTS] Step 3: Getting bill file from PocketBase');
  let billFileBuffer = null;

  if (expenseRecord.bill_file) {
    try {
      const billFileUrl = pb.files.getUrl(expenseRecord, expenseRecord.bill_file);
      logger.info(`[EXPENSE-EMAIL-ATTACHMENTS] ✓ Bill file URL obtained: ${billFileUrl}`);

      // Fetch the bill file
      logger.info('[EXPENSE-EMAIL-ATTACHMENTS] Step 4: Fetching bill file from URL');
      const billResponse = await fetch(billFileUrl);

      if (!billResponse.ok) {
        logger.warn(`[EXPENSE-EMAIL-ATTACHMENTS] ⚠ Warning: Failed to fetch bill file (status: ${billResponse.status})`);
        logger.warn('[EXPENSE-EMAIL-ATTACHMENTS]   - Continuing without bill attachment');
      } else {
        const arrayBuffer = await billResponse.arrayBuffer();
        billFileBuffer = Buffer.from(arrayBuffer);
        logger.info(`[EXPENSE-EMAIL-ATTACHMENTS] ✓ Bill file fetched successfully`);
        logger.info(`[EXPENSE-EMAIL-ATTACHMENTS]   - Size: ${billFileBuffer.length} bytes`);
      }
    } catch (error) {
      logger.warn(`[EXPENSE-EMAIL-ATTACHMENTS] ⚠ Warning: Error fetching bill file: ${error.message}`);
      logger.warn('[EXPENSE-EMAIL-ATTACHMENTS]   - Continuing without bill attachment');
    }
  } else {
    logger.warn('[EXPENSE-EMAIL-ATTACHMENTS] ⚠ Warning: No bill file found in expense record');
    logger.warn('[EXPENSE-EMAIL-ATTACHMENTS]   - Continuing without bill attachment');
  }

  // Step 5: Convert voucher base64 to buffer
  logger.info('[EXPENSE-EMAIL-ATTACHMENTS] Step 5: Converting voucher base64 to buffer');
  let voucherBuffer;
  try {
    voucherBuffer = Buffer.from(voucherBase64, 'base64');
    logger.info(`[EXPENSE-EMAIL-ATTACHMENTS] ✓ Voucher buffer created`);
    logger.info(`[EXPENSE-EMAIL-ATTACHMENTS]   - Size: ${voucherBuffer.length} bytes`);
  } catch (error) {
    logger.error(`[EXPENSE-EMAIL-ATTACHMENTS] ✗ Failed to convert voucher base64: ${error.message}`);
    throw new Error(`Invalid voucher base64 encoding: ${error.message}`, { cause: error });
  }

  // Step 6: Prepare email content
  logger.info('[EXPENSE-EMAIL-ATTACHMENTS] Step 6: Preparing email content');
  const formattedAmount = formatCurrency(expenseRecord.amount || 0);
  const formattedDate = formatDate(expenseRecord.date || expenseRecord.created);

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Expense Details with Voucher</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #8B0000 0%, #A52A2A 100%); color: #ffffff; padding: 30px; text-align: center; border-radius: 4px; margin-bottom: 30px; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
        .header p { margin: 5px 0 0 0; font-size: 14px; opacity: 0.95; }
        .content { margin: 20px 0; }
        .details-box { background-color: #f8f9fa; border-left: 4px solid #8B0000; padding: 20px; margin: 20px 0; border-radius: 4px; }
        .details-box h3 { color: #8B0000; font-size: 16px; margin-top: 0; margin-bottom: 15px; font-weight: 600; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e0e0e0; }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { color: #666; font-weight: 500; }
        .detail-value { color: #333; font-weight: 600; }
        .amount-section { background: linear-gradient(135deg, #fff3cd 0%, #fffbea 100%); border: 2px solid #ffc107; padding: 20px; margin: 20px 0; border-radius: 6px; text-align: center; }
        .amount-label { color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; font-weight: 600; }
        .amount-value { color: #8B0000; font-size: 32px; font-weight: 700; }
        .attachments-section { background-color: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .attachments-section h4 { color: #2e7d32; margin-top: 0; margin-bottom: 10px; }
        .attachment-item { margin: 8px 0; font-size: 14px; color: #333; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 20px; }
        .footer-title { color: #8B0000; font-weight: 600; margin-bottom: 5px; }
        .footer-text { margin: 3px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Expense Details & Payment Voucher</h1>
          <p>Attached documents for your records</p>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>Please find below the details of the expense along with the payment voucher and supporting bill documents.</p>
          
          <div class="details-box">
            <h3>Expense Information</h3>
            <div class="detail-row">
              <span class="detail-label">Expense ID</span>
              <span class="detail-value">${expenseId}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Category</span>
              <span class="detail-value">${expenseRecord.category || 'N/A'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Date</span>
              <span class="detail-value">${formattedDate}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Description</span>
              <span class="detail-value">${expenseRecord.description || 'N/A'}</span>
            </div>
          </div>
          
          <div class="amount-section">
            <div class="amount-label">Expense Amount</div>
            <div class="amount-value">${formattedAmount}</div>
          </div>
          
          <div class="attachments-section">
            <h4>✓ Attached Documents</h4>
            <div class="attachment-item">📄 Payment Voucher (PDF)</div>
            ${billFileBuffer ? '<div class="attachment-item">📋 Bill/Receipt (Original File)</div>' : ''}
          </div>
          
          <p style="color: #666; font-size: 14px; line-height: 1.8; margin-top: 20px;">
            Please review the attached documents for your records. The payment voucher contains all relevant expense details, and the bill/receipt provides supporting documentation.
          </p>
        </div>
        <div class="footer">
          <div class="footer-title">Sri Sithhi Vinayagar Tempel Kultur Verein e.V</div>
          <div class="footer-text">Humboldt Str. 103, 90459 Nürnberg</div>
          <div class="footer-text">Tel. No. 0911 43958088</div>
          <div style="margin-top: 10px; font-size: 11px; color: #999;">
            <p style="margin: 5px 0;">This is an automated email. Please do not reply to this message.</p>
            <p style="margin: 5px 0;">&copy; ${new Date().getFullYear()} Sri Sithhi Vinayagar Tempel Kultur Verein e.V. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  logger.info('[EXPENSE-EMAIL-ATTACHMENTS] ✓ Email HTML content generated');

  // Step 7: Initialize email transporter
  logger.info('[EXPENSE-EMAIL-ATTACHMENTS] Step 7: Initializing email transporter');
  const emailTransporter = initializeTransporter();
  logger.info('[EXPENSE-EMAIL-ATTACHMENTS] ✓ Transporter initialized');

  // Step 8: Prepare email options with attachments
  logger.info('[EXPENSE-EMAIL-ATTACHMENTS] Step 8: Preparing email options with attachments');
  const fromEmail = process.env.SMTP_FROM_EMAIL || 'noreply@temple.com';
  const fromName = process.env.SMTP_FROM_NAME || 'Sri Sithhi Vinayagar Temple';

  const attachments = [];

  // Add voucher PDF attachment
  attachments.push({
    filename: `Voucher-${expenseId}.pdf`,
    content: voucherBuffer,
    contentType: 'application/pdf',
  });
  logger.info('[EXPENSE-EMAIL-ATTACHMENTS]   - Voucher PDF attachment added');

  // Add bill file attachment if available
  if (billFileBuffer) {
    attachments.push({
      filename: billFileName,
      content: billFileBuffer,
      contentType: 'application/octet-stream',
    });
    logger.info(`[EXPENSE-EMAIL-ATTACHMENTS]   - Bill file attachment added: ${billFileName}`);
  }

  const mailOptions = {
    from: `${fromName} <${fromEmail}>`,
    to: recipientEmail,
    subject: `Expense Details & Payment Voucher - ${expenseId}`,
    html: htmlContent,
    attachments: attachments,
  };

  logger.info('[EXPENSE-EMAIL-ATTACHMENTS]   - From: ' + fromName + ' <' + fromEmail + '>');
  logger.info('[EXPENSE-EMAIL-ATTACHMENTS]   - To: ' + recipientEmail);
  logger.info('[EXPENSE-EMAIL-ATTACHMENTS]   - Subject: ' + mailOptions.subject);
  logger.info(`[EXPENSE-EMAIL-ATTACHMENTS]   - Attachments: ${attachments.length}`);

  // Step 9: Send email
  logger.info('[EXPENSE-EMAIL-ATTACHMENTS] Step 9: Sending email via Nodemailer');
  const info = await emailTransporter.sendMail(mailOptions);

  logger.info('[EXPENSE-EMAIL-ATTACHMENTS] ========================================');
  logger.info('[EXPENSE-EMAIL-ATTACHMENTS] ✓ EMAIL WITH ATTACHMENTS SENT SUCCESSFULLY');
  logger.info('[EXPENSE-EMAIL-ATTACHMENTS] ========================================');
  logger.info(`[EXPENSE-EMAIL-ATTACHMENTS] Message ID: ${info.messageId}`);
  logger.info(`[EXPENSE-EMAIL-ATTACHMENTS] Response: ${info.response}`);
  logger.info(`[EXPENSE-EMAIL-ATTACHMENTS] Accepted: ${info.accepted?.join(', ') || 'N/A'}`);
  logger.info(`[EXPENSE-EMAIL-ATTACHMENTS] Recipient: ${recipientEmail}`);
  logger.info(`[EXPENSE-EMAIL-ATTACHMENTS] Expense ID: ${expenseId}`);
  logger.info(`[EXPENSE-EMAIL-ATTACHMENTS] Attachments: ${attachments.length}`);

  res.json({
    success: true,
    message: 'Email sent with attachments',
    messageId: info.messageId,
  });
});

// POST /expense/send-email - Send expense details via email
router.post('/send-email', async (req, res) => {
  logger.info('[EXPENSE-EMAIL] ========================================');
  logger.info('[EXPENSE-EMAIL] POST /send-email - Send expense email request received');
  logger.info('[EXPENSE-EMAIL] ========================================');
  logger.info('[EXPENSE-EMAIL] Request body:', JSON.stringify(req.body, null, 2));

  const { expenseId, recipientEmail } = req.body;

  // Step 1: Validate input parameters
  logger.info('[EXPENSE-EMAIL] Step 1: Validating input parameters');

  if (!expenseId || typeof expenseId !== 'string' || expenseId.trim().length === 0) {
    logger.warn('[EXPENSE-EMAIL] ✗ Validation failed: Missing or invalid expenseId');
    return res.status(400).json({ error: 'expenseId is required and must be a non-empty string' });
  }
  logger.info(`[EXPENSE-EMAIL] ✓ expenseId validated: ${expenseId}`);

  if (!recipientEmail || typeof recipientEmail !== 'string' || recipientEmail.trim().length === 0) {
    logger.warn('[EXPENSE-EMAIL] ✗ Validation failed: Missing or invalid recipientEmail');
    return res.status(400).json({ error: 'recipientEmail is required and must be a non-empty string' });
  }
  logger.info(`[EXPENSE-EMAIL] ✓ recipientEmail parameter present: ${recipientEmail}`);

  if (!isValidEmail(recipientEmail)) {
    logger.warn('[EXPENSE-EMAIL] ✗ Validation failed: Invalid email format');
    logger.warn(`[EXPENSE-EMAIL]   - Email: ${recipientEmail}`);
    return res.status(400).json({ error: `Invalid email format: "${recipientEmail}"` });
  }
  logger.info(`[EXPENSE-EMAIL] ✓ Email format validation PASSED: "${recipientEmail}"`);
  logger.info('[EXPENSE-EMAIL] ✓ All input parameters validated successfully');

  // Step 2: Fetch expense record from PocketBase
  logger.info('[EXPENSE-EMAIL] Step 2: Fetching expense record from PocketBase');
  logger.info(`[EXPENSE-EMAIL]   - Collection: expenses`);
  logger.info(`[EXPENSE-EMAIL]   - ID: ${expenseId}`);

  const expense = await pb.collection('expenses').getOne(expenseId);

  if (!expense) {
    logger.error(`[EXPENSE-EMAIL] ✗ Expense not found: ${expenseId}`);
    throw new Error(`Expense with ID ${expenseId} not found`);
  }

  logger.info('[EXPENSE-EMAIL] ✓ Expense record fetched successfully');
  logger.info('[EXPENSE-EMAIL] Expense record details:');
  logger.info(`[EXPENSE-EMAIL]   - ID: ${expense.id}`);
  logger.info(`[EXPENSE-EMAIL]   - Category: ${expense.category || 'N/A'}`);
  logger.info(`[EXPENSE-EMAIL]   - Amount: €${expense.amount || 0}`);
  logger.info(`[EXPENSE-EMAIL]   - Date: ${expense.date || 'N/A'}`);
  logger.info(`[EXPENSE-EMAIL]   - Description: ${expense.description || 'N/A'}`);
  logger.info(`[EXPENSE-EMAIL]   - Image: ${expense.image || 'N/A'}`);

  // Step 3: Extract expense details
  logger.info('[EXPENSE-EMAIL] Step 3: Extracting expense details');

  const category = expense.category || 'General';
  const amount = expense.amount || 0;
  const date = expense.date || new Date().toISOString();
  const description = expense.description || 'No description provided';
  const formattedAmount = formatCurrency(amount);
  const formattedDate = formatDate(date);

  // Get image URL if image exists
  let imageUrl = null;
  if (expense.image) {
    try {
      imageUrl = pb.files.getUrl(expense, expense.image);
      logger.info(`[EXPENSE-EMAIL]   - Image URL: ${imageUrl}`);
    } catch (error) {
      logger.warn(`[EXPENSE-EMAIL] ⚠ Failed to get image URL: ${error.message}`);
      imageUrl = null;
    }
  }

  logger.info('[EXPENSE-EMAIL] ✓ Expense details extracted');
  logger.info(`[EXPENSE-EMAIL]   - Category: ${category}`);
  logger.info(`[EXPENSE-EMAIL]   - Amount: ${formattedAmount}`);
  logger.info(`[EXPENSE-EMAIL]   - Date: ${formattedDate}`);
  logger.info(`[EXPENSE-EMAIL]   - Description: ${description}`);
  logger.info(`[EXPENSE-EMAIL]   - Image URL: ${imageUrl ? 'Present' : 'Not available'}`);

  // Step 4: Generate HTML email content
  logger.info('[EXPENSE-EMAIL] Step 4: Generating HTML email content');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Expense Details</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #8B0000 0%, #A52A2A 100%); color: #ffffff; padding: 30px; text-align: center; border-radius: 4px; margin-bottom: 30px; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
        .header p { margin: 5px 0 0 0; font-size: 14px; opacity: 0.95; }
        .content { margin: 20px 0; }
        .details-box { background-color: #f8f9fa; border-left: 4px solid #8B0000; padding: 20px; margin: 20px 0; border-radius: 4px; }
        .details-box h3 { color: #8B0000; font-size: 16px; margin-top: 0; margin-bottom: 15px; font-weight: 600; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e0e0e0; }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { color: #666; font-weight: 500; }
        .detail-value { color: #333; font-weight: 600; }
        .amount-section { background: linear-gradient(135deg, #fff3cd 0%, #fffbea 100%); border: 2px solid #ffc107; padding: 20px; margin: 20px 0; border-radius: 6px; text-align: center; }
        .amount-label { color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; font-weight: 600; }
        .amount-value { color: #8B0000; font-size: 32px; font-weight: 700; }
        .image-section { margin: 20px 0; text-align: center; }
        .image-section img { max-width: 100%; height: auto; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 20px; }
        .footer-title { color: #8B0000; font-weight: 600; margin-bottom: 5px; }
        .footer-text { margin: 3px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Expense Details</h1>
          <p>Expense Information Report</p>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>Please find below the details of the expense record:</p>
          
          <div class="details-box">
            <h3>Expense Information</h3>
            <div class="detail-row">
              <span class="detail-label">Expense ID</span>
              <span class="detail-value">${expenseId}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Category</span>
              <span class="detail-value">${category}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Date</span>
              <span class="detail-value">${formattedDate}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Description</span>
              <span class="detail-value">${description}</span>
            </div>
          </div>
          
          <div class="amount-section">
            <div class="amount-label">Expense Amount</div>
            <div class="amount-value">${formattedAmount}</div>
          </div>
          
          ${imageUrl ? `
          <div class="image-section">
            <h3 style="color: #8B0000; font-size: 14px; margin-bottom: 10px;">Expense Image</h3>
            <img src="${imageUrl}" alt="Expense Image" style="max-width: 100%; height: auto; border-radius: 4px;">
          </div>
          ` : ''}
          
          <p style="color: #666; font-size: 14px; line-height: 1.8; margin-top: 20px;">
            If you have any questions about this expense or need additional information, please don't hesitate to contact us.
          </p>
        </div>
        <div class="footer">
          <div class="footer-title">Sri Sithhi Vinayagar Tempel Kultur Verein e.V</div>
          <div class="footer-text">Humboldt Str. 103, 90459 Nürnberg</div>
          <div class="footer-text">Tel. No. 0911 43958088</div>
          <div style="margin-top: 10px; font-size: 11px; color: #999;">
            <p style="margin: 5px 0;">This is an automated email. Please do not reply to this message.</p>
            <p style="margin: 5px 0;">&copy; ${new Date().getFullYear()} Sri Sithhi Vinayagar Tempel Kultur Verein e.V. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  logger.info('[EXPENSE-EMAIL] ✓ HTML email content generated');

  // Step 5: Initialize email transporter
  logger.info('[EXPENSE-EMAIL] Step 5: Initializing email transporter');
  const emailTransporter = initializeTransporter();
  logger.info('[EXPENSE-EMAIL] ✓ Transporter initialized');

  // Step 6: Prepare email options
  logger.info('[EXPENSE-EMAIL] Step 6: Preparing email options');
  const fromEmail = process.env.SMTP_FROM_EMAIL || 'noreply@temple.com';
  const fromName = process.env.SMTP_FROM_NAME || 'Sri Sithhi Vinayagar Temple';

  const mailOptions = {
    from: `${fromName} <${fromEmail}>`,
    to: recipientEmail,
    subject: `Expense Details - ${category}`,
    html: htmlContent,
  };

  logger.info('[EXPENSE-EMAIL]   - From: ' + fromName + ' <' + fromEmail + '>');
  logger.info('[EXPENSE-EMAIL]   - To: ' + recipientEmail);
  logger.info('[EXPENSE-EMAIL]   - Subject: ' + mailOptions.subject);

  // Step 7: Send email
  logger.info('[EXPENSE-EMAIL] Step 7: Sending email via Nodemailer');
  const info = await emailTransporter.sendMail(mailOptions);

  logger.info('[EXPENSE-EMAIL] ========================================');
  logger.info('[EXPENSE-EMAIL] ✓ EXPENSE EMAIL SENT SUCCESSFULLY');
  logger.info('[EXPENSE-EMAIL] ========================================');
  logger.info(`[EXPENSE-EMAIL] Message ID: ${info.messageId}`);
  logger.info(`[EXPENSE-EMAIL] Response: ${info.response}`);
  logger.info(`[EXPENSE-EMAIL] Accepted: ${info.accepted?.join(', ') || 'N/A'}`);
  logger.info(`[EXPENSE-EMAIL] Recipient: ${recipientEmail}`);
  logger.info(`[EXPENSE-EMAIL] Expense ID: ${expenseId}`);
  logger.info(`[EXPENSE-EMAIL] Category: ${category}`);
  logger.info(`[EXPENSE-EMAIL] Amount: ${formattedAmount}`);

  res.json({
    success: true,
    message: 'Email sent successfully',
    messageId: info.messageId,
  });
});

export default router;