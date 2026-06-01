/// <reference path="../pb_data/types.d.ts" />
onRecordAfterCreateSuccess((e) => {
  const status = e.record.get("status");
  if (status === "Confirmed" || status === "approved") {
    generateAndSendPoojaReceipt(e.record);
  }
  e.next();
}, "pooja_bookings");

onRecordAfterUpdateSuccess((e) => {
  const status = e.record.get("status");
  if (status === "Confirmed" || status === "approved") {
    const originalStatus = e.record.original().get("status");
    if (originalStatus !== status) {
      generateAndSendPoojaReceipt(e.record);
    }
  }
  e.next();
}, "pooja_bookings");

function generateAndSendPoojaReceipt(record) {
  try {
    const timestamp = new Date().getTime();
    const random = Math.random().toString(36).substring(2, 8);
    const receiptNumber = "POOJA_" + timestamp + "_" + random;
    
    // Set receipt number and sent date
    record.set("receipt_number", receiptNumber);
    record.set("receipt_sent_at", new Date().toISOString().split('T')[0]);
    
    // Save the record with receipt details
    $app.save(record);
    
    // Send email with receipt
    const email = record.get("email");
    const name = record.get("name");
    const poojaName = record.get("pooja_name") || "Pooja Service";
    const donationAmount = record.get("donation_amount") || 0;
    const bookingDate = record.get("booking_date") || "";
    
    const message = new MailerMessage({
      from: {
        address: $app.settings().meta.senderAddress,
        name: $app.settings().meta.senderName
      },
      to: [{ address: email }],
      subject: "Your Receipt - Sri Sitthi Vinayagar Temple",
      html: `
        <h2>Receipt for Pooja Booking</h2>
        <p>Dear ${name},</p>
        <p>Thank you for booking the ${poojaName} at Sri Sitthi Vinayagar Temple.</p>
        <p><strong>Receipt Number:</strong> ${receiptNumber}</p>
        <p><strong>Booking Date:</strong> ${bookingDate}</p>
        <p><strong>Amount:</strong> ₹${donationAmount}</p>
        <p>May Lord Ganesha bless you and your family with prosperity, health, and happiness.</p>
        <p>With divine blessings,<br>Sri Sitthi Vinayagar Temple</p>
      `
    });
    
    $app.newMailClient().send(message);
  } catch (error) {
    console.log("Error generating pooja receipt: " + error.message);
  }
}