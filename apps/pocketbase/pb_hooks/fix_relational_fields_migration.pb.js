/// <reference path="../pb_data/types.d.ts" />
// This hook is for data validation ONLY - not for migration logic
// The actual migration is handled by the migration file

onRecordAfterCreateSuccess((e) => {
  // Validate that relation fields are properly set
  e.next();
}, "pooja_bookings");

onRecordAfterCreateSuccess((e) => {
  // Validate that relation fields are properly set
  e.next();
}, "donations");

onRecordAfterCreateSuccess((e) => {
  // Validate that relation fields are properly set
  e.next();
}, "pending_subscriptions");