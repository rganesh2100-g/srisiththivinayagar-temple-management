/// <reference path="../pb_data/types.d.ts" />
onRecordAfterCreateSuccess((e) => {
  try {
    const transactionId = e.record.get("transaction_id");
    const amount = e.record.get("amount");
    const paymentDate = e.record.get("payment_date");
    const subscriptionId = e.record.get("subscription_id");
    const userEmail = e.record.get("user_email");
    const status = e.record.get("status");
    
    const adminEmail = "admin@yourdomain.com";
    const approvalPageLink = "https://yourdomain.com/admin/subscription-management";
    
    const emailBody = `
      <h2>New Payment Submission Received</h2>
      <p>A new payment has been submitted and requires your review.</p>
      <hr>
      <h3>Payment Details:</h3>
      <ul>
        <li><strong>Transaction ID:</strong> ${transactionId || "N/A"}</li>
        <li><strong>Amount:</strong> ${amount || "N/A"}</li>
        <li><strong>Payment Date:</strong> ${paymentDate || "N/A"}</li>
        <li><strong>Subscription ID:</strong> ${subscriptionId || "N/A"}</li>
        <li><strong>User Email:</strong> ${userEmail || "N/A"}</li>
        <li><strong>Status:</strong> ${status || "N/A"}</li>
      </ul>
      <hr>
      <p><a href="${approvalPageLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Review Payment in Admin Panel</a></p>
      <p>Please review and approve or reject this payment submission.</p>
    `;
    
    const message = new MailerMessage({
      from: {
        address: $app.settings().meta.senderAddress,
        name: $app.settings().meta.senderName
      },
      to: [{ address: adminEmail }],
      subject: "New Payment Submission Received",
      html: emailBody
    });
    
    $app.newMailClient().send(message);
  } catch (error) {
    console.error("Error sending payment notification email:", error);
  }
  
  e.next();
}, "payment_records");