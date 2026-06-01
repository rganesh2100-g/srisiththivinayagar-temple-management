import express from 'express';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * GET /bank-account-config
 * Fetches the active bank account configuration
 */
router.get('/', async (req, res) => {
  try {
    logger.info('[BANK-ACCOUNT-CONFIG] Fetching active bank account configuration');
    
    // Fetch the first active record. Disable autoCancel as required by PocketBase client rules.
    const record = await pb.collection('bank_account_config').getFirstListItem('is_active=true', {
      $autoCancel: false
    });

    // Construct the full URL for the QR code image if it exists
    const qrCodeUrl = record.qr_code_image 
      ? pb.files.getUrl(record, record.qr_code_image) 
      : null;

    // Return exact fields as specified in requirements
    res.json({
      success: true,
      id: record.id,
      bank_name: record.bank_name,
      account_holder_name: record.account_holder_name,
      account_number: record.account_number,
      iban: record.iban,
      contact_email: record.contact_email,
      direct_payment_link: record.direct_payment_link,
      qr_code_image: record.qr_code_image,
      is_active: record.is_active,
      qrCodeUrl: qrCodeUrl
    });
  } catch (error) {
    logger.error(`[BANK-ACCOUNT-CONFIG] Error fetching configuration: ${error.message}`);
    // If no active record is found, PocketBase throws a 404 error
    // Return a structured JSON error response
    res.status(404).json({ 
      success: false, 
      error: 'No active bank account configuration found. Please contact administration.' 
    });
  }
});

export default router;