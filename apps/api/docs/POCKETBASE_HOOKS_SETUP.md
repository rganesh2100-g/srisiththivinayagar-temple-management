# PocketBase Hooks Setup Guide

## Donation Receipt Email Hooks

This document explains how to set up PocketBase hooks for sending donation receipt emails.

### Overview

When a donation is approved in the Express.js API, the following happens:

1. **Approval Endpoint** (`POST /donations/approve`)
   - Fetches the donation record
   - Updates status to 'approved'
   - Generates receipt ID and PDF
   - Creates a `donation_emails` record
   - Logs all steps with detailed information

2. **PocketBase Hook** (`donation-receipt-email.pb.js`)
   - Triggers when `donation_emails` record is created
   - Sends email to donor with receipt
   - Logs success/failure

### Required Collections

You need the following collections in PocketBase:

#### 1. `donations` Collection

Fields:
- `id` (text, primary key)
- `donorName` (text, required)
- `donorEmail` (email, required for email sending)
- `amount` (number, required)
- `category` (text, optional)
- `message` (text, optional)
- `status` (select: 'pending', 'approved', 'rejected')
- `receipt_id` (text, optional)
- `receipt_created_at` (datetime, optional)
- `created` (datetime, auto)
- `updated` (datetime, auto)

#### 2. `donation_emails` Collection

Fields:
- `id` (text, primary key)
- `donationId` (text, required)
- `recipientEmail` (email, required)
- `recipientName` (text, required)
- `subject` (text, required)
- `htmlContent` (text, required)
- `receiptId` (text, required)
- `amount` (number, required)
- `category` (text, required)
- `status` (select: 'pending', 'sent', 'failed')
- `errorMessage` (text, optional)
- `sentAt` (datetime, optional)
- `created` (datetime, auto)
- `updated` (datetime, auto)

### PocketBase Hook: donation-receipt-email.pb.js

Create this hook in PocketBase Admin UI:

**Location:** Settings → Hooks → Create New Hook

**Hook Type:** After Record Create

**Collection:** `donation_emails`

**Code:**

```javascript
// donation-receipt-email.pb.js
// Triggered when a donation_emails record is created
// Sends email to donor with receipt

console.log('[HOOK] donation-receipt-email hook started');
console.log('[HOOK] Record ID:', $record.id);
console.log('[HOOK] Recipient Email:', $record.recipientEmail);

try {
  // Validate required fields
  if (!$record.recipientEmail) {
    throw new Error('Missing recipient email');
  }

  if (!$record.htmlContent) {
    throw new Error('Missing email HTML content');
  }

  console.log('[HOOK] Email payload validation passed');
  console.log('[HOOK] Subject:', $record.subject);
  console.log('[HOOK] HTML Length:', $record.htmlContent.length);

  // Get mail client
  const mailClient = $app.newMailClient();
  console.log('[HOOK] Mail client initialized');

  // Get sender address from settings
  const senderAddress = $app.settings().meta.senderAddress;
  console.log('[HOOK] Sender address:', senderAddress);

  if (!senderAddress) {
    throw new Error('Sender address not configured in PocketBase settings');
  }

  // Create email message
  const message = new MailerMessage({
    from: { address: senderAddress },
    to: [{ address: $record.recipientEmail }],
    subject: $record.subject,
    html: $record.htmlContent,
  });

  console.log('[HOOK] MailerMessage created');
  console.log('[HOOK] From:', senderAddress);
  console.log('[HOOK] To:', $record.recipientEmail);
  console.log('[HOOK] Subject:', $record.subject);

  // Send email
  mailClient.send(message);
  console.log('[HOOK] ✓ Email sent successfully');

  // Update record status to 'sent'
  $record.status = 'sent';
  $record.sentAt = new Date().toISOString();
  console.log('[HOOK] Record status updated to sent');

} catch (error) {
  console.error('[HOOK] ✗ Error sending email:', error.message);
  console.error('[HOOK] Stack:', error.stack);

  // Update record status to 'failed' with error message
  $record.status = 'failed';
  $record.errorMessage = error.message;
  console.log('[HOOK] Record status updated to failed');
}

console.log('[HOOK] donation-receipt-email hook completed');
```

### PocketBase Hook: donation-confirmation-email.pb.js

Alternative hook that triggers on donation status change:

**Location:** Settings → Hooks → Create New Hook

**Hook Type:** After Record Update

**Collection:** `donations`

**Condition:** `status == "approved"`

**Code:**

