import 'dotenv/config';
import { jsPDF } from 'jspdf';
import logger from './logger.js';

// Helper function to generate unique receipt ID
const generateReceiptId = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9).toUpperCase();
  return `RCP-${timestamp}-${random}`;
};

// Helper function to format currency (USD)
const formatCurrency = (amount) => {
  return '$' + parseFloat(amount).toFixed(2);
};

// Helper function to format date as DD.MM.YYYY (German format)
const formatDateGerman = (dateString) => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

// Helper function to format date as readable string
const formatDateReadable = (dateString) => {
  const date = new Date(dateString);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${month} ${day}, ${year}`;
};

// Helper function to format current timestamp
const formatCurrentTimestamp = () => {
  const date = new Date();
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const day = String(date.getDate()).padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${month} ${day}, ${year} at ${hours}:${minutes}:${seconds}`;
};

// Helper function to create receipt PDF
const createReceiptPDF = async (receiptData) => {
  try {
    const {
      receiptId,
      type,
      poojaName,
      donationCategory,
      amount,
      approvalDate,
      userName,
      userEmail,
      bookingId,
      donationId,
    } = receiptData;

    logger.info(`[RECEIPT-GENERATOR] Creating receipt PDF for ${receiptId}`);
    logger.info(`[RECEIPT-GENERATOR] Type: ${type}, Amount: $${amount}, User: ${userName}`);

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPosition = margin;

    // Header
    doc.setFontSize(24);
    doc.setTextColor(139, 0, 0); // Dark red color
    doc.text('RECEIPT', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Temple name/info
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('Temple Administration', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 5;
    doc.setFontSize(10);
    doc.text('Official Receipt Document', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 12;

    // Divider line
    doc.setDrawColor(139, 0, 0);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    // Receipt details section
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);

    // Receipt ID
    doc.text('Receipt ID:', margin, yPosition);
    doc.setFont(undefined, 'bold');
    doc.text(receiptId, pageWidth - margin - 50, yPosition, { align: 'left' });
    doc.setFont(undefined, 'normal');
    yPosition += 8;

    // Date
    doc.text('Date:', margin, yPosition);
    doc.setFont(undefined, 'bold');
    const formattedDate = formatDateReadable(approvalDate);
    doc.text(formattedDate, pageWidth - margin - 50, yPosition, { align: 'left' });
    doc.setFont(undefined, 'normal');
    yPosition += 8;

    // Type
    doc.text('Type:', margin, yPosition);
    doc.setFont(undefined, 'bold');
    const receiptType = type === 'pooja' ? 'Pooja Booking' : 'Donation';
    doc.text(receiptType, pageWidth - margin - 50, yPosition, { align: 'left' });
    doc.setFont(undefined, 'normal');
    yPosition += 12;

    // Divider line
    doc.setDrawColor(139, 0, 0);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    // Recipient information
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Recipient Information', margin, yPosition);
    doc.setFont(undefined, 'normal');
    yPosition += 8;

    doc.setFontSize(10);
    doc.text(`Name: ${userName}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Email: ${userEmail}`, margin, yPosition);
    yPosition += 12;

    // Transaction details
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Transaction Details', margin, yPosition);
    doc.setFont(undefined, 'normal');
    yPosition += 8;

    doc.setFontSize(10);
    if (type === 'pooja') {
      doc.text(`Pooja Name: ${poojaName}`, margin, yPosition);
      yPosition += 6;
      doc.text(`Booking ID: ${bookingId}`, margin, yPosition);
    } else {
      doc.text(`Donation Category: ${donationCategory}`, margin, yPosition);
      yPosition += 6;
      doc.text(`Donation ID: ${donationId}`, margin, yPosition);
    }
    yPosition += 12;

    // Amount section
    doc.setDrawColor(139, 0, 0);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(139, 0, 0);
    doc.text('Amount:', margin, yPosition);
    doc.text(formatCurrency(amount), pageWidth - margin, yPosition, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    yPosition += 12;

    // Divider line
    doc.setDrawColor(139, 0, 0);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 15;

    // Footer message
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    const footerText = 'This is an official receipt from the Temple Administration.\nPlease keep this document for your records.';
    doc.text(footerText, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Page number and timestamp
    doc.setFontSize(8);
    const timestamp = formatCurrentTimestamp();
    doc.text(
      `Generated on: ${timestamp}`,
      pageWidth / 2,
      pageHeight - margin,
      { align: 'center' }
    );

    // Convert PDF to buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    logger.info(`[RECEIPT-GENERATOR] ✓ Receipt PDF created successfully for ${receiptId}, size: ${pdfBuffer.length} bytes`);

    return pdfBuffer;
  } catch (error) {
    logger.error(`[RECEIPT-GENERATOR] ✗ Error creating receipt PDF: ${error.message}`);
    throw new Error(`Failed to create receipt PDF: ${error.message}`, { cause: error });
  }
};

export const receiptGenerator = {
  generateReceiptId,
  createReceiptPDF,
  formatCurrency,
  formatDateGerman,
  formatDateReadable,
  formatCurrentTimestamp,
};