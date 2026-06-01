/// <reference path="../pb_data/types.d.ts" />
onRecordCreate((e) => {
  const userId = e.record.get("user_id");
  const email = e.record.get("email");
  const fullName = e.record.get("full_name");
  const subscriptionType = e.record.get("subscription_type");
  const membershipType = e.record.get("membership_type");
  const amount = e.record.get("amount");
  const transactionReference = e.record.get("transaction_reference");
  const transactionId = e.record.get("transaction_id");
  const approvalStatus = e.record.get("approval_status");

  console.log("=== SUBSCRIPTION CREATE DEBUG ===");
  console.log("Record data: {");
  console.log("  user_id: " + userId);
  console.log("  email: " + email);
  console.log("  full_name: " + fullName);
  console.log("  subscription_type: " + subscriptionType);
  console.log("  membership_type: " + membershipType);
  console.log("  amount: " + amount);
  console.log("  transaction_reference: " + transactionReference);
  console.log("  transaction_id: " + transactionId);
  console.log("  approval_status: " + approvalStatus);
  console.log("}");

  // Validate required fields
  if (!userId || !email || !fullName || !subscriptionType || !membershipType || !amount || !transactionReference || !transactionId || !approvalStatus) {
    throw new BadRequestError("Missing required fields");
  }

  // Validate amount is positive
  if (amount <= 0) {
    throw new BadRequestError("Amount must be greater than 0");
  }

  // Validate subscription type
  const validSubscriptionTypes = ["monthly", "quarterly", "annual"];
  if (!validSubscriptionTypes.includes(subscriptionType)) {
    throw new BadRequestError("Invalid subscription type");
  }

  // Validate membership type
  const validMembershipTypes = ["basic", "premium", "enterprise"];
  if (!validMembershipTypes.includes(membershipType)) {
    throw new BadRequestError("Invalid membership type");
  }

  // Validate approval status
  const validApprovalStatuses = ["pending_approval", "approved", "rejected"];
  if (!validApprovalStatuses.includes(approvalStatus)) {
    throw new BadRequestError("Invalid approval status");
  }

  // Try to find the user
  try {
    const user = $app.findRecordById("users", userId);
    if (!user) {
      throw new BadRequestError("User not found");
    }
    
    const userBlocked = user.get("blocked");
    const userDeleted = user.get("deleted");
    const userArchived = user.get("archived");
    
    console.log("User found: " + user.get("email") + " | blocked: " + userBlocked + " | deleted: " + userDeleted + " | archived: " + userArchived);
    
    if (userBlocked || userDeleted || userArchived) {
      throw new BadRequestError("User is blocked, deleted, or archived");
    }
  } catch (err) {
    throw new BadRequestError("User validation failed: " + err.message);
  }

  console.log("All validations passed");
  e.next();
}, "subscriptions");