/// <reference path="../pb_data/types.d.ts" />
onRecordAfterCreateSuccess((e) => {
  try {
    const receiptId = e.record.get("receipt_id");
    const amount = e.record.get("amount");
    const paymentType = e.record.get("payment_type");
    const userName = e.record.get("user_name");
    const date = e.record.get("date");
    const description = e.record.get("description");
    const bookingId = e.record.get("booking_id");
    const donationId = e.record.get("donation_id");

    // Fetch user email from users collection
    let userEmail = null;
    try {
      const userRecord = $app.findFirstRecordByData("users", "name", userName);
      if (userRecord) {
        userEmail = userRecord.get("email");
      }
    } catch (err) {
      console.log("Could not find user by name, attempting alternative lookup");
    }

    // If email not found by name, try to get it from booking or donation record
    if (!userEmail && bookingId) {
      try {
        const bookingRecord = $app.findRecordById("pooja_bookings", bookingId);
        if (bookingRecord) {
          userEmail = bookingRecord.get("email");
        }
      } catch (err) {
        console.log("Could not fetch booking record");
      }
    }

    if (!userEmail && donationId) {
      try {
        const donationRecord = $app.findRecordById("donations", donationId);
        if (donationRecord) {
          // Try to get user and fetch their email
          const userId = donationRecord.get("user_id");
          if (userId) {
            const userRec = $app.findRecordById("users", userId);
            if (userRec) {
              userEmail = userRec.get("email");
            }
          }
        }
      } catch (err) {
        console.log("Could not fetch donation record");
      }
    }

    if (!userEmail) {
      console.log("Warning: Could not find user email for receipt " + receiptId);
      e.next();
      return;
    }

    // Format the date
    const formattedDate = new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Generate professional HTML email
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .header h1 { margin: 0; color: #2c3e50; font-size: 24px; }
          .receipt-details { background-color: #fff; border: 1px solid #ddd; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .detail-row:last-child { border-bottom: none; }
          .detail-label { font-weight: bold; color: #555; }
          .detail-value { color: #333; }
          .amount-section { background-color: #f0f8ff; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .amount-display { font-size: 28px; font-weight: bold; color: #27ae60; text-align: center; }
          .footer { text-align: center; color: #777; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
          .thank-you { text-align: center; color: #27ae60; font-size: 16px; font-weight: bold; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Receipt Confirmation</h1>
            <p>Thank you for your contribution!</p>
          </div>

          <div class="receipt-details">
            <div class="detail-row">
              <span class="detail-label">Receipt ID:</span>
              <span class="detail-value">${receiptId}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Name:</span>
              <span class="detail-value">${userName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Payment Type:</span>
              <span class="detail-value">${paymentType}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Date:</span>
              <span class="detail-value">${formattedDate}</span>
            </div>
            ${description ? `
            <div class="detail-row">
              <span class="detail-label">Description:</span>
              <span class="detail-value">${description}</span>
            </div>
            ` : ''}
          </div>

          <div class="amount-section">
            <div style="font-size: 14px; color: #666; margin-bottom: 10px;">Amount Received</div>
            <div class="amount-display">₹${amount}</div>
          </div>

          <div class="thank-you">
            Your contribution is greatly appreciated and will be used to support our mission.
          </div>

          <div class="footer">
            <p>This is an automated receipt. Please do not reply to this email.</p>
            <p>If you have any questions, please contact us through our website.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Construct the email message
    const message = new MailerMessage({
      from: {
        address: $app.settings().meta.senderAddress,
        name: $app.settings().meta.senderName
      },
      to: [{ address: userEmail }],
      subject: "Receipt Confirmation - Receipt ID: " + receiptId,
      html: htmlContent
    });

    // Send the email
    $app.newMailClient().send(message);
    console.log("Receipt email sent successfully to " + userEmail + " for receipt " + receiptId);

  } catch (error) {
    console.log("Error sending receipt email: " + error.message);
  }

  e.next();
}, "accounts_ledger");