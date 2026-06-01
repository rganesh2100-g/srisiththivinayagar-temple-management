/// <reference path="../pb_data/types.d.ts" />
// DIAGNOSTIC HOOK - Logs subscription creation attempts
// This hook will help identify which field or rule is causing the SQL error

onRecordCreate((e) => {
  console.log("=== SUBSCRIPTION CREATION DIAGNOSTIC ===");
  console.log("Collection: subscriptions");
  console.log("Record ID: " + e.record.id);
  console.log("User ID: " + e.record.get("user_id"));
  console.log("Email: " + e.record.get("email"));
  console.log("Full Name: " + e.record.get("full_name"));
  console.log("Subscription Type: " + e.record.get("subscription_type"));
  console.log("Amount: " + e.record.get("amount"));
  console.log("Membership Type: " + e.record.get("membership_type"));
  console.log("Transaction Reference: " + e.record.get("transaction_reference"));
  console.log("Transaction ID: " + e.record.get("transaction_id"));
  console.log("Approval Status: " + e.record.get("approval_status"));
  console.log("Rejection Reason: " + e.record.get("rejection_reason"));
  console.log("Auth User ID: " + (e.auth ? e.auth.id : "NO AUTH"));
  console.log("Auth Collection: " + (e.auth ? e.auth.collectionName : "NO AUTH"));
  console.log("=== END DIAGNOSTIC ===");
  e.next();
}, "subscriptions");