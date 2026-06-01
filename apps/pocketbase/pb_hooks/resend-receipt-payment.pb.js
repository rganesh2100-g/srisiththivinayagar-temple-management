/// <reference path="../pb_data/types.d.ts" />
onRecordUpdate((e) => {
  const resendReceipt = e.record.get("resend_receipt");
  if (resendReceipt === true) {
    try {
      const email = e.record.get("email");
      const receiptNumber = e.record.get("receipt_number");
      const planType = e.record.get("plan_type") || "Subscription";
      const totalAmount = e.record.get("total_amount") || 0;
      
      if (receiptNumber && email) {
        const message = new MailerMessage({
          from: {
            address: $app.settings().meta.senderAddress,
            name: $app.settings().meta.senderName
          },
          to: [{ address: email }],
          subject: "Your Receipt - Sri Sitthi Vinayagar Temple",
          html: `
            <h2>Payment Receipt (Resent)</h2>
            <p>Dear Devotee,</p>
            <p>Please find your receipt for your payment to Sri Sitthi Vinayagar Temple.</p>
            <p><strong>Receipt Number:</strong> ${receiptNumber}</p>
            <p><strong>Plan Type:</strong> ${planType}</p>
            <p><strong>Amount:</strong> ₹${totalAmount}</p>
            <p>Your payment has been successfully processed. May Lord Ganesha bless you with divine grace and spiritual enlightenment.</p>
            <p>With divine blessings,<br>Sri Sitthi Vinayagar Temple</p>
          `
        });
        
        $app.newMailClient().send(message);
        
        // Reset resend_receipt flag
        e.record.set("resend_receipt", false);
      }
    } catch (error) {
      console.log("Error resending payment receipt: " + error.message);
    }
  }
  e.next();
}, "payments");