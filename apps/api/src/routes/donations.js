import 'dotenv/config';
import express from 'express';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';

const router = express.Router();

logger.info('[DONATIONS-ROUTES] ========================================');
logger.info('[DONATIONS-ROUTES] Initializing Donations Routes');
logger.info('[DONATIONS-ROUTES] ========================================');

/**
 * GET /donations - Fetch all donations from PocketBase
 *
 * Returns all donation records from the donations collection,
 * sorted by created date in descending order (newest first).
 *
 * Response: Array of donation records
 * Each item: { id, amount, category, status, created, ... }
 *
 * Security: No authentication required (public endpoint)
 */
router.get('/', async (req, res) => {
  logger.info('[DONATIONS-GET] ========================================');
  logger.info('[DONATIONS-GET] GET / - Fetch all donations request received');
  logger.info('[DONATIONS-GET] ========================================');
  logger.info(`[DONATIONS-GET] Timestamp: ${new Date().toISOString()}`);

  // Step 1: Fetch all donations from PocketBase
  logger.info('[DONATIONS-GET] Step 1: Fetching all donations from PocketBase');
  logger.info('[DONATIONS-GET]   - Collection: donations');
  logger.info('[DONATIONS-GET]   - Sort: -created (descending)');

  const donations = await pb.collection('donations').getFullList({
    sort: '-created',
  });

  logger.info('[DONATIONS-GET] ✓ Donations fetched successfully from PocketBase');
  logger.info(`[DONATIONS-GET]   - Total donations: ${donations.length}`);

  // Step 2: Return donations array
  logger.info('[DONATIONS-GET] Step 2: Returning donations array');

  logger.info('[DONATIONS-GET] ========================================');
  logger.info('[DONATIONS-GET] ✓ GET DONATIONS COMPLETED SUCCESSFULLY');
  logger.info('[DONATIONS-GET] ========================================');
  logger.info(`[DONATIONS-GET] Response count: ${donations.length}`);

  res.json(donations);
});

