import 'dotenv/config';
import nodemailer from 'nodemailer';
import logger from './logger.js';

/**
 * Email Service - Handles all email sending operations
 * Uses Nodemailer with SMTP configuration from .env
 */

let transporter = null;

/**
 * Initialize Nodemailer transporter with SMTP
 * @returns {Object} Nodemailer transporter instance
 */
const initializeTransporter = () => {
  if (transporter) {
    logger.info('[EMAIL-SERVICE] Using cached transporter instance');
    return transporter;
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  logger.info('[EMAIL-SERVICE] Initializing Nodemailer transporter');
  logger.info(`[EMAIL-SERVICE] SMTP Host: ${smtpHost}`);
  logger.info(`[EMAIL-SERVICE] SMTP Port: ${smtpPort}`);
  logger.info(`[EMAIL-SERVICE] SMTP User: ${smtpUser}`);

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    const missingVars = [];
    if (!smtpHost) missingVars.push('SMTP_HOST');
    if (!smtpPort) missingVars.push('SMTP_PORT');
    if (!smtpUser) missingVars.push('SMTP_USER');
    if (!smtpPass) missingVars.push('SMTP_PASS');
    logger.error(`[EMAIL-SERVICE] Missing SMTP configuration: ${missingVars.join(', ')}`);
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

    logger.info('[EMAIL-SERVICE] ✓ Nodemailer transporter initialized successfully');
    return transporter;
  } catch (error) {
    logger.error(`[EMAIL-SERVICE] ✗ Failed to initialize transporter: ${error.message}`);
    logger.error(`[EMAIL-SERVICE] Error stack: ${error.stack}`);
    throw new Error(`Failed to initialize email transporter: ${error.message}`, { cause: error });
  }
};

/**
 * Send welcome email with login credentials to new user
 * @param {Object} params - Email parameters
 * @param {string} params.email - User's email address
 * @param {string} params.fullName - User's full name
 * @param {string} params.password - Auto-generated password
 * @param {string} params.subscriptionType - Type of subscription (e.g., 'Monthly', 'Yearly')
 * @param {string} params.transactionId - Transaction ID
 * @param {number} params.amount - Subscription amount
 * @param {string} params.approvalDate - Date of approval (YYYY-MM-DD)
 * @param {string} params.subscriptionStartDate - Subscription start date (YYYY-MM-DD)
 * @param {string} params.loginUrl - URL to login page
 * @returns {Promise<boolean>} True if email sent successfully, false otherwise
 */
