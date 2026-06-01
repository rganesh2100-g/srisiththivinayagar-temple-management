/// <reference path="../pb_data/types.d.ts" />
onRecordAfterUpdateSuccess((e) => {
  const status = e.record.get("status");
  const userId = e.record.get("user_id");
  
  // Only process if status changed to 'active' or 'approved'
  if (status === "active" || status === "approved") {
    try {
      // Fetch the user record
      const userRecord = $app.dao().findRecordById("_pb_users_auth_", userId);
      
      if (userRecord) {
        // Update user membership fields
        userRecord.set("membership_type", "premium");
        userRecord.set("premium_status", "Active");
        userRecord.set("subscription_status", "premium");
        
        // Save the updated user record
        $app.dao().saveRecord(userRecord);
      }
    } catch (err) {
      console.log("Error updating user membership: " + err.message);
    }
  }
  
  e.next();
}, "subscriptions");