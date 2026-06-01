/// <reference path="../pb_data/types.d.ts" />
onRecordAfterCreateSuccess((e) => {
  // Send admin notification email for new contact inquiry
  // This hook runs AFTER the record is successfully saved, so it won't block creation
  
  const adminEmail = "admin@temple.com"; // Configurable admin email
  const inquiryName = e.record.get("name") || "Unknown";
  const inquiryEmail = e.record.get("email") || "no-email";
  const inquirySubject = e.record.get("subject") || "No Subject";
  const inquiryMessage = e.record.get("message") || "No Message";
  
  try {
    const message = new MailerMessage({
      from: {
        address: $app.settings().meta.senderAddress,
        name: $app.settings().meta.senderName
      },
      to: [{ address: adminEmail }],
      subject: "New Contact Inquiry: " + inquirySubject,
      html: "<h2>New Contact Inquiry</h2>" +
            "<p><strong>Name:</strong> " + inquiryName + "</p>" +
            "<p><strong>Email:</strong> " + inquiryEmail + "</p>" +
            "<p><strong>Phone:</strong> " + (e.record.get("phone") || "Not provided") + "</p>" +
            "<p><strong>Subject:</strong> " + inquirySubject + "</p>" +
            "<p><strong>Message:</strong></p>" +
            "<p>" + inquiryMessage + "</p>" +
            "<p><em>Inquiry ID: " + e.record.id + "</em></p>"
    });
    
    $app.newMailClient().send(message);
  } catch (err) {
    // Log error but don't block record creation
    console.log("Failed to send contact inquiry notification email: " + err.message);
  }
  
  // CRITICAL: Always call e.next() to continue execution chain
  e.next();
}, "contact_inquiries");