export const sendWelcomeEmailWithCredentials = async (params) => {
  logger.info('[EMAIL-SERVICE] ========================================');
  logger.info('[EMAIL-SERVICE] sendWelcomeEmailWithCredentials() CALLED');
  logger.info('[EMAIL-SERVICE] ========================================');

  const {
    email,
    fullName,
    password,
    subscriptionType,
    transactionId,
    amount,
    approvalDate,
    subscriptionStartDate,
    loginUrl,
  } = params;

  logger.info('[EMAIL-SERVICE] Parameters received:');
  logger.info(`[EMAIL-SERVICE]   - email: ${email}`);
  logger.info(`[EMAIL-SERVICE]   - fullName: ${fullName}`);
  logger.info(`[EMAIL-SERVICE]   - subscriptionType: ${subscriptionType}`);
  logger.info(`[EMAIL-SERVICE]   - transactionId: ${transactionId}`);
  logger.info(`[EMAIL-SERVICE]   - amount: €${amount}`);
  logger.info(`[EMAIL-SERVICE]   - approvalDate: ${approvalDate}`);
  logger.info(`[EMAIL-SERVICE]   - subscriptionStartDate: ${subscriptionStartDate}`);
  logger.info(`[EMAIL-SERVICE]   - loginUrl: ${loginUrl}`);

  // Validate inputs
  logger.info('[EMAIL-SERVICE] Step 1: Validating input parameters');

  if (!email || typeof email !== 'string') {
    logger.error('[EMAIL-SERVICE] ✗ VALIDATION FAILED: Invalid email');
    logger.error(`[EMAIL-SERVICE]   - Received: ${JSON.stringify(email)}`);
    return false;
  }
  logger.info('[EMAIL-SERVICE] ✓ email validated');

  if (!fullName || typeof fullName !== 'string') {
    logger.error('[EMAIL-SERVICE] ✗ VALIDATION FAILED: Invalid fullName');
    logger.error(`[EMAIL-SERVICE]   - Received: ${JSON.stringify(fullName)}`);
    return false;
  }
  logger.info('[EMAIL-SERVICE] ✓ fullName validated');

  if (!password || typeof password !== 'string') {
    logger.error('[EMAIL-SERVICE] ✗ VALIDATION FAILED: Invalid password');
    logger.error(`[EMAIL-SERVICE]   - Received: ${JSON.stringify(password)}`);
    return false;
  }
  logger.info('[EMAIL-SERVICE] ✓ password validated');

  logger.info('[EMAIL-SERVICE] ✓ All input parameters validated successfully');

  try {
    logger.info('[EMAIL-SERVICE] Step 2: Initializing email transporter');
    const emailTransporter = initializeTransporter();
    logger.info('[EMAIL-SERVICE] ✓ Transporter initialized');

    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@temple.com';
    const fromName = process.env.SMTP_FROM_NAME || 'Sri Sithhi Vinayagar Temple';

    logger.info('[EMAIL-SERVICE] Step 3: Preparing email content');
    logger.info(`[EMAIL-SERVICE]   - From: ${fromName} <${fromEmail}>`);
    logger.info(`[EMAIL-SERVICE]   - To: ${email}`);

    const formattedAmount = `€${parseFloat(amount || 0).toFixed(2)}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Sri Sithhi Vinayagar Temple - Your Account is Ready!</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
          }

          .email-container {
            max-width: 700px;
            margin: 0 auto;
            background-color: #ffffff;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            border-radius: 8px;
            overflow: hidden;
          }

          .email-header {
            background: linear-gradient(135deg, #8B0000 0%, #A52A2A 100%);
            color: #ffffff;
            padding: 40px 30px;
            text-align: center;
          }

          .email-header h1 {
            font-size: 32px;
            margin-bottom: 10px;
            font-weight: 700;
            letter-spacing: 0.5px;
          }

          .email-header p {
            font-size: 14px;
            opacity: 0.95;
            font-weight: 300;
          }

          .email-content {
            padding: 40px 30px;
          }

          .greeting h2 {
            color: #8B0000;
            font-size: 20px;
            margin-bottom: 10px;
            font-weight: 600;
          }

          .greeting p {
            color: #555;
            font-size: 15px;
            line-height: 1.8;
            margin-bottom: 20px;
          }

          .section-title {
            color: #8B0000;
            font-size: 16px;
            font-weight: 600;
            margin-top: 25px;
            margin-bottom: 15px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 2px solid #8B0000;
            padding-bottom: 10px;
          }

          .credentials-box {
            background-color: #f8f9fa;
            border-left: 4px solid #8B0000;
            padding: 20px;
            margin: 20px 0;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
          }

          .credential-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #e0e0e0;
            font-size: 14px;
          }

          .credential-row:last-child {
            border-bottom: none;
          }

          .credential-label {
            color: #666;
            font-weight: 600;
            font-family: 'Segoe UI', sans-serif;
          }

          .credential-value {
            color: #333;
            font-weight: 700;
            word-break: break-all;
          }

          .login-button {
            display: inline-block;
            background: linear-gradient(135deg, #8B0000 0%, #A52A2A 100%);
            color: #ffffff;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 4px;
            font-weight: 600;
            margin: 20px 0;
            text-align: center;
          }

          .receipt-box {
            background-color: #f8f9fa;
            border-left: 4px solid #8B0000;
            padding: 20px;
            margin: 20px 0;
            border-radius: 4px;
          }

          .receipt-box h3 {
            color: #8B0000;
            font-size: 14px;
            margin-bottom: 15px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .receipt-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e0e0e0;
            font-size: 13px;
          }

          .receipt-row:last-child {
            border-bottom: none;
          }

          .receipt-label {
            color: #666;
            font-weight: 500;
          }

          .receipt-value {
            color: #333;
            font-weight: 600;
            text-align: right;
          }

          .instructions-list {
            margin: 15px 0;
            padding-left: 20px;
          }

          .instructions-list li {
            margin: 10px 0;
            color: #555;
            font-size: 14px;
            line-height: 1.6;
          }

          .instructions-list strong {
            color: #8B0000;
          }

          .support-box {
            background-color: #f0f8ff;
            border-left: 4px solid #8B0000;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }

          .support-box h4 {
            color: #8B0000;
            font-size: 14px;
            margin-bottom: 10px;
            font-weight: 600;
          }

          .support-box p {
            color: #555;
            font-size: 13px;
            line-height: 1.6;
            margin: 5px 0;
          }

          .email-footer {
            background-color: #f8f9fa;
            padding: 30px;
            border-top: 1px solid #e0e0e0;
            text-align: center;
          }

          .footer-content {
            margin-bottom: 20px;
          }

          .footer-title {
            color: #8B0000;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .footer-text {
            color: #666;
            font-size: 13px;
            line-height: 1.8;
            margin: 5px 0;
          }

          .footer-disclaimer {
            color: #999;
            font-size: 11px;
            margin-top: 15px;
            line-height: 1.6;
          }

          .amount-highlight {
            color: #8B0000;
            font-weight: 700;
            font-size: 16px;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="email-header">
            <h1>Welcome to Sri Sithhi Vinayagar Temple!</h1>
            <p>Your Premium Subscription is Approved</p>
          </div>

          <div class="email-content">
            <div class="greeting">
              <h2>Hello ${fullName}!</h2>
              <p>Congratulations! Your premium subscription has been approved and your account is now active. We are delighted to welcome you to our temple community. Below you'll find your login credentials and subscription details.</p>
            </div>

            <h3 class="section-title">Your Subscription is Approved! ✓</h3>
            <p style="color: #555; font-size: 14px; line-height: 1.8; margin: 15px 0;">
              Your premium membership is now active and ready to use. You can access your account immediately using the credentials below.
            </p>

            <h3 class="section-title">Login Credentials</h3>
            <div class="credentials-box">
              <div class="credential-row">
                <span class="credential-label">Email:</span>
                <span class="credential-value">${email}</span>
              </div>
              <div class="credential-row">
                <span class="credential-label">Password:</span>
                <span class="credential-value">${password}</span>
              </div>
              <div class="credential-row">
                <span class="credential-label">Login URL:</span>
                <span class="credential-value" style="font-size: 12px;">${loginUrl}</span>
              </div>
            </div>

            <div style="text-align: center;">
              <a href="${loginUrl}" class="login-button">Login to Your Account</a>
            </div>

            <h3 class="section-title">Subscription Receipt</h3>
            <div class="receipt-box">
              <h3 style="color: #8B0000; margin-top: 0; font-size: 14px; margin-bottom: 15px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Subscription Details</h3>
              <div class="receipt-row">
                <span class="receipt-label">Full Name</span>
                <span class="receipt-value">${fullName}</span>
              </div>
              <div class="receipt-row">
                <span class="receipt-label">Email</span>
                <span class="receipt-value">${email}</span>
              </div>
              <div class="receipt-row">
                <span class="receipt-label">Subscription Type</span>
                <span class="receipt-value">${subscriptionType}</span>
              </div>
              <div class="receipt-row">
                <span class="receipt-label">Transaction ID</span>
                <span class="receipt-value">${transactionId}</span>
              </div>
              <div class="receipt-row">
                <span class="receipt-label">Amount</span>
                <span class="receipt-value amount-highlight">${formattedAmount}</span>
              </div>
              <div class="receipt-row">
                <span class="receipt-label">Approval Date</span>
                <span class="receipt-value">${approvalDate}</span>
              </div>
              <div class="receipt-row">
                <span class="receipt-label">Subscription Start Date</span>
                <span class="receipt-value">${subscriptionStartDate}</span>
              </div>
            </div>

            <h3 class="section-title">Login Instructions</h3>
            <p style="color: #555; font-size: 14px; line-height: 1.8; margin: 15px 0;">
              To access your account, visit the login page using the link above and enter your email address and password. Once logged in, you'll have full access to all premium features and benefits of your membership. We recommend changing your password after your first login for security purposes.
            </p>

            <div class="support-box">
              <h4>Need Help?</h4>
              <p><strong>Email:</strong> support@srisiththivinayagar.com</p>
              <p><strong>Phone:</strong> +49 911 43958088</p>
              <p><strong>Hours:</strong> Monday - Friday, 9:00 AM - 5:00 PM (CET)</p>
              <p style="margin-top: 10px; font-size: 12px; color: #888;">Our support team is here to help you with any questions or issues you may encounter.</p>
            </div>

            <p style="color: #666; font-size: 14px; line-height: 1.8; margin-top: 20px;">
              Thank you for choosing Sri Sithhi Vinayagar Temple. We look forward to serving you with devotion and compassion. If you have any questions or need assistance, please don't hesitate to contact our support team.
            </p>
          </div>

          <div class="email-footer">
            <div class="footer-content">
              <div class="footer-title">Sri Sithhi Vinayagar Tempel Kultur Verein e.V</div>
              <div class="footer-text">Humboldt Str. 103, 90459 Nürnberg</div>
              <div class="footer-text">Tel. No. 0911 43958088</div>
            </div>

            <div class="footer-disclaimer">
              <p style="margin: 10px 0 0 0;">This is an automated welcome email. Please do not reply to this message.</p>
              <p style="margin: 5px 0 0 0;">&copy; ${new Date().getFullYear()} Sri Sithhi Vinayagar Tempel Kultur Verein e.V. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `${fromName} <${fromEmail}>`,
      to: email,
      subject: `Welcome to Sri Sithhi Vinayagar Temple - Your Account is Ready!`,
      html: htmlContent,
    };

    logger.info('[EMAIL-SERVICE] Step 4: Sending email via Nodemailer');
    logger.info(`[EMAIL-SERVICE]   - Subject: ${mailOptions.subject}`);
    logger.info(`[EMAIL-SERVICE]   - Recipient: ${email}`);

    const info = await emailTransporter.sendMail(mailOptions);

    logger.info('[EMAIL-SERVICE] ========================================');
    logger.info('[EMAIL-SERVICE] ✓ WELCOME EMAIL SENT SUCCESSFULLY');
    logger.info('[EMAIL-SERVICE] ========================================');
    logger.info(`[EMAIL-SERVICE] Message ID: ${info.messageId}`);
    logger.info(`[EMAIL-SERVICE] Response: ${info.response}`);
    logger.info(`[EMAIL-SERVICE] Accepted: ${info.accepted?.join(', ') || 'N/A'}`);
    logger.info(`[EMAIL-SERVICE] Recipient: ${email}`);

    return true;
  } catch (error) {
    logger.error('[EMAIL-SERVICE] ========================================');
    logger.error('[EMAIL-SERVICE] ✗ WELCOME EMAIL SENDING FAILED');
    logger.error('[EMAIL-SERVICE] ========================================');
    logger.error(`[EMAIL-SERVICE] Error message: ${error.message}`);
    logger.error(`[EMAIL-SERVICE] Error name: ${error.name}`);
    logger.error(`[EMAIL-SERVICE] Error code: ${error.code || 'N/A'}`);
    logger.error(`[EMAIL-SERVICE] Error stack: ${error.stack}`);
    logger.error(`[EMAIL-SERVICE] Recipient: ${email}`);

    return false;
  }
};

/**
 * Send donation report/confirmation email
 * @param {string} email - Recipient email address
 * @param {string} donorName - Name of the donor
 * @param {number} amount - Donation amount
 * @param {string} donationDate - Date of donation (YYYY-MM-DD format)
 * @param {string} transactionId - Transaction ID
 * @param {string} message - Custom thank you message
 * @returns {Promise<boolean>} True if email sent successfully, false otherwise
 */
export const sendDonationReportEmail = async (email, donorName, amount, donationDate, transactionId, message) => {
  logger.info('[EMAIL-SERVICE] ========================================');
  logger.info('[EMAIL-SERVICE] sendDonationReportEmail() CALLED');
  logger.info('[EMAIL-SERVICE] ========================================');

  // Validate inputs
  logger.info('[EMAIL-SERVICE] Step 1: Validating input parameters');

  if (!email || typeof email !== 'string') {
    logger.error('[EMAIL-SERVICE] ✗ VALIDATION FAILED: Invalid email');
    logger.error(`[EMAIL-SERVICE]   - Received: ${JSON.stringify(email)}`);
    return false;
  }
  logger.info(`[EMAIL-SERVICE] ✓ email validated: ${email}`);

  if (!donorName || typeof donorName !== 'string') {
    logger.error('[EMAIL-SERVICE] ✗ VALIDATION FAILED: Invalid donorName');
    return false;
  }
  logger.info(`[EMAIL-SERVICE] ✓ donorName validated: ${donorName}`);

  if (typeof amount !== 'number' || amount <= 0) {
    logger.error('[EMAIL-SERVICE] ✗ VALIDATION FAILED: Invalid amount');
    return false;
  }
  logger.info(`[EMAIL-SERVICE] ✓ amount validated: €${amount}`);

  if (!donationDate || typeof donationDate !== 'string') {
    logger.error('[EMAIL-SERVICE] ✗ VALIDATION FAILED: Invalid donationDate');
    return false;
  }
  logger.info(`[EMAIL-SERVICE] ✓ donationDate validated: ${donationDate}`);

  if (!transactionId || typeof transactionId !== 'string') {
    logger.error('[EMAIL-SERVICE] ✗ VALIDATION FAILED: Invalid transactionId');
    return false;
  }
  logger.info(`[EMAIL-SERVICE] ✓ transactionId validated: ${transactionId}`);

  logger.info('[EMAIL-SERVICE] ✓ All input parameters validated successfully');

  try {
    logger.info('[EMAIL-SERVICE] Step 2: Initializing email transporter');
    const emailTransporter = initializeTransporter();
    logger.info('[EMAIL-SERVICE] ✓ Transporter initialized');

    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@temple.com';
    const fromName = process.env.SMTP_FROM_NAME || 'Sri Sithhi Vinayagar Temple';

    logger.info('[EMAIL-SERVICE] Step 3: Preparing email content');
    logger.info(`[EMAIL-SERVICE]   - From: ${fromName} <${fromEmail}>`);
    logger.info(`[EMAIL-SERVICE]   - To: ${email}`);

    const formattedAmount = `€${parseFloat(amount).toFixed(2)}`;
    const formattedDate = new Date(donationDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Donation Confirmation</title>
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
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 20px; }
          .footer-title { color: #8B0000; font-weight: 600; margin-bottom: 5px; }
          .footer-text { margin: 3px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Thank You for Your Donation!</h1>
            <p>Your generous contribution has been received</p>
          </div>
          <div class="content">
            <div class="greeting">
              <h2>Dear ${donorName},</h2>
              <p>We are deeply grateful for your generous donation to our temple. Your contribution will help us continue our sacred mission and serve our community with devotion and compassion.</p>
            </div>
            
            <div class="summary-box">
              <h3>Donation Details</h3>
              <div class="summary-row">
                <span class="summary-label">Donor Name</span>
                <span class="summary-value">${donorName}</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">Donation Date</span>
                <span class="summary-value">${formattedDate}</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">Transaction ID</span>
                <span class="summary-value">${transactionId}</span>
              </div>
            </div>
            
            <div class="amount-section">
              <div class="amount-label">Donation Amount</div>
              <div class="amount-value">${formattedAmount}</div>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.8; margin-top: 20px;">
              ${message || 'Your donation has been recorded and verified. A detailed receipt is attached to this email for your records.'}
            </p>
            
            <p style="color: #666; font-size: 14px; line-height: 1.8; margin-top: 15px;">
              If you have any questions about your donation or would like to make an additional contribution, please don't hesitate to contact us. We are always here to help and deeply appreciate your continued support.
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

    const mailOptions = {
      from: `${fromName} <${fromEmail}>`,
      to: email,
      subject: `Donation Confirmation - Thank You!`,
      html: htmlContent,
    };

    logger.info('[EMAIL-SERVICE] Step 4: Sending email via Nodemailer');
    logger.info(`[EMAIL-SERVICE]   - Subject: ${mailOptions.subject}`);
    logger.info(`[EMAIL-SERVICE]   - Recipient: ${email}`);

    const info = await emailTransporter.sendMail(mailOptions);

    logger.info('[EMAIL-SERVICE] ========================================');
    logger.info('[EMAIL-SERVICE] ✓ DONATION REPORT EMAIL SENT SUCCESSFULLY');
    logger.info('[EMAIL-SERVICE] ========================================');
    logger.info(`[EMAIL-SERVICE] Message ID: ${info.messageId}`);
    logger.info(`[EMAIL-SERVICE] Response: ${info.response}`);
    logger.info(`[EMAIL-SERVICE] Recipient: ${email}`);
    logger.info(`[EMAIL-SERVICE] Donor: ${donorName}`);
    logger.info(`[EMAIL-SERVICE] Amount: €${amount}`);

    return true;
  } catch (error) {
    logger.error('[EMAIL-SERVICE] ========================================');
    logger.error('[EMAIL-SERVICE] ✗ DONATION REPORT EMAIL SENDING FAILED');
    logger.error('[EMAIL-SERVICE] ========================================');
    logger.error(`[EMAIL-SERVICE] Error message: ${error.message}`);
    logger.error(`[EMAIL-SERVICE] Error name: ${error.name}`);
    logger.error(`[EMAIL-SERVICE] Error code: ${error.code || 'N/A'}`);
    logger.error(`[EMAIL-SERVICE] Error stack: ${error.stack}`);
    logger.error(`[EMAIL-SERVICE] Recipient: ${email}`);

    return false;
  }
};

/**
 * Send test email for SMTP configuration testing
 * @param {string} email - Recipient email address
 * @param {string} subject - Email subject (optional)
 * @param {string} message - Email message (optional)
 * @returns {Promise<boolean>} True if email sent successfully, false otherwise
 */
export const sendTestEmail = async (email, subject = 'Test Email', message = 'This is a test email to verify SMTP configuration.') => {
  logger.info('[EMAIL-SERVICE] ========================================');
  logger.info('[EMAIL-SERVICE] sendTestEmail() CALLED');
  logger.info('[EMAIL-SERVICE] ========================================');

  // Validate inputs
  logger.info('[EMAIL-SERVICE] Step 1: Validating input parameters');

  if (!email || typeof email !== 'string') {
    logger.error('[EMAIL-SERVICE] ✗ VALIDATION FAILED: Invalid email');
    logger.error(`[EMAIL-SERVICE]   - Received: ${JSON.stringify(email)}`);
    return false;
  }
  logger.info(`[EMAIL-SERVICE] ✓ email validated: ${email}`);

  if (!subject || typeof subject !== 'string') {
    logger.warn('[EMAIL-SERVICE] ⚠ WARNING: Invalid subject, using default');
    subject = 'Test Email';
  }
  logger.info(`[EMAIL-SERVICE] ✓ subject validated: ${subject}`);

  if (!message || typeof message !== 'string') {
    logger.warn('[EMAIL-SERVICE] ⚠ WARNING: Invalid message, using default');
    message = 'This is a test email to verify SMTP configuration.';
  }
  logger.info(`[EMAIL-SERVICE] ✓ message validated`);

  logger.info('[EMAIL-SERVICE] ✓ All input parameters validated successfully');

  try {
    logger.info('[EMAIL-SERVICE] Step 2: Initializing email transporter');
    const emailTransporter = initializeTransporter();
    logger.info('[EMAIL-SERVICE] ✓ Transporter initialized');

    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@temple.com';
    const fromName = process.env.SMTP_FROM_NAME || 'Sri Sithhi Vinayagar Temple';

    logger.info('[EMAIL-SERVICE] Step 3: Preparing test email content');
    logger.info(`[EMAIL-SERVICE]   - From: ${fromName} <${fromEmail}>`);
    logger.info(`[EMAIL-SERVICE]   - To: ${email}`);
    logger.info(`[EMAIL-SERVICE]   - Subject: ${subject}`);

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #8B0000 0%, #A52A2A 100%); color: #ffffff; padding: 30px; text-align: center; border-radius: 4px; margin-bottom: 30px; }
          .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
          .content { margin: 20px 0; }
          .content p { color: #555; font-size: 15px; line-height: 1.8; }
          .success-box { background-color: #d4edda; border-left: 4px solid #28a745; padding: 20px; margin: 20px 0; border-radius: 4px; }
          .success-box h3 { color: #155724; margin-top: 0; margin-bottom: 10px; font-weight: 600; }
          .success-box p { color: #155724; margin: 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 20px; }
          .footer-title { color: #8B0000; font-weight: 600; margin-bottom: 5px; }
          .footer-text { margin: 3px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✓ Test Email Successful</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>${message}</p>
            
            <div class="success-box">
              <h3>✓ SMTP Configuration is Working</h3>
              <p>Your email system is properly configured and operational. This test email was sent successfully.</p>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.8; margin-top: 20px;">
              If you received this email, your SMTP configuration is working correctly. You can now proceed with sending emails through your application.
            </p>
          </div>
          <div class="footer">
            <div class="footer-title">Sri Sithhi Vinayagar Tempel Kultur Verein e.V</div>
            <div class="footer-text">Humboldt Str. 103, 90459 Nürnberg</div>
            <div class="footer-text">Tel. No. 0911 43958088</div>
            <div style="margin-top: 10px; font-size: 11px; color: #999;">
              <p style="margin: 5px 0;">&copy; ${new Date().getFullYear()} Sri Sithhi Vinayagar Tempel Kultur Verein e.V. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `${fromName} <${fromEmail}>`,
      to: email,
      subject: subject,
      html: htmlContent,
    };

    logger.info('[EMAIL-SERVICE] Step 4: Sending test email via Nodemailer');
    const info = await emailTransporter.sendMail(mailOptions);

    logger.info('[EMAIL-SERVICE] ========================================');
    logger.info('[EMAIL-SERVICE] ✓ TEST EMAIL SENT SUCCESSFULLY');
    logger.info('[EMAIL-SERVICE] ========================================');
    logger.info(`[EMAIL-SERVICE] Message ID: ${info.messageId}`);
    logger.info(`[EMAIL-SERVICE] Response: ${info.response}`);
    logger.info(`[EMAIL-SERVICE] Recipient: ${email}`);
    logger.info('[EMAIL-SERVICE] SMTP Configuration Status: ✓ WORKING');

    return true;
  } catch (error) {
    logger.error('[EMAIL-SERVICE] ========================================');
    logger.error('[EMAIL-SERVICE] ✗ TEST EMAIL SENDING FAILED');
    logger.error('[EMAIL-SERVICE] ========================================');
    logger.error(`[EMAIL-SERVICE] Error message: ${error.message}`);
    logger.error(`[EMAIL-SERVICE] Error name: ${error.name}`);
    logger.error(`[EMAIL-SERVICE] Error code: ${error.code || 'N/A'}`);
    logger.error(`[EMAIL-SERVICE] Error stack: ${error.stack}`);
    logger.error(`[EMAIL-SERVICE] Recipient: ${email}`);
    logger.error('[EMAIL-SERVICE] SMTP Configuration Status: ✗ FAILED');

    return false;
  }
};

export default {
  sendWelcomeEmailWithCredentials,
  sendDonationReportEmail,
  sendTestEmail,
};