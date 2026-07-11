/// <reference path="../pb_data/types.d.ts" />

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

function autoArchiveExpiredPoojas() {
  try {
    const records = $app.findAllRecords('poojas',
      "published=true && is_archived=false && is_deleted=false"
    );

    let archivedCount = 0;
    for (const record of records) {
      const availabilityType = record.get('availabilityType');
      if (availabilityType !== 'specificDate') continue;

      let dates = [];
      try {
        dates = JSON.parse(record.get('dates') || record.get('specificDates') || '[]');
      } catch {}

      if (dates.length > 0 && areAllDatesPassed(dates)) {
        record.set('published', false);
        record.set('status', 'draft');
        record.set('is_archived', true);
        record.set('archivedAt', new Date().toISOString());
        $app.save(record);
        archivedCount++;
        console.log('[AUTO-ARCHIVE] Archived pooja: "' + record.get('name') + '" (' + record.id + ')');
      }
    }

    if (archivedCount > 0) {
      console.log('[AUTO-ARCHIVE] Total archived: ' + archivedCount + ' pooja(s)');
    }

    return archivedCount;
  } catch (e) {
    console.log('[AUTO-ARCHIVE] Error: ' + e.message);
    return 0;
  }
}

cronAdd('auto_archive_expired_poojas', '*/5 * * * *', () => {
  console.log('[AUTO-ARCHIVE] Cron job triggered at ' + new Date().toISOString());
  autoArchiveExpiredPoojas();
});

onRecordAfterCreateSuccess((e) => {
  autoArchiveExpiredPoojas();
}, 'poojas');

onRecordAfterUpdateSuccess((e) => {
  autoArchiveExpiredPoojas();
}, 'poojas');

onRecordsListRequest((e) => {
  if (e.collection.name === 'poojas') {
    autoArchiveExpiredPoojas();
  }
  e.next();
}, 'poojas');

onRecordViewRequest((e) => {
  if (e.collection.name === 'poojas') {
    autoArchiveExpiredPoojas();
  }
  e.next();
}, 'poojas');
