import 'dotenv/config';
import nodemailer from 'nodemailer';
import logger from './logger.js';

/**
 * Payment Received Email Service - Handles sending payment received confirmation emails
 * Uses Nodemailer with SMTP configuration
 */

let transporter = null;

/**
 * Initialize Nodemailer transporter with SMTP
 * @returns {Object} Nodemailer transporter instance
 */
const initializeTransporter = () => {
  if (transporter) {
    logger.info('[PAYMENT-EMAIL-SERVICE] Using cached transporter instance');
    return transporter;
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  logger.info('[PAYMENT-EMAIL-SERVICE] Initializing Nodemailer transporter');
  logger.info(`[PAYMENT-EMAIL-SERVICE] SMTP Host: ${smtpHost}`);
  logger.info(`[PAYMENT-EMAIL-SERVICE] SMTP Port: ${smtpPort}`);
  logger.info(`[PAYMENT-EMAIL-SERVICE] SMTP User: ${smtpUser}`);

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    const missingVars = [];
    if (!smtpHost) missingVars.push('SMTP_HOST');
    if (!smtpPort) missingVars.push('SMTP_PORT');
    if (!smtpUser) missingVars.push('SMTP_USER');
    if (!smtpPass) missingVars.push('SMTP_PASS');
    logger.error(`[PAYMENT-EMAIL-SERVICE] Missing SMTP configuration: ${missingVars.join(', ')}`);
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

    logger.info('[PAYMENT-EMAIL-SERVICE] ✓ Nodemailer transporter initialized successfully');
    return transporter;
  } catch (error) {
    logger.error(`[PAYMENT-EMAIL-SERVICE] ✗ Failed to initialize transporter: ${error.message}`);
    logger.error(`[PAYMENT-EMAIL-SERVICE] Error stack: ${error.stack}`);
    throw new Error(`Failed to initialize email transporter: ${error.message}`, { cause: error });
  }
};

/**
 * Send donation payment received email with PDF attachment
 * @param {Object} donationData - Donation details
 * @param {string} donationData.donorName - Donor's name
 * @param {string} donationData.donorEmail - Donor's email
 * @param {number} donationData.amount - Donation amount
 * @param {string} donationData.category - Donation category
 * @param {string} donationData.donationId - Donation ID
 * @param {string} donationData.createdAt - Date donation was created
 * @param {Buffer} pdfBuffer - PDF receipt buffer (optional)
 * @returns {Promise<Object>} Result with success status
 */