```javascript
// donation-confirmation-email.pb.js
// Triggered when donation status is updated to 'approved'
// Sends confirmation email to donor

console.log('[HOOK] donation-confirmation-email hook started');
console.log('[HOOK] Donation ID:', $record.id);
console.log('[HOOK] Status:', $record.status);

try {
  // Validate required fields
  if (!$record.donorEmail) {
    console.warn('[HOOK] Donation has no donor email - skipping email send');
    return;
  }

  if (!$record.donorName) {
    throw new Error('Missing donor name');
  }

  if (!$record.amount) {
    throw new Error('Missing donation amount');
  }

  console.log('[HOOK] Validation passed');
  console.log('[HOOK] Donor:', $record.donorName);
  console.log('[HOOK] Email:', $record.donorEmail);
  console.log('[HOOK] Amount:', $record.amount);
  console.log('[HOOK] Category:', $record.category);
  console.log('[HOOK] Receipt ID:', $record.receipt_id);

  // Get mail client
  const mailClient = $app.newMailClient();
  console.log('[HOOK] Mail client initialized');

  // Get sender address from settings
  const senderAddress = $app.settings().meta.senderAddress;
  console.log('[HOOK] Sender address:', senderAddress);

  if (!senderAddress) {
    throw new Error('Sender address not configured in PocketBase settings');
  }

  // Generate email HTML (simplified version)
  const emailHtml = `
    <html>
      <body>
        <h1>Thank You for Your Donation!</h1>
        <p>Dear ${$record.donorName},</p>
        <p>We have received your donation of $${$record.amount} for ${$record.category || 'General Fund'}.</p>
        <p>Receipt ID: ${$record.receipt_id || 'N/A'}</p>
        <p>Thank you for your generosity!</p>
      </body>
    </html>
  `;

  console.log('[HOOK] Email HTML generated, length:', emailHtml.length);

  // Create email message
  const message = new MailerMessage({
    from: { address: senderAddress },
    to: [{ address: $record.donorEmail }],
    subject: `Donation Receipt - ${$record.receipt_id || 'Confirmation'}`,
    html: emailHtml,
  });

  console.log('[HOOK] MailerMessage created');
  console.log('[HOOK] From:', senderAddress);
  console.log('[HOOK] To:', $record.donorEmail);
  console.log('[HOOK] Subject: Donation Receipt');

  // Send email
  mailClient.send(message);
  console.log('[HOOK] ✓ Email sent successfully');

} catch (error) {
  console.error('[HOOK] ✗ Error sending email:', error.message);
  console.error('[HOOK] Stack:', error.stack);
}

console.log('[HOOK] donation-confirmation-email hook completed');
```

### PocketBase Configuration

1. **Email Settings**
   - Go to Settings → Mail Settings
   - Configure SMTP settings or use PocketBase's built-in mailer
   - Set sender address (e.g., noreply@temple.com)
   - Test email configuration

2. **Verify Collections Exist**
   - Collections → donations (verify fields)
   - Collections → donation_emails (verify fields)

3. **Create Hooks**
   - Settings → Hooks
   - Create `donation-receipt-email` hook
   - Create `donation-confirmation-email` hook (optional)

### Testing Email Flow

1. **Test via API**
   ```bash
   # Create a donation
   curl -X POST http://localhost:3001/hcgi/api/donations \
     -H "Content-Type: application/json" \
     -d '{
       "donorName": "John Doe",
       "donorEmail": "john@example.com",
       "amount": 100,
       "category": "General Fund"
     }'

   # Approve the donation (replace DONATION_ID)
   curl -X POST http://localhost:3001/hcgi/api/donations/approve \
     -H "Content-Type: application/json" \
     -d '{"id": "DONATION_ID"}'
   ```

2. **Check Logs**
   - Express.js logs: Check terminal for `[DONATION-APPROVAL]` messages
   - PocketBase logs: Check PocketBase admin UI for hook execution logs
   - Email records: Check `donation_emails` collection for status

3. **Verify Email Sent**
   - Check `donation_emails` collection
   - Status should be 'sent'
   - sentAt should have timestamp
   - Check donor's email inbox

### Troubleshooting

#### Email Not Sending

1. **Check PocketBase Email Configuration**
   ```
   Settings → Mail Settings
   - Verify SMTP settings are correct
   - Verify sender address is set
   - Test email configuration
   ```

2. **Check Hook Logs**
   ```
   - Look for [HOOK] messages in PocketBase logs
   - Check for error messages
   - Verify hook is being triggered
   ```

3. **Check donation_emails Collection**
   ```
   - Verify records are being created
   - Check status field (pending/sent/failed)
   - Check errorMessage field for details
   ```

4. **Verify Donor Email**
   ```
   - Check donations collection
   - Verify donorEmail field is populated
   - Verify email format is valid
   ```

5. **Check Express.js Logs**
   ```
   - Look for [DONATION-APPROVAL] messages
   - Verify donation_emails record is created
   - Check for any errors in approval process
   ```

#### Common Issues

1. **"Sender address not configured"**
   - Go to PocketBase Settings → Mail Settings
   - Set sender address (e.g., noreply@temple.com)

2. **"Missing recipient email"**
   - Verify donations collection has donorEmail field
   - Verify donor email is populated when creating donation

3. **"Mail client initialization failed"**
   - Check PocketBase email configuration
   - Verify SMTP settings are correct
   - Check PocketBase logs for mail client errors

4. **Hook not executing**
   - Verify hook is enabled in PocketBase
   - Verify hook condition is correct
   - Check PocketBase logs for hook execution

### Logging

All operations are logged with detailed information:

**Express.js Logs:**
```
[DONATION-APPROVAL] Processing approval for donation ID: xxx
[DONATION-APPROVAL] ✓ Found donation record: xxx - Donor: John Doe, Amount: $100
[DONATION-APPROVAL] Step 2: Updating donation xxx status to approved
[DONATION-APPROVAL] ✓ Successfully approved donation xxx
[DONATION-APPROVAL] Step 6: Attempting direct email send to john@example.com
[DONATION-APPROVAL] Email HTML generated, length: 5000 characters
[DONATION-APPROVAL] ✓ Email record created: xxx
```

**PocketBase Hook Logs:**
```
[HOOK] donation-receipt-email hook started
[HOOK] Record ID: xxx
[HOOK] Recipient Email: john@example.com
[HOOK] Mail client initialized
[HOOK] MailerMessage created
[HOOK] ✓ Email sent successfully
```

### Next Steps

1. Create the required collections in PocketBase
2. Configure email settings in PocketBase
3. Create the hooks in PocketBase
4. Test the email flow using the API
5. Monitor logs for any issues
6. Verify emails are being received by donors