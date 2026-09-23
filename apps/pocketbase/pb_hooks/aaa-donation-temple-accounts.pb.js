/// <reference path="../pb_data/types.d.ts" />
// ===============================================================================
// donation-temple-accounts.pb.js (registered FIRST via aaa- prefix)
//
// Creates a temple_accounts income record when a donation is or becomes approved
// (approved + amount > 0). Mirrors the H8 STEP-4 semantics that used to live in
// the API's donationMirror service.
//
// PB 0.38 JSVM constraints (proven empirically, see aaa-mirror-donation.pb.js):
//   1. Hook callbacks do NOT see top-level functions/consts from the same file —
//      all logic is INLINED below.
//   2. The legacy donation-receipt-generation.pb.js hook calls $app.save() inside
//      onRecordAfterUpdateSuccess on the pending->approved transition, which
//      aborts the ENTIRE after-update hook chain to the CLIENT (record IS still
//      committed). So the temple_accounts creation runs in the PRE-COMMIT
//      onRecordCreateExecute / onRecordUpdateExecute hooks — the only reliable
//      channel in this build.
//
// Guard rails:
//   - approved + amount > 0 only
//   - duplicate-guard: one temple_accounts row per donation.id
//   - never throws: a TA failure cannot fail the donation itself
//   - no secrets logged
// ===============================================================================

onRecordCreateExecute((e) => {
  try {
    var donation = e.record;

    if (donation.get("status") !== "approved") {
      e.next();
      return;
    }
    var amount = Number(donation.get("amount"));
    if (!Number.isFinite(amount) || amount <= 0) {
      e.next();
      return;
    }

    var existing = null;
    try {
      existing = $app.findFirstRecordByFilter(
        "temple_accounts",
        "transaction_id = {:txId}",
        { txId: donation.id }
      );
    } catch (guardErr) {
      existing = null;
    }
    if (existing) {
      e.next();
      return;
    }

    var userId = donation.get("user") || null;
    var category = donation.get("category") || "General";
    var donationDate = donation.get("donation_date") || new Date().toISOString().split("T")[0];

    var taCollection = $app.findCollectionByNameOrId("temple_accounts");
    var templeAccount = new Record(taCollection);
    templeAccount.set("member_name", userId);
    templeAccount.set("amount", amount);
    templeAccount.set("category", category);
    templeAccount.set("date", donationDate);
    var monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    templeAccount.set("month", monthNames[new Date(donationDate).getMonth()] || "January");
    templeAccount.set("year", new Date(donationDate).getFullYear());
    templeAccount.set("transaction_id", donation.id);
    templeAccount.set("classification", "Donation");

    $app.save(templeAccount);
  } catch (error) {
    console.log("[donation-ta] Error creating temple account from donation (create):", error.message);
  }
  e.next();
}, "donations");

onRecordUpdateExecute((e) => {
  try {
    var donation = e.record;

    if (donation.get("status") !== "approved") {
      e.next();
      return;
    }
    var amount = Number(donation.get("amount"));
    if (!Number.isFinite(amount) || amount <= 0) {
      e.next();
      return;
    }

    var existing = null;
    try {
      existing = $app.findFirstRecordByFilter(
        "temple_accounts",
        "transaction_id = {:txId}",
        { txId: donation.id }
      );
    } catch (guardErr) {
      existing = null;
    }
    if (existing) {
      e.next();
      return;
    }

    var userId = donation.get("user") || null;
    var category = donation.get("category") || "General";
    var donationDate = donation.get("donation_date") || new Date().toISOString().split("T")[0];

    var taCollection = $app.findCollectionByNameOrId("temple_accounts");
    var templeAccount = new Record(taCollection);
    templeAccount.set("member_name", userId);
    templeAccount.set("amount", amount);
    templeAccount.set("category", category);
    templeAccount.set("date", donationDate);
    var monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    templeAccount.set("month", monthNames[new Date(donationDate).getMonth()] || "January");
    templeAccount.set("year", new Date(donationDate).getFullYear());
    templeAccount.set("transaction_id", donation.id);
    templeAccount.set("classification", "Donation");

    $app.save(templeAccount);
  } catch (error) {
    console.log("[donation-ta] Error creating temple account from donation (update):", error.message);
  }
  e.next();
}, "donations");