import 'dotenv/config';
import express from 'express';
import * as XLSX from 'xlsx';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';

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
 * Helper function to get month and year string
 */
const getMonthYearString = () => {
  const date = new Date();
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return `${months[date.getMonth()]}_${date.getFullYear()}`;
};

/**
 * POST /temple-accounts/export-excel
 * Fetch all expenses and income, generate Excel file with professional formatting
 */
router.post('/export-excel', async (req, res) => {
  logger.info('[TEMPLE-ACCOUNTS-EXPORT] ========================================');
  logger.info('[TEMPLE-ACCOUNTS-EXPORT] POST /export-excel - Export request received');
  logger.info('[TEMPLE-ACCOUNTS-EXPORT] ========================================');

  // Step 1: Fetch expenses from expenses collection
  logger.info('[TEMPLE-ACCOUNTS-EXPORT] Step 1: Fetching expenses from PocketBase');
  const expenses = await pb.collection('expenses').getFullList({
    sort: '-date',
  });
  logger.info(`[TEMPLE-ACCOUNTS-EXPORT] ✓ Fetched ${expenses.length} expense records`);

  // Step 2: Fetch donations from donations collection
  logger.info('[TEMPLE-ACCOUNTS-EXPORT] Step 2: Fetching donations from PocketBase');
  const donations = await pb.collection('donations').getFullList({
    filter: 'status = "approved"',
    sort: '-created',
  });
  logger.info(`[TEMPLE-ACCOUNTS-EXPORT] ✓ Fetched ${donations.length} approved donation records`);

  // Step 3: Fetch pooja bookings from pooja_bookings collection
  logger.info('[TEMPLE-ACCOUNTS-EXPORT] Step 3: Fetching pooja bookings from PocketBase');
  const poojaBookings = await pb.collection('pooja_bookings').getFullList({
    filter: 'status = "Confirmed"',
    sort: '-created',
  });
  logger.info(`[TEMPLE-ACCOUNTS-EXPORT] ✓ Fetched ${poojaBookings.length} confirmed pooja booking records`);

  // Step 4: Build transaction data array
  logger.info('[TEMPLE-ACCOUNTS-EXPORT] Step 4: Building transaction data array');
  const transactions = [];

  // Add expenses
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

  // Add donations
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

  // Add pooja bookings
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

  // Sort by date
  transactions.sort((a, b) => new Date(b.Date) - new Date(a.Date));
  logger.info(`[TEMPLE-ACCOUNTS-EXPORT] ✓ Built transaction array with ${transactions.length} total transactions`);

  // Step 5: Calculate totals
  logger.info('[TEMPLE-ACCOUNTS-EXPORT] Step 5: Calculating totals');
  const totalIncome = transactions
    .filter(t => t.Type === 'income')
    .reduce((sum, t) => sum + t.AmountNumeric, 0);
  const totalExpenses = transactions
    .filter(t => t.Type === 'expense')
    .reduce((sum, t) => sum + t.AmountNumeric, 0);
  const netProfitLoss = totalIncome - totalExpenses;

  logger.info(`[TEMPLE-ACCOUNTS-EXPORT]   - Total Income: €${totalIncome.toFixed(2)}`);
  logger.info(`[TEMPLE-ACCOUNTS-EXPORT]   - Total Expenses: €${totalExpenses.toFixed(2)}`);
  logger.info(`[TEMPLE-ACCOUNTS-EXPORT]   - Net Profit/Loss: €${netProfitLoss.toFixed(2)}`);

  // Step 6: Prepare data for Excel
  logger.info('[TEMPLE-ACCOUNTS-EXPORT] Step 6: Preparing data for Excel export');
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

  // Step 7: Create Excel workbook
  logger.info('[TEMPLE-ACCOUNTS-EXPORT] Step 7: Creating Excel workbook');
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(excelData);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 12 }, // Date
    { wch: 18 }, // Transaction Type
    { wch: 20 }, // Category
    { wch: 15 }, // Amount
    { wch: 30 }, // Description
    { wch: 18 }, // Payment Method
  ];

  // Apply formatting to header row
  const headerStyle = {
    font: { bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '8B0000' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    },
  };

  // Apply header formatting
  const headerCells = ['A1', 'B1', 'C1', 'D1', 'E1', 'F1'];
  headerCells.forEach(cell => {
    if (worksheet[cell]) {
      worksheet[cell].s = headerStyle;
    }
  });

  // Apply borders to all data cells
  const borderStyle = {
    border: {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    },
  };

  for (let row = 2; row <= excelData.length + 1; row++) {
    for (let col = 0; col < 6; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: row - 1, c: col });
      if (worksheet[cellRef]) {
        worksheet[cellRef].s = borderStyle;
      }
    }
  }

  // Bold the summary rows
  const summaryRowStart = excelData.length - 3;
  for (let row = summaryRowStart; row <= excelData.length; row++) {
    for (let col = 0; col < 6; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: row - 1, c: col });
      if (worksheet[cellRef]) {
        worksheet[cellRef].s = {
          ...borderStyle,
          font: { bold: true },
          fill: { fgColor: { rgb: 'F0F0F0' } },
        };
      }
    }
  }

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Accounts');
  logger.info('[TEMPLE-ACCOUNTS-EXPORT] ✓ Excel workbook created');

  // Step 8: Generate Excel file
  logger.info('[TEMPLE-ACCOUNTS-EXPORT] Step 8: Generating Excel file');
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
  logger.info(`[TEMPLE-ACCOUNTS-EXPORT] ✓ Excel file generated (${excelBuffer.length} bytes)`);

  // Step 9: Send file as download
  logger.info('[TEMPLE-ACCOUNTS-EXPORT] Step 9: Sending file as download');
  const monthYear = getMonthYearString();
  const filename = `Temple_Accounts_${monthYear}.xlsx`;

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', excelBuffer.length);

  logger.info('[TEMPLE-ACCOUNTS-EXPORT] ========================================');
  logger.info('[TEMPLE-ACCOUNTS-EXPORT] ✓ EXCEL EXPORT COMPLETED SUCCESSFULLY');
  logger.info('[TEMPLE-ACCOUNTS-EXPORT] ========================================');
  logger.info(`[TEMPLE-ACCOUNTS-EXPORT] Filename: ${filename}`);
  logger.info(`[TEMPLE-ACCOUNTS-EXPORT] File Size: ${excelBuffer.length} bytes`);
  logger.info(`[TEMPLE-ACCOUNTS-EXPORT] Total Transactions: ${transactions.length}`);
  logger.info(`[TEMPLE-ACCOUNTS-EXPORT] Total Income: €${totalIncome.toFixed(2)}`);
  logger.info(`[TEMPLE-ACCOUNTS-EXPORT] Total Expenses: €${totalExpenses.toFixed(2)}`);
  logger.info(`[TEMPLE-ACCOUNTS-EXPORT] Net Profit/Loss: €${netProfitLoss.toFixed(2)}`);

  res.send(excelBuffer);
});

export default router;