export const sendDonationPaymentReceivedEmail = async (donationData, pdfBuffer) => {
  logger.info('[PAYMENT-EMAIL-SERVICE] ========================================');
  logger.info('[PAYMENT-EMAIL-SERVICE] sendDonationPaymentReceivedEmail() CALLED');
  logger.info('[PAYMENT-EMAIL-SERVICE] ========================================');

  if (!donationData || typeof donationData !== 'object') {
    logger.error('[PAYMENT-EMAIL-SERVICE] ✗ VALIDATION FAILED: Invalid donation data');
    throw new Error('Invalid donation data');
  }

  const { donorEmail, donorName, amount, category, donationId, createdAt } = donationData;

  if (!donorEmail || typeof donorEmail !== 'string') {
    logger.error('[PAYMENT-EMAIL-SERVICE] ✗ VALIDATION FAILED: Invalid donor email');
    throw new Error('Invalid donor email address');
  }

  if (!donorName || typeof donorName !== 'string') {
    logger.error('[PAYMENT-EMAIL-SERVICE] ✗ VALIDATION FAILED: Invalid donor name');
    throw new Error('Invalid donor name');
  }

  if (typeof amount !== 'number' || amount <= 0) {
    logger.error('[PAYMENT-EMAIL-SERVICE] ✗ VALIDATION FAILED: Invalid amount');
    throw new Error('Invalid donation amount');
  }

  if (pdfBuffer && !Buffer.isBuffer(pdfBuffer)) {
    logger.error('[PAYMENT-EMAIL-SERVICE] ✗ VALIDATION FAILED: pdfBuffer is not a Buffer object');
    logger.error(`[PAYMENT-EMAIL-SERVICE]   - Type: ${typeof pdfBuffer}`);
    logger.error(`[PAYMENT-EMAIL-SERVICE]   - Is Buffer: ${Buffer.isBuffer(pdfBuffer)}`);
    throw new Error('Invalid PDF buffer - must be a Buffer object');
  }

  logger.info('[PAYMENT-EMAIL-SERVICE] Parameters received:');
  logger.info(`[PAYMENT-EMAIL-SERVICE]   - donorEmail: ${donorEmail}`);
  logger.info(`[PAYMENT-EMAIL-SERVICE]   - donorName: ${donorName}`);
  logger.info(`[PAYMENT-EMAIL-SERVICE]   - amount: €${amount}`);
  logger.info(`[PAYMENT-EMAIL-SERVICE]   - category: ${category}`);
  logger.info(`[PAYMENT-EMAIL-SERVICE]   - pdfBuffer: ${pdfBuffer ? `${pdfBuffer.length} bytes` : 'null'}`);

  try {
    const transporter = initializeTransporter();
    const fromEmail = process.env.SMTP_FROM_EMAIL || 'noreply@temple.com';
    const fromName = process.env.SMTP_FROM_NAME || 'Sri Sithhi Vinayagar Temple';

    const formattedAmount = `€${parseFloat(amount).toFixed(2)}`;
    const donationDate = new Date(createdAt || new Date()).toLocaleDateString('en-US', {
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
        <title>Your Donation Has Been Received! ✓</title>
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
          .section-title { color: #8B0000; font-size: 16px; font-weight: 600; margin-top: 25px; margin-bottom: 12px; }
          .bullet-list { margin: 10px 0; padding-left: 20px; }
          .bullet-list li { margin: 8px 0; color: #555; font-size: 14px; line-height: 1.6; }
          .spiritual-message { background-color: #f0f8ff; border-left: 4px solid #8B0000; padding: 15px; margin: 20px 0; border-radius: 4px; font-style: italic; color: #555; text-align: center; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 20px; }
          .footer-title { color: #8B0000; font-weight: 600; margin-bottom: 5px; }
          .footer-text { margin: 3px 0; }
          .footer-contact { font-size: 11px; color: #888; margin-top: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✓ Your Donation Has Been Received!</h1>
            <p>Thank you for your generous contribution</p>
          </div>
          <div class="content">
            <div class="greeting">
              <h2>Dear ${donorName},</h2>
              <p>We are delighted to confirm that we have received your generous donation. Your contribution is a blessing to our temple community and will make a meaningful impact on our sacred mission.</p>
            </div>
            
            <div class="summary-box">
              <h3>Donation Summary</h3>
              <div class="summary-row">
                <span class="summary-label">Reference ID</span>
                <span class="summary-value">${donationId}</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">Donor Name</span>
                <span class="summary-value">${donorName}</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">Email</span>
                <span class="summary-value">${donorEmail}</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">Category</span>
                <span class="summary-value">${category || 'General Fund'}</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">Date Received</span>
                <span class="summary-value">${donationDate}</span>
              </div>
            </div>
            
            <div class="amount-section">
              <div class="amount-label">Donation Amount</div>
              <div class="amount-value">${formattedAmount}</div>
            </div>
            
            <h3 class="section-title">How Your Donation Will Be Used</h3>
            <ul class="bullet-list">
              <li><strong>Spiritual Services:</strong> Supporting daily pujas, rituals, and sacred ceremonies that nourish our community's spiritual life</li>
              <li><strong>Temple Maintenance:</strong> Preserving and maintaining our sacred temple infrastructure for future generations</li>
              <li><strong>Community Programs:</strong> Funding educational and cultural programs that strengthen our community bonds</li>
              <li><strong>Charitable Outreach:</strong> Supporting those in need through our temple's charitable initiatives</li>
              <li><strong>Spiritual Education:</strong> Promoting Vedic knowledge and spiritual wisdom through our educational programs</li>
            </ul>
            
            <h3 class="section-title">What Happens Next?</h3>
            <ul class="bullet-list">
              <li><strong>Payment Recording:</strong> Your donation has been recorded in our system and is being processed</li>
              <li><strong>Admin Review:</strong> Our temple administration will review and approve your donation</li>
              <li><strong>Receipt Delivery:</strong> You will receive a detailed receipt within 24 hours after approval</li>
              <li><strong>Acknowledgment:</strong> Your generous contribution will be acknowledged in our temple records</li>
              <li><strong>Special Prayers:</strong> Special prayers and blessings will be offered for you and your family</li>
            </ul>
            
            <div class="spiritual-message">
              May the divine grace of the Lord bless you and your family with health, happiness, prosperity, and spiritual fulfillment. Your generous contribution brings abundant blessings into your life.
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.8; margin-top: 20px;">
              If you have any questions about your donation or would like to make an additional contribution, please don't hesitate to contact us. We are always here to help and deeply appreciate your continued support.
            </p>
          </div>
          <div class="footer">
            <div class="footer-title">Sri Sithhi Vinayagar Tempel Kultur Verein e.V</div>
            <div class="footer-text">Humboldt Str. 103, 90459 Nürnberg</div>
            <div class="footer-text">Tel. No. 0911 43958088</div>
            <div class="footer-contact">
              <p style="margin: 10px 0 0 0;">This is an automated confirmation email. Please do not reply to this message.</p>
              <p style="margin: 5px 0 0 0;">&copy; ${new Date().getFullYear()} Sri Sithhi Vinayagar Tempel Kultur Verein e.V. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const attachments = [];
    if (pdfBuffer && Buffer.isBuffer(pdfBuffer)) {
      logger.info('[PAYMENT-EMAIL-SERVICE] Step 4: Building attachments array');
      logger.info('[PAYMENT-EMAIL-SERVICE] OK PDF attachment added to email');
      logger.info(`[PAYMENT-EMAIL-SERVICE]   - Filename: Receipt-Donation-${donationId}.pdf`);
      logger.info(`[PAYMENT-EMAIL-SERVICE]   - Size: ${pdfBuffer.length} bytes`);
      logger.info('[PAYMENT-EMAIL-SERVICE]   - Content-Type: application/pdf');
      attachments.push({
        filename: `Receipt-Donation-${donationId}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      });
    }

    const mailOptions = {
      from: `${fromName} <${fromEmail}>`,
      to: donorEmail,
      subject: `Your Donation Has Been Received! ✓`,
      html: htmlContent,
      attachments: attachments,
    };

    logger.info('[PAYMENT-EMAIL-SERVICE] Step 5: Sending email via Nodemailer');
    const info = await transporter.sendMail(mailOptions);

    logger.info('[PAYMENT-EMAIL-SERVICE] ========================================');
    logger.info('[PAYMENT-EMAIL-SERVICE] ✓ DONATION PAYMENT EMAIL SENT SUCCESSFULLY');
    logger.info('[PAYMENT-EMAIL-SERVICE] ========================================');
    logger.info(`[PAYMENT-EMAIL-SERVICE] Message ID: ${info.messageId}`);
    logger.info(`[PAYMENT-EMAIL-SERVICE] Response: ${info.response}`);
    logger.info(`[PAYMENT-EMAIL-SERVICE] Accepted: ${info.accepted?.join(', ') || 'N/A'}`);

    return {
      success: true,
      message: `Payment received email sent to ${donorEmail}`,
      messageId: info.messageId,
    };
  } catch (error) {
    logger.error('[PAYMENT-EMAIL-SERVICE] ========================================');
    logger.error('[PAYMENT-EMAIL-SERVICE] ✗ DONATION PAYMENT EMAIL SENDING FAILED');
    logger.error('[PAYMENT-EMAIL-SERVICE] ========================================');
    logger.error(`[PAYMENT-EMAIL-SERVICE] Error message: ${error.message}`);
    logger.error(`[PAYMENT-EMAIL-SERVICE] Error name: ${error.name}`);
    logger.error(`[PAYMENT-EMAIL-SERVICE] Error code: ${error.code || 'N/A'}`);
    logger.error(`[PAYMENT-EMAIL-SERVICE] Error stack: ${error.stack}`);
    throw new Error(`Failed to send donation payment received email: ${error.message}`, { cause: error });
  }
};

/**
 * Send pooja payment received email with PDF attachment
 * @param {Object} poojaData - Pooja booking details
 * @param {string} poojaData.customerName - Customer's name
 * @param {string} poojaData.customerEmail - Customer's email
 * @param {number} poojaData.amount - Booking amount
 * @param {string} poojaData.poojaType - Type of pooja
 * @param {string} poojaData.bookingId - Booking ID
 * @param {string} poojaData.createdAt - Date booking was created
 * @param {Buffer} pdfBuffer - PDF receipt buffer (optional)
 * @returns {Promise<Object>} Result with success status
 */
export const sendPoojaPaymentReceivedEmail = async (poojaData, pdfBuffer) => {
  logger.info('[PAYMENT-EMAIL-SERVICE] ========================================');
  logger.info('[PAYMENT-EMAIL-SERVICE] sendPoojaPaymentReceivedEmail() CALLED');
  logger.info('[PAYMENT-EMAIL-SERVICE] ========================================');

  if (!poojaData || typeof poojaData !== 'object') {
    logger.error('[PAYMENT-EMAIL-SERVICE] ✗ VALIDATION FAILED: Invalid pooja data');
    throw new Error('Invalid pooja data');
  }

  const { customerEmail, customerName, amount, poojaType, bookingId, createdAt } = poojaData;

  if (!customerEmail || typeof customerEmail !== 'string') {
    logger.error('[PAYMENT-EMAIL-SERVICE] ✗ VALIDATION FAILED: Invalid customer email');
    throw new Error('Invalid customer email address');
  }

  if (!customerName || typeof customerName !== 'string') {
    logger.error('[PAYMENT-EMAIL-SERVICE] ✗ VALIDATION FAILED: Invalid customer name');
    throw new Error('Invalid customer name');
  }

  if (typeof amount !== 'number' || amount <= 0) {
    logger.error('[PAYMENT-EMAIL-SERVICE] ✗ VALIDATION FAILED: Invalid amount');
    throw new Error('Invalid booking amount');
  }

  if (pdfBuffer && !Buffer.isBuffer(pdfBuffer)) {
    logger.error('[PAYMENT-EMAIL-SERVICE] ✗ VALIDATION FAILED: pdfBuffer is not a Buffer object');
    logger.error(`[PAYMENT-EMAIL-SERVICE]   - Type: ${typeof pdfBuffer}`);
    logger.error(`[PAYMENT-EMAIL-SERVICE]   - Is Buffer: ${Buffer.isBuffer(pdfBuffer)}`);
    throw new Error('Invalid PDF buffer - must be a Buffer object');
  }

  logger.info('[PAYMENT-EMAIL-SERVICE] Parameters received:');
  logger.info(`[PAYMENT-EMAIL-SERVICE]   - customerEmail: ${customerEmail}`);
  logger.info(`[PAYMENT-EMAIL-SERVICE]   - customerName: ${customerName}`);
  logger.info(`[PAYMENT-EMAIL-SERVICE]   - amount: €${amount}`);
  logger.info(`[PAYMENT-EMAIL-SERVICE]   - poojaType: ${poojaType}`);
  logger.info(`[PAYMENT-EMAIL-SERVICE]   - pdfBuffer: ${pdfBuffer ? `${pdfBuffer.length} bytes` : 'null'}`);

  try {
    const transporter = initializeTransporter();
    const fromEmail = process.env.SMTP_FROM_EMAIL || 'noreply@temple.com';
    const fromName = process.env.SMTP_FROM_NAME || 'Sri Sithhi Vinayagar Temple';

    const formattedAmount = `€${parseFloat(amount).toFixed(2)}`;
    const bookingDate = new Date(createdAt || new Date()).toLocaleDateString('en-US', {
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
        <title>Your Pooja Booking Has Been Received! ✓</title>
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
          .section-title { color: #8B0000; font-size: 16px; font-weight: 600; margin-top: 25px; margin-bottom: 12px; }
          .bullet-list { margin: 10px 0; padding-left: 20px; }
          .bullet-list li { margin: 8px 0; color: #555; font-size: 14px; line-height: 1.6; }
          .spiritual-message { background-color: #f0f8ff; border-left: 4px solid #8B0000; padding: 15px; margin: 20px 0; border-radius: 4px; font-style: italic; color: #555; text-align: center; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 20px; }
          .footer-title { color: #8B0000; font-weight: 600; margin-bottom: 5px; }
          .footer-text { margin: 3px 0; }
          .footer-contact { font-size: 11px; color: #888; margin-top: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✓ Your Pooja Booking Has Been Received!</h1>
            <p>Thank you for booking a pooja service with us</p>
          </div>
          <div class="content">
            <div class="greeting">
              <h2>Dear ${customerName},</h2>
              <p>We are delighted to confirm that we have received your payment for the pooja booking. Your reservation is being processed and we look forward to serving you with devotion and care.</p>
            </div>
            
            <div class="summary-box">
              <h3>Booking Summary</h3>
              <div class="summary-row">
                <span class="summary-label">Reference ID</span>
                <span class="summary-value">${bookingId}</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">Customer Name</span>
                <span class="summary-value">${customerName}</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">Email</span>
                <span class="summary-value">${customerEmail}</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">Pooja Type</span>
                <span class="summary-value">${poojaType}</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">Date Received</span>
                <span class="summary-value">${bookingDate}</span>
              </div>
            </div>
            
            <div class="amount-section">
              <div class="amount-label">Booking Amount</div>
              <div class="amount-value">${formattedAmount}</div>
            </div>
            
            <h3 class="section-title">About Your Pooja Service</h3>
            <ul class="bullet-list">
              <li><strong>Sacred Ritual:</strong> Your pooja will be performed with utmost devotion and adherence to Vedic traditions</li>
              <li><strong>Spiritual Blessings:</strong> Special prayers and blessings will be offered for you and your family</li>
              <li><strong>Professional Priests:</strong> Experienced and knowledgeable priests will conduct your service</li>
              <li><strong>Customized Service:</strong> Your pooja will be tailored to your specific needs and preferences</li>
              <li><strong>Sacred Atmosphere:</strong> The service will be performed in our sacred temple environment</li>
            </ul>
            
            <h3 class="section-title">What Happens Next?</h3>
            <ul class="bullet-list">
              <li><strong>Payment Recording:</strong> Your payment has been recorded in our system and is being processed</li>
              <li><strong>Admin Review:</strong> Our temple administration will review and confirm your booking</li>
              <li><strong>Receipt Delivery:</strong> You will receive a detailed receipt within 24 hours after confirmation</li>
              <li><strong>Booking Confirmation:</strong> We will contact you to confirm the date and time of your pooja service</li>
              <li><strong>Special Prayers:</strong> Special prayers and blessings will be offered for you and your family</li>
            </ul>
            
            <div class="spiritual-message">
              May the divine grace of the Lord bless you and your family with health, happiness, prosperity, and spiritual fulfillment. Your generous contribution brings abundant blessings into your life.
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.8; margin-top: 20px;">
              If you have any questions about your booking or would like to make any changes, please don't hesitate to contact us. We are always here to help and look forward to serving you.
            </p>
          </div>
          <div class="footer">
            <div class="footer-title">Sri Sithhi Vinayagar Tempel Kultur Verein e.V</div>
            <div class="footer-text">Humboldt Str. 103, 90459 Nürnberg</div>
            <div class="footer-text">Tel. No. 0911 43958088</div>
            <div class="footer-contact">
              <p style="margin: 10px 0 0 0;">This is an automated confirmation email. Please do not reply to this message.</p>
              <p style="margin: 5px 0 0 0;">&copy; ${new Date().getFullYear()} Sri Sithhi Vinayagar Tempel Kultur Verein e.V. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const attachments = [];
    if (pdfBuffer && Buffer.isBuffer(pdfBuffer)) {
      logger.info('[PAYMENT-EMAIL-SERVICE] Step 4: Building attachments array');
      logger.info('[PAYMENT-EMAIL-SERVICE] OK PDF attachment added to email');
      logger.info(`[PAYMENT-EMAIL-SERVICE]   - Filename: Receipt-Pooja-${bookingId}.pdf`);
      logger.info(`[PAYMENT-EMAIL-SERVICE]   - Size: ${pdfBuffer.length} bytes`);
      logger.info('[PAYMENT-EMAIL-SERVICE]   - Content-Type: application/pdf');
      attachments.push({
        filename: `Receipt-Pooja-${bookingId}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      });
    }

    const mailOptions = {
      from: `${fromName} <${fromEmail}>`,
      to: customerEmail,
      subject: `Your Pooja Booking Has Been Received! ✓`,
      html: htmlContent,
      attachments: attachments,
    };

    logger.info('[PAYMENT-EMAIL-SERVICE] Step 5: Sending email via Nodemailer');
    const info = await transporter.sendMail(mailOptions);

    logger.info('[PAYMENT-EMAIL-SERVICE] ========================================');
    logger.info('[PAYMENT-EMAIL-SERVICE] ✓ POOJA PAYMENT EMAIL SENT SUCCESSFULLY');
    logger.info('[PAYMENT-EMAIL-SERVICE] ========================================');
    logger.info(`[PAYMENT-EMAIL-SERVICE] Message ID: ${info.messageId}`);
    logger.info(`[PAYMENT-EMAIL-SERVICE] Response: ${info.response}`);
    logger.info(`[PAYMENT-EMAIL-SERVICE] Accepted: ${info.accepted?.join(', ') || 'N/A'}`);

    return {
      success: true,
      message: `Payment received email sent to ${customerEmail}`,
      messageId: info.messageId,
    };
  } catch (error) {
    logger.error('[PAYMENT-EMAIL-SERVICE] ========================================');
    logger.error('[PAYMENT-EMAIL-SERVICE] ✗ POOJA PAYMENT EMAIL SENDING FAILED');
    logger.error('[PAYMENT-EMAIL-SERVICE] ========================================');
    logger.error(`[PAYMENT-EMAIL-SERVICE] Error message: ${error.message}`);
    logger.error(`[PAYMENT-EMAIL-SERVICE] Error name: ${error.name}`);
    logger.error(`[PAYMENT-EMAIL-SERVICE] Error code: ${error.code || 'N/A'}`);
    logger.error(`[PAYMENT-EMAIL-SERVICE] Error stack: ${error.stack}`);
    throw new Error(`Failed to send pooja payment received email: ${error.message}`, { cause: error });
  }
};

export default {
  sendDonationPaymentReceivedEmail,
  sendPoojaPaymentReceivedEmail,
};