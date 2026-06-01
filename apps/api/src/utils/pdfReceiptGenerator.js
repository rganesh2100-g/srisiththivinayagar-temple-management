import 'dotenv/config';
import PDFDocument from 'pdfkit';
import logger from './logger.js';

/**
 * FLEXIBLE FIELD LOOKUP HELPER
 */
export const getFieldValue = (record, possibleNames, fieldDescription) => {
  if (!record || typeof record !== 'object') {
    logger.warn(`[FIELD-LOOKUP] Record is not an object for ${fieldDescription}`);
    return null;
  }
  for (const fieldName of possibleNames) {
    if (record[fieldName] !== undefined && record[fieldName] !== null && record[fieldName] !== '') {
      return record[fieldName];
    }
  }
  return null;
};

const formatCurrency = (amount) => {
  if (typeof amount !== 'number' || isNaN(amount)) return '€0.00';
  return `€${parseFloat(amount).toFixed(2)}`;
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

const fetchLogoBuffer = async () => {
  try {
    const res = await fetch('https://horizons-cdn.hostinger.com/5e34f49c-00e8-4e55-9306-3c6d20c04e0a/379602fce394f1f705c6749b4795cda8.png');
    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }
  } catch (error) {
    logger.warn('[PDF-RECEIPT] Failed to fetch temple logo', { cause: error });
  }
  return null;
};

const drawHeader = (doc, logoBuffer, margin, contentWidth, title) => {
  let yPosition = 20;
  if (logoBuffer) {
    doc.image(logoBuffer, margin, yPosition, { fit: [contentWidth, 60], align: 'center' });
    yPosition += 65;
  }
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#8B0000').text('Sri Sitthi Vinayagar Tempel Kultur Verein e.V', margin, yPosition, { align: 'center', width: contentWidth });
  yPosition += 14;
  doc.fontSize(9).font('Helvetica').fillColor('#333333').text('Humboldt Str.103, 90459 Nürnberg', margin, yPosition, { align: 'center', width: contentWidth });
  yPosition += 11;
  doc.text('Tel.No. 0911 43958088 • Re. No: VR201235', margin, yPosition, { align: 'center', width: contentWidth });
  yPosition += 15;
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#8B0000').text(title, margin, yPosition, { width: contentWidth, align: 'center' });
  yPosition += 18;
  doc.strokeColor('#8B0000').lineWidth(1).moveTo(margin, yPosition).lineTo(doc.page.width - margin, yPosition).stroke();
  yPosition += 10;
  return yPosition;
};

/**
 * DONATION RECEIPT PDF GENERATOR
 */
export const generateDonationReceiptPDF = async (donationRecord, receiptId) => {
  if (!receiptId) throw new Error('Receipt ID is required');
  const logoBuffer = await fetchLogoBuffer();
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margins: { top: 20, left: 20, right: 20, bottom: 20 } });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (error) => reject(new Error('PDF Error', { cause: error })));
      drawHeader(doc, logoBuffer, 20, 555, 'DONATION RECEIPT');
      doc.end();
    } catch (e) { reject(new Error('Failed Donation PDF', { cause: e })); }
  });
};

/**
 * POOJA RECEIPT PDF GENERATOR
 */
