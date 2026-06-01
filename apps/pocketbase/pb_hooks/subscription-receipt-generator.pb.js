/// <reference path="../pb_data/types.d.ts" />
onRecordAfterUpdateSuccess((e) => {
  // Only process if status changed to 'active' or if this is an approved subscription
  const status = e.record.get("status");
  const email = e.record.get("email") || "";
  
  // Check if this is the record we're looking for
  if (email === "rganesh2100@gmail.com" && status === "active") {
    try {
      // Prepare receipt data
      const receiptData = {
        user_name: "ganesh",
        email: "rganesh2100@gmail.com",
        membership_type: e.record.get("plan_type") || "Premium",
        amount: e.record.get("total_amount") || 10.00,
        currency: "€",
        date: new Date().toISOString().split('T')[0],
        subscription_id: e.record.id,
        transaction_id: e.record.get("transaction_id") || "",
        billing_cycle: e.record.get("billing_cycle") || "",
        start_date: e.record.get("start_date") || "",
        end_date: e.record.get("end_date") || ""
      };
      
      // Generate receipt ID based on subscription type
      const planType = e.record.get("plan_type") || "premium";
      const timestamp = Date.now();
      const receiptId = `RCP-${planType.toUpperCase()}-${timestamp}`;
      
      // Update the record with receipt information
      e.record.set("receipt_id", receiptId);
      e.record.set("receipt_generated_at", new Date().toISOString());
      
      // Note: PDF generation would happen here with your pdfReceiptGenerator utility
      // This is a placeholder - you'll need to integrate your actual PDF generation logic
      console.log("Receipt generated for subscription:", receiptId);
      console.log("Receipt data:", receiptData);
      
      // Save the updated record
      $app.save(e.record);
      
    } catch (error) {
      console.error("Error generating receipt:", error);
    }
  }
  
  e.next();
}, "subscriptions");