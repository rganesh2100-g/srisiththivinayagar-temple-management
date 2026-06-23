/// <reference path="../pb_data/types.d.ts" />
onRecordCreate((e) => {
  const user = e.record.get("user");
  const planType = e.record.get("plan_type");
  const amount = e.record.get("amount");
  const transactionId = e.record.get("transaction_id");
  const transactionRef = e.record.get("transaction_ref");
  const status = e.record.get("status");
  const billingCycle = e.record.get("billing_cycle");
  const durationMonths = e.record.get("duration_months");
  const renewalType = e.record.get("renewal_type");
  const startDate = e.record.get("start_date");
  const endDate = e.record.get("end_date");

  console.log("=== SUBSCRIPTION CREATE DEBUG ===");
  console.log("Record data: {");
  console.log("  user: " + user);
  console.log("  plan_type: " + planType);
  console.log("  amount: " + amount);
  console.log("  transaction_id: " + transactionId);
  console.log("  transaction_ref: " + transactionRef);
  console.log("  status: " + status);
  console.log("  billing_cycle: " + billingCycle);
  console.log("  duration_months: " + durationMonths);
  console.log("  renewal_type: " + renewalType);
  console.log("  start_date: " + startDate);
  console.log("  end_date: " + endDate);
  console.log("}");

  // Validate required fields
  if (!user || !planType || !amount || !status || !billingCycle || !durationMonths || !renewalType || !startDate || !endDate) {
    throw new BadRequestError("Missing required fields");
  }

  // Validate amount is positive
  if (amount <= 0) {
    throw new BadRequestError("Amount must be greater than 0");
  }

  // Validate plan_type
  const validPlanTypes = ["free", "premium"];
  if (!validPlanTypes.includes(planType)) {
    throw new BadRequestError("Invalid plan type");
  }

  // Validate status
  const validStatuses = ["pending", "active", "rejected"];
  if (!validStatuses.includes(status)) {
    throw new BadRequestError("Invalid status");
  }

  // Validate renewal_type
  const validRenewalTypes = ["auto", "manual"];
  if (renewalType && !validRenewalTypes.includes(renewalType)) {
    throw new BadRequestError("Invalid renewal type");
  }

  // Validate duration_months
  if (durationMonths < 1 || durationMonths > 120) {
    throw new BadRequestError("Duration months must be between 1 and 120");
  }

  // Try to find the user
  try {
    const userRecord = $app.findRecordById("users", user);
    if (!userRecord) {
      throw new BadRequestError("User not found");
    }

    const userBlocked = userRecord.get("blocked");
    const userDeleted = userRecord.get("deleted");
    const userArchived = userRecord.get("archived");

    console.log("User found: " + userRecord.get("email") + " | blocked: " + userBlocked + " | deleted: " + userDeleted + " | archived: " + userArchived);

    if (userBlocked || userDeleted || userArchived) {
      throw new BadRequestError("User is blocked, deleted, or archived");
    }
  } catch (err) {
    if (err instanceof BadRequestError) {
      throw err;
    }
    throw new BadRequestError("User validation failed: " + err.message);
  }

  console.log("All validations passed");
  e.next();
}, "subscriptions");
