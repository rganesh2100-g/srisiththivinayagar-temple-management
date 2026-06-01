import 'dotenv/config';
import express from 'express';
import PocketBase from 'pocketbase';
import logger from '../utils/logger.js';

const router = express.Router();
const pb = new PocketBase(process.env.POCKETBASE_URL || 'http://localhost:8090');

// Helper function to convert month number to month name
const getMonthName = (monthNumber) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[monthNumber - 1];
};

// Helper function to parse date and extract month and year
const parseDateToMonthYear = (dateString) => {
  const date = new Date(dateString);
  const monthNumber = date.getMonth() + 1;
  const monthName = getMonthName(monthNumber);
  const year = date.getFullYear();
  return { monthName, year, monthNumber };
};

// Helper function to calculate total_amount
const calculateTotalAmount = (record) => {
  return (
    (record.annadhanam_amount || 0) +
    (record.temple_maintenance_amount || 0) +
    (record.goshala_amount || 0) +
    (record.veda_pathshala_amount || 0) +
    (record.general_fund_amount || 0) +
    (record.pooja_services_amount || 0)
  );
};

// POST /temple-accounts/update-from-pooja
router.post('/update-from-pooja', async (req, res) => {
  const { bookingId, amount, bookingDate, userId } = req.body;

  // Validate required fields
  if (!bookingId || amount === undefined || !bookingDate || !userId) {
    throw new Error('bookingId, amount, bookingDate, and userId are required');
  }

  logger.info(`Updating temple accounts from pooja: ${bookingId} - $${amount}`);

  const { monthName, year } = parseDateToMonthYear(bookingDate);

  // Query for existing record
  const existingRecords = await pb.collection('temple_accounts').getFullList({
    filter: `month="${monthName}" && year=${year}`,
  });

  let templeAccount;

  if (existingRecords.length > 0) {
    // Update existing record
    const record = existingRecords[0];
    const updatedPooja = (record.pooja_services_amount || 0) + amount;
    const updatedData = {
      pooja_services_amount: updatedPooja,
      total_amount: calculateTotalAmount({
        ...record,
        pooja_services_amount: updatedPooja,
      }),
    };
    templeAccount = await pb.collection('temple_accounts').update(record.id, updatedData);
    logger.info(`Updated temple account record: ${record.id}`);
  } else {
    // Create new record
    const newData = {
      month: monthName,
      year: year,
      pooja_services_amount: amount,
      annadhanam_amount: 0,
      temple_maintenance_amount: 0,
      goshala_amount: 0,
      veda_pathshala_amount: 0,
      general_fund_amount: 0,
      total_amount: amount,
      member_name: 'Temple Account',
      category: 'Pooja Services',
      date: bookingDate,
      transaction_id: bookingId,
    };
    templeAccount = await pb.collection('temple_accounts').create(newData);
    logger.info(`Created new temple account record for ${monthName} ${year}`);
  }

  res.json({ success: true, templeAccount });
});

// POST /temple-accounts/update-from-donation
router.post('/update-from-donation', async (req, res) => {
  const { donationId, amount, donationDate, userId, donationCategory } = req.body;

  // Validate required fields
  if (!donationId || amount === undefined || !donationDate || !userId || !donationCategory) {
    throw new Error('donationId, amount, donationDate, userId, and donationCategory are required');
  }

  logger.info(`Updating temple accounts from donation: ${donationId} - $${amount}`);

  // Map donation category to field name
  const categoryMap = {
    'Annadhanam (Food Offering)': 'annadhanam_amount',
    'Temple Maintenance (Infrastructure)': 'temple_maintenance_amount',
    'Goshala (Cow Care)': 'goshala_amount',
    'Veda Pathshala (Education)': 'veda_pathshala_amount',
    'General Temple Fund (Discretionary)': 'general_fund_amount',
  };

  const mappedField = categoryMap[donationCategory];
  if (!mappedField) {
    throw new Error(`Invalid donation category: ${donationCategory}`);
  }

  const { monthName, year } = parseDateToMonthYear(donationDate);

  // Query for existing record
  const existingRecords = await pb.collection('temple_accounts').getFullList({
    filter: `month="${monthName}" && year=${year}`,
  });

  let templeAccount;

  if (existingRecords.length > 0) {
    // Update existing record
    const record = existingRecords[0];
    const updatedCategoryAmount = (record[mappedField] || 0) + amount;
    const updatedData = {
      [mappedField]: updatedCategoryAmount,
      total_amount: calculateTotalAmount({
        ...record,
        [mappedField]: updatedCategoryAmount,
      }),
    };
    templeAccount = await pb.collection('temple_accounts').update(record.id, updatedData);
    logger.info(`Updated temple account record: ${record.id}`);
  } else {
    // Create new record
    const newData = {
      month: monthName,
      year: year,
      pooja_services_amount: 0,
      annadhanam_amount: 0,
      temple_maintenance_amount: 0,
      goshala_amount: 0,
      veda_pathshala_amount: 0,
      general_fund_amount: 0,
      [mappedField]: amount,
      total_amount: amount,
      member_name: 'Temple Account',
      category: donationCategory,
      date: donationDate,
      transaction_id: donationId,
    };
    templeAccount = await pb.collection('temple_accounts').create(newData);
    logger.info(`Created new temple account record for ${monthName} ${year}`);
  }

  res.json({ success: true, templeAccount });
});

export default router;