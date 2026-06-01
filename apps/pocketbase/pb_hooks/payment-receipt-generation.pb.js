/// <reference path="../pb_data/types.d.ts" />
onRecordAfterCreateSuccess((e) => {
  const status = e.record.get("status");
  if (status === "approved") {
    generateAndSendPaymentReceipt(e.record);
  }
  e.next();
}, "payments");

onRecordAfterUpdateSuccess((e) => {
  const status = e.record.get("status");
  if (status === "approved") {
    const originalStatus = e.record.original().get("status");
    if (originalStatus !== status) {
      generateAndSendPaymentReceipt(e.record);
    }
  }
  e.next();
}, "payments");

function generateAndSendPaymentReceipt(record) {
  try {
    const timestamp = new Date().getTime();
    const random = Math.random().toString(36).substring(2, 8);
    const receiptNumber = "PAYMENT_" + timestamp + "_" + random;
    
    // Set receipt number and sent date
    record.set("receipt_number", receiptNumber);
    record.set("receipt_sent_at", new Date().toISOString().split('T')[0]);
    
    // Save the record with receipt details
    $app.save(record);
    
    // Send email with receipt
    const email = record.get("email");
    const planType = record.get("plan_type") || "Subscription";
    const totalAmount = record.get("total_amount") || 0;
    const billingCycle = record.get("billing_cycle") || "";
    const startDate = record.get("start_date") || "";
    const endDate = record.get("end_date") || "";
    
    const message = new MailerMessage({
      from: {
        address: $app.settings().meta.senderAddress,
        name: $app.settings().meta.senderName
      },
      to: [{ address: email }],
      subject: "Your Receipt - Sri Sitthi Vinayagar Temple",
      html: `
        <h2>Payment Receipt</h2>
        <p>Dear Devotee,</p>
        <p>Thank you for your payment to Sri Sitthi Vinayagar Temple.</p>
        <p><strong>Receipt Number:</strong> ${receiptNumber}</p>
        <p><strong>Plan Type:</strong> ${planType}</p>
        <p><strong>Billing Cycle:</strong> ${billingCycle}</p>
        ${startDate ? '<p><strong>Start Date:</strong> ' + startDate + '</p>' : ''}
        ${endDate ? '<p><strong>End Date:</strong> ' + endDate + '</p>' : ''}
        <p><strong>Amount:</strong> ₹${totalAmount}</p>
        <p>Your payment has been successfully processed. May Lord Ganesha bless you with divine grace and spiritual enlightenment.</p>
        <p>With divine blessings,<br>Sri Sitthi Vinayagar Temple</p>
      `
    });
    
    $app.newMailClient().send(message);
  } catch (error) {
    console.log("Error generating payment receipt: " + error.message);
  }
}