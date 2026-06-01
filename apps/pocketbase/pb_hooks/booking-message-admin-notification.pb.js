/// <reference path="../pb_data/types.d.ts" />
onRecordAfterCreateSuccess((e) => {
  try {
    const senderType = e.record.get("sender_type");
    
    // Only notify admin if message is from user
    if (senderType === "user") {
      const bookingId = e.record.get("booking_id");
      const messageContent = e.record.get("message_content");
      const senderId = e.record.get("sender_id");
      
      // Get booking details
      const booking = $app.findRecordById("pooja_bookings", bookingId);
      if (booking) {
        const userName = booking.get("name");
        const userEmail = booking.get("email");
        
        const message = new MailerMessage({
          from: {
            address: $app.settings().meta.senderAddress,
            name: $app.settings().meta.senderName
          },
          to: [{ address: "admin@temple.com" }],
          subject: "New Message from User: " + userName,
          html: "<h2>New Booking Message</h2><p><strong>From:</strong> " + userName + " (" + userEmail + ")</p><p><strong>Message:</strong></p><p>" + messageContent + "</p><p>Please log in to respond.</p>"
        });
        
        $app.newMailClient().send(message);
      }
    }
  } catch (err) {
    console.log("Error sending admin notification: " + err.message);
  }
  
  e.next();
}, "booking_messages");