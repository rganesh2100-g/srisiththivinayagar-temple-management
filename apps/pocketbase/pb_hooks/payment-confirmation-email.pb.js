/// <reference path="../pb_data/types.d.ts" />
onRecordAfterCreateSuccess((e) => {
  const userEmail = e.record.get("user_email");
  const amount = e.record.get("amount");
  const transactionId = e.record.get("transaction_id");
  const subscriptionType = e.record.get("subscription_type");
  const paymentDate = e.record.get("payment_date");
  const paymentMethod = e.record.get("payment_method");
  const fullName = e.record.get("full_name");
  const contactNumber = e.record.get("contact_number");
  const address = e.record.get("address");

  const senderAddress = $app.settings().meta.senderAddress;
  const senderName = $app.settings().meta.senderName;

  // Email 1: Send payment confirmation to user
  const userMessage = new MailerMessage({
    from: {
      address: senderAddress,
      name: senderName
    },
    to: [{ address: userEmail }],
    subject: "Payment Confirmation - Transaction #" + transactionId,
    html: "<h2>Payment Confirmation</h2>" +
          "<p>Dear " + (fullName || "Valued Member") + ",</p>" +
          "<p>Thank you for your payment. Your transaction has been successfully processed.</p>" +
          "<h3>Payment Details:</h3>" +
          "<ul>" +
          "<li><strong>Transaction ID:</strong> " + transactionId + "</li>" +
          "<li><strong>Amount:</strong> ₹" + amount + "</li>" +
          "<li><strong>Subscription Type:</strong> " + subscriptionType + "</li>" +
          "<li><strong>Payment Method:</strong> " + (paymentMethod || "N/A") + "</li>" +
          "<li><strong>Payment Date:</strong> " + paymentDate + "</li>" +
          "</ul>" +
          "<p>If you have any questions, please contact us.</p>" +
          "<p>Best regards,<br>" + senderName + "</p>"
  });

  $app.newMailClient().send(userMessage).catch(err => {
    console.log("User payment confirmation email failed:", err);
  });

  // Email 2: Send payment notification to admin
  const adminEmail = $app.settings().meta.senderAddress;
  const adminMessage = new MailerMessage({
    from: {
      address: senderAddress,
      name: senderName
    },
    to: [{ address: adminEmail }],
    subject: "New Payment Received - Transaction #" + transactionId,
    html: "<h2>New Payment Notification</h2>" +
          "<p>A new payment has been received in the system.</p>" +
          "<h3>Payment Details:</h3>" +
          "<ul>" +
          "<li><strong>Transaction ID:</strong> " + transactionId + "</li>" +
          "<li><strong>Amount:</strong> ₹" + amount + "</li>" +
          "<li><strong>Subscription Type:</strong> " + subscriptionType + "</li>" +
          "<li><strong>Payment Method:</strong> " + (paymentMethod || "N/A") + "</li>" +
          "<li><strong>Payment Date:</strong> " + paymentDate + "</li>" +
          "</ul>" +
          "<h3>User Information:</h3>" +
          "<ul>" +
          "<li><strong>Name:</strong> " + (fullName || "N/A") + "</li>" +
          "<li><strong>Email:</strong> " + userEmail + "</li>" +
          "<li><strong>Contact Number:</strong> " + (contactNumber || "N/A") + "</li>" +
          "<li><strong>Address:</strong> " + (address || "N/A") + "</li>" +
          "</ul>" +
          "<p>Please review and process this payment accordingly.</p>"
  });

  $app.newMailClient().send(adminMessage).catch(err => {
    console.log("Admin payment notification email failed:", err);
  });

  e.next();
}, "payment_records");