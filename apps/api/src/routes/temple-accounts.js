import 'dotenv/config';
import express from 'express';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Helper function to extract month and year from date string
const extractMonthYear = (dateString) => {
  const date = new Date(dateString);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return { month, year };
};

// Helper function to get user member_name from userId
const getUserMemberName = async (userId) => {
  const user = await pb.collection('users').getOne(userId);
  return user.member_name || user.name || user.email || 'Unknown';
};

// Helper function to calculate total_amount from all category fields
const calculateTotalAmount = (record) => {
  const categories = [
    'pooja_services_amount',
    'annadhanam_amount',
    'temple_maintenance_amount',
    'goshala_amount',
    'veda_pathshala_amount',
    'general_fund_amount',
  ];
  return categories.reduce((sum, field) => sum + (record[field] || 0), 0);
};

// Helper function to map donation category to field name
const mapDonationCategoryToField = (donationCategory) => {
  const categoryMap = {
    'Annadhanam': 'annadhanam_amount',
    'Temple Maintenance': 'temple_maintenance_amount',
    'Goshala': 'goshala_amount',
    'Veda Pathshala': 'veda_pathshala_amount',
    'General Fund': 'general_fund_amount',
  };
  return categoryMap[donationCategory] || 'general_fund_amount';
};

// Helper function to map transaction type and category to field name
const mapTransactionTypeToField = (transactionType, category) => {
  const typeMap = {
    'pooja': 'pooja_services_amount',
    'donation': mapDonationCategoryToField(category),
    'annadhanam': 'annadhanam_amount',
    'maintenance': 'temple_maintenance_amount',
    'goshala': 'goshala_amount',
    'veda': 'veda_pathshala_amount',
    'general': 'general_fund_amount',
  };
  return typeMap[transactionType] || 'general_fund_amount';
};

// POST /temple-accounts/update-from-pooja
router.post('/update-from-pooja', async (req, res) => {
  const { bookingId, amount, bookingDate, userId } = req.body;

  // Input validation
  if (!bookingId || !amount || !bookingDate || !userId) {
    return res.status(400).json({
      error: 'bookingId, amount, bookingDate, and userId are required',
    });
  }

  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number' });
  }

  logger.info(`Updating temple accounts from pooja: ${bookingId} - $${amount}`);

  const { month, year } = extractMonthYear(bookingDate);
  const memberName = await getUserMemberName(userId);

  // Query for existing record matching month/year
  const existingRecords = await pb.collection('temple_accounts').getFullList({
    filter: `month = "${month}" && year = ${year}`,
  });

  if (existingRecords.length > 0) {
    // Update existing record
    const record = existingRecords[0];
    const updatedPooja = (record.pooja_services_amount || 0) + amount;
    const updatedRecord = await pb.collection('temple_accounts').update(record.id, {
      pooja_services_amount: updatedPooja,
      total_amount: calculateTotalAmount({
        ...record,
        pooja_services_amount: updatedPooja,
      }),
    });
    res.json(updatedRecord);
  } else {
    // Create new record
    const newRecord = await pb.collection('temple_accounts').create({
      member_name: memberName,
      amount,
      category: 'Pooja Services',
      date: bookingDate,
      month,
      year,
      transaction_id: bookingId,
      pooja_services_amount: amount,
      annadhanam_amount: 0,
      temple_maintenance_amount: 0,
      goshala_amount: 0,
      veda_pathshala_amount: 0,
      general_fund_amount: 0,
      total_amount: amount,
    });
    res.status(201).json(newRecord);
  }
});

// POST /temple-accounts/update-from-donation
router.post('/update-from-donation', async (req, res) => {
  const { donationId, amount, donationDate, userId, donationCategory } = req.body;

  // Input validation
  if (!donationId || !amount || !donationDate || !userId || !donationCategory) {
    return res.status(400).json({
      error: 'donationId, amount, donationDate, userId, and donationCategory are required',
    });
  }

  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number' });
  }

  logger.info(`Updating temple accounts from donation: ${donationId} - $${amount}`);

  const { month, year } = extractMonthYear(donationDate);
  const memberName = await getUserMemberName(userId);
  const categoryField = mapDonationCategoryToField(donationCategory);

  // Query for existing record matching month/year
  const existingRecords = await pb.collection('temple_accounts').getFullList({
    filter: `month = "${month}" && year = ${year}`,
  });

  if (existingRecords.length > 0) {
    // Update existing record
    const record = existingRecords[0];
    const updatedCategoryAmount = (record[categoryField] || 0) + amount;
    const updatedRecord = await pb.collection('temple_accounts').update(record.id, {
      [categoryField]: updatedCategoryAmount,
      total_amount: calculateTotalAmount({
        ...record,
        [categoryField]: updatedCategoryAmount,
      }),
    });
    res.json(updatedRecord);
  } else {
    // Create new record
    const newRecord = await pb.collection('temple_accounts').create({
      member_name: memberName,
      amount,
      category: donationCategory,
      date: donationDate,
      month,
      year,
      transaction_id: donationId,
      pooja_services_amount: categoryField === 'pooja_services_amount' ? amount : 0,
      annadhanam_amount: categoryField === 'annadhanam_amount' ? amount : 0,
      temple_maintenance_amount: categoryField === 'temple_maintenance_amount' ? amount : 0,
      goshala_amount: categoryField === 'goshala_amount' ? amount : 0,
      veda_pathshala_amount: categoryField === 'veda_pathshala_amount' ? amount : 0,
      general_fund_amount: categoryField === 'general_fund_amount' ? amount : 0,
      total_amount: amount,
    });
    res.status(201).json(newRecord);
  }
});

// POST /temple-accounts/update-from-transaction
router.post('/update-from-transaction', async (req, res) => {
  const { transactionId, amount, transactionDate, userId, transactionType, category } = req.body;

  // Input validation
  if (!transactionId || !amount || !transactionDate || !userId || !transactionType) {
    return res.status(400).json({
      error: 'transactionId, amount, transactionDate, userId, and transactionType are required',
    });
  }

  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number' });
  }

  logger.info(`Updating temple accounts from transaction: ${transactionId} - $${amount}`);

  const { month, year } = extractMonthYear(transactionDate);
  const memberName = await getUserMemberName(userId);
  const categoryField = mapTransactionTypeToField(transactionType, category);

  // Query for existing record matching month/year
  const existingRecords = await pb.collection('temple_accounts').getFullList({
    filter: `month = "${month}" && year = ${year}`,
  });

  if (existingRecords.length > 0) {
    // Update existing record
    const record = existingRecords[0];
    const updatedCategoryAmount = (record[categoryField] || 0) + amount;
    const updatedRecord = await pb.collection('temple_accounts').update(record.id, {
      [categoryField]: updatedCategoryAmount,
      total_amount: calculateTotalAmount({
        ...record,
        [categoryField]: updatedCategoryAmount,
      }),
    });
    res.json(updatedRecord);
  } else {
    // Create new record
    const newRecord = await pb.collection('temple_accounts').create({
      member_name: memberName,
      amount,
      category: transactionType,
      date: transactionDate,
      month,
      year,
      transaction_id: transactionId,
      pooja_services_amount: categoryField === 'pooja_services_amount' ? amount : 0,
      annadhanam_amount: categoryField === 'annadhanam_amount' ? amount : 0,
      temple_maintenance_amount: categoryField === 'temple_maintenance_amount' ? amount : 0,
      goshala_amount: categoryField === 'goshala_amount' ? amount : 0,
      veda_pathshala_amount: categoryField === 'veda_pathshala_amount' ? amount : 0,
      general_fund_amount: categoryField === 'general_fund_amount' ? amount : 0,
      total_amount: amount,
    });
    res.status(201).json(newRecord);
  }
});

export default router;