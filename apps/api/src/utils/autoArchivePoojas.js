import pb from './pocketbaseClient.js';
import logger from './logger.js';

const AUTO_ARCHIVE_INTERVAL_MS = 60 * 60 * 1000;

function isDatePassed(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateStr + 'T00:00:00');
  return date < today;
}

function areAllDatesPassed(datesArray) {
  if (!datesArray || datesArray.length === 0) return false;
  return datesArray.every(isDatePassed);
}

function shouldArchivePooja(pooja) {
  if (pooja.is_archived || pooja.is_deleted) return false;

  if (pooja.availabilityType === 'specificDate') {
    let dates = [];
    try {
      dates = JSON.parse(pooja.dates || pooja.specificDates || '[]');
    } catch {
      return false;
    }
    return areAllDatesPassed(dates);
  }

  return false;
}

export const autoArchivePoojas = async () => {
  logger.info('[AUTO-ARCHIVE] ========================================');
  logger.info('[AUTO-ARCHIVE] Running auto-archive check for expired poojas');
  logger.info('[AUTO-ARCHIVE] Timestamp: ' + new Date().toISOString());
  logger.info('[AUTO-ARCHIVE] ========================================');

  try {
    const publishedPoojas = await pb.collection('poojas').getFullList({
      filter: 'published=true && is_deleted=false && is_archived=false',
      sort: '-created',
      requestKey: 'auto-archive-check',
    });

    logger.info(`[AUTO-ARCHIVE] Found ${publishedPoojas.length} published poojas to check`);

    let archivedCount = 0;

    for (const pooja of publishedPoojas) {
      if (shouldArchivePooja(pooja)) {
        try {
          await pb.collection('poojas').update(pooja.id, {
            published: false,
            status: 'draft',
            is_archived: true,
          }, { requestKey: `auto-archive-${pooja.id}` });

          logger.info(`[AUTO-ARCHIVE] ✓ Archived pooja: "${pooja.name}" (${pooja.id})`);
          archivedCount++;
        } catch (updateError) {
          logger.error(`[AUTO-ARCHIVE] ✗ Failed to archive pooja "${pooja.name}": ${updateError.message}`);
        }
      }
    }

    logger.info('[AUTO-ARCHIVE] ========================================');
    logger.info(`[AUTO-ARCHIVE] ✓ Auto-archive check complete. ${archivedCount} pooja(s) archived`);
    logger.info('[AUTO-ARCHIVE] ========================================');

    return archivedCount;
  } catch (error) {
    logger.error(`[AUTO-ARCHIVE] ✗ Error during auto-archive check: ${error.message}`);
    return 0;
  }
};

export const startAutoArchiveScheduler = () => {
  setInterval(async () => {
    await autoArchivePoojas();
  }, AUTO_ARCHIVE_INTERVAL_MS);

  logger.info(`[AUTO-ARCHIVE] Scheduler started — will run every ${AUTO_ARCHIVE_INTERVAL_MS / 60000} minutes`);
};
