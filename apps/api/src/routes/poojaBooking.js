import 'dotenv/config';
import express from 'express';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';
import { generatePoojaReceiptId } from '../utils/receiptIdGenerator.js';
import { generatePoojaReceipt } from '../utils/pdfReceiptGenerator.js';
import { sendPoojaBookingConfirmationEmail, sendPoojaReceiptEmail } from '../utils/emailReceiptService.js';

const router = express.Router();

logger.info('[POOJA-BOOKING-ROUTES] Initializing Pooja Booking Routes');

// POST /pooja-bookings - Create a new pooja booking
router.post('/', async (req, res) => {
  try {
    const { pooja_name, donation_amount, user_id, pooja_date, time_slot, name, email, user_contact } = req.body;

    if (!pooja_name || !donation_amount || donation_amount <= 0) {
      return res.status(400).json({ error: 'Valid pooja_name and positive donation_amount are required' });
    }

    const bookingRecord = await pb.collection('pooja_bookings').create({
      pooja_name: pooja_name.trim(),
      donation_amount,
      user_id: user_id || '',
      pooja_date: pooja_date || '',
      time_slot: time_slot || '',
      name: name || '',
      email: email || '',
      user_contact: user_contact || '',
      status: 'Pending Approval',
    });

    let emailSent = false;
    if (email) {
      try {
        await sendPoojaBookingConfirmationEmail(bookingRecord);
        emailSent = true;
      } catch (err) {
        logger.error('[POOJA-BOOKING] Email confirmation failed', { cause: err });
      }
    }

    res.status(201).json({ success: true, bookingId: bookingRecord.id, emailSent });
  } catch (error) {
    logger.error('[POOJA-BOOKING] Create failed', { cause: error });
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /pooja-bookings/send-confirmation - Confirm and generate receipt
router.post('/send-confirmation', async (req, res) => {
  const { booking_id } = req.body;
  if (!booking_id) return res.status(400).json({ error: 'booking_id is required' });

  try {
    const booking = await pb.collection('pooja_bookings').getOne(booking_id);
    const receiptId = generatePoojaReceiptId();
    const receiptGeneratedDate = new Date().toISOString().split('T')[0];

    const updatedBooking = await pb.collection('pooja_bookings').update(booking_id, {
      receipt_id: receiptId,
      receipt_created_at: receiptGeneratedDate,
      status: 'Confirmed',
    });

    // PDF and Email Logic
    const pdfBuffer = await generatePoojaReceipt(updatedBooking, receiptId);
    await sendPoojaReceiptEmail(updatedBooking, pdfBuffer, receiptId);

    res.status(200).json({ success: true, bookingId: booking_id, receiptId });
  } catch (error) {
    logger.error('[POOJA-CONFIRMATION] Confirmation failed', { cause: error });
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /pooja-bookings/:id/receipt - Download receipt
router.get('/:id/receipt', async (req, res) => {
  const { id } = req.params;
  try {
    const booking = await pb.collection('pooja_bookings').getOne(id);
    const storedReceiptId = booking.receipt_id;

    if (!storedReceiptId) {
      return res.status(404).json({ error: 'Receipt not found for this booking' });
    }

    const pdfBuffer = await generatePoojaReceipt(booking, storedReceiptId);
    const filename = `POOJA_RECEIPT_${id}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (error) {
    logger.error('[POOJA-RECEIPT-DOWNLOAD] Download failed', { cause: error });
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /pooja-bookings/:bookingId/resend-receipt - Resend receipt email
router.post('/:bookingId/resend-receipt', async (req, res) => {
  logger.info('[POOJA-RESEND-RECEIPT] ========================================');
  logger.info('[POOJA-RESEND-RECEIPT] POST /:bookingId/resend-receipt - Resend receipt request received');
  logger.info('[POOJA-RESEND-RECEIPT] ========================================');

  const { bookingId } = req.params;

  // Step 1: Validate bookingId parameter
  logger.info('[POOJA-RESEND-RECEIPT] Step 1: Validating bookingId parameter');
  if (!bookingId || typeof bookingId !== 'string' || bookingId.trim().length === 0) {
    logger.warn('[POOJA-RESEND-RECEIPT] ✗ Validation failed: Missing or invalid bookingId');
    logger.warn(`[POOJA-RESEND-RECEIPT]   - bookingId received: ${JSON.stringify(bookingId)}`);
    throw new Error('Booking ID is required and must be a non-empty string');
  }
  logger.info(`[POOJA-RESEND-RECEIPT] ✓ bookingId validated: ${bookingId}`);

  // Step 2: Fetch pooja booking record from PocketBase
  logger.info('[POOJA-RESEND-RECEIPT] Step 2: Fetching pooja booking record from PocketBase');
  logger.info(`[POOJA-RESEND-RECEIPT]   - Collection: pooja_bookings`);
  logger.info(`[POOJA-RESEND-RECEIPT]   - ID: ${bookingId}`);

  const booking = await pb.collection('pooja_bookings').getOne(bookingId);

  if (!booking) {
    logger.warn(`[POOJA-RESEND-RECEIPT] ✗ Booking not found: ${bookingId}`);
    throw new Error('Booking not found');
  }

  logger.info('[POOJA-RESEND-RECEIPT] ✓ Booking record fetched successfully');
  logger.info('[POOJA-RESEND-RECEIPT] Booking record details:');
  logger.info(`[POOJA-RESEND-RECEIPT]   - ID: ${booking.id}`);
  logger.info(`[POOJA-RESEND-RECEIPT]   - Pooja Name: ${booking.pooja_name || 'N/A'}`);
  logger.info(`[POOJA-RESEND-RECEIPT]   - Email: ${booking.email || 'N/A'}`);
  logger.info(`[POOJA-RESEND-RECEIPT]   - Amount: €${booking.donation_amount || 0}`);
  logger.info(`[POOJA-RESEND-RECEIPT]   - Status: ${booking.status || 'N/A'}`);
  logger.info(`[POOJA-RESEND-RECEIPT]   - Stored receipt_id: ${booking.receipt_id || '(not set)'}`);

  // Step 3: Validate required fields
  logger.info('[POOJA-RESEND-RECEIPT] Step 3: Validating required fields');
  const requiredFields = ['email', 'pooja_name', 'donation_amount'];
  const missingFields = [];

  requiredFields.forEach((field) => {
    if (!booking[field]) {
      missingFields.push(field);
      logger.warn(`[POOJA-RESEND-RECEIPT]   - Missing field: ${field}`);
    }
  });

  if (missingFields.length > 0) {
    logger.error('[POOJA-RESEND-RECEIPT] ✗ Validation failed: Missing required fields');
    logger.error(`[POOJA-RESEND-RECEIPT]   - Missing fields: ${missingFields.join(', ')}`);
    throw new Error(`Booking is missing required fields: ${missingFields.join(', ')}`);
  }

  logger.info('[POOJA-RESEND-RECEIPT] ✓ All required fields present');
  logger.info(`[POOJA-RESEND-RECEIPT]   - email: ${booking.email}`);
  logger.info(`[POOJA-RESEND-RECEIPT]   - pooja_name: ${booking.pooja_name}`);
  logger.info(`[POOJA-RESEND-RECEIPT]   - donation_amount: €${booking.donation_amount}`);

  // Step 4: Retrieve stored receipt_id (CRITICAL - do NOT generate new one)
  logger.info('[POOJA-RESEND-RECEIPT] Step 4: Retrieving stored receipt_id from booking record');
  const storedReceiptId = booking.receipt_id;

  if (!storedReceiptId) {
    logger.warn('[POOJA-RESEND-RECEIPT] ⚠ WARNING: No stored receipt_id found');
    logger.warn('[POOJA-RESEND-RECEIPT]   - This should not happen for confirmed bookings');
    throw new Error('No receipt_id found for this booking');
  }

  logger.info(`[POOJA-RESEND-RECEIPT] ✓ Using stored receipt_id: ${storedReceiptId}`);

  // Step 5: Generate PDF using FULL RECORD (flexible field lookup)
  logger.info('[POOJA-RESEND-RECEIPT] Step 5: Generating PDF receipt using full record');
  logger.info(`[POOJA-RESEND-RECEIPT]   - Passing full record to generatePoojaReceipt()`);
  logger.info(`[POOJA-RESEND-RECEIPT]   - Passing receipt_id: ${storedReceiptId}`);

  const pdfBuffer = await generatePoojaReceipt(booking, storedReceiptId);

  if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer)) {
    logger.error('[POOJA-RESEND-RECEIPT] ✗ PDF buffer is invalid');
    throw new Error('PDF generation failed - invalid buffer');
  }

  logger.info('[POOJA-RESEND-RECEIPT] ✓ PDF receipt generated successfully');
  logger.info(`[POOJA-RESEND-RECEIPT]   - Type: Buffer`);
  logger.info(`[POOJA-RESEND-RECEIPT]   - Size: ${pdfBuffer.length} bytes`);
  logger.info(`[POOJA-RESEND-RECEIPT]   - Is Buffer: true`);
  logger.info(`[POOJA-RESEND-RECEIPT]   - Receipt ID in PDF: ${storedReceiptId}`);

  // Step 6: Send receipt email with PDF
  logger.info('[POOJA-RESEND-RECEIPT] Step 6: Sending receipt email with PDF attachment');
  logger.info(`[POOJA-RESEND-RECEIPT]   - Recipient: ${booking.email}`);
  logger.info(`[POOJA-RESEND-RECEIPT]   - Pooja Name: ${booking.pooja_name}`);
  logger.info(`[POOJA-RESEND-RECEIPT]   - Amount: €${booking.donation_amount}`);
  logger.info(`[POOJA-RESEND-RECEIPT]   - Receipt ID: ${storedReceiptId}`);
  logger.info(`[POOJA-RESEND-RECEIPT]   - PDF Size: ${pdfBuffer.length} bytes`);

  await sendPoojaReceiptEmail(booking, pdfBuffer, storedReceiptId);

  logger.info('[POOJA-RESEND-RECEIPT] ✓ Receipt email sent successfully');

  // Step 7: Return success response
  logger.info('[POOJA-RESEND-RECEIPT] ========================================');
  logger.info('[POOJA-RESEND-RECEIPT] ✓ RECEIPT RESEND COMPLETED SUCCESSFULLY');
  logger.info('[POOJA-RESEND-RECEIPT] ========================================');
  logger.info(`[POOJA-RESEND-RECEIPT] Booking ID: ${bookingId}`);
  logger.info(`[POOJA-RESEND-RECEIPT] Receipt ID: ${storedReceiptId}`);
  logger.info(`[POOJA-RESEND-RECEIPT] Email Sent: YES`);

  res.json({
    success: true,
    message: `Receipt email sent successfully to ${booking.email}`,
    receiptNumber: storedReceiptId,
    bookingId: bookingId,
    email: booking.email,
    poojaName: booking.pooja_name,
    amount: booking.donation_amount,
  });
});

// GET all bookings
router.get('/', async (req, res) => {
  try {
    const records = await pb.collection('pooja_bookings').getFullList({ sort: '-created' });
    res.json(records);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE booking
router.delete('/:id', async (req, res) => {
  try {
    await pb.collection('pooja_bookings').delete(req.params.id);
    res.json({ success: true, message: 'Booking deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;