import 'dotenv/config';
import express from 'express';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * GET /poojas - Get list of poojas
 * 
 * Query Parameters:
 *   - preview (optional): Set to 'true' for preview mode
 *     - Preview mode: Returns all published poojas
 *     - Live mode (default): Returns published poojas excluding demo/test records
 * 
 * Response: Array of pooja records
 */
router.get('/', async (req, res) => {
  logger.info('[POOJAS] ========================================');
  logger.info('[POOJAS] GET / - Fetch poojas request received');
  logger.info('[POOJAS] ========================================');

  const { preview } = req.query;
  const isPreviewMode = preview === 'true';

  logger.info(`[POOJAS] Mode: ${isPreviewMode ? 'PREVIEW' : 'LIVE'}`);
  logger.info(`[POOJAS] Preview param: ${preview || '(not provided)'}`);

  logger.info('[POOJAS] Step 1: Fetching poojas from PocketBase');
  logger.info('[POOJAS]   - Collection: poojas');
  logger.info('[POOJAS]   - Filter: status = "published"');

  // Fetch all published poojas
  const poojas = await pb.collection('poojas').getList(1, 500, {
    filter: 'status = "published"',
    sort: '-created',
  });

  logger.info(`[POOJAS] ✓ Fetched ${poojas.items.length} published poojas from PocketBase`);

  let results = poojas.items;

  // Apply live mode filtering if not in preview mode
  if (!isPreviewMode) {
    logger.info('[POOJAS] Step 2: Applying live mode filters');
    logger.info('[POOJAS]   - Filtering out demo/test records');
    logger.info('[POOJAS]   - Case-insensitive matching on name and description');

    const demoPatterns = ['demo', 'test', 'admin demo'];
    const filteredResults = results.filter((pooja) => {
      const name = (pooja.name || '').toLowerCase();
      const description = (pooja.description || '').toLowerCase();

      // Check if name or description contains any demo pattern
      const isDemoRecord = demoPatterns.some(
        (pattern) => name.includes(pattern) || description.includes(pattern)
      );

      if (isDemoRecord) {
        logger.info(`[POOJAS]   - Filtered out: "${pooja.name}" (contains demo/test keyword)`);
      }

      return !isDemoRecord;
    });

    logger.info(`[POOJAS] ✓ Live mode filtering complete`);
    logger.info(`[POOJAS]   - Original count: ${results.length}`);
    logger.info(`[POOJAS]   - After filtering: ${filteredResults.length}`);

    results = filteredResults;
  } else {
    logger.info('[POOJAS] Step 2: Preview mode - no filtering applied');
    logger.info(`[POOJAS]   - Returning all ${results.length} published poojas`);
  }

  logger.info('[POOJAS] ========================================');
  logger.info('[POOJAS] ✓ POOJAS FETCH COMPLETED');
  logger.info('[POOJAS] ========================================');
  logger.info(`[POOJAS] Mode: ${isPreviewMode ? 'PREVIEW' : 'LIVE'}`);
  logger.info(`[POOJAS] Total results: ${results.length}`);

  res.json(results);
});

export default router;