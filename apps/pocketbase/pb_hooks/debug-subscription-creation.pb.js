/// <reference path="../pb_data/types.d.ts" />
// Debug hook to log all subscription creation attempts and validation errors
onRecordCreate((e) => {
  console.log("=== SUBSCRIPTION CREATE DEBUG ===");
  console.log("Record data:", JSON.stringify({
    user_id: e.record.get("user_id"),
    email: e.record.get("email"),
    full_name: e.record.get("full_name"),
    subscription_type: e.record.get("subscription_type"),
    membership_type: e.record.get("membership_type"),
    amount: e.record.get("amount"),
    transaction_reference: e.record.get("transaction_reference"),
    transaction_id: e.record.get("transaction_id"),
    approval_status: e.record.get("approval_status"),
    rejection_reason: e.record.get("rejection_reason")
  }, null, 2));
  
  // Verify user_id relation exists
  try {
    const user = $app.findRecordById("users", e.record.get("user_id"));
    console.log("User found:", user.get("email"), "| blocked:", user.get("is_blocked"), "| deleted:", user.get("is_deleted"), "| archived:", user.get("archived"));
  } catch (err) {
    console.log("ERROR: User not found or error accessing user:", err.message);
    throw new BadRequestError("User ID does not exist or is inaccessible: " + e.record.get("user_id"));
  }
  
  // Validate required fields
  const requiredFields = ["user_id", "email", "full_name", "subscription_type", "membership_type", "amount", "transaction_reference", "transaction_id", "approval_status"];
  for (const field of requiredFields) {
    const value = e.record.get(field);
    if (value === null || value === undefined || value === "") {
      console.log("VALIDATION ERROR: Required field missing:", field, "value:", value);
      throw new BadRequestError("Required field is empty: " + field);
    }
  }
  
  // Validate approval_status is in allowed values
  const validStatuses = ["pending_approval", "approved", "rejected"];
  const status = e.record.get("approval_status");
  if (!validStatuses.includes(status)) {
    console.log("VALIDATION ERROR: Invalid approval_status:", status);
    throw new BadRequestError("Invalid approval_status. Must be one of: " + validStatuses.join(", "));
  }
  
  console.log("All validations passed");
  e.next();
}, "subscriptions");