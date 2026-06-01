/// <reference path="../pb_data/types.d.ts" />
onRecordUpdate((e) => {
  const resendReceipt = e.record.get("resend_receipt");
  if (resendReceipt === true) {
    try {
      const email = e.record.get("email");
      const name = e.record.get("name");
      const receiptNumber = e.record.get("receipt_number");
      const poojaName = e.record.get("pooja_name") || "Pooja Service";
      
      if (receiptNumber && email) {
        const message = new MailerMessage({
          from: {
            address: $app.settings().meta.senderAddress,
            name: $app.settings().meta.senderName
          },
          to: [{ address: email }],
          subject: "Your Receipt - Sri Sitthi Vinayagar Temple",
          html: `
            <h2>Receipt for Pooja Booking (Resent)</h2>
            <p>Dear ${name},</p>
            <p>Please find your receipt for the ${poojaName} booking at Sri Sitthi Vinayagar Temple.</p>
            <p><strong>Receipt Number:</strong> ${receiptNumber}</p>
            <p>May Lord Ganesha bless you and your family with prosperity, health, and happiness.</p>
            <p>With divine blessings,<br>Sri Sitthi Vinayagar Temple</p>
          `
        });
        
        $app.newMailClient().send(message);
        
        // Reset resend_receipt flag
        e.record.set("resend_receipt", false);
      }
    } catch (error) {
      console.log("Error resending pooja receipt: " + error.message);
    }
  }
  e.next();
}, "pooja_bookings");