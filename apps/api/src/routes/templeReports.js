/* global Intl */
import 'dotenv/config';
import express from 'express';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf/dist/jspdf.umd.min.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Helper function to format currency
const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
};

// Helper function to generate Excel file
const generateExcelReport = (reportData, filters) => {
  const workbook = XLSX.utils.book_new();

  // Yearly Summary Sheet
  const yearlySummaryData = [
    ['Temple Accounts - Yearly Summary'],
    [],
    ['Category', 'Amount'],
    ['Pooja Services', formatCurrency(reportData.yearly?.pooja_services_amount || 0)],
    ['Annadhanam', formatCurrency(reportData.yearly?.annadhanam_amount || 0)],
    ['Temple Maintenance', formatCurrency(reportData.yearly?.temple_maintenance_amount || 0)],
    ['Goshala', formatCurrency(reportData.yearly?.goshala_amount || 0)],
    ['Veda Pathshala', formatCurrency(reportData.yearly?.veda_pathshala_amount || 0)],
    ['General Fund', formatCurrency(reportData.yearly?.general_fund_amount || 0)],
    [],
    ['Total', formatCurrency(reportData.yearly?.total_amount || 0)],
  ];

  const yearlySummarySheet = XLSX.utils.aoa_to_sheet(yearlySummaryData);
  yearlySummarySheet['!cols'] = [{ wch: 25 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, yearlySummarySheet, 'Yearly Summary');

  // Monthly Summaries Sheet
  const monthlySummaryData = [
    ['Temple Accounts - Monthly Summaries'],
    [],
    ['Month', 'Pooja Services', 'Annadhanam', 'Temple Maintenance', 'Goshala', 'Veda Pathshala', 'General Fund', 'Total'],
  ];

  if (reportData.monthly && Array.isArray(reportData.monthly)) {
    reportData.monthly.forEach((month) => {
      monthlySummaryData.push([
        month.month || 'N/A',
        formatCurrency(month.pooja_services_amount || 0),
        formatCurrency(month.annadhanam_amount || 0),
        formatCurrency(month.temple_maintenance_amount || 0),
        formatCurrency(month.goshala_amount || 0),
        formatCurrency(month.veda_pathshala_amount || 0),
        formatCurrency(month.general_fund_amount || 0),
        formatCurrency(month.total_amount || 0),
      ]);
    });
  }

  const monthlySummarySheet = XLSX.utils.aoa_to_sheet(monthlySummaryData);
  monthlySummarySheet['!cols'] = [
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 20 },
    { wch: 12 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
  ];
  XLSX.utils.book_append_sheet(workbook, monthlySummarySheet, 'Monthly Summaries');

  // Transactions Sheet
  const transactionsData = [
    ['Temple Accounts - Transactions'],
    [],
    ['Date', 'Member Name', 'Category', 'Amount', 'Transaction ID'],
  ];

  if (reportData.transactions && Array.isArray(reportData.transactions)) {
    reportData.transactions.forEach((transaction) => {
      transactionsData.push([
        transaction.date || 'N/A',
        transaction.member_name || 'N/A',
        transaction.category || 'N/A',
        formatCurrency(transaction.amount || 0),
        transaction.transaction_id || 'N/A',
      ]);
    });
  }

  const transactionsSheet = XLSX.utils.aoa_to_sheet(transactionsData);
  transactionsSheet['!cols'] = [
    { wch: 15 },
    { wch: 20 },
    { wch: 20 },
    { wch: 15 },
    { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(workbook, transactionsSheet, 'Transactions');

  return workbook;
};

// Helper function to generate PDF file
const generatePdfReport = async (reportData, filters) => {
  const doc = new jsPDF();
  let yPosition = 20;
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const maxWidth = pageWidth - 2 * margin;

  // Title
  doc.setFontSize(18);
  doc.text('Temple Accounts Report', margin, yPosition);
  yPosition += 15;

  // Date Range
  doc.setFontSize(11);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, margin, yPosition);
  yPosition += 10;

  // Filters Applied
  if (filters && Object.keys(filters).length > 0) {
    doc.setFontSize(10);
    doc.text('Filters Applied:', margin, yPosition);
    yPosition += 5;
    Object.entries(filters).forEach(([key, value]) => {
      doc.text(`  • ${key}: ${value}`, margin + 5, yPosition);
      yPosition += 5;
    });
    yPosition += 5;
  }

  // Yearly Summary Section
  doc.setFontSize(14);
  doc.text('Yearly Summary', margin, yPosition);
  yPosition += 10;

  doc.setFontSize(10);
  const yearlySummary = [
    ['Category', 'Amount'],
    ['Pooja Services', formatCurrency(reportData.yearly?.pooja_services_amount || 0)],
    ['Annadhanam', formatCurrency(reportData.yearly?.annadhanam_amount || 0)],
    ['Temple Maintenance', formatCurrency(reportData.yearly?.temple_maintenance_amount || 0)],
    ['Goshala', formatCurrency(reportData.yearly?.goshala_amount || 0)],
    ['Veda Pathshala', formatCurrency(reportData.yearly?.veda_pathshala_amount || 0)],
    ['General Fund', formatCurrency(reportData.yearly?.general_fund_amount || 0)],
    ['Total', formatCurrency(reportData.yearly?.total_amount || 0)],
  ];

  doc.autoTable({
    startY: yPosition,
    head: [yearlySummary[0]],
    body: yearlySummary.slice(1),
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
    bodyStyles: { textColor: 0 },
    alternateRowStyles: { fillColor: [240, 240, 240] },
  });

  yPosition = doc.lastAutoTable.finalY + 15;

  // Check if we need a new page
  if (yPosition > pageHeight - 40) {
    doc.addPage();
    yPosition = 20;
  }

  // Monthly Summaries Section
  doc.setFontSize(14);
  doc.text('Monthly Summaries', margin, yPosition);
  yPosition += 10;

  if (reportData.monthly && Array.isArray(reportData.monthly) && reportData.monthly.length > 0) {
    const monthlyData = [
      ['Month', 'Pooja', 'Annadhanam', 'Maintenance', 'Goshala', 'Veda', 'General', 'Total'],
    ];

    reportData.monthly.forEach((month) => {
      monthlyData.push([
        month.month || 'N/A',
        formatCurrency(month.pooja_services_amount || 0),
        formatCurrency(month.annadhanam_amount || 0),
        formatCurrency(month.temple_maintenance_amount || 0),
        formatCurrency(month.goshala_amount || 0),
        formatCurrency(month.veda_pathshala_amount || 0),
        formatCurrency(month.general_fund_amount || 0),
        formatCurrency(month.total_amount || 0),
      ]);
    });

    doc.autoTable({
      startY: yPosition,
      head: [monthlyData[0]],
      body: monthlyData.slice(1),
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      bodyStyles: { textColor: 0, fontSize: 9 },
      alternateRowStyles: { fillColor: [240, 240, 240] },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' },
        7: { halign: 'right' },
      },
    });

    yPosition = doc.lastAutoTable.finalY + 15;
  }

  // Check if we need a new page
  if (yPosition > pageHeight - 40) {
    doc.addPage();
    yPosition = 20;
  }

  // Transactions Section
  doc.setFontSize(14);
  doc.text('Transactions', margin, yPosition);
  yPosition += 10;

  if (reportData.transactions && Array.isArray(reportData.transactions) && reportData.transactions.length > 0) {
    const transactionsData = [
      ['Date', 'Member Name', 'Category', 'Amount', 'Transaction ID'],
    ];

    reportData.transactions.forEach((transaction) => {
      transactionsData.push([
        transaction.date || 'N/A',
        transaction.member_name || 'N/A',
        transaction.category || 'N/A',
        formatCurrency(transaction.amount || 0),
        transaction.transaction_id || 'N/A',
      ]);
    });

    doc.autoTable({
      startY: yPosition,
      head: [transactionsData[0]],
      body: transactionsData.slice(1),
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      bodyStyles: { textColor: 0, fontSize: 8 },
      alternateRowStyles: { fillColor: [240, 240, 240] },
      columnStyles: {
        3: { halign: 'right' },
      },
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  return doc;
};

// POST /send-report-email
router.post('/send-report-email', async (req, res) => {
  const { recipientEmail, reportFormat, reportData, filters } = req.body;

  // Input validation
  if (!recipientEmail) {
    return res.status(400).json({ error: 'recipientEmail is required' });
  }

  if (!reportFormat) {
    return res.status(400).json({ error: 'reportFormat is required' });
  }

  if (!['excel', 'pdf'].includes(reportFormat)) {
    return res.status(400).json({ error: 'reportFormat must be either "excel" or "pdf"' });
  }

  if (!reportData) {
    return res.status(400).json({ error: 'reportData is required' });
  }

  logger.info(`Generating ${reportFormat} report for ${recipientEmail}`);

  let attachmentFilename;
  let fileBuffer;

  if (reportFormat === 'excel') {
    // Generate Excel file
    const workbook = generateExcelReport(reportData, filters);
    attachmentFilename = `temple-accounts-report-${new Date().toISOString().split('T')[0]}.xlsx`;
    fileBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    logger.info(`Excel report generated: ${attachmentFilename}`);
  } else if (reportFormat === 'pdf') {
    // Generate PDF file
    const doc = await generatePdfReport(reportData, filters);
    attachmentFilename = `temple-accounts-report-${new Date().toISOString().split('T')[0]}.pdf`;
    fileBuffer = Buffer.from(doc.output('arraybuffer'));
    logger.info(`PDF report generated: ${attachmentFilename}`);
  }

  // Email sending note: Email functionality must be handled by PocketBase hooks
  // This endpoint prepares the report and returns it for email delivery
  logger.info(`Report prepared for email delivery to ${recipientEmail}`);

  res.json({
    success: true,
    message: 'Report generated successfully. Email sending should be handled by PocketBase hooks.',
    filename: attachmentFilename,
    fileBuffer: fileBuffer.toString('base64'),
    recipientEmail,
    reportFormat,
  });
});

export default router;