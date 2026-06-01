import 'dotenv/config';
import express from 'express';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * NOTE: Email sending is handled by PocketBase hooks, NOT by this Express.js backend.
 * 
 * When booking messages are created in PocketBase:
 * 1. PocketBase hooks are triggered automatically
 * 2. Hooks use PocketBase's built-in mailer to send emails
 * 3. Express.js routes only create/update records
 * 4. No email sending logic should be in Express.js
 */

// POST /send-booking-message - Send message to customer regarding their booking
router.post('/send-booking-message', async (req, res) => {
  const { bookingId, message, adminId, customerEmail, customerName, poojaName } = req.body;

  // Input validation
  if (!bookingId || !message || !adminId || !customerEmail || !customerName || !poojaName) {
    return res.status(400).json({
      error: 'bookingId, message, adminId, customerEmail, customerName, and poojaName are required',
    });
  }

  if (typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'message must be a non-empty string' });
  }

  logger.info(`Processing booking message for booking: ${bookingId}, customer: ${customerEmail}`);

  // Validate admin exists
  const admin = await pb.collection('users').getOne(adminId);
  logger.info(`Found admin user: ${admin.id} - ${admin.email}`);

  // Create message record in booking_messages collection
  logger.info(`Creating booking message record for booking ${bookingId}`);
  const messageRecord = await pb.collection('booking_messages').create({
    bookingId,
    message,
    adminId,
    customerEmail,
    customerName,
    poojaName,
    sentAt: new Date().toISOString(),
  });

  logger.info(`Booking message created: ${messageRecord.id}`);
  logger.info(`Email will be sent by PocketBase hook when booking message is created`);

  res.json({
    success: true,
    messageId: messageRecord.id,
    message: 'Booking message created. Email will be sent automatically.',
  });
});

export default router;