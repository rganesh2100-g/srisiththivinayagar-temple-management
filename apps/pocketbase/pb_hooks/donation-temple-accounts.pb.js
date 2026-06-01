/// <reference path="../pb_data/types.d.ts" />
onRecordAfterCreateSuccess((e) => {
  try {
    const donation = e.record;
    const userId = donation.get("user_id");
    const amount = donation.get("amount");
    const category = donation.get("category") || "General";
    const donationDate = donation.get("donation_date") || new Date().toISOString().split('T')[0];

    // Create temple account entry
    const templeAccount = new Record();
    templeAccount.collection().name = "temple_accounts";
    templeAccount.set("member_name", userId);
    templeAccount.set("amount", amount);
    templeAccount.set("category", category);
    templeAccount.set("date", donationDate);
    templeAccount.set("month", new Date(donationDate).toLocaleString('default', { month: 'long' }));
    templeAccount.set("year", new Date(donationDate).getFullYear());
    templeAccount.set("transaction_id", donation.id);

    $app.dao().saveRecord(templeAccount);
  } catch (error) {
    console.log("Error creating temple account from donation:", error.message);
  }
  e.next();
}, "donations");

onRecordAfterUpdateSuccess((e) => {
  try {
    const donation = e.record;
    const original = e.record.original();
    
    // Only process if status changed to approved
    if (original.get("status") !== "approved" && donation.get("status") === "approved") {
      const userId = donation.get("user_id");
      const amount = donation.get("amount");
      const category = donation.get("category") || "General";
      const donationDate = donation.get("donation_date") || new Date().toISOString().split('T')[0];

      // Create temple account entry
      const templeAccount = new Record();
      templeAccount.collection().name = "temple_accounts";
      templeAccount.set("member_name", userId);
      templeAccount.set("amount", amount);
      templeAccount.set("category", category);
      templeAccount.set("date", donationDate);
      templeAccount.set("month", new Date(donationDate).toLocaleString('default', { month: 'long' }));
      templeAccount.set("year", new Date(donationDate).getFullYear());
      templeAccount.set("transaction_id", donation.id);

      $app.dao().saveRecord(templeAccount);
    }
  } catch (error) {
    console.log("Error updating temple account from donation:", error.message);
  }
  e.next();
}, "donations");