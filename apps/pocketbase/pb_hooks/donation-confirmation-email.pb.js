/// <reference path="../pb_data/types.d.ts" />
onRecordAfterCreateSuccess((e) => {
  // Extract donation details from the record
  const donationAmount = e.record.get("amount");
  const donationDate = e.record.get("donation_date");
  const donationId = e.record.id;
  const userId = e.record.get("user_id");
  const category = e.record.get("category");

  // Fetch the user record to get donor name and email
  let donorName = "Valued Donor";
  let donorEmail = "";
  
  try {
    const user = $app.findRecordById("users", userId);
    if (user) {
      donorName = user.get("name") || "Valued Donor";
      donorEmail = user.get("email") || "";
    }
  } catch (err) {
    console.log("Could not fetch user record: " + err);
  }

  // If no email found, skip sending
  if (!donorEmail) {
    e.next();
    return;
  }

  // Format the donation date
  let formattedDate = "Date not available";
  if (donationDate) {
    const dateObj = new Date(donationDate);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    formattedDate = dateObj.toLocaleDateString('en-US', options);
  }

  // Format amount with € symbol and 2 decimals
  const formattedAmount = "€" + parseFloat(donationAmount).toFixed(2);

  // Generate professional HTML email
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Donation Confirmation</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f5f5f5;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #8B7355 0%, #A0826D 100%);
          padding: 40px 20px;
          text-align: center;
          color: #ffffff;
        }
        .header h1 {
          font-size: 28px;
          margin-bottom: 10px;
          font-weight: 600;
        }
        .header p {
          font-size: 16px;
          opacity: 0.95;
        }
        .success-badge {
          display: inline-block;
          background-color: #D4AF37;
          color: #8B7355;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          margin-top: 15px;
        }
        .content {
          padding: 40px 30px;
        }
        .greeting {
          font-size: 16px;
          color: #333;
          margin-bottom: 20px;
          line-height: 1.8;
        }
        .thank-you-message {
          background-color: #FFF8E7;
          border-left: 4px solid #D4AF37;
          padding: 20px;
          margin: 25px 0;
          border-radius: 4px;
          font-size: 15px;
          color: #555;
          line-height: 1.7;
        }
        .section-title {
          font-size: 18px;
          color: #8B7355;
          margin-top: 30px;
          margin-bottom: 15px;
          font-weight: 600;
          border-bottom: 2px solid #D4AF37;
          padding-bottom: 10px;
        }
        .summary-box {
          background-color: #F9F7F4;
          border: 1px solid #E8DCC8;
          border-radius: 6px;
          padding: 25px;
          margin: 20px 0;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #E8DCC8;
        }
        .summary-row:last-child {
          border-bottom: none;
        }
        .summary-label {
          font-size: 14px;
          color: #666;
          font-weight: 500;
        }
        .summary-value {
          font-size: 14px;
          color: #333;
          font-weight: 600;
        }
        .amount-highlight {
          font-size: 24px;
          color: #D4AF37;
          font-weight: 700;
        }
        .info-section {
          background-color: #F9F7F4;
          padding: 20px;
          border-radius: 6px;
          margin: 20px 0;
          font-size: 14px;
          color: #555;
          line-height: 1.7;
        }
        .info-section h4 {
          color: #8B7355;
          margin-bottom: 10px;
          font-size: 15px;
        }
        .next-steps {
          background-color: #FFF8E7;
          padding: 20px;
          border-radius: 6px;
          margin: 20px 0;
          border-left: 4px solid #D4AF37;
        }
        .next-steps h4 {
          color: #8B7355;
          margin-bottom: 12px;
          font-size: 15px;
        }
        .next-steps ul {
          list-style: none;
          padding-left: 0;
        }
        .next-steps li {
          padding: 8px 0;
          padding-left: 25px;
          position: relative;
          font-size: 14px;
          color: #555;
        }
        .next-steps li:before {
          content: "✓";
          position: absolute;
          left: 0;
          color: #D4AF37;
          font-weight: bold;
        }
        .footer {
          background-color: #F5F5F5;
          padding: 30px;
          text-align: center;
          border-top: 1px solid #E8DCC8;
          font-size: 13px;
          color: #888;
        }
        .footer p {
          margin: 8px 0;
        }
        .divider {
          height: 1px;
          background-color: #E8DCC8;
          margin: 25px 0;
        }
        @media (max-width: 600px) {
          .container {
            border-radius: 0;
          }
          .content {
            padding: 25px 20px;
          }
          .header {
            padding: 30px 20px;
          }
          .header h1 {
            font-size: 24px;
          }
          .summary-row {
            flex-direction: column;
            align-items: flex-start;
          }
          .summary-value {
            margin-top: 5px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <h1>Your Donation Has Been Received! ✓</h1>
          <p>Thank you for your generous contribution</p>
          <div class="success-badge">Donation Confirmed</div>
        </div>

        <!-- Content -->
        <div class="content">
          <div class="greeting">
            Dear <strong>` + donorName + `</strong>,
          </div>

          <div class="thank-you-message">
            We are deeply grateful for your generous donation. Your contribution will make a meaningful difference in our temple community and help us continue our sacred mission of service and spiritual growth.
          </div>

          <!-- Donation Summary -->
          <div class="section-title">Donation Summary</div>
          <div class="summary-box">
            <div class="summary-row">
              <span class="summary-label">Donation Amount:</span>
              <span class="summary-value amount-highlight">` + formattedAmount + `</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Donation Date:</span>
              <span class="summary-value">` + formattedDate + `</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Category:</span>
              <span class="summary-value">` + (category || "General Donation") + `</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Reference ID:</span>
              <span class="summary-value">` + donationId + `</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Donor Email:</span>
              <span class="summary-value">` + donorEmail + `</span>
            </div>
          </div>

          <!-- Donation Usage -->
          <div class="section-title">How Your Donation Will Be Used</div>
          <div class="info-section">
            <h4>Supporting Our Mission</h4>
            <p>Your donation supports our temple's essential activities including:</p>
            <ul style="margin-top: 10px; margin-left: 20px;">
              <li>• Daily worship and spiritual ceremonies</li>
              <li>• Community outreach and social services</li>
              <li>• Maintenance and preservation of our sacred space</li>
              <li>• Educational programs and cultural events</li>
            </ul>
          </div>

          <!-- Tax Receipt Information -->
          <div class="section-title">Tax Receipt Information</div>
          <div class="info-section">
            <h4>Your Donation Receipt</h4>
            <p>A detailed tax receipt for your donation will be sent to your email address shortly. Please retain this receipt for your tax records. If you have any questions regarding your donation or need additional documentation, please contact us.</p>
          </div>

          <!-- What Happens Next -->
          <div class="next-steps">
            <h4>What Happens Next?</h4>
            <ul>
              <li>Your donation has been recorded in our system</li>
              <li>A tax receipt will be emailed to you within 24 hours</li>
              <li>Your contribution will be acknowledged in our temple records</li>
              <li>You will receive updates on how your donation is being utilized</li>
              <li>Special prayers will be offered for your well-being and prosperity</li>
            </ul>
          </div>

          <div class="divider"></div>

          <p style="font-size: 14px; color: #666; line-height: 1.8;">
            If you have any questions about your donation or need further assistance, please don't hesitate to reach out to us. We are here to help and appreciate your continued support.
          </p>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p><strong>With Gratitude and Blessings</strong></p>
          <p>Our Temple Community</p>
          <p style="margin-top: 15px; font-size: 12px; color: #999;">
            This is an automated confirmation email. Please do not reply to this message.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Create and send the email
  const message = new MailerMessage({
    from: {
      address: $app.settings().meta.senderAddress,
      name: $app.settings().meta.senderName
    },
    to: [{ address: donorEmail }],
    subject: "Donation Confirmation - Thank You for Your Generosity",
    html: htmlContent
  });

  try {
    $app.newMailClient().send(message);
  } catch (err) {
    console.log("Error sending donation confirmation email: " + err);
  }

  e.next();
}, "donations");