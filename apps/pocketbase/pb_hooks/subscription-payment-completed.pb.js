/// <reference path="../pb_data/types.d.ts" />
onRecordAfterUpdateSuccess((e) => {
  try {
    const subscription = e.record;
    const original = e.record.original();

    // NOTE: the subscriptions collection only allows the lowercase status
    // values pending/active/rejected, so this branch does not currently run.
    // It is retained (repaired for PocketBase 0.23+ APIs) but deliberately not
    // retargeted at "active": creating temple_accounts rows here would be a new
    // financial side effect that must be mirrored with the H9 identity rules
    // before it is ever allowed to fire.
    if (original.get("status") !== "Approved" && subscription.get("status") === "Approved") {
      const userId = subscription.get("user_id");
      const amount = subscription.get("amount");
      const approvedDate = new Date().toISOString().split('T')[0];

      // Create temple account entry for subscription payment
      const templeAccountsCollection = $app.findCollectionByNameOrId("temple_accounts");
      const templeAccount = new Record(templeAccountsCollection);
      templeAccount.set("member_name", userId);
      templeAccount.set("amount", amount);
      templeAccount.set("category", "Membership");
      templeAccount.set("date", approvedDate);
      templeAccount.set("month", new Date(approvedDate).toLocaleString('default', { month: 'long' }));
      templeAccount.set("year", new Date(approvedDate).getFullYear());
      templeAccount.set("transaction_id", subscription.get("transaction_id"));
      templeAccount.set("subscription_id", subscription.id);

      $app.save(templeAccount);

      // Update user's membership tier
      try {
        const user = $app.findRecordById("users", userId);
        if (user) {
          user.set("membershipTier", "premium");
          $app.save(user);
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