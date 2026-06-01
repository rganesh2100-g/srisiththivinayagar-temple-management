import logger from './logger.js';

/**
 * Format a number as USD currency
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency string (e.g., "$100.00")
 */
const formatUSDCurrency = (amount) => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '$0.00';
  }
  const formatted = amount.toFixed(2);
  return `$${formatted}`;
};

/**
 * Generate a beautiful HTML email template for donation approvals
 * @param {Object} donationData - Donation details
 * @param {string} donationData.donorName - Name of the donor
 * @param {string} donationData.donorEmail - Email of the donor
 * @param {number} donationData.amount - Donation amount
 * @param {string} donationData.receiptId - Receipt ID
 * @param {string} donationData.approvalDate - Date of approval
 * @returns {string} HTML email template
 */
export const generateDonationApprovalEmailTemplate = (donationData) => {
  const {
    donorName = 'Valued Donor',
    donorEmail = '',
    amount = 0,
    receiptId = '',
    approvalDate = new Date().toISOString(),
  } = donationData;

  const formattedDate = new Date(approvalDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedAmount = formatUSDCurrency(amount);

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Donation Approved</title>
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
          max-width: 600px;
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
        }

        .donation-details {
          background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
          border-left: 4px solid #8B0000;
          padding: 25px;
          margin: 30px 0;
          border-radius: 4px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .donation-details h3 {
          color: #8B0000;
          font-size: 16px;
          margin-bottom: 20px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid #e0e0e0;
          font-size: 14px;
        }

        .detail-row:last-child {
          border-bottom: none;
        }

        .detail-label {
          color: #666;
          font-weight: 500;
        }

        .detail-value {
          color: #333;
          font-weight: 600;
          text-align: right;
        }

        .amount-section {
          background: linear-gradient(135deg, #fff3cd 0%, #fffbea 100%);
          border: 2px solid #ffc107;
          padding: 25px;
          margin: 30px 0;
          border-radius: 6px;
          text-align: center;
        }

        .amount-label {
          color: #666;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 10px;
          font-weight: 600;
        }

        .amount-value {
          color: #8B0000;
          font-size: 36px;
          font-weight: 700;
          margin-bottom: 5px;
        }

        .status-badge {
          display: inline-block;
          background-color: #28a745;
          color: #ffffff;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 20px 0;
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
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="email-header">
          <h1>Donation Approved!</h1>
          <p>Your donation has been approved and processed</p>
        </div>

        <div class="email-content">
          <div class="greeting">
            <h2>Dear ${donorName},</h2>
            <p>We are delighted to inform you that your generous donation has been approved and successfully processed. Your contribution will make a meaningful impact on our temple and community.</p>
          </div>

          <div style="text-align: center;">
            <span class="status-badge">✓ Approved</span>
          </div>

          <div class="donation-details">
            <h3>Donation Details</h3>
            <div class="detail-row">
              <span class="detail-label">Receipt ID</span>
              <span class="detail-value">${receiptId}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Donor Name</span>
              <span class="detail-value">${donorName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Approval Date</span>
              <span class="detail-value">${formattedDate}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Status</span>
              <span class="detail-value" style="color: #28a745;">Approved</span>
            </div>
          </div>

          <div class="amount-section">
            <div class="amount-label">Donation Amount</div>
            <div class="amount-value">${formattedAmount}</div>
            <div style="color: #888; font-size: 12px; margin-top: 5px;">Thank you for your generosity</div>
          </div>

          <p style="color: #666; font-size: 14px; line-height: 1.8; margin-top: 25px;">
            If you have any questions about your donation or would like to make an additional contribution, please don't hesitate to contact us. We are always here to help and deeply appreciate your continued support.
          </p>
        </div>

        <div class="email-footer">
          <div class="footer-content">
            <div class="footer-title">Sri Sithivinayagar Temple</div>
            <div class="footer-text">Serving our community with devotion and compassion</div>
          </div>

          <div class="footer-content">
            <div class="footer-text">📞 Contact Us</div>
            <div class="footer-text" style="font-size: 12px; color: #888;">Email: info@srisiththivinayagar.com</div>
          </div>

          <div class="footer-disclaimer">
            <p>This is an automated approval notification from Sri Sithivinayagar Temple. Please do not reply to this email. If you have questions, please contact us directly using the information above.</p>
            <p style="margin-top: 10px;">&copy; ${new Date().getFullYear()} Sri Sithivinayagar Temple. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Generate a beautiful HTML email template for donation reports
 * @param {Object} reportData - Report details
 * @returns {string} HTML email template
 */
export const generateDonationReportEmailTemplate = (reportData) => {
  const {
    adminEmail = '',
    reportData: data = {},
    filters = {},
    generatedDate = new Date().toISOString(),
  } = reportData;

  const formattedDate = new Date(generatedDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const totalAmount = formatUSDCurrency(data.totalAmount || 0);
  const donationCount = data.donations?.length || 0;
  const categoryBreakdown = data.categoryBreakdown || {};
  const statusBreakdown = data.statusBreakdown || {};

  // Generate category breakdown HTML
  let categoryHtml = '';
  Object.entries(categoryBreakdown).forEach(([category, count]) => {
    categoryHtml += `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e0e0e0;">${category}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e0e0e0; text-align: right;">${count}</td>
      </tr>
    `;
  });

  // Generate status breakdown HTML
  let statusHtml = '';
  Object.entries(statusBreakdown).forEach(([status, count]) => {
    statusHtml += `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e0e0e0;">${status}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e0e0e0; text-align: right;">${count}</td>
      </tr>
    `;
  });

  // Generate recent donations table
  let donationsHtml = '';
  const recentDonations = (data.donations || []).slice(0, 10);
  recentDonations.forEach((donation) => {
    donationsHtml += `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e0e0e0; font-size: 12px;">${donation.donorName || 'N/A'}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e0e0e0; font-size: 12px;">${donation.category || 'General'}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e0e0e0; text-align: right; font-size: 12px;">${formatUSDCurrency(donation.amount || 0)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e0e0e0; font-size: 12px;">${donation.status || 'pending'}</td>
      </tr>
    `;
  });

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Donation Report</title>
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
          font-size: 14px;
          line-height: 1.8;
          margin-bottom: 20px;
        }

        .summary-section {
          background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
          border-left: 4px solid #8B0000;
          padding: 25px;
          margin: 25px 0;
          border-radius: 4px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .summary-section h3 {
          color: #8B0000;
          font-size: 16px;
          margin-bottom: 20px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid #e0e0e0;
          font-size: 14px;
        }

        .summary-row:last-child {
          border-bottom: none;
        }

        .summary-label {
          color: #666;
          font-weight: 500;
        }

        .summary-value {
          color: #333;
          font-weight: 600;
          text-align: right;
        }

        .total-amount {
          background: linear-gradient(135deg, #fff3cd 0%, #fffbea 100%);
          border: 2px solid #ffc107;
          padding: 20px;
          margin: 25px 0;
          border-radius: 6px;
          text-align: center;
        }

        .total-label {
          color: #666;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 8px;
          font-weight: 600;
        }

        .total-value {
          color: #8B0000;
          font-size: 32px;
          font-weight: 700;
        }

        .breakdown-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          background-color: #f9f9f9;
          border-radius: 4px;
          overflow: hidden;
        }

        .breakdown-table th {
          background-color: #8B0000;
          color: #ffffff;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .breakdown-table td {
          padding: 10px 12px;
          border-bottom: 1px solid #e0e0e0;
          font-size: 13px;
        }

        .breakdown-table tr:last-child td {
          border-bottom: none;
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
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="email-header">
          <h1>Donation Report</h1>
          <p>Generated on ${formattedDate}</p>
        </div>

        <div class="email-content">
          <div class="greeting">
            <h2>Donation Report Summary</h2>
            <p>This is your requested donation report. Below you'll find a comprehensive summary of all donations matching your selected filters.</p>
          </div>

          <div class="summary-section">
            <h3>Report Summary</h3>
            <div class="summary-row">
              <span class="summary-label">Total Donations</span>
              <span class="summary-value">${donationCount}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Report Generated</span>
              <span class="summary-value">${formattedDate}</span>
            </div>
            ${Object.keys(filters).length > 0 ? `
            <div class="summary-row">
              <span class="summary-label">Filters Applied</span>
              <span class="summary-value">${Object.keys(filters).length}</span>
            </div>
            ` : ''}
          </div>

          <div class="total-amount">
            <div class="total-label">Total Amount</div>
            <div class="total-value">${totalAmount}</div>
          </div>

          ${Object.keys(categoryBreakdown).length > 0 ? `
          <h3 style="color: #8B0000; font-size: 16px; margin-top: 30px; margin-bottom: 15px; font-weight: 600;">Donations by Category</h3>
          <table class="breakdown-table">
            <thead>
              <tr>
                <th>Category</th>
                <th style="text-align: right;">Count</th>
              </tr>
            </thead>
            <tbody>
              ${categoryHtml}
            </tbody>
          </table>
          ` : ''}

          ${Object.keys(statusBreakdown).length > 0 ? `
          <h3 style="color: #8B0000; font-size: 16px; margin-top: 30px; margin-bottom: 15px; font-weight: 600;">Donations by Status</h3>
          <table class="breakdown-table">
            <thead>
              <tr>
                <th>Status</th>
                <th style="text-align: right;">Count</th>
              </tr>
            </thead>
            <tbody>
              ${statusHtml}
            </tbody>
          </table>
          ` : ''}

          ${recentDonations.length > 0 ? `
          <h3 style="color: #8B0000; font-size: 16px; margin-top: 30px; margin-bottom: 15px; font-weight: 600;">Recent Donations (Top 10)</h3>
          <table class="breakdown-table">
            <thead>
              <tr>
                <th>Donor</th>
                <th>Category</th>
                <th style="text-align: right;">Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${donationsHtml}
            </tbody>
          </table>
          ` : ''}
        </div>

        <div class="email-footer">
          <div class="footer-content">
            <div class="footer-title">Sri Sithivinayagar Temple</div>
            <div class="footer-text">Serving our community with devotion and compassion</div>
          </div>

          <div class="footer-disclaimer">
            <p>This is an automated report from Sri Sithivinayagar Temple. Please do not reply to this email. If you have questions, please contact the temple administration.</p>
            <p style="margin-top: 10px;">&copy; ${new Date().getFullYear()} Sri Sithivinayagar Temple. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Generate a beautiful HTML email template for donation confirmations
 * @param {Object} donationData - Donation details
 * @param {string} donationData.donorName - Name of the donor
 * @param {string} donationData.donorEmail - Email of the donor
 * @param {number} donationData.amount - Donation amount
 * @param {string} donationData.category - Donation category
 * @param {string} donationData.receiptId - Receipt ID
 * @param {string} donationData.donationDate - Date of donation
 * @returns {string} HTML email template
 */
export const generateDonationConfirmationEmail = (donationData) => {
  const {
    donorName = 'Valued Donor',
    donorEmail = '',
    amount = 0,
    category = 'General Fund',
    receiptId = '',
    donationDate = new Date().toISOString(),
  } = donationData;

  const formattedDate = new Date(donationDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedAmount = formatUSDCurrency(amount);

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Donation Confirmation</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #8B0000; text-align: center;">Thank You!</h1>
        <p>Dear ${donorName},</p>
        <p>We are deeply grateful for your generous donation to our temple. Your contribution will help us continue our sacred mission and serve our community with devotion and compassion.</p>
        
        <div style="background-color: #f9f9f9; padding: 20px; border-left: 4px solid #8B0000; margin: 20px 0;">
          <h3 style="color: #8B0000; margin-top: 0;">Donation Details</h3>
          <p><strong>Receipt ID:</strong> ${receiptId}</p>
          <p><strong>Donor Name:</strong> ${donorName}</p>
          <p><strong>Donation Date:</strong> ${formattedDate}</p>
          <p><strong>Category:</strong> ${category}</p>
          <p><strong>Amount:</strong> ${formattedAmount}</p>
        </div>
        
        <p>Your donation has been recorded and verified. A detailed receipt PDF is attached to this email for your records.</p>
        
        <p>If you have any questions about your donation or would like to make an additional contribution, please don't hesitate to contact us. We are always here to help and appreciate your continued support.</p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <div style="text-align: center; color: #666; font-size: 12px;">
          <p><strong>Sri Sithivinayagar Temple</strong></p>
          <p>Serving our community with devotion and compassion</p>
          <p>Email: info@srisiththivinayagar.com</p>
          <p style="margin-top: 20px; font-size: 11px; color: #999;">
            This is an automated confirmation message from Sri Sithivinayagar Temple. Please do not reply to this email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Generate a beautiful HTML email template for pooja booking confirmations
 * @param {Object} bookingData - Booking details
 * @returns {string} HTML email template
 */
export const generatePoojaConfirmationEmail = (bookingData) => {
  const {
    poojaName = 'Pooja Service',
    userName = 'Valued Member',
    userEmail = '',
    amount = 0,
    bookingDate = new Date().toISOString(),
    receiptId = '',
    bookingId = '',
  } = bookingData;

  const formattedDate = new Date(bookingDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const formattedAmount = formatUSDCurrency(amount);

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Pooja Booking Confirmation</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #8B0000; text-align: center;">Booking Confirmed</h1>
        <p>Dear ${userName},</p>
        <p>Thank you for booking a pooja service with us. Your booking has been confirmed and your receipt is attached to this email.</p>
        
        <div style="background-color: #f9f9f9; padding: 20px; border-left: 4px solid #8B0000; margin: 20px 0;">
          <h3 style="color: #8B0000; margin-top: 0;">Booking Details</h3>
          <p><strong>Pooja Name:</strong> ${poojaName}</p>
          <p><strong>Booking ID:</strong> ${bookingId}</p>
          <p><strong>Receipt ID:</strong> ${receiptId}</p>
          <p><strong>Booking Date:</strong> ${formattedDate}</p>
          <p><strong>Amount:</strong> ${formattedAmount}</p>
        </div>
        
        <p>Your receipt is attached to this email for your records.</p>
        
        <p>If you have any questions about your booking or need to make changes, please contact the temple administration.</p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <div style="text-align: center; color: #666; font-size: 12px;">
          <p><strong>Sri Sithivinayagar Temple</strong></p>
          <p>Serving our community with devotion and compassion</p>
          <p>&copy; ${new Date().getFullYear()} Sri Sithivinayagar Temple. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export default {
  generateDonationApprovalEmailTemplate,
  generateDonationReportEmailTemplate,
  generateDonationConfirmationEmail,
  generatePoojaConfirmationEmail,
};