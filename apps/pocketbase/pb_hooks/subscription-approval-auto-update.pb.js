/// <reference path="../pb_data/types.d.ts" />
onRecordAfterUpdateSuccess((e) => {
  if (e.record.get('status') === 'active') {
    try {
      const userRecord = $app.findRecordById('users', e.record.get('user'));
      if (userRecord) {
        userRecord.set('membership_type', 'premium');
        userRecord.set('premium_status', 'Active');
        $app.save(userRecord);
      }
    } catch (err) {
      // The subscription update is already committed, so never let the
      // membership sync surface as a request failure.
      console.log("subscription-approval-auto-update: " + err.message);
    }
  }
  e.next();
}, 'subscriptions');