// POST /donations - Create a new donation
router.post('/', async (req, res, next) => {
  try {
    logger.info('[DONATIONS] ========================================');
    logger.info('[DONATIONS] POST / - Create donation request received');
    logger.info('[DONATIONS] ========================================');
    logger.info('[DONATIONS] API Request Body:', JSON.stringify(req.body, null, 2));

    const {
      amount,
      category,
      donation_date,
      donor_name,
      donor_email,
      donor_phone,
      notes,
      special_occasion,
      user_id,
    } = req.body;

    // Step 1: Validate REQUIRED fields
    logger.info('[DONATIONS] Step 1: Validating fields');

    if (amount === undefined || amount === null || amount === '') {
      throw new Error('amount is required and must be a positive number');
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new Error('amount must be a valid positive number');
    }

    if (!category || typeof category !== 'string' || category.trim().length === 0) {
      throw new Error('category is required and must be a non-empty string');
    }

    // Validate donor info
    if (!donor_name || typeof donor_name !== 'string' || donor_name.trim().length === 0) {
      throw new Error('donor_name is required');
    }
    if (!donor_email || typeof donor_email !== 'string' || donor_email.trim().length === 0) {
      throw new Error('donor_email is required');
    }
    if (!donor_phone || typeof donor_phone !== 'string' || donor_phone.trim().length === 0) {
      throw new Error('donor_phone is required');
    }

    logger.info(`[DONATIONS] ✓ Validated Donor: ${donor_name}, ${donor_email}, ${donor_phone}`);

    // Step 2: Build the record object
    const safeName = donor_name.trim();
    const safeEmail = donor_email.trim();
    const safePhone = donor_phone.trim();
    const safeNotes = notes ? notes.trim() : 'None';
    
    const combinedNotes = `Name: ${safeName} | Email: ${safeEmail} | Phone: ${safePhone} | Notes: ${safeNotes}`;

    const recordData = {
      amount: parsedAmount,
      category: category.trim(),
      status: 'pending',
      notes: combinedNotes,
    };

    if (user_id) recordData.user_id = user_id.trim();
    if (donation_date) recordData.donation_date = donation_date;
    if (special_occasion) recordData.special_occasion = special_occasion.trim();

    logger.info('[DONATIONS] PocketBase Payload (Data being sent to PB):');
    logger.info(JSON.stringify(recordData, null, 2));

    // Step 3: Create donation record in PocketBase
    const donationRecord = await pb.collection('donations').create(recordData, { $autoCancel: false });
    logger.info(`[DONATIONS] ✓ Donation record created successfully. ID: ${donationRecord.id}`);

    res.status(201).json({
      success: true,
      donationId: donationRecord.id,
      message: 'Donation created successfully',
      donation: {
        id: donationRecord.id,
        amount: donationRecord.amount,
        category: donationRecord.category,
        status: donationRecord.status,
        created: donationRecord.created,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /donations/approve - Approve a pending donation
router.post('/approve', async (req, res) => {
  let currentStep = 'INITIALIZATION';
  try {
    currentStep = 'VALIDATION';
    logger.info('[DONATIONS-APPROVE] ========================================');
    logger.info(`[DONATIONS-APPROVE] APPROVAL_REQUEST_RECEIVED: ${JSON.stringify(req.body)}`);
    logger.info('[DONATIONS-APPROVE] ========================================');

    const { donationId } = req.body;

    if (!donationId || typeof donationId !== 'string' || donationId.trim().length === 0) {
      throw new Error('donationId is required and must be a non-empty string');
    }

    logger.info(`[DONATIONS-APPROVE] DONATION_ID = ${donationId}`);
    logger.info(`[DONATIONS-APPROVE] USER_ID = ${req.body.userId || 'Not provided in body'}`);

    // STEP 1: Fetch donation record
    currentStep = 'FETCHING_DONATION';
    logger.info(`[DONATIONS-APPROVE] STEP 1: FETCHING_DONATION: ${donationId}`);
    const donation = await pb.collection('donations').getOne(donationId);
    
    logger.info(`[DONATIONS-APPROVE] ✓ DONATION_RECORD_FETCHED`);
    logger.info(`[DONATIONS-APPROVE] DONATION_RECORD_DETAILS:`);
    logger.info(`[DONATIONS-APPROVE]   - id: ${donation.id}`);
    logger.info(`[DONATIONS-APPROVE]   - amount: ${donation.amount}`);
    logger.info(`[DONATIONS-APPROVE]   - category: ${donation.category}`);
    logger.info(`[DONATIONS-APPROVE]   - status: ${donation.status}`);
    logger.info(`[DONATIONS-APPROVE]   - notes: ${donation.notes}`);
    logger.info(`[DONATIONS-APPROVE]   - receipt_id: ${donation.receipt_id || 'null'}`);

    // STEP 2: Log current status
    currentStep = 'STATUS_CHECK';
    logger.info(`[DONATIONS-APPROVE] STEP 2: CHECKING_DONATION_STATUS`);
    logger.info(`[DONATIONS-APPROVE] Current status: "${donation.status}"`);
    logger.info(`[DONATIONS-APPROVE] Expected status: "pending"`);

    // STEP 3: Check if status is 'pending' BEFORE any update
    logger.info(`[DONATIONS-APPROVE] STEP 3: VALIDATING_STATUS_IS_PENDING`);
    if (donation.status !== 'pending') {
      logger.error(`[DONATIONS-APPROVE] ✗ STATUS_CHECK_FAILED`);
      logger.error(`[DONATIONS-APPROVE] Donation status must be 'pending' to approve`);
      logger.error(`[DONATIONS-APPROVE] Current status: "${donation.status}"`);
      throw new Error(`Donation status must be 'pending' to approve. Current status: "${donation.status}"`);
    }
    logger.info(`[DONATIONS-APPROVE] ✓ STATUS_CHECK_PASSED: Status is 'pending'`);

    // STEP 4: Extract and validate email from donation record
    currentStep = 'EMAIL_EXTRACTION';
    logger.info(`[DONATIONS-APPROVE] STEP 4: EXTRACTING_AND_VALIDATING_EMAIL`);
    logger.info(`[DONATIONS-APPROVE] NOTES_FIELD_CONTENT: "${donation.notes}"`);

    // Try to get email from direct fields first
    let donorEmail = donation.donor_email || donation.email || null;
    logger.info(`[DONATIONS-APPROVE] Direct email field: ${donorEmail || 'null'}`);

    // If no direct email, parse from notes
    if (!donorEmail && donation.notes) {
      logger.info(`[DONATIONS-APPROVE] Attempting to parse email from notes field`);
      const emailMatch = donation.notes.match(/Email:\s*([^|]+)/i);
      if (emailMatch) {
        donorEmail = emailMatch[1].trim();
        logger.info(`[DONATIONS-APPROVE] ✓ Extracted email from notes: "${donorEmail}"`);
      } else {
        logger.warn(`[DONATIONS-APPROVE] ⚠ Could not find Email: pattern in notes`);
      }
    }

    logger.info(`[DONATIONS-APPROVE] Email value before validation: "${donorEmail}"`);

    // STEP 5: Validate email format
    currentStep = 'EMAIL_VALIDATION';
    logger.info(`[DONATIONS-APPROVE] STEP 5: VALIDATING_EMAIL_FORMAT`);
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!donorEmail || typeof donorEmail !== 'string' || !emailRegex.test(donorEmail)) {
      logger.error(`[DONATIONS-APPROVE] ✗ EMAIL_VALIDATION_FAILED`);
      logger.error(`[DONATIONS-APPROVE] Invalid email address: "${donorEmail}"`);
      logger.error(`[DONATIONS-APPROVE] Email must match pattern: something@something.something`);
      throw new Error(`Cannot extract valid email from donation record. Email: "${donorEmail}"`);
    }
    logger.info(`[DONATIONS-APPROVE] ✓ EMAIL_VALIDATION_PASSED`);
    logger.info(`[DONATIONS-APPROVE] Valid email: "${donorEmail}"`);

    // STEP 6: Generate receipt ID (ONCE)
    currentStep = 'RECEIPT_ID_GENERATION';
    logger.info(`[DONATIONS-APPROVE] STEP 6: GENERATING_RECEIPT_ID`);
    const receiptId = `DONATION_${Math.floor(Date.now() / 1000)}_${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`;
    logger.info(`[DONATIONS-APPROVE] ✓ RECEIPT_ID_GENERATED: ${receiptId}`);
    logger.info(`[DONATIONS-APPROVE] Generated receipt ID format: DONATION_XXXXXXXXX_XXXXXX`);

    // STEP 7: Update donation status to 'approved' and store receipt_id
    currentStep = 'DATABASE_UPDATE';
    logger.info(`[DONATIONS-APPROVE] STEP 7: UPDATING_DONATION_IN_DATABASE`);
    const receiptGeneratedDate = new Date().toISOString().split('T')[0];
    const updateData = {
      receipt_id: receiptId,
      receipt_generated_date: receiptGeneratedDate,
      status: 'approved',
    };
    
    logger.info(`[DONATIONS-APPROVE] UPDATE_DATA: ${JSON.stringify(updateData)}`);
    const updatedDonation = await pb.collection('donations').update(donationId, updateData);
    logger.info(`[DONATIONS-APPROVE] ✓ DONATION_UPDATED_IN_DATABASE`);
    logger.info(`[DONATIONS-APPROVE]   - receipt_id: ${updatedDonation.receipt_id}`);
    logger.info(`[DONATIONS-APPROVE]   - receipt_generated_date: ${updatedDonation.receipt_generated_date}`);
    logger.info(`[DONATIONS-APPROVE]   - status: ${updatedDonation.status}`);

    if (!updatedDonation.receipt_id) {
      throw new Error('Failed to save receipt_id to database - update returned empty receipt_id');
    }

    // STEP 8: Generate PDF
    currentStep = 'PDF_GENERATION';
    logger.info(`[DONATIONS-APPROVE] STEP 8: GENERATING_PDF_RECEIPT`);
    logger.info(`[DONATIONS-APPROVE] PDF_GENERATION_START for receipt_id: ${receiptId}`);
    logger.info(`[DONATIONS-APPROVE] Passing to PDF generator - receipt_id: ${receiptId}`);
    
    const { generateDonationReceiptPDF } = await import('../utils/pdfReceiptGenerator.js');
    const pdfBuffer = await generateDonationReceiptPDF(updatedDonation, updatedDonation.receipt_id);
    
    logger.info(`[DONATIONS-APPROVE] ✓ PDF_GENERATED`);
    logger.info(`[DONATIONS-APPROVE]   - Size: ${pdfBuffer.length} bytes`);
    logger.info(`[DONATIONS-APPROVE]   - Is Buffer: ${Buffer.isBuffer(pdfBuffer)}`);

    // STEP 9: Send email
    currentStep = 'EMAIL_SENDING';
    logger.info(`[DONATIONS-APPROVE] STEP 9: SENDING_RECEIPT_EMAIL`);
    logger.info(`[DONATIONS-APPROVE] EMAIL_RECIPIENT: ${donorEmail}`);
    logger.info(`[DONATIONS-APPROVE] EMAIL_ATTACHMENT_INFO:`);
    logger.info(`[DONATIONS-APPROVE]   - filename: Receipt-${receiptId}.pdf`);
    logger.info(`[DONATIONS-APPROVE]   - size: ${pdfBuffer.length} bytes`);
    logger.info(`[DONATIONS-APPROVE]   - receiptId: ${receiptId}`);
    
    const { sendDonationReceiptEmail } = await import('../utils/emailReceiptService.js');
    await sendDonationReceiptEmail(updatedDonation, pdfBuffer, updatedDonation.receipt_id);
    
    logger.info(`[DONATIONS-APPROVE] ✓ EMAIL_SENT_SUCCESS`);

    logger.info('[DONATIONS-APPROVE] ========================================');
    logger.info('[DONATIONS-APPROVE] ✓ DONATION APPROVED SUCCESSFULLY');
    logger.info('[DONATIONS-APPROVE] ========================================');
    logger.info(`[DONATIONS-APPROVE] Donation ID: ${donationId}`);
    logger.info(`[DONATIONS-APPROVE] Receipt ID: ${receiptId}`);
    logger.info(`[DONATIONS-APPROVE] Email Sent: YES`);
    logger.info(`[DONATIONS-APPROVE] Recipient: ${donorEmail}`);

    res.json({
      success: true,
      message: 'Donation approved successfully',
      receipt_id: updatedDonation.receipt_id,
      donation: {
        id: updatedDonation.id,
        status: updatedDonation.status,
        amount: updatedDonation.amount,
        category: updatedDonation.category,
        approval_date: updatedDonation.approval_date,
        receipt_id: updatedDonation.receipt_id,
        receipt_generated_date: updatedDonation.receipt_generated_date,
        updated: updatedDonation.updated,
      },
    });
  } catch (error) {
    logger.error(`[DONATIONS-APPROVE] ========================================`);
    logger.error(`[DONATIONS-APPROVE] ✗ APPROVAL_FAILED`);
    logger.error(`[DONATIONS-APPROVE] ========================================`);
    logger.error(`[DONATIONS-APPROVE] ERROR_STEP: ${currentStep}`);
    logger.error(`[DONATIONS-APPROVE] ERROR_MESSAGE: ${error.message}`);
    logger.error(`[DONATIONS-APPROVE] ERROR_STACK: ${error.stack}`);
    res.status(500).json({ error: error.message, step: currentStep });
  }
});

// POST /donations/reject - Reject a pending donation
router.post('/reject', async (req, res) => {
  logger.info('[DONATIONS-REJECT] ========================================');
  logger.info('[DONATIONS-REJECT] POST /reject - Reject donation request received');
  logger.info('[DONATIONS-REJECT] ========================================');
  logger.info('[DONATIONS-REJECT] Request body:', JSON.stringify(req.body, null, 2));

  const { donationId } = req.body;

  // Step 1: Validate donationId
  logger.info('[DONATIONS-REJECT] Step 1: Validating donationId');
  if (!donationId || typeof donationId !== 'string' || donationId.trim().length === 0) {
    logger.warn('[DONATIONS-REJECT] ✗ Validation failed: Missing or invalid donationId');
    logger.warn(`[DONATIONS-REJECT]   - donationId received: ${JSON.stringify(donationId)}`);
    throw new Error('donationId is required and must be a non-empty string');
  }
  logger.info(`[DONATIONS-REJECT] ✓ donationId validated: ${donationId}`);

  // Step 2: Fetch donation record
  logger.info('[DONATIONS-REJECT] Step 2: Fetching donation record from PocketBase');
  logger.info(`[DONATIONS-REJECT]   - Collection: donations`);
  logger.info(`[DONATIONS-REJECT]   - ID: ${donationId}`);

  const donation = await pb.collection('donations').getOne(donationId);

  if (!donation) {
    logger.warn(`[DONATIONS-REJECT] ✗ Donation not found: ${donationId}`);
    throw new Error(`Donation with ID ${donationId} not found`);
  }

  logger.info('[DONATIONS-REJECT] ✓ Donation record fetched successfully');
  logger.info('[DONATIONS-REJECT] Donation record details:');
  logger.info(`[DONATIONS-REJECT]   - Status: ${donation.status}`);
  logger.info(`[DONATIONS-REJECT]   - Amount: €${donation.amount}`);
  logger.info(`[DONATIONS-REJECT]   - Category: ${donation.category}`);

  // Step 3: Verify donation status is 'pending'
  logger.info('[DONATIONS-REJECT] Step 3: Verifying donation status is pending');
  if (donation.status !== 'pending') {
    logger.warn(`[DONATIONS-REJECT] ✗ Donation status is not pending`);
    logger.warn(`[DONATIONS-REJECT]   - Current status: ${donation.status}`);
    throw new Error(`Donation status must be 'pending' to reject. Current status: ${donation.status}`);
  }
  logger.info('[DONATIONS-REJECT] ✓ Donation status is pending');

  // Step 4: Update donation status to 'rejected'
  logger.info('[DONATIONS-REJECT] Step 4: Updating donation status to rejected');

  const updatedDonation = await pb.collection('donations').update(donationId, {
    status: 'rejected',
  });

  logger.info('[DONATIONS-REJECT] ✓ Donation status updated to rejected');
  logger.info(`[DONATIONS-REJECT]   - Updated at: ${updatedDonation.updated}`);

  logger.info('[DONATIONS-REJECT] ========================================');
  logger.info('[DONATIONS-REJECT] ✓ DONATION REJECTED SUCCESSFULLY');
  logger.info('[DONATIONS-REJECT] ========================================');
  logger.info(`[DONATIONS-REJECT] Donation ID: ${donationId}`);
  logger.info(`[DONATIONS-REJECT] Status: ${updatedDonation.status}`);
  logger.info(`[DONATIONS-REJECT] Amount: €${updatedDonation.amount}`);
  logger.info(`[DONATIONS-REJECT] Category: ${updatedDonation.category}`);

  res.json({
    success: true,
    message: 'Donation rejected successfully',
    donation: {
      id: updatedDonation.id,
      status: updatedDonation.status,
      amount: updatedDonation.amount,
      category: updatedDonation.category,
    },
  });
});

// GET /receipts/donations/:donationId/generate-receipt - Download donation receipt PDF
router.get('/receipts/:donationId/generate-receipt', async (req, res) => {
  const { donationId } = req.params;

  logger.info('[DONATIONS-RECEIPT-DOWNLOAD] ========================================');
  logger.info('[DONATIONS-RECEIPT-DOWNLOAD] GET /receipts/:donationId/generate-receipt');
  logger.info('[DONATIONS-RECEIPT-DOWNLOAD] ========================================');
  logger.info(`[DONATIONS-RECEIPT-DOWNLOAD] Donation ID: ${donationId}`);

  if (!donationId || typeof donationId !== 'string' || donationId.trim().length === 0) {
    logger.warn('[DONATIONS-RECEIPT-DOWNLOAD] ✗ Validation failed: Missing or invalid donationId');
    throw new Error('Donation ID is required and must be a non-empty string');
  }

  // Step 1: Fetch donation record
  logger.info('[DONATIONS-RECEIPT-DOWNLOAD] Step 1: Fetching donation record');
  const donation = await pb.collection('donations').getOne(donationId, { $autoCancel: false });

  if (!donation) {
    logger.warn(`[DONATIONS-RECEIPT-DOWNLOAD] ✗ Donation not found: ${donationId}`);
    throw new Error(`Donation with ID ${donationId} not found`);
  }

  if (donation.status !== 'approved') {
    logger.warn('[DONATIONS-RECEIPT-DOWNLOAD] ✗ Donation status is not approved');
    throw new Error(`Donation status must be 'approved' to download receipt. Current status: ${donation.status}`);
  }

  // Step 2: Verify receipt_id exists
  logger.info('[DONATIONS-RECEIPT-DOWNLOAD] Step 2: Verifying receipt_id exists');
  const storedReceiptId = donation.receipt_id;
  
  if (!storedReceiptId) {
    logger.warn('[DONATIONS-RECEIPT-DOWNLOAD] ⚠ WARNING: No stored receipt_id found');
    throw new Error('No receipt_id found for approved donation');
  }
  
  if (!storedReceiptId.startsWith('DONATION_')) {
    logger.warn(`[DONATIONS-RECEIPT-DOWNLOAD] ⚠ WARNING: receipt_id does not start with DONATION_`);
    logger.warn(`[DONATIONS-RECEIPT-DOWNLOAD]   - receipt_id: ${storedReceiptId}`);
  }
  
  logger.info(`[DONATIONS-RECEIPT-DOWNLOAD] ✓ Using stored receipt_id: ${storedReceiptId}`);

  // Step 3: Generate PDF using FULL RECORD (flexible field lookup)
  logger.info('[DONATIONS-RECEIPT-DOWNLOAD] Step 3: Generating PDF receipt with stored receipt_id');
  logger.info(`[DONATIONS-RECEIPT-DOWNLOAD]   - Passing full record to generateDonationReceiptPDF()`);
  logger.info(`[DONATIONS-RECEIPT-DOWNLOAD]   - Passing receipt_id: ${storedReceiptId}`);

  const { generateDonationReceiptPDF } = await import('../utils/pdfReceiptGenerator.js');
  const pdfBuffer = await generateDonationReceiptPDF(donation, storedReceiptId);

  if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer)) {
    logger.error('[DONATIONS-RECEIPT-DOWNLOAD] ✗ PDF buffer is invalid');
    throw new Error('PDF generation failed - invalid buffer');
  }

  logger.info('[DONATIONS-RECEIPT-DOWNLOAD] ✓ PDF generated successfully');
  logger.info(`[DONATIONS-RECEIPT-DOWNLOAD]   - Size: ${pdfBuffer.length} bytes`);
  logger.info(`[DONATIONS-RECEIPT-DOWNLOAD]   - Receipt ID in PDF: ${storedReceiptId}`);

  const filename = `Receipt-${storedReceiptId}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', pdfBuffer.length);

  logger.info('[DONATIONS-RECEIPT-DOWNLOAD] ========================================');
  logger.info('[DONATIONS-RECEIPT-DOWNLOAD] ✓ PDF SENT TO CLIENT');
  logger.info('[DONATIONS-RECEIPT-DOWNLOAD] ========================================');
  logger.info(`[DONATIONS-RECEIPT-DOWNLOAD] Filename: ${filename}`);
  logger.info(`[DONATIONS-RECEIPT-DOWNLOAD] Receipt ID: ${storedReceiptId}`);
  logger.info(`[DONATIONS-RECEIPT-DOWNLOAD] Size: ${pdfBuffer.length} bytes`);

  res.send(pdfBuffer);
});

// GET all donations
router.get('/', async (req, res, next) => {
  try {
    const records = await pb.collection('donations').getFullList({ sort: '-created', $autoCancel: false });
    res.json(records);
  } catch (error) {
    next(error);
  }
});

// GET a single donation by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) throw new Error('Donation ID is required');
    const record = await pb.collection('donations').getOne(id, { $autoCancel: false });
    res.json(record);
  } catch (error) {
    next(error);
  }
});

// PATCH /donations/:id - Update a donation
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, category, notes, status } = req.body;

    if (!id) throw new Error('Donation ID is required');
    if (amount !== undefined && (typeof amount !== 'number' || amount <= 0)) {
      throw new Error('amount must be a positive number');
    }

    const updateData = {};
    if (amount !== undefined) updateData.amount = amount;
    if (category !== undefined) updateData.category = category;
    if (notes !== undefined) updateData.notes = notes;
    if (status !== undefined) updateData.status = status;

    const record = await pb.collection('donations').update(id, updateData, { $autoCancel: false });
    res.json(record);
  } catch (error) {
    next(error);
  }
});

// DELETE /donations/:id - Delete a donation
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) throw new Error('Donation ID is required');
    await pb.collection('donations').delete(id, { $autoCancel: false });
    res.json({ success: true, message: 'Donation deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// POST /donations/:donationId/download-receipt - Download donation receipt PDF
router.get('/:donationId/download-receipt', async (req, res) => {
  const { donationId } = req.params;

  if (!donationId) {
    res.status(400);
    throw new Error('Donation ID is required');
  }

  const donation = await pb.collection('donations').getOne(donationId, { $autoCancel: false });

  if (!donation.receipt_id) {
    res.status(400);
    throw new Error('Receipt ID not found');
  }

  logger.info(`Downloading receipt for donation: ${donationId}, receipt_id: ${donation.receipt_id}`);

  let pdfBuffer;
  if (donation.receipt_pdf) {
    const fileUrl = pb.files.getUrl(donation, donation.receipt_pdf);
    const fileRes = await fetch(fileUrl);
    if (fileRes.ok) {
      const arrayBuffer = await fileRes.arrayBuffer();
      pdfBuffer = Buffer.from(arrayBuffer);
    } else {
      const { generateDonationReceiptPDF } = await import('../utils/pdfReceiptGenerator.js');
      pdfBuffer = await generateDonationReceiptPDF(donation, donation.receipt_id);
    }
  } else {
    const { generateDonationReceiptPDF } = await import('../utils/pdfReceiptGenerator.js');
    pdfBuffer = await generateDonationReceiptPDF(donation, donation.receipt_id);
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="Receipt_${donation.receipt_id}.pdf"`);
  res.setHeader('Content-Length', pdfBuffer.length);
  res.send(pdfBuffer);
});

// POST /donations/:donationId/resend-receipt - Resend receipt email for an approved donation
router.post('/:donationId/resend-receipt', async (req, res) => {
  logger.info('[DONATIONS-RESEND-RECEIPT] ========================================');
  logger.info('[DONATIONS-RESEND-RECEIPT] POST /:donationId/resend-receipt - Resend receipt request received');
  logger.info('[DONATIONS-RESEND-RECEIPT] ========================================');

  const { donationId } = req.params;

  // Step 1: Validate donationId parameter
  logger.info('[DONATIONS-RESEND-RECEIPT] Step 1: Validating donationId parameter');
  if (!donationId || typeof donationId !== 'string' || donationId.trim().length === 0) {
    logger.warn('[DONATIONS-RESEND-RECEIPT] ✗ Validation failed: Missing or invalid donationId');
    logger.warn(`[DONATIONS-RESEND-RECEIPT]   - donationId received: ${JSON.stringify(donationId)}`);
    throw new Error('Donation ID is required and must be a non-empty string');
  }
  logger.info(`[DONATIONS-RESEND-RECEIPT] ✓ donationId validated: ${donationId}`);

  // Step 2: Fetch donation record from PocketBase
  logger.info('[DONATIONS-RESEND-RECEIPT] Step 2: Fetching donation record from PocketBase');
  logger.info(`[DONATIONS-RESEND-RECEIPT]   - Collection: donations`);
  logger.info(`[DONATIONS-RESEND-RECEIPT]   - ID: ${donationId}`);

  const donation = await pb.collection('donations').getOne(donationId);

  if (!donation) {
    logger.warn(`[DONATIONS-RESEND-RECEIPT] ✗ Donation not found: ${donationId}`);
    throw new Error(`Donation with ID ${donationId} not found`);
  }

  logger.info('[DONATIONS-RESEND-RECEIPT] ✓ Donation record fetched successfully');
  logger.info('[DONATIONS-RESEND-RECEIPT] Donation record details:');
  logger.info(`[DONATIONS-RESEND-RECEIPT]   - Status: ${donation.status}`);
  logger.info(`[DONATIONS-RESEND-RECEIPT]   - Amount: €${donation.amount}`);
  logger.info(`[DONATIONS-RESEND-RECEIPT]   - Category: ${donation.category}`);
  logger.info(`[DONATIONS-RESEND-RECEIPT]   - Notes: ${donation.notes || '(not set)'}`);
  logger.info(`[DONATIONS-RESEND-RECEIPT]   - Stored receipt_id: ${donation.receipt_id || '(not set)'}`);

  // Step 3: Verify donation status is 'approved'
  logger.info('[DONATIONS-RESEND-RECEIPT] Step 3: Verifying donation status is approved');
  if (donation.status !== 'approved') {
    logger.warn('[DONATIONS-RESEND-RECEIPT] ✗ Donation status is not approved');
    logger.warn(`[DONATIONS-RESEND-RECEIPT]   - Current status: ${donation.status}`);
    throw new Error(`Donation status must be 'approved' to resend receipt. Current status: ${donation.status}`);
  }
  logger.info('[DONATIONS-RESEND-RECEIPT] ✓ Donation status is approved');

  // Step 4: Retrieve stored receipt_id (CRITICAL - do NOT generate new one)
  logger.info('[DONATIONS-RESEND-RECEIPT] Step 4: Retrieving stored receipt_id from donation record');
  const storedReceiptId = donation.receipt_id;
  
  if (!storedReceiptId) {
    logger.warn('[DONATIONS-RESEND-RECEIPT] ⚠ WARNING: No stored receipt_id found');
    logger.warn('[DONATIONS-RESEND-RECEIPT]   - This should not happen for approved donations');
    throw new Error('No receipt_id found for approved donation');
  }
  
  logger.info(`[DONATIONS-RESEND-RECEIPT] ✓ Using stored receipt_id: ${storedReceiptId}`);

  // Step 5: Generate PDF using FULL RECORD (flexible field lookup)
  logger.info('[DONATIONS-RESEND-RECEIPT] Step 5: Generating PDF receipt using full record');
  logger.info(`[DONATIONS-RESEND-RECEIPT]   - Passing full record to generateDonationReceiptPDF()`);
  logger.info(`[DONATIONS-RESEND-RECEIPT]   - Passing receipt_id: ${storedReceiptId}`);

  const { generateDonationReceiptPDF } = await import('../utils/pdfReceiptGenerator.js');
  const pdfBuffer = await generateDonationReceiptPDF(donation, storedReceiptId);

  if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer)) {
    logger.error('[DONATIONS-RESEND-RECEIPT] ✗ PDF buffer is invalid');
    throw new Error('PDF generation failed - invalid buffer');
  }

  logger.info('[DONATIONS-RESEND-RECEIPT] ✓ PDF receipt generated successfully');
  logger.info(`[DONATIONS-RESEND-RECEIPT]   - Type: Buffer`);
  logger.info(`[DONATIONS-RESEND-RECEIPT]   - Size: ${pdfBuffer.length} bytes`);
  logger.info(`[DONATIONS-RESEND-RECEIPT]   - Is Buffer: true`);
  logger.info(`[DONATIONS-RESEND-RECEIPT]   - Receipt ID in PDF: ${storedReceiptId}`);

  // Step 6: Send receipt email with PDF using FULL RECORD
  logger.info('[DONATIONS-RESEND-RECEIPT] Step 6: Sending receipt email with PDF attachment');
  logger.info(`[DONATIONS-RESEND-RECEIPT]   - Passing full record to sendDonationReceiptEmail()`);
  logger.info(`[DONATIONS-RESEND-RECEIPT]   - Passing receipt_id: ${storedReceiptId}`);

  const { sendDonationReceiptEmail } = await import('../utils/emailReceiptService.js');
  await sendDonationReceiptEmail(donation, pdfBuffer, storedReceiptId);

  logger.info('[DONATIONS-RESEND-RECEIPT] ✓ Receipt email sent successfully');

  logger.info('[DONATIONS-RESEND-RECEIPT] ========================================');
  logger.info('[DONATIONS-RESEND-RECEIPT] ✓ RECEIPT RESEND COMPLETED SUCCESSFULLY');
  logger.info('[DONATIONS-RESEND-RECEIPT] ========================================');
  logger.info(`[DONATIONS-RESEND-RECEIPT] Donation ID: ${donationId}`);
  logger.info(`[DONATIONS-RESEND-RECEIPT] Receipt ID: ${storedReceiptId}`);
  logger.info(`[DONATIONS-RESEND-RECEIPT] Email Sent: YES`);

  res.json({
    success: true,
    message: `Receipt email sent successfully`,
    receiptNumber: storedReceiptId,
  });
});

// POST /donations/:donationId/send-custom-email - Send custom email to donor
router.post('/:donationId/send-custom-email', async (req, res) => {
  const { donationId } = req.params;
  const { recipientEmail, subject, message, includePdf } = req.body;

  if (!donationId) {
    res.status(400);
    throw new Error('Donation ID is required');
  }

  if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
    res.status(400);
    throw new Error('A valid recipient email is required');
  }

  if (!subject || typeof subject !== 'string' || subject.trim() === '') {
    res.status(400);
    throw new Error('Email subject is required');
  }

  const donation = await pb.collection('donations').getOne(donationId, { $autoCancel: false });

  if (!donation) {
    res.status(404);
    throw new Error('Donation record not found');
  }

  logger.info(`Sent custom email to ${recipientEmail} for donation ${donationId}`);

  const { sendCustomDonationEmail } = await import('../utils/emailReceiptService.js');
  await sendCustomDonationEmail(donation, recipientEmail, subject, message, includePdf);

  res.json({
    success: true,
    message: 'Email sent successfully'
  });
});

export default router;