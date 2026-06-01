/// <reference path="../pb_data/types.d.ts" />
onRecordAfterCreateSuccess((e) => {
  try {
    const senderType = e.record.get("sender_type");
    
    // Only notify user if message is from admin
    if (senderType === "admin") {
      const bookingId = e.record.get("booking_id");
      const messageContent = e.record.get("message_content");
      
      // Get booking details
      const booking = $app.findRecordById("pooja_bookings", bookingId);
      if (booking) {
        const userEmail = booking.get("email");
        const userName = booking.get("name");
        
        const message = new MailerMessage({
          from: {
            address: $app.settings().meta.senderAddress,
            name: $app.settings().meta.senderName
          },
          to: [{ address: userEmail }],
          subject: "New Message About Your Pooja Booking",
          html: "<h2>Message from Temple Admin</h2><p>Dear " + userName + ",</p><p><strong>Message:</strong></p><p>" + messageContent + "</p><p>Please log in to your account to respond.</p>"
        });
        
        $app.newMailClient().send(message);
      }
    }
  } catch (err) {
    console.log("Error sending user notification: " + err.message);
  }
  
  e.next();
}, "booking_messages");