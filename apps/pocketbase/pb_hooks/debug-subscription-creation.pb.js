/// <reference path="../pb_data/types.d.ts" />
// Debug hook to log all subscription creation attempts and validation errors
onRecordCreate((e) => {
  console.log("=== SUBSCRIPTION CREATE DEBUG ===");
  console.log("Record data:", JSON.stringify({
    user: e.record.get("user"),
    plan_type: e.record.get("plan_type"),
    amount: e.record.get("amount"),
    transaction_id: e.record.get("transaction_id"),
    transaction_ref: e.record.get("transaction_ref"),
    status: e.record.get("status"),
    billing_cycle: e.record.get("billing_cycle"),
    duration_months: e.record.get("duration_months"),
    renewal_type: e.record.get("renewal_type"),
    start_date: e.record.get("start_date"),
    end_date: e.record.get("end_date")
  }, null, 2));

  // Verify user relation exists
  try {
    const userRecord = $app.findRecordById("users", e.record.get("user"));
    console.log("User found:", userRecord.get("email"), "| blocked:", userRecord.get("blocked"), "| deleted:", userRecord.get("deleted"), "| archived:", userRecord.get("archived"));
  } catch (err) {
    console.log("ERROR: User not found or error accessing user:", err.message);
    throw new BadRequestError("User ID does not exist or is inaccessible: " + e.record.get("user"));
  }

  // Validate required fields
  const requiredFields = ["user", "plan_type", "amount", "status", "billing_cycle", "duration_months", "renewal_type", "start_date", "end_date"];
  for (const field of requiredFields) {
    const value = e.record.get(field);
    if (value === null || value === undefined || value === "") {
      console.log("VALIDATION ERROR: Required field missing:", field, "value:", value);
      throw new BadRequestError("Required field is empty: " + field);
    }
  }

  // Validate status is in allowed values
  const validStatuses = ["pending", "active", "rejected"];
  const status = e.record.get("status");
  if (!validStatuses.includes(status)) {
    console.log("VALIDATION ERROR: Invalid status:", status);
    throw new BadRequestError("Invalid status. Must be one of: " + validStatuses.join(", "));
  }

  console.log("All validations passed");
  e.next();
}, "subscriptions");