export const generatePoojaReceipt = async (bookingRecord, receiptId) => {
  if (!receiptId || typeof receiptId !== 'string' || receiptId.trim() === '') {
    throw new Error('Receipt ID parameter is required and must be a non-empty string');
  }

  const customerName = getFieldValue(bookingRecord, ['name', 'customer_name', 'user_name', 'full_name'], 'customer name') || 'Valued Customer';
  const customerEmail = getFieldValue(bookingRecord, ['email', 'customer_email', 'user_email'], 'customer email') || 'N/A';
  const poojaName = getFieldValue(bookingRecord, ['pooja_name', 'pooja_type', 'service_name'], 'pooja name') || 'Pooja Service';
  const amount = getFieldValue(bookingRecord, ['donation_amount', 'amount', 'fee_amount', 'total'], 'booking amount') || 0;
  const poojaDate = getFieldValue(bookingRecord, ['pooja_date', 'booking_date', 'scheduled_date'], 'pooja date') || 'To be scheduled';
  const timeSlot = getFieldValue(bookingRecord, ['time_slot', 'booking_time', 'scheduled_time'], 'time slot') || 'To be confirmed';
  const phone = getFieldValue(bookingRecord, ['user_contact', 'phone', 'contact_number'], 'phone number') || 'N/A';
  const receiptDate = getFieldValue(bookingRecord, ['receipt_date', 'created', 'created_at', 'createdAt'], 'receipt date') || new Date().toISOString();

  const logoBuffer = await fetchLogoBuffer();

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margins: { top: 20, left: 20, right: 20, bottom: 20 } });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (error) => reject(new Error(`Pooja PDF Error: ${error.message}`, { cause: error })));

      let yPosition = drawHeader(doc, logoBuffer, 20, doc.page.width - 40, 'POOJA BOOKING RECEIPT');

      const details = [
        { label: 'Receipt Number', value: receiptId },
        { label: 'Date', value: formatDate(receiptDate) },
        { label: 'Devotee Name', value: customerName },
        { label: 'Email', value: customerEmail },
        { label: 'Phone', value: phone },
      ];

      details.forEach((d) => {
        doc.fontSize(10).font('Helvetica-Bold').text(`${d.label}:`, 20, yPosition, { width: 100 });
        doc.font('Helvetica').text(d.value, 130, yPosition);
        yPosition += 16;
      });

      yPosition += 10;
      doc.fontSize(10).font('Helvetica-Bold').text('Pooja Details:', 20, yPosition);
      yPosition += 14;

      const poojaDetails = [
        { label: 'Pooja Type', value: poojaName },
        { label: 'Scheduled Date', value: poojaDate },
        { label: 'Time Slot', value: timeSlot },
      ];

      poojaDetails.forEach((d) => {
        doc.fontSize(9).font('Helvetica-Bold').text(`${d.label}:`, 20, yPosition, { width: 100 });
        doc.font('Helvetica').text(d.value, 130, yPosition);
        yPosition += 12;
      });

      yPosition += 10;
      doc.fontSize(20).font('Helvetica-Bold').fillColor('#8B0000').text(formatCurrency(amount), 20, yPosition, { align: 'center' });
      
      doc.end();
    } catch (error) {
      reject(new Error(`Failed to generate pooja PDF: ${error.message}`, { cause: error }));
    }
  });
};

/**
 * PREMIUM SUBSCRIBE RECEIPT PDF GENERATOR
 */
export const generatePremiumSubscribeReceipt = async (subscriptionData) => {
  const { receiptId } = subscriptionData;
  if (!receiptId) throw new Error('Receipt ID is required');
  const logoBuffer = await fetchLogoBuffer();
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margins: { top: 20, left: 20, right: 20, bottom: 20 } });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (error) => reject(new Error('Premium PDF Error', { cause: error })));
      drawHeader(doc, logoBuffer, 20, 555, 'PREMIUM SUBSCRIPTION RECEIPT');
      doc.end();
    } catch (e) { reject(new Error('Failed Premium PDF', { cause: e })); }
  });
};

/**
 * SUBSCRIPTION RECEIPT PDF GENERATOR
 */
export const generateSubscriptionReceipt = async (subscriptionData) => {
    const { receiptId } = subscriptionData;
    if (!receiptId) throw new Error('Receipt ID is required');
    const logoBuffer = await fetchLogoBuffer();
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margins: { top: 20, left: 20, right: 20, bottom: 20 } });
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (error) => reject(new Error('Subscription PDF Error', { cause: error })));
        drawHeader(doc, logoBuffer, 20, 555, 'SUBSCRIPTION RECEIPT');
        doc.end();
      } catch (e) { reject(new Error('Failed Subscription PDF', { cause: e })); }
    });
};

/**
 * PAYMENT VOUCHER PDF GENERATOR
 */
export const generatePaymentVoucherPDF = async (voucherData) => {
    const { voucherId } = voucherData;
    if (!voucherId) throw new Error('Voucher ID is required');
    const logoBuffer = await fetchLogoBuffer();
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margins: { top: 20, left: 20, right: 20, bottom: 20 } });
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (error) => reject(new Error('Voucher PDF Error', { cause: error })));
        drawHeader(doc, logoBuffer, 20, 555, 'PAYMENT VOUCHER');
        doc.end();
      } catch (e) { reject(new Error('Failed Voucher PDF', { cause: e })); }
    });
};

export default {
  generateDonationReceiptPDF,
  generatePoojaReceipt,
  generatePremiumSubscribeReceipt,
  generateSubscriptionReceipt,
  generatePaymentVoucherPDF,
  getFieldValue,
  formatCurrency,
  formatDate,
};