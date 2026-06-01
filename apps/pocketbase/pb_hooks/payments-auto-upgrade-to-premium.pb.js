/// <reference path="../pb_data/types.d.ts" />
onRecordAfterUpdateSuccess((e) => {
  const status = e.record.get("status");
  
  // Check if payment status is approved
  if (status === "approved") {
    const userId = e.record.get("user");
    
    if (userId) {
      try {
        // Get the user record
        const user = $app.findRecordById("users", userId);
        
        // Update user account_type to Premium Membership
        user.set("account_type", "Premium Membership");
        $app.save(user);
        
        // Create subscription record
        const subscriptionsCollection = $app.findCollectionByNameOrId("subscriptions");
        const subscription = new Record(subscriptionsCollection);
        
        // Set subscription fields
        subscription.set("user", userId);
        subscription.set("plan_type", "premium");
        subscription.set("status", "active");
        
        // Calculate dates
        const today = new Date();
        const endDate = new Date(today);
        endDate.setFullYear(endDate.getFullYear() + 1);
        
        // Format dates as YYYY-MM-DD
        const startDateStr = today.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];
        
        subscription.set("start_date", startDateStr);
        subscription.set("end_date", endDateStr);
        subscription.set("total_amount", e.record.get("total_amount") || 0);
        subscription.set("billing_cycle", "yearly");
        
        $app.save(subscription);
        
        // Log the upgrade action
        console.log("User " + userId + " upgraded to Premium Membership via payment approval");
        
      } catch (error) {
        console.error("Error upgrading user to premium: " + error.message);
      }
    }
  }
  
  e.next();
}, "payments");