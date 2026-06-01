/// <reference path="../pb_data/types.d.ts" />
onRecordAfterUpdateSuccess((e) => {
  // Only process if receipt_id was just set and receipt_pdf is not already set
  if (e.record.get("receipt_id") && !e.record.get("receipt_pdf")) {
    const receiptId = e.record.get("receipt_id");
    const billingCycle = e.record.get("billing_cycle");
    const amount = e.record.get("total_amount");
    const planType = e.record.get("plan_type");
    const startDate = e.record.get("start_date");
    const endDate = e.record.get("end_date");
    const userId = e.record.get("user_id");
    
    // Get user details
    let userEmail = "N/A";
    let userName = "ganesh";
    try {
      const user = $app.findRecordById("users", e.record.get("user"));
      if (user) {
        userEmail = user.get("email") || "N/A";
        userName = user.get("name") || user.get("full_name") || "ganesh";
      }
    } catch (err) {
      console.log("Could not fetch user details: " + err.message);
    }
    
    // Format dates
    const dateObj = new Date("2026-04-30");
    const formattedDate = dateObj.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
    
    // Create HTML content for PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 40px;
            color: #333;
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 2px solid #007bff;
            padding-bottom: 20px;
          }
          .header h1 {
            margin: 0;
            color: #007bff;
          }
          .receipt-id {
            font-size: 14px;
            color: #666;
            margin-top: 10px;
          }
          .section {
            margin-bottom: 30px;
          }
          .section-title {
            font-weight: bold;
            font-size: 14px;
            color: #007bff;
            margin-bottom: 10px;
            text-transform: uppercase;
          }
          .row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 14px;
          }
          .label {
            font-weight: bold;
            color: #333;
          }
          .value {
            color: #666;
          }
          .amount-section {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 5px;
            margin-top: 20px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            font-size: 16px;
            font-weight: bold;
            color: #007bff;
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid #ddd;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            font-size: 12px;
            color: #999;
            border-top: 1px solid #ddd;
            padding-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>RECEIPT</h1>
          <div class="receipt-id">Receipt ID: ${receiptId}</div>
        </div>
        
        <div class="section">
          <div class="section-title">User Information</div>
          <div class="row">
            <span class="label">Name:</span>
            <span class="value">${userName}</span>
          </div>
          <div class="row">
            <span class="label">Email:</span>
            <span class="value">${userEmail}</span>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">Subscription Details</div>
          <div class="row">
            <span class="label">Plan:</span>
            <span class="value">Premium</span>
          </div>
          <div class="row">
            <span class="label">Billing Cycle:</span>
            <span class="value">${billingCycle}</span>
          </div>
          <div class="row">
            <span class="label">Start Date:</span>
            <span class="value">${startDate || 'N/A'}</span>
          </div>
          <div class="row">
            <span class="label">End Date:</span>
            <span class="value">${endDate || 'N/A'}</span>
          </div>
        </div>
        
        <div class="amount-section">
          <div class="row">
            <span class="label">Amount:</span>
            <span class="value">${amount || '10.00'} €</span>
          </div>
          <div class="total-row">
            <span>Total Amount:</span>
            <span>${amount || '10.00'} €</span>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">Payment Information</div>
          <div class="row">
            <span class="label">Date:</span>
            <span class="value">${formattedDate}</span>
          </div>
          <div class="row">
            <span class="label">Status:</span>
            <span class="value">Approved</span>
          </div>
        </div>
        
        <div class="footer">
          <p>This is an automatically generated receipt. Please keep it for your records.</p>
          <p>Generated on ${formattedDate}</p>
        </div>
      </body>
      </html>
    `;
    
    console.log("Receipt HTML generated for receipt ID: " + receiptId);
  }
  
  e.next();
}, "subscriptions");