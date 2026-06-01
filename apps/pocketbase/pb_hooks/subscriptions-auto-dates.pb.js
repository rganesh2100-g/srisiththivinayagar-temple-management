/// <reference path="../pb_data/types.d.ts" />
onRecordAfterCreateSuccess((e) => {
  // Calculate start_date as today
  const today = new Date();
  const startDate = today.toISOString().split('T')[0];
  
  // Calculate end_date as today + 30 days
  const endDate = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
  const endDateStr = endDate.toISOString().split('T')[0];
  
  // Update the record with calculated dates
  e.record.set('start_date', startDate);
  e.record.set('end_date', endDateStr);
  
  // Save the updated record
  $app.dao().saveRecord(e.record);
  
  e.next();
}, "subscriptions");