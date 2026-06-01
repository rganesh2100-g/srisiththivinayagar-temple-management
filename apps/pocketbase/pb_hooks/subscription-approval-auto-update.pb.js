/// <reference path="../pb_data/types.d.ts" />
onRecordAfterUpdateSuccess((e) => {
  if (e.record.get('status') === 'active') {
    const userRecord = $app.dao().findRecordById('users', e.record.get('user'));
    userRecord.set('membership_type', 'premium');
    userRecord.set('premium_status', 'Active');
    $app.dao().saveRecord(userRecord);
  }
  e.next();
}, 'subscriptions');