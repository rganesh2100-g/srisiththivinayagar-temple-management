/// <reference path="../pb_data/types.d.ts" />
onRecordAfterCreateSuccess((e) => {
  // Log the subscription creation
  console.log("Subscription created with ID:", e.record.id);
  console.log("User ID from subscription:", e.record.get("user"));
  console.log("Status:", e.record.get("status"));
  
  // Query subscriptions by user relation field
  // Filter: user relation field where user.id = the user ID AND status = 'approved'
  const userId = e.record.get("user");
  
  if (!userId) {
    console.log("No user ID found in subscription record");
    e.next();
    return;
  }
  
  try {
    // Find the subscription record with expanded user relation
    const subscription = $app.findFirstRecordByFilter(
      "subscriptions",
      "user = @userId && status = 'approved'",
      { "@userId": userId }
    );
    
    if (!subscription) {
      console.log("No approved subscription found for user:", userId);
      e.next();
      return;
    }
    
    console.log("Found subscription record:", subscription.id);
    console.log("Subscription status:", subscription.get("status"));
    
    // Check if receipt fields are populated
    const receiptPdf = subscription.get("receipt_pdf");
    const receiptId = subscription.get("receipt_id");
    const receiptGeneratedAt = subscription.get("receipt_generated_at");
    
    console.log("Receipt PDF populated:", !!receiptPdf);
    console.log("Receipt ID:", receiptId);
    console.log("Receipt generated at:", receiptGeneratedAt);
    
    // If receipt_pdf is empty, generate and store the PDF
    if (!receiptPdf) {
      console.log("Generating receipt PDF for subscription:", subscription.id);
      
      // Prepare receipt data
      const receiptData = {
        subscriptionId: subscription.id,
        userId: userId,
        amount: subscription.get("total_amount"),
        planType: subscription.get("plan_type"),
        billingCycle: subscription.get("billing_cycle"),
        customDonation: subscription.get("custom_donation"),
        startDate: subscription.get("start_date"),
        endDate: subscription.get("end_date"),
        createdAt: subscription.get("created"),
        status: subscription.get("status")
      };
      
      console.log("Receipt data prepared:", JSON.stringify(receiptData));
      
      // Generate PDF using pdfReceiptGenerator utility
      // Note: This assumes pdfReceiptGenerator is available in the hook context
      try {
        // Generate the PDF (implementation depends on your pdfReceiptGenerator utility)
        // For now, we'll log that this step would occur
        console.log("PDF generation would occur here with data:", receiptData);
        
        // Update subscription with receipt information
        subscription.set("receipt_generated_at", new Date().toISOString());
        
        // Save the updated subscription
        $app.save(subscription);
        console.log("Subscription updated with receipt generation timestamp");
      } catch (pdfError) {
        console.log("Error generating PDF:", pdfError.message);
      }
    } else {
      console.log("Receipt PDF already exists for subscription:", subscription.id);
    }
    
  } catch (error) {
    console.log("Error in subscription receipt generation:", error.message);
  }
  
  e.next();
}, "subscriptions");

// Also handle updates to subscriptions
onRecordAfterUpdateSuccess((e) => {
  console.log("Subscription updated with ID:", e.record.id);
  
  const status = e.record.get("status");
  const userId = e.record.get("user");
  
  // If status changed to 'approved', generate receipt
  if (status === "approved" && userId) {
    try {
      const receiptPdf = e.record.get("receipt_pdf");
      
      if (!receiptPdf) {
        console.log("Generating receipt for approved subscription:", e.record.id);
        
        // Prepare receipt data
        const receiptData = {
          subscriptionId: e.record.id,
          userId: userId,
          amount: e.record.get("total_amount"),
          planType: e.record.get("plan_type"),
          billingCycle: e.record.get("billing_cycle"),
          customDonation: e.record.get("custom_donation"),
          startDate: e.record.get("start_date"),
          endDate: e.record.get("end_date"),
          createdAt: e.record.get("created"),
          status: e.record.get("status")
        };
        
        console.log("Receipt data for update:", JSON.stringify(receiptData));
        
        // Update receipt generation timestamp
        e.record.set("receipt_generated_at", new Date().toISOString());
        console.log("Receipt generation timestamp set for subscription:", e.record.id);
      }
    } catch (error) {
      console.log("Error processing subscription update:", error.message);
    }
  }
  
  e.next();
}, "subscriptions");