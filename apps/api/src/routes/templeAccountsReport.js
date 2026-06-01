import 'dotenv/config';
import express from 'express';
import nodemailer from 'nodemailer';
import * as XLSX from 'xlsx';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';

const router = express.Router();

let transporter = null;

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
 * Helper function to format currency
 */
const formatCurrency = (amount) => {
  return `€${parseFloat(amount || 0).toFixed(2)}`;
};

/**
 * Helper function to format date
 */
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

/**
 * Helper function to format date as readable string
 */
const formatDateReadable = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Initialize Nodemailer transporter
 */
const initializeTransporter = () => {
  if (transporter) {
    logger.info('[TEMPLE-REPORT-EMAIL] Using cached transporter instance');
    return transporter;
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  logger.info('[TEMPLE-REPORT-EMAIL] Initializing Nodemailer transporter');
  logger.info(`[TEMPLE-REPORT-EMAIL] SMTP Host: ${smtpHost}`);
  logger.info(`[TEMPLE-REPORT-EMAIL] SMTP Port: ${smtpPort}`);
  logger.info(`[TEMPLE-REPORT-EMAIL] SMTP User: ${smtpUser}`);

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    const missingVars = [];
    if (!smtpHost) missingVars.push('SMTP_HOST');
    if (!smtpPort) missingVars.push('SMTP_PORT');
    if (!smtpUser) missingVars.push('SMTP_USER');
    if (!smtpPass) missingVars.push('SMTP_PASS');
    logger.error(`[TEMPLE-REPORT-EMAIL] Missing SMTP configuration: ${missingVars.join(', ')}`);
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

    logger.info('[TEMPLE-REPORT-EMAIL] ✓ Nodemailer transporter initialized successfully');
    return transporter;
  } catch (error) {
    logger.error(`[TEMPLE-REPORT-EMAIL] ✗ Failed to initialize transporter: ${error.message}`);
    throw new Error(`Failed to initialize email transporter: ${error.message}`, { cause: error });
  }
};

/**
 * Generate Excel file for report
 */
const generateReportExcel = (transactions, totalIncome, totalExpenses, netProfitLoss) => {
  logger.info('[TEMPLE-REPORT-EMAIL] Generating Excel file for report');

  const excelData = transactions.map(t => ({
    Date: t.Date,
    'Transaction Type': t['Transaction Type'],
    Category: t.Category,
    Amount: t.Amount,
    Description: t.Description,
    'Payment Method': t['Payment Method'],
  }));

  // Add summary section
  excelData.push({});
  excelData.push({
    Date: 'SUMMARY',
    'Transaction Type': '',
    Category: '',
    Amount: '',
    Description: '',
    'Payment Method': '',
  });
  excelData.push({
    Date: 'Total Income',
    'Transaction Type': '',
    Category: '',
    Amount: formatCurrency(totalIncome),
    Description: '',
    'Payment Method': '',
  });
  excelData.push({
    Date: 'Total Expenses',
    'Transaction Type': '',
    Category: '',
    Amount: formatCurrency(totalExpenses),
    Description: '',
    'Payment Method': '',
  });
  excelData.push({
    Date: 'Net Profit/Loss',
    'Transaction Type': '',
    Category: '',
    Amount: formatCurrency(netProfitLoss),
    Description: '',
    'Payment Method': '',
  });

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(excelData);

  worksheet['!cols'] = [
    { wch: 12 },
    { wch: 18 },
    { wch: 20 },
    { wch: 15 },
    { wch: 30 },
    { wch: 18 },
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

  logger.info(`[TEMPLE-REPORT-EMAIL] ✓ Excel file generated (${excelBuffer.length} bytes)`);
  return excelBuffer;
};

/**
 * POST /temple-accounts/send-report
 * Send P&L statement and optional Excel attachment via email
 */
router.post('/send-report', async (req, res) => {
  logger.info('[TEMPLE-REPORT-EMAIL] ========================================');
  logger.info('[TEMPLE-REPORT-EMAIL] POST /send-report - Report request received');
  logger.info('[TEMPLE-REPORT-EMAIL] ========================================');
  logger.info('[TEMPLE-REPORT-EMAIL] Request body:', JSON.stringify(req.body, null, 2));

  const { email, reportType, startDate, endDate } = req.body;

  // Step 1: Validate input parameters
  logger.info('[TEMPLE-REPORT-EMAIL] Step 1: Validating input parameters');

  if (!email || typeof email !== 'string') {
    logger.warn('[TEMPLE-REPORT-EMAIL] ✗ Validation failed: Missing or invalid email');
    return res.status(400).json({ error: 'Email is required and must be a string' });
  }

  if (!isValidEmail(email)) {
    logger.warn(`[TEMPLE-REPORT-EMAIL] ✗ Validation failed: Invalid email format: ${email}`);
    return res.status(400).json({ error: `Invalid email format: ${email}` });
  }
  logger.info(`[TEMPLE-REPORT-EMAIL] ✓ Email validated: ${email}`);

  if (!reportType || typeof reportType !== 'string') {
    logger.warn('[TEMPLE-REPORT-EMAIL] ✗ Validation failed: Missing or invalid reportType');
    return res.status(400).json({ error: 'reportType is required and must be a string' });
  }

  const validReportTypes = ['summary', 'detailed', 'with-excel'];
  if (!validReportTypes.includes(reportType)) {
    logger.warn(`[TEMPLE-REPORT-EMAIL] ✗ Validation failed: Invalid reportType: ${reportType}`);
    return res.status(400).json({
      error: `Invalid reportType. Must be one of: ${validReportTypes.join(', ')}`,
    });
  }
  logger.info(`[TEMPLE-REPORT-EMAIL] ✓ reportType validated: ${reportType}`);

  // Validate dates if provided
  let startDateObj = null;
  let endDateObj = null;

  if (startDate) {
    startDateObj = new Date(startDate);
    if (isNaN(startDateObj.getTime())) {
      logger.warn(`[TEMPLE-REPORT-EMAIL] ✗ Validation failed: Invalid startDate: ${startDate}`);
      return res.status(400).json({ error: `Invalid startDate format: ${startDate}` });
    }
    logger.info(`[TEMPLE-REPORT-EMAIL] ✓ startDate validated: ${formatDateReadable(startDate)}`);
  }

  if (endDate) {
    endDateObj = new Date(endDate);
    if (isNaN(endDateObj.getTime())) {
      logger.warn(`[TEMPLE-REPORT-EMAIL] ✗ Validation failed: Invalid endDate: ${endDate}`);
      return res.status(400).json({ error: `Invalid endDate format: ${endDate}` });
    }
    logger.info(`[TEMPLE-REPORT-EMAIL] ✓ endDate validated: ${formatDateReadable(endDate)}`);
  }

  logger.info('[TEMPLE-REPORT-EMAIL] ✓ All input parameters validated successfully');

  // Step 2: Fetch expenses
  logger.info('[TEMPLE-REPORT-EMAIL] Step 2: Fetching expenses from PocketBase');
  let expenseFilter = '';
  if (startDateObj && endDateObj) {
    const startISO = startDateObj.toISOString();
    const endISO = endDateObj.toISOString();
    expenseFilter = `date >= "${startISO}" && date <= "${endISO}"`;
  }

  const expenses = await pb.collection('expenses').getFullList({
    filter: expenseFilter || undefined,
    sort: '-date',
  });
  logger.info(`[TEMPLE-REPORT-EMAIL] ✓ Fetched ${expenses.length} expense records`);

  // Step 3: Fetch donations
  logger.info('[TEMPLE-REPORT-EMAIL] Step 3: Fetching donations from PocketBase');
  let donationFilter = 'status = "approved"';
  if (startDateObj && endDateObj) {
    const startISO = startDateObj.toISOString();
    const endISO = endDateObj.toISOString();
    donationFilter = `status = "approved" && created >= "${startISO}" && created <= "${endISO}"`;
  }

  const donations = await pb.collection('donations').getFullList({
    filter: donationFilter,
    sort: '-created',
  });
  logger.info(`[TEMPLE-REPORT-EMAIL] ✓ Fetched ${donations.length} approved donation records`);

  // Step 4: Fetch pooja bookings
  logger.info('[TEMPLE-REPORT-EMAIL] Step 4: Fetching pooja bookings from PocketBase');
  let poojaFilter = 'status = "Confirmed"';
  if (startDateObj && endDateObj) {
    const startISO = startDateObj.toISOString();
    const endISO = endDateObj.toISOString();
    poojaFilter = `status = "Confirmed" && created >= "${startISO}" && created <= "${endISO}"`;
  }

  const poojaBookings = await pb.collection('pooja_bookings').getFullList({
    filter: poojaFilter,
    sort: '-created',
  });
  logger.info(`[TEMPLE-REPORT-EMAIL] ✓ Fetched ${poojaBookings.length} confirmed pooja booking records`);

  // Step 5: Build transaction data
  logger.info('[TEMPLE-REPORT-EMAIL] Step 5: Building transaction data');
  const transactions = [];

  expenses.forEach((expense) => {
    transactions.push({
      Date: formatDate(expense.date || expense.created),
      'Transaction Type': 'Expense',
      Category: expense.category || 'General',
      Amount: formatCurrency(expense.amount || 0),
      Description: expense.description || expense.notes || '',
      'Payment Method': expense.payment_method || 'N/A',
      AmountNumeric: expense.amount || 0,
      Type: 'expense',
    });
  });

  donations.forEach((donation) => {
    transactions.push({
      Date: formatDate(donation.created),
      'Transaction Type': 'Donation',
      Category: donation.category || 'General Fund',
      Amount: formatCurrency(donation.amount || 0),
      Description: donation.notes || '',
      'Payment Method': 'Bank Transfer',
      AmountNumeric: donation.amount || 0,
      Type: 'income',
    });
  });

  poojaBookings.forEach((booking) => {
    transactions.push({
      Date: formatDate(booking.created),
      'Transaction Type': 'Pooja Booking',
      Category: booking.pooja_name || 'Pooja Service',
      Amount: formatCurrency(booking.donation_amount || 0),
      Description: `Booking for ${booking.name || 'Customer'}`,
      'Payment Method': 'Bank Transfer',
      AmountNumeric: booking.donation_amount || 0,
      Type: 'income',
    });
  });

  transactions.sort((a, b) => new Date(b.Date) - new Date(a.Date));
  logger.info(`[TEMPLE-REPORT-EMAIL] ✓ Built transaction array with ${transactions.length} total transactions`);

  // Step 6: Calculate totals
  logger.info('[TEMPLE-REPORT-EMAIL] Step 6: Calculating totals');
  const totalIncome = transactions
    .filter(t => t.Type === 'income')
    .reduce((sum, t) => sum + t.AmountNumeric, 0);
  const totalExpenses = transactions
    .filter(t => t.Type === 'expense')
    .reduce((sum, t) => sum + t.AmountNumeric, 0);
  const netProfitLoss = totalIncome - totalExpenses;

  logger.info(`[TEMPLE-REPORT-EMAIL]   - Total Income: €${totalIncome.toFixed(2)}`);
  logger.info(`[TEMPLE-REPORT-EMAIL]   - Total Expenses: €${totalExpenses.toFixed(2)}`);
  logger.info(`[TEMPLE-REPORT-EMAIL]   - Net Profit/Loss: €${netProfitLoss.toFixed(2)}`);

  // Step 7: Generate Excel file if needed
  logger.info('[TEMPLE-REPORT-EMAIL] Step 7: Preparing attachments');
  let excelBuffer = null;
  if (reportType === 'with-excel') {
    excelBuffer = generateReportExcel(transactions, totalIncome, totalExpenses, netProfitLoss);
  }

  // Step 8: Build email HTML
  logger.info('[TEMPLE-REPORT-EMAIL] Step 8: Building email HTML content');
  const dateRange = startDate && endDate
    ? `${formatDateReadable(startDate)} to ${formatDateReadable(endDate)}`
    : 'All Time';

  const transactionRows = reportType === 'summary'
    ? transactions.slice(0, 10).map(t => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${t.Date}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${t['Transaction Type']}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${t.Category}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; text-align: right;">${t.Amount}</td>
      </tr>
    `).join('')
    : transactions.map(t => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${t.Date}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${t['Transaction Type']}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${t.Category}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; text-align: right;">${t.Amount}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${t.Description}</td>
      </tr>
    `).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Temple Accounts Report</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; }
        .container { max-width: 900px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #8B0000 0%, #A52A2A 100%); color: #ffffff; padding: 30px; text-align: center; border-radius: 4px; margin-bottom: 30px; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
        .header p { margin: 5px 0 0 0; font-size: 14px; opacity: 0.95; }
        .content { margin: 20px 0; }
        .section-title { color: #8B0000; font-size: 18px; font-weight: 600; margin-top: 25px; margin-bottom: 15px; border-bottom: 2px solid #8B0000; padding-bottom: 10px; }
        .summary-box { background-color: #f8f9fa; border-left: 4px solid #8B0000; padding: 20px; margin: 20px 0; border-radius: 4px; }
        .summary-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e0e0e0; }
        .summary-row:last-child { border-bottom: none; }
        .summary-label { color: #666; font-weight: 500; }
        .summary-value { color: #333; font-weight: 600; }
        .amount-positive { color: #28a745; font-weight: 600; }
        .amount-negative { color: #dc3545; font-weight: 600; }
        .table { width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #f9f9f9; border-radius: 4px; }
        .table th { background-color: #8B0000; color: #ffffff; padding: 12px; text-align: left; font-weight: 600; font-size: 12px; text-transform: uppercase; }
        .table td { padding: 10px 12px; border-bottom: 1px solid #e0e0e0; font-size: 13px; }
        .table tr:last-child td { border-bottom: none; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 20px; }
        .footer-title { color: #8B0000; font-weight: 600; margin-bottom: 5px; }
        .footer-text { margin: 3px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Temple Accounts Report</h1>
          <p>Profit & Loss Statement</p>
        </div>
        <div class="content">
          <p>Dear Administrator,</p>
          <p>Please find below the temple accounts report for the period: <strong>${dateRange}</strong></p>
          
          <div class="section-title">Financial Summary</div>
          <div class="summary-box">
            <div class="summary-row">
              <span class="summary-label">Total Income (Donations + Pooja Bookings)</span>
              <span class="summary-value amount-positive">${formatCurrency(totalIncome)}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Total Expenses</span>
              <span class="summary-value amount-negative">${formatCurrency(totalExpenses)}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Net Profit/Loss</span>
              <span class="summary-value ${netProfitLoss >= 0 ? 'amount-positive' : 'amount-negative'}">${formatCurrency(netProfitLoss)}</span>
            </div>
          </div>
          
          <div class="section-title">Transaction Details</div>
          <table class="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Category</th>
                <th>Amount</th>
                ${reportType !== 'summary' ? '<th>Description</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${transactionRows}
            </tbody>
          </table>
          
          ${reportType === 'summary' ? `<p style="color: #666; font-size: 13px; margin-top: 15px;">Showing top 10 transactions. Download the Excel file for complete details.</p>` : ''}
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

  // Step 9: Send email
  logger.info('[TEMPLE-REPORT-EMAIL] Step 9: Sending email via Nodemailer');
  const emailTransporter = initializeTransporter();
  const fromEmail = process.env.SMTP_FROM_EMAIL || 'noreply@temple.com';
  const fromName = process.env.SMTP_FROM_NAME || 'Sri Sithhi Vinayagar Temple';

  const attachments = [];
  if (excelBuffer) {
    const monthYear = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    attachments.push({
      filename: `Temple_Accounts_Report_${monthYear}.xlsx`,
      content: excelBuffer,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    logger.info('[TEMPLE-REPORT-EMAIL]   - Excel attachment added');
  }

  const mailOptions = {
    from: `${fromName} <${fromEmail}>`,
    to: email,
    subject: `Temple Accounts Report - ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
    html: htmlContent,
    attachments: attachments,
  };

  logger.info(`[TEMPLE-REPORT-EMAIL]   - From: ${fromName} <${fromEmail}>`);
  logger.info(`[TEMPLE-REPORT-EMAIL]   - To: ${email}`);
  logger.info(`[TEMPLE-REPORT-EMAIL]   - Subject: ${mailOptions.subject}`);
  logger.info(`[TEMPLE-REPORT-EMAIL]   - Attachments: ${attachments.length}`);

  const info = await emailTransporter.sendMail(mailOptions);

  logger.info('[TEMPLE-REPORT-EMAIL] ========================================');
  logger.info('[TEMPLE-REPORT-EMAIL] ✓ REPORT EMAIL SENT SUCCESSFULLY');
  logger.info('[TEMPLE-REPORT-EMAIL] ========================================');
  logger.info(`[TEMPLE-REPORT-EMAIL] Message ID: ${info.messageId}`);
  logger.info(`[TEMPLE-REPORT-EMAIL] Response: ${info.response}`);
  logger.info(`[TEMPLE-REPORT-EMAIL] Recipient: ${email}`);
  logger.info(`[TEMPLE-REPORT-EMAIL] Report Type: ${reportType}`);
  logger.info(`[TEMPLE-REPORT-EMAIL] Total Income: €${totalIncome.toFixed(2)}`);
  logger.info(`[TEMPLE-REPORT-EMAIL] Total Expenses: €${totalExpenses.toFixed(2)}`);
  logger.info(`[TEMPLE-REPORT-EMAIL] Net Profit/Loss: €${netProfitLoss.toFixed(2)}`);

  res.json({
    success: true,
    message: `Report sent successfully to ${email}`,
    reportData: {
      totalIncome: formatCurrency(totalIncome),
      totalExpenses: formatCurrency(totalExpenses),
      netProfitLoss: formatCurrency(netProfitLoss),
      transactionCount: transactions.length,
      dateRange: dateRange,
    },
  });
});

export default router;