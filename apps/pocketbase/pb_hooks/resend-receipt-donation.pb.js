/// <reference path="../pb_data/types.d.ts" />
onRecordUpdate((e) => {
  const resendReceipt = e.record.get("resend_receipt");
  if (resendReceipt === true) {
    try {
      const userId = e.record.get("user_id");
      const receiptNumber = e.record.get("receipt_number");
      const amount = e.record.get("amount") || 0;
      const category = e.record.get("category") || "General Donation";
      
      if (receiptNumber && userId) {
        // Get user email
        let userEmail = "";
        try {
          const user = $app.findRecordById("users", userId);
          userEmail = user.get("email");
        } catch (err) {
          console.log("Could not find user email");
          e.next();
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
            <h2>Donation Receipt (Resent)</h2>
            <p>Dear Devotee,</p>
            <p>Please find your receipt for your donation to Sri Sitthi Vinayagar Temple.</p>
            <p><strong>Receipt Number:</strong> ${receiptNumber}</p>
            <p><strong>Category:</strong> ${category}</p>
            <p><strong>Amount:</strong> ₹${amount}</p>
            <p>Your contribution helps us serve the community and maintain our sacred temple. May Lord Ganesha bless you with wisdom, prosperity, and spiritual growth.</p>
            <p>With divine blessings,<br>Sri Sitthi Vinayagar Temple</p>
          `
        });
        
        $app.newMailClient().send(message);
        
        // Reset resend_receipt flag
        e.record.set("resend_receipt", false);
      }
    } catch (error) {
      console.log("Error resending donation receipt: " + error.message);
    }
  }
  e.next();
}, "donations");