/// <reference path="../pb_data/types.d.ts" />
onRecordAfterCreateSuccess((e) => {
  const accountType = e.record.get("account_type");
  
  // Check if account_type is empty or null
  if (!accountType || accountType.trim() === "") {
    e.record.set("account_type", "Free Membership");
    $app.save(e.record);
  }
  
  e.next();
}, "users");