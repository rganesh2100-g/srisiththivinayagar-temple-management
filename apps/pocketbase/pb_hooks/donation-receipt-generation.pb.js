/// <reference path="../pb_data/types.d.ts" />
onRecordAfterCreateSuccess((e) => {
  const status = e.record.get("status");
  if (status === "approved") {
    generateAndSendDonationReceipt(e.record);
  }
  e.next();
}, "donations");

onRecordAfterUpdateSuccess((e) => {
  const status = e.record.get("status");
  if (status === "approved") {
    const originalStatus = e.record.original().get("status");
    if (originalStatus !== status) {
      generateAndSendDonationReceipt(e.record);
    }
  }
  e.next();
}, "donations");

function generateAndSendDonationReceipt(record) {
  try {
    const timestamp = new Date().getTime();
    const random = Math.random().toString(36).substring(2, 8);
    const receiptNumber = "DONATION_" + timestamp + "_" + random;
    
    // Set receipt number and sent date
    record.set("receipt_number", receiptNumber);
    record.set("receipt_sent_at", new Date().toISOString().split('T')[0]);
    
    // Save the record with receipt details
    $app.save(record);
    
    // Send email with receipt
    const userId = record.get("user_id");
    const amount = record.get("amount") || 0;
    const category = record.get("category") || "General Donation";
    const specialOccasion = record.get("special_occasion") || "";
    
    // Try to get user email from users collection
    let userEmail = "";
    try {
      const user = $app.findRecordById("users", userId);
      userEmail = user.get("email");
    } catch (e) {
      console.log("Could not find user email");
      return;
    }
    
    const message = new MailerMessage({
      from: {
        address: $app.settings().meta.senderAddress,
        name: $app.settings().meta.senderName
      },
      to: [{ address: userEmail }],
      subject: "Your Receipt - Sri Sitthi Vinayagar Temple",
      html: `
        <h2>Donation Receipt</h2>
        <p>Dear Devotee,</p>
        <p>Thank you for your generous donation to Sri Sitthi Vinayagar Temple.</p>
        <p><strong>Receipt Number:</strong> ${receiptNumber}</p>
        <p><strong>Category:</strong> ${category}</p>
        ${specialOccasion ? '<p><strong>Occasion:</strong> ' + specialOccasion + '</p>' : ''}
        <p><strong>Amount:</strong> ₹${amount}</p>
        <p>Your contribution helps us serve the community and maintain our sacred temple. May Lord Ganesha bless you with wisdom, prosperity, and spiritual growth.</p>
        <p>With divine blessings,<br>Sri Sitthi Vinayagar Temple</p>
      `
    });
    
    $app.newMailClient().send(message);
  } catch (error) {
    console.log("Error generating donation receipt: " + error.message);
  }
}