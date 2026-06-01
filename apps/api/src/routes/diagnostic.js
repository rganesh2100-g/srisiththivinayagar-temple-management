import 'dotenv/config';
import express from 'express';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';

const router = express.Router();

logger.info('[DIAGNOSTIC-ROUTES] ========================================');
logger.info('[DIAGNOSTIC-ROUTES] Initializing Diagnostic Routes');
logger.info('[DIAGNOSTIC-ROUTES] ========================================');

/**
 * GET /diagnostic/test - Simple test endpoint
 *
 * Returns a simple status message to verify the diagnostic route is accessible.
 * No authentication required.
 *
 * Response: { status: 'ok', message: 'Diagnostic endpoint is working' }
 *
 * Security: Public endpoint (no auth required)
 */
router.get('/test', async (req, res) => {
  logger.info('[DIAGNOSTIC-TEST] ========================================');
  logger.info('[DIAGNOSTIC-TEST] GET /test - Test endpoint request received');
  logger.info('[DIAGNOSTIC-TEST] ========================================');
  logger.info(`[DIAGNOSTIC-TEST] Timestamp: ${new Date().toISOString()}`);

  logger.info('[DIAGNOSTIC-TEST] Step 1: Returning test response');
  const response = {
    status: 'ok',
    message: 'Diagnostic endpoint is working',
    timestamp: new Date().toISOString(),
  };

  logger.info('[DIAGNOSTIC-TEST] ========================================');
  logger.info('[DIAGNOSTIC-TEST] ✓ TEST ENDPOINT RESPONSE SENT');
  logger.info('[DIAGNOSTIC-TEST] ========================================');
  logger.info(`[DIAGNOSTIC-TEST] Status: ${response.status}`);
  logger.info(`[DIAGNOSTIC-TEST] Message: ${response.message}`);

  res.json(response);
});

/**
 * GET /diagnostic/schema/payment_records - Get payment_records collection schema
 *
 * Fetches the complete schema of the payment_records collection from PocketBase,
 * including field definitions, types, and validation rules.
 *
 * Response: { collection: 'payment_records', collectionId: string, totalFields: number, fields: [...], metadata: {...} }
 *
 * Security: No authentication required (diagnostic endpoint)
 */
router.get('/schema/payment_records', async (req, res) => {
  logger.info('[DIAGNOSTIC-SCHEMA] ========================================');
  logger.info('[DIAGNOSTIC-SCHEMA] GET /schema/payment_records - Schema diagnostic request received');
  logger.info('[DIAGNOSTIC-SCHEMA] ========================================');
  logger.info(`[DIAGNOSTIC-SCHEMA] Timestamp: ${new Date().toISOString()}`);

  // Step 1: Fetch collection metadata from PocketBase
  logger.info('[DIAGNOSTIC-SCHEMA] Step 1: Fetching payment_records collection metadata from PocketBase');
  logger.info('[DIAGNOSTIC-SCHEMA]   - Collection name: payment_records');
  logger.info('[DIAGNOSTIC-SCHEMA]   - Using pb.collections.getOne()');

  const collection = await pb.collections.getOne('payment_records');

  if (!collection) {
    logger.warn('[DIAGNOSTIC-SCHEMA] ✗ Collection not found: payment_records');
    throw new Error('Collection "payment_records" not found in PocketBase');
  }

  logger.info('[DIAGNOSTIC-SCHEMA] ✓ Collection metadata fetched successfully');
  logger.info(`[DIAGNOSTIC-SCHEMA]   - Collection ID: ${collection.id}`);
  logger.info(`[DIAGNOSTIC-SCHEMA]   - Collection name: ${collection.name}`);
  logger.info(`[DIAGNOSTIC-SCHEMA]   - Total fields: ${collection.schema ? collection.schema.length : 0}`);

  // Step 2: Extract field information
  logger.info('[DIAGNOSTIC-SCHEMA] Step 2: Extracting field information from schema');

  const fields = [];

  if (collection.schema && Array.isArray(collection.schema)) {
    logger.info(`[DIAGNOSTIC-SCHEMA] Processing ${collection.schema.length} fields`);

    collection.schema.forEach((field, index) => {
      logger.info(`[DIAGNOSTIC-SCHEMA] Field ${index + 1}:`);
      logger.info(`[DIAGNOSTIC-SCHEMA]   - Name: ${field.name}`);
      logger.info(`[DIAGNOSTIC-SCHEMA]   - Type: ${field.type}`);
      logger.info(`[DIAGNOSTIC-SCHEMA]   - Required: ${field.required || false}`);

      // Extract validation rules
      const validation = {};

      // Common validation properties
      if (field.options) {
        logger.info(`[DIAGNOSTIC-SCHEMA]   - Options: ${JSON.stringify(field.options)}`);

        // Min/Max for numbers
        if (field.options.min !== undefined) {
          validation.min = field.options.min;
          logger.info(`[DIAGNOSTIC-SCHEMA]     - Min: ${field.options.min}`);
        }
        if (field.options.max !== undefined) {
          validation.max = field.options.max;
          logger.info(`[DIAGNOSTIC-SCHEMA]     - Max: ${field.options.max}`);
        }

        // Unique constraint
        if (field.options.unique !== undefined) {
          validation.unique = field.options.unique;
          logger.info(`[DIAGNOSTIC-SCHEMA]     - Unique: ${field.options.unique}`);
        }

        // Pattern/Regex
        if (field.options.pattern) {
          validation.pattern = field.options.pattern;
          logger.info(`[DIAGNOSTIC-SCHEMA]     - Pattern: ${field.options.pattern}`);
        }

        // Relation target
        if (field.options.collectionId) {
          validation.relationTarget = field.options.collectionId;
          logger.info(`[DIAGNOSTIC-SCHEMA]     - Relation Target: ${field.options.collectionId}`);
        }

        // Select options
        if (field.options.values && Array.isArray(field.options.values)) {
          validation.selectOptions = field.options.values;
          logger.info(`[DIAGNOSTIC-SCHEMA]     - Select Options: ${field.options.values.join(', ')}`);
        }

        // Email validation
        if (field.type === 'email') {
          validation.format = 'email';
          logger.info(`[DIAGNOSTIC-SCHEMA]     - Format: email`);
        }

        // Date validation
        if (field.type === 'date') {
          validation.format = 'date';
          logger.info(`[DIAGNOSTIC-SCHEMA]     - Format: date`);
        }
      }

      // Build field object
      const fieldObj = {
        name: field.name,
        type: field.type,
        required: field.required || false,
      };

      // Add validation rules if any exist
      if (Object.keys(validation).length > 0) {
        fieldObj.validation = validation;
      }

      fields.push(fieldObj);
    });
  } else {
    logger.warn('[DIAGNOSTIC-SCHEMA] ⚠ WARNING: Collection schema is empty or not an array');
  }

  logger.info('[DIAGNOSTIC-SCHEMA] ✓ Field extraction completed');
  logger.info(`[DIAGNOSTIC-SCHEMA]   - Total fields extracted: ${fields.length}`);

  // Step 3: Build response
  logger.info('[DIAGNOSTIC-SCHEMA] Step 3: Building response object');

  const response = {
    collection: 'payment_records',
    collectionId: collection.id,
    totalFields: fields.length,
    fields: fields,
    metadata: {
      created: collection.created,
      updated: collection.updated,
      system: collection.system || false,
    },
  };

  logger.info('[DIAGNOSTIC-SCHEMA] ========================================');
  logger.info('[DIAGNOSTIC-SCHEMA] ✓ SCHEMA DIAGNOSTIC COMPLETED SUCCESSFULLY');
  logger.info('[DIAGNOSTIC-SCHEMA] ========================================');
  logger.info(`[DIAGNOSTIC-SCHEMA] Collection: ${response.collection}`);
  logger.info(`[DIAGNOSTIC-SCHEMA] Total Fields: ${response.totalFields}`);
  logger.info('[DIAGNOSTIC-SCHEMA] Field Names:');
  fields.forEach((field) => {
    logger.info(`[DIAGNOSTIC-SCHEMA]   - ${field.name} (${field.type}, required: ${field.required})`);
  });

  res.json(response);
});

export default router;