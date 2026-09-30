/// <reference path="../pb_data/types.d.ts" />
onRecordAfterCreateSuccess((e) => {
  // Normalize subscription dates on create.
  // start_date is always the day the subscription was created.
  // end_date honours the record's own duration_months so that yearly plans
  // are not silently shortened to 30 days; it falls back to 30 days only when
  // duration_months is absent or out of the 1..120 range the schema allows.
  const today = new Date();
  const startDate = today.toISOString().split('T')[0];

  let months = parseInt(e.record.get("duration_months"), 10);
  if (!months || months < 1 || months > 120) {
    months = 1;
  }

  const endDate = new Date(today.getTime());
  endDate.setUTCMonth(endDate.getUTCMonth() + months);
  const endDateStr = endDate.toISOString().split('T')[0];

  e.record.set('start_date', startDate);
  e.record.set('end_date', endDateStr);

  try {
    $app.save(e.record);
  } catch (err) {
    // Never let date normalization fail the create request. The record is
    // already persisted at this point, so a failure here would otherwise
    // surface as a bogus 400 to the caller while the row exists.
    console.log("subscriptions-auto-dates: failed to normalize dates: " + err.message);
  }

  e.next();
}, "subscriptions");