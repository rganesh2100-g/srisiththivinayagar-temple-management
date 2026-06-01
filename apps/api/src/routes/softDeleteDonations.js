import 'dotenv/config';
import express from 'express';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';

const router = express.Router();

// POST /soft-delete/donation-remove - Remove donation amount from temple_accounts
router.post('/donation-remove', async (req, res) => {
  const { donationId, amount, accountId } = req.body;

  // Input validation
  if (!donationId || amount === undefined || !accountId) {
    return res.status(400).json({
      error: 'donationId, amount, and accountId are required',
    });
  }

  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number' });
  }

  logger.info(`Removing donation ${donationId} amount $${amount} from account ${accountId}`);

  // Query temple_accounts by accountId
  const account = await pb.collection('temple_accounts').getOne(accountId);

  if (!account) {
    throw new Error('Account not found');
  }

  logger.info(`Found account: ${account.id} with current balance: $${account.total_amount}`);

  // Calculate new balance
  const newBalance = Math.max(0, (account.total_amount || 0) - amount);

  logger.info(`Updating account ${accountId} balance from $${account.total_amount} to $${newBalance}`);

  // Update the record
  const updatedAccount = await pb.collection('temple_accounts').update(accountId, {
    total_amount: newBalance,
  });

  if (!updatedAccount) {
    throw new Error('Failed to update account');
  }

  logger.info(`Successfully removed donation amount from account ${accountId}`);

  res.json({
    success: true,
    message: 'Donation amount removed from account',
    updatedBalance: newBalance,
  });
});

// POST /soft-delete/donation-restore - Add donation amount back to temple_accounts
router.post('/donation-restore', async (req, res) => {
  const { donationId, amount, accountId } = req.body;

  // Input validation
  if (!donationId || amount === undefined || !accountId) {
    return res.status(400).json({
      error: 'donationId, amount, and accountId are required',
    });
  }

  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number' });
  }

  logger.info(`Restoring donation ${donationId} amount $${amount} to account ${accountId}`);

  // Query temple_accounts by accountId
  const account = await pb.collection('temple_accounts').getOne(accountId);

  if (!account) {
    throw new Error('Account not found');
  }

  logger.info(`Found account: ${account.id} with current balance: $${account.total_amount}`);

  // Calculate new balance
  const newBalance = (account.total_amount || 0) + amount;

  logger.info(`Updating account ${accountId} balance from $${account.total_amount} to $${newBalance}`);

  // Update the record
  const updatedAccount = await pb.collection('temple_accounts').update(accountId, {
    total_amount: newBalance,
  });

  if (!updatedAccount) {
    throw new Error('Failed to update account');
  }

  logger.info(`Successfully restored donation amount to account ${accountId}`);

  res.json({
    success: true,
    message: 'Donation amount restored to account',
    updatedBalance: newBalance,
  });
});

// POST /soft-delete/donation-permanent-delete - Ensure amount is removed when permanently deleting
router.post('/donation-permanent-delete', async (req, res) => {
  const { donationId, amount, accountId } = req.body;

  // Input validation
  if (!donationId || amount === undefined || !accountId) {
    return res.status(400).json({
      error: 'donationId, amount, and accountId are required',
    });
  }

  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number' });
  }

  logger.info(`Permanently deleting donation ${donationId} and removing amount $${amount} from account ${accountId}`);

  // Query temple_accounts by accountId
  const account = await pb.collection('temple_accounts').getOne(accountId);

  if (!account) {
    throw new Error('Account not found');
  }

  logger.info(`Found account: ${account.id} with current balance: $${account.total_amount}`);

  // Calculate new balance (subtract amount if not already removed)
  const newBalance = Math.max(0, (account.total_amount || 0) - amount);

  logger.info(`Updating account ${accountId} balance from $${account.total_amount} to $${newBalance}`);

  // Update the record
  const updatedAccount = await pb.collection('temple_accounts').update(accountId, {
    total_amount: newBalance,
  });

  if (!updatedAccount) {
    throw new Error('Failed to update account');
  }

  logger.info(`Successfully permanently deleted donation ${donationId} and removed amount from account ${accountId}`);

  res.json({
    success: true,
    message: 'Donation permanently deleted and amount removed from account',
  });
});

export default router;