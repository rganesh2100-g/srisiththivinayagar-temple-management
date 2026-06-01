/// <reference path="../pb_data/types.d.ts" />
onRecordUpdate((e) => {
  const original = e.record.original();
  const currentStatus = e.record.get("status");
  const previousStatus = original.get("status");
  
  // Only send email when status changes to 'approved'
  if (currentStatus === "approved" && previousStatus !== "approved") {
    try {
      // Fetch user details
      const userId = e.record.get("user_id");
      const user = $app.findRecordById("users", userId);
      
      // Get booking details
      const userName = user.get("name") || "Devotee";
      const userEmail = user.get("email");
      const poojaId = e.record.get("pooja_id");
      const selectedDate = e.record.get("selected_date");
      const selectedTime = e.record.get("selected_time");
      const donationAmount = e.record.get("donation_amount");
      const bookingId = e.record.id;
      
      // Fetch pooja details
      const pooja = $app.findRecordById("poojas", poojaId);
      const poojaName = pooja.get("pooja_name");
      const god = pooja.get("god");
      
      // Generate receipt number: RCP-YYYYMMDD-XXXXX
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const randomSuffix = String(Math.floor(Math.random() * 100000)).padStart(5, "0");
      const receiptNumber = "RCP-" + year + month + day + "-" + randomSuffix;
      
      // Format approval date
      const approvalDate = now.toLocaleDateString("en-US", { 
        year: "numeric", 
        month: "long", 
        day: "numeric" 
      });
      
      // Create professional receipt email with Deep Red & Gold theme
      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #8B0000 0%, #D4AF37 100%); padding: 30px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 600; letter-spacing: 1px; }
    .header p { margin: 8px 0 0 0; font-size: 14px; opacity: 0.95; }
    .receipt-number { background-color: rgba(255,255,255,0.15); padding: 12px; margin-top: 15px; border-radius: 4px; font-family: 'Courier New', monospace; font-weight: bold; font-size: 16px; }
    .content { padding: 30px; }
    .greeting { font-size: 16px; color: #333; margin-bottom: 20px; }
    .section { margin-bottom: 25px; }
    .section-title { font-size: 14px; font-weight: 600; color: #8B0000; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; border-bottom: 2px solid #D4AF37; padding-bottom: 8px; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
    .detail-label { color: #666; font-weight: 500; }
    .detail-value { color: #333; font-weight: 600; }
    .amount-row { background-color: #f9f9f9; padding: 12px; border-radius: 4px; display: flex; justify-content: space-between; font-size: 16px; font-weight: 600; color: #8B0000; margin-top: 15px; }
    .footer { background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #e0e0e0; }
    .footer p { margin: 5px 0; }
    .divider { height: 2px; background: linear-gradient(90deg, #8B0000, #D4AF37, #8B0000); margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🙏 POOJA BOOKING APPROVED 🙏</h1>
      <p>Your sacred offering has been confirmed</p>
      <div class="receipt-number">${receiptNumber}</div>
    </div>
    
    <div class="content">
      <div class="greeting">
        Dear <strong>${userName}</strong>,<br><br>
        Your pooja booking has been approved. Please find the details below.
      </div>
      
      <div class="section">
        <div class="section-title">Pooja Details</div>
        <div class="detail-row">
          <span class="detail-label">Deity</span>
          <span class="detail-value">${god}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Pooja Name</span>
          <span class="detail-value">${poojaName}</span>
        </div>
      </div>
      
      <div class="section">
        <div class="section-title">Booking Information</div>
        <div class="detail-row">
          <span class="detail-label">Date</span>
          <span class="detail-value">${selectedDate}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Time</span>
          <span class="detail-value">${selectedTime}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Approval Date</span>
          <span class="detail-value">${approvalDate}</span>
        </div>
      </div>
      
      <div class="section">
        <div class="section-title">Payment Details</div>
        <div class="amount-row">
          <span>Donation Amount</span>
          <span>₹ ${donationAmount}</span>
        </div>
      </div>
      
      <div class="divider"></div>
      
      <div style="background-color: #fff8f0; padding: 15px; border-radius: 4px; font-size: 13px; color: #666; line-height: 1.6;">
        <strong style="color: #8B0000;">Important:</strong> Please keep this receipt for your records. Your booking reference is <strong>${bookingId}</strong>. If you have any questions, please contact the temple administration.
      </div>
    </div>
    
    <div class="footer">
      <p><strong>Thank you for your devotion and support</strong></p>
      <p>This is an automated receipt. Please do not reply to this email.</p>
      <p>&copy; 2024 Temple Management System. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
      `;
      
      // Send email
      const message = new MailerMessage({
        from: {
          address: $app.settings().meta.senderAddress,
          name: $app.settings().meta.senderName
        },
        to: [{ address: userEmail }],
        subject: "Pooja Booking Approved - Receipt #" + receiptNumber,
        html: emailHtml
      });
      
      $app.newMailClient().send(message);
    } catch (error) {
      console.log("Error sending approval email:", error);
    }
  }
  
  e.next();
}, "pooja_bookings");