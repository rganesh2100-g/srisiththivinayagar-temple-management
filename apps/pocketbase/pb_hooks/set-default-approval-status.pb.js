/// <reference path="../pb_data/types.d.ts" />
onRecordCreate((e) => {
  const membershipTier = e.record.get("membershipTier");
  if (membershipTier === "premium") {
    e.record.set("approval_status", "pending_approval");
  }
  e.next();
}, "users");