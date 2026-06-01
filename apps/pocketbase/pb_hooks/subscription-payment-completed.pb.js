/// <reference path="../pb_data/types.d.ts" />
onRecordAfterUpdateSuccess((e) => {
  try {
    const subscription = e.record;
    const original = e.record.original();
    
    // Only process if status changed to Approved
    if (original.get("status") !== "Approved" && subscription.get("status") === "Approved") {
      const userId = subscription.get("user_id");
      const amount = subscription.get("amount");
      const subscriptionType = subscription.get("subscription_type");
      const approvedDate = new Date().toISOString().split('T')[0];

      // Create temple account entry for subscription payment
      const templeAccount = new Record();
      templeAccount.collection().name = "temple_accounts";
      templeAccount.set("member_name", userId);
      templeAccount.set("amount", amount);
      templeAccount.set("category", "Membership");
      templeAccount.set("date", approvedDate);
      templeAccount.set("month", new Date(approvedDate).toLocaleString('default', { month: 'long' }));
      templeAccount.set("year", new Date(approvedDate).getFullYear());
      templeAccount.set("transaction_id", subscription.get("transaction_id"));
      templeAccount.set("subscription_id", subscription.id);

      $app.dao().saveRecord(templeAccount);

      // Update user's membership tier
      try {
        const user = $app.dao().findRecordById("users", userId);
        if (user) {
          user.set("membershipTier", "premium");
          $app.dao().saveRecord(user);
        }
      } catch (userError) {
        console.log("Could not update user membership tier:", userError.message);
      }
    }
  } catch (error) {
    console.log("Error processing subscription payment:", error.message);
  }
  e.next();
}, "subscriptions");