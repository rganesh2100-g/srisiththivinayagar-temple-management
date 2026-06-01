/// <reference path="../pb_data/types.d.ts" />
// DIAGNOSTIC HOOK - This hook logs all subscription creation attempts
// to help identify where the 'sql: no rows in result set' error originates

onRecordCreate((e) => {
  console.log("=== SUBSCRIPTION CREATE HOOK ===");
  console.log("Record data:", JSON.stringify(e.record.export(), null, 2));
  console.log("User ID value:", e.record.get("user_id"));
  console.log("User ID type:", typeof e.record.get("user_id"));
  
  // Try to find the user record
  try {
    const userId = e.record.get("user_id");
    console.log("Attempting to find user with ID:", userId);
    const user = $app.findRecordById("users", userId);
    console.log("User found:", user ? "YES" : "NO");
    if (user) {
      console.log("User email:", user.get("email"));
    }
  } catch (err) {
    console.log("Error finding user:", err.message);
  }
  
  e.next();
}, "subscriptions");