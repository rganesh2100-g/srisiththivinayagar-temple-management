/// <reference path="../pb_data/types.d.ts" />
onRecordAfterCreateSuccess((e) => {
  // Get the booking record
  const booking = e.record;
  const bookingId = booking.id;
  const userId = booking.get("user_id");
  const poojaId = booking.get("pooja_id");
  const bookingDate = booking.get("pooja_date");
  const timeSlot = booking.get("time_slot");
  const donationAmount = booking.get("donation_amount");
  const userEmail = booking.get("email");
  const userName = booking.get("name");
  const userContact = booking.get("user_contact");
  const status = booking.get("status");
  
  // Fetch the related pooja record to get the pooja name
  let poojaName = "Pooja";
  try {
    const pooja = $app.findRecordById("poojas", poojaId);
    if (pooja) {
      poojaName = pooja.get("name");
    }
  } catch (err) {
    console.log("Could not fetch pooja details: " + err.message);
  }
  
  // Format the date for display
  const dateObj = new Date(bookingDate);
  const formattedDate = dateObj.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
  
  // Create the confirmation email
  const message = new MailerMessage({
    from: {
      address: $app.settings().meta.senderAddress,
      name: $app.settings().meta.senderName
    },
    to: [{ address: userEmail }],
    subject: "Pooja Booking Confirmation - " + poojaName,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h1 style="color: #d4a574; text-align: center; margin-bottom: 30px;">Pooja Booking Confirmation</h1>
          
          <p style="color: #333; font-size: 16px; margin-bottom: 20px;">Dear <strong>${userName}</strong>,</p>
          
          <p style="color: #666; font-size: 14px; margin-bottom: 20px;">Thank you for booking with us! Your pooja booking has been confirmed. Here are your booking details:</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-left: 4px solid #d4a574; margin: 20px 0;">
            <h2 style="color: #d4a574; font-size: 18px; margin-top: 0;">Booking Details</h2>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 12px 0; color: #666; font-weight: bold; width: 40%;">Pooja Name:</td>
                <td style="padding: 12px 0; color: #333;">${poojaName}</td>
              </tr>
              <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 12px 0; color: #666; font-weight: bold;">Booking Date:</td>
                <td style="padding: 12px 0; color: #333;">${formattedDate}</td>
              </tr>
              <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 12px 0; color: #666; font-weight: bold;">Time Slot:</td>
                <td style="padding: 12px 0; color: #333;">${timeSlot}</td>
              </tr>
              <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 12px 0; color: #666; font-weight: bold;">Donation Amount:</td>
                <td style="padding: 12px 0; color: #333;">₹${donationAmount}</td>
              </tr>
              <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 12px 0; color: #666; font-weight: bold;">Booking Status:</td>
                <td style="padding: 12px 0; color: #d4a574; font-weight: bold;">${status}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; color: #666; font-weight: bold;">Reference ID:</td>
                <td style="padding: 12px 0; color: #333; font-family: monospace;">${bookingId}</td>
              </tr>
            </table>
          </div>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-left: 4px solid #d4a574; margin: 20px 0;">
            <h2 style="color: #d4a574; font-size: 18px; margin-top: 0;">Your Contact Information</h2>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 12px 0; color: #666; font-weight: bold; width: 40%;">Name:</td>
                <td style="padding: 12px 0; color: #333;">${userName}</td>
              </tr>
              <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 12px 0; color: #666; font-weight: bold;">Email:</td>
                <td style="padding: 12px 0; color: #333;">${userEmail}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; color: #666; font-weight: bold;">Phone:</td>
                <td style="padding: 12px 0; color: #333;">${userContact}</td>
              </tr>
            </table>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 20px; line-height: 1.6;">
            If you have any questions or need to make changes to your booking, please contact us at your earliest convenience. We look forward to serving you!
          </p>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p style="color: #999; font-size: 12px; margin: 0;">This is an automated confirmation email. Please do not reply to this email.</p>
          </div>
        </div>
      </div>
    `
  });
  
  // Send the email
  try {
    $app.newMailClient().send(message);
    console.log("Booking confirmation email sent to " + userEmail);
  } catch (err) {
    console.log("Failed to send confirmation email: " + err.message);
  }
  
  e.next();
}, "pooja_bookings");