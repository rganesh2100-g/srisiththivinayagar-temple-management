/// <reference path="../pb_data/types.d.ts" />
onRecordAfterUpdateSuccess((e) => {
  // Only send notification if status changed to Confirmed
  const original = e.record.original();
  const newStatus = e.record.get("status");
  const oldStatus = original ? original.get("status") : null;
  
  if (newStatus === "Confirmed" && oldStatus !== "Confirmed") {
    try {
      const userEmail = e.record.get("email");
      const userName = e.record.get("name");
      const poojaDate = e.record.get("pooja_date");
      const timeSlot = e.record.get("time_slot");
      
      const message = new MailerMessage({
        from: {
          address: $app.settings().meta.senderAddress,
          name: $app.settings().meta.senderName
        },
        to: [{ address: userEmail }],
        subject: "Pooja Booking Confirmed",
        html: "<h2>Your Pooja Booking is Confirmed!</h2><p>Dear " + userName + ",</p><p>Your pooja booking has been confirmed.</p><p><strong>Date:</strong> " + poojaDate + "</p><p><strong>Time Slot:</strong> " + timeSlot + "</p><p>Thank you for booking with us!</p>"
      });
      
      $app.newMailClient().send(message);
    } catch (err) {
      console.log("Error sending confirmation email: " + err.message);
    }
  }
  
  e.next();
}, "pooja_bookings");