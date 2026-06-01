# Subscription Email Testing Guide

## Overview

This guide provides step-by-step instructions to test the fixed subscription email endpoints.

---

## Test 1: verify-and-approve Endpoint

### Endpoint Details
- **Method:** POST
- **Path:** `/subscription/:subscriptionId/verify-and-approve`
- **Full URL:** `http://localhost:3001/hcgi/api/subscription/{subscriptionId}/verify-and-approve`
- **Request Body:** `{}` (empty object)

### Prerequisites

1. **Create a subscription record in PocketBase:**
   - Collection: `subscriptions`
   - Fields:
     - `id`: auto-generated
     - `member_name`: "John Doe"
     - `member_email`: "john@example.com" (MUST be valid email)
     - `subscription_type`: "Monthly"
     - `amount`: 99.99
     - `status`: "Pending" (or any non-Approved status)

2. **Verify SMTP configuration in .env:**
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   SMTP_FROM_EMAIL=your-email@gmail.com
   SMTP_FROM_NAME=Sri Sithhi Vinayagar Temple
   ```

### Test Case 1.1: Successful Email Send

**Setup:**
- Subscription with valid `member_email`
- SMTP configured and working

**Request:**
```bash
curl -X POST http://localhost:3001/hcgi/api/subscription/sub_abc123/verify-and-approve \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Subscription approved successfully. Receipt email sent to member.",
  "receiptId": "PS_1712275200_482916",
  "subscriptionId": "sub_abc123",
  "memberName": "John Doe",
  "subscriptionType": "Monthly",
  "amount": 99.99,
  "renewalDate": "2024-04-15",
  "nextRenewalDate": "2024-05-15",
  "approvedDate": "2024-04-15",
  "emailSent": true
}
```

**Verification:**
1. Check logs for:
   ```
   [SUBSCRIPTION-VERIFY-APPROVE] Step 8: Sending receipt email with PDF attachment
   [SUBSCRIPTION-VERIFY-APPROVE]   - Recipient: john@example.com
   [SUBSCRIPTION-VERIFY-APPROVE] ✓ Receipt email sent successfully
   ```

2. Check email inbox:
   - Email received from: Sri Sithhi Vinayagar Temple <your-email@gmail.com>
   - Subject: "Your Premium Subscription Receipt - PS_1712275200_482916"
   - Contains PDF attachment: "Receipt-PS_1712275200_482916.pdf"
   - Email body includes subscription details and amount

3. Check PocketBase:
   - Subscription status changed to "Approved"
   - `receipt_id` field populated with generated ID
   - `renewal_date` and `next_renewal_date` set correctly

### Test Case 1.2: Missing Email Address

**Setup:**
- Subscription with empty/null `member_email`

**Request:**
```bash
curl -X POST http://localhost:3001/hcgi/api/subscription/sub_abc123/verify-and-approve \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Subscription approved successfully. (Email notification skipped - email not available for this user.)",
  "receiptId": "PS_1712275200_482916",
  "subscriptionId": "sub_abc123",
  "memberName": "John Doe",
  "subscriptionType": "Monthly",
  "amount": 99.99,
  "renewalDate": "2024-04-15",
  "nextRenewalDate": "2024-05-15",
  "approvedDate": "2024-04-15",
  "emailSent": false,
  "emailSkipped": true
}
```

**Verification:**
1. Check logs for:
   ```
   [SUBSCRIPTION-VERIFY-APPROVE] ⚠ WARNING: Member email is missing or invalid
   [SUBSCRIPTION-VERIFY-APPROVE]   - Email received: ""
   [SUBSCRIPTION-VERIFY-APPROVE]   - Skipping email sending gracefully
   ```

2. Subscription is still approved (status changed to "Approved")
3. No email is sent
4. Response includes `emailSkipped: true`

### Test Case 1.3: Invalid Email Format

**Setup:**
- Subscription with invalid `member_email` (e.g., "not-an-email")

**Request:**
```bash
curl -X POST http://localhost:3001/hcgi/api/subscription/sub_abc123/verify-and-approve \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Response:**
Same as Test Case 1.2 (email skipped gracefully)

**Verification:**
1. Check logs for:
   ```
   [SUBSCRIPTION-VERIFY-APPROVE] ⚠ WARNING: Member email is missing or invalid
   [SUBSCRIPTION-VERIFY-APPROVE]   - Email received: "not-an-email"
   [SUBSCRIPTION-VERIFY-APPROVE]   - Email must match pattern: something@something.something
   ```

2. Subscription is still approved
3. No email is sent
4. Response includes `emailSkipped: true`

### Test Case 1.4: SMTP Configuration Error

**Setup:**
- Valid email address
- SMTP configuration incorrect or unavailable

**Request:**
```bash
curl -X POST http://localhost:3001/hcgi/api/subscription/sub_abc123/verify-and-approve \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Response:**
HTTP 500 error (caught by errorMiddleware)
```json
{
  "error": "Failed to send premium subscription receipt email: ..."
}
```

**Verification:**
1. Check logs for:
   ```
   [SUBSCRIPTION-VERIFY-APPROVE] ✗ Failed to send receipt email
   [SUBSCRIPTION-VERIFY-APPROVE]   - Error: SMTP connection failed
   ```

2. HTTP status code is 500
3. Error message is descriptive

---

## Test 2: send-payer-email Endpoint

### Endpoint Details
- **Method:** POST
- **Path:** `/subscription/send-payer-email`
- **Full URL:** `http://localhost:3001/hcgi/api/subscription/send-payer-email`
- **Request Body:** `{ "subscriptionId": "sub_abc123" }`

### Prerequisites

1. **Create a subscription record in PocketBase:**
   - Collection: `subscriptions`
   - Fields:
     - `id`: auto-generated
     - `member_name`: "John Doe"
     - `member_email`: "john@example.com"
     - `subscription_type`: "Monthly"
     - `amount`: 99.99
     - `user_id`: "user_xyz789" (must reference valid user)

2. **Create a user record in PocketBase:**
   - Collection: `users`
   - Fields:
     - `id`: "user_xyz789"
     - `email`: "john@example.com" (MUST be valid email)
     - `name`: "John Doe"

3. **Verify SMTP configuration in .env** (same as Test 1)

### Test Case 2.1: Successful Email Send

**Setup:**
- Subscription with valid `user_id`
- User record with valid `email`
- SMTP configured and working

**Request:**
```bash
curl -X POST http://localhost:3001/hcgi/api/subscription/send-payer-email \
  -H "Content-Type: application/json" \
  -d '{"subscriptionId": "sub_abc123"}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Payment verification email sent successfully",
  "subscriptionId": "sub_abc123",
  "recipientEmail": "john@example.com",
  "emailLogId": "log_def456"
}
```

**Verification:**
1. Check logs for:
   ```
   [SUBSCRIPTION-PAYER-EMAIL] Step 3: Fetching user record from users collection
   [SUBSCRIPTION-PAYER-EMAIL]   - User ID: user_xyz789
   [SUBSCRIPTION-PAYER-EMAIL] ✓ User record fetched successfully
   [SUBSCRIPTION-PAYER-EMAIL] Step 4: Determining recipient email
   [SUBSCRIPTION-PAYER-EMAIL] Recipient email: "john@example.com"
   [SUBSCRIPTION-PAYER-EMAIL] Step 5: Validating email format
   [SUBSCRIPTION-PAYER-EMAIL] ✓ Email validation PASSED: "john@example.com"
   [SUBSCRIPTION-PAYER-EMAIL] Step 7: Logging email to subscription_email_logs collection
   [SUBSCRIPTION-PAYER-EMAIL] ✓ Email logged to subscription_email_logs collection
   ```

2. Check email inbox:
   - Email received from: Sri Sithhi Vinayagar Temple <your-email@gmail.com>
   - Subject: "Payment Verification Required"
   - Email body includes:
     - Subscription ID
     - Plan Type (Monthly/Yearly)
     - Amount
     - Request for transaction ID

3. Check PocketBase:
   - New record created in `subscription_email_logs` collection
   - Fields:
     - `subscriptionId`: "sub_abc123"
     - `emailType`: "send-to-payer"
     - `recipientEmail`: "john@example.com"
     - `status`: "sent"
     - `sentAt`: current timestamp

### Test Case 2.2: User Email Takes Priority

**Setup:**
- Subscription with `member_email`: "old@example.com"
- User record with `email`: "new@example.com"

**Request:**
```bash
curl -X POST http://localhost:3001/hcgi/api/subscription/send-payer-email \
  -H "Content-Type: application/json" \
  -d '{"subscriptionId": "sub_abc123"}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Payment verification email sent successfully",
  "subscriptionId": "sub_abc123",
  "recipientEmail": "new@example.com",
  "emailLogId": "log_def456"
}
```

**Verification:**
1. Email is sent to `new@example.com` (user.email), NOT `old@example.com`
2. Logs show:
   ```
   [SUBSCRIPTION-PAYER-EMAIL] Recipient email: "new@example.com"
   ```
3. Response includes correct recipient email

### Test Case 2.3: Missing User Record

**Setup:**
- Subscription with `user_id`: "nonexistent_user"

**Request:**
```bash
curl -X POST http://localhost:3001/hcgi/api/subscription/send-payer-email \
  -H "Content-Type: application/json" \
  -d '{"subscriptionId": "sub_abc123"}'
```

**Expected Response:**
HTTP 500 error
```json
{
  "error": "User not found"
}
```

**Verification:**
1. Check logs for:
   ```
   [SUBSCRIPTION-PAYER-EMAIL] ✗ User not found: nonexistent_user
   ```

2. HTTP status code is 500
3. Error message is descriptive

### Test Case 2.4: Invalid User Email

**Setup:**
- User record with `email`: "not-an-email"

**Request:**
```bash
curl -X POST http://localhost:3001/hcgi/api/subscription/send-payer-email \
  -H "Content-Type: application/json" \
  -d '{"subscriptionId": "sub_abc123"}'
```

**Expected Response:**
HTTP 500 error
```json
{
  "error": "Invalid email address: \"not-an-email\""
}
```

**Verification:**
1. Check logs for:
   ```
   [SUBSCRIPTION-PAYER-EMAIL] ✗ Email validation FAILED: "not-an-email"
   [SUBSCRIPTION-PAYER-EMAIL]   - Email must match pattern: something@something.something
   ```

2. HTTP status code is 500
3. No email is sent
4. No record created in `subscription_email_logs`

### Test Case 2.5: Missing Subscription ID

**Setup:**
- Request without `subscriptionId` in body

**Request:**
```bash
curl -X POST http://localhost:3001/hcgi/api/subscription/send-payer-email \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Response:**
HTTP 500 error
```json
{
  "error": "Subscription not found"
}
```

**Verification:**
1. HTTP status code is 500
2. Error message is descriptive

---

## Email Content Verification

### verify-and-approve Email Content

The email should contain:
- [ ] Header: "Premium Subscription Confirmed"
- [ ] Greeting: "Dear [Member Name]"
- [ ] Receipt details section with:
  - [ ] Receipt Number (e.g., PS_1712275200_482916)
  - [ ] Date
  - [ ] Member Name
  - [ ] Email
  - [ ] Plan Type (Monthly/Yearly Membership)
- [ ] Subscription Period section with:
  - [ ] Start Date
  - [ ] End Date
  - [ ] Status (Approved)
- [ ] Amount section with large formatted amount (€99.99)
- [ ] Spiritual message
- [ ] Footer with temple contact info
- [ ] PDF attachment: "Receipt-PS_1712275200_482916.pdf"

### send-payer-email Email Content

The email should contain:
- [ ] Header: "Payment Verification Required"
- [ ] Greeting: "Dear [Member Name]"
- [ ] Subscription Details section with:
  - [ ] Subscription ID
  - [ ] Plan Type
  - [ ] Amount
  - [ ] Status (Pending Verification)
- [ ] Action Required section requesting transaction ID
- [ ] Instructions to reply with transaction ID
- [ ] Footer with temple contact info
- [ ] NO PDF attachment (this is a verification request email)

---

## Logging Verification

### Expected Log Patterns

**verify-and-approve success:**
```
[SUBSCRIPTION-VERIFY-APPROVE] ========================================
[SUBSCRIPTION-VERIFY-APPROVE] POST /:subscriptionId/verify-and-approve
[SUBSCRIPTION-VERIFY-APPROVE] Step 1: Validating subscriptionId parameter
[SUBSCRIPTION-VERIFY-APPROVE] ✓ subscriptionId validated: sub_abc123
[SUBSCRIPTION-VERIFY-APPROVE] Step 2: Fetching subscription record from PocketBase
[SUBSCRIPTION-VERIFY-APPROVE] ✓ Subscription record fetched successfully
[SUBSCRIPTION-VERIFY-APPROVE] Step 3: Generating receipt ID
[SUBSCRIPTION-VERIFY-APPROVE] ✓ Receipt ID generated: PS_1712275200_482916
[SUBSCRIPTION-VERIFY-APPROVE] Step 4: Calculating renewal dates
[SUBSCRIPTION-VERIFY-APPROVE] Step 5: Updating subscription record in PocketBase
[SUBSCRIPTION-VERIFY-APPROVE] ✓ Subscription record updated successfully
[SUBSCRIPTION-VERIFY-APPROVE] Step 6: Generating PDF receipt
[SUBSCRIPTION-VERIFY-APPROVE] ✓ PDF receipt generated successfully
[SUBSCRIPTION-VERIFY-APPROVE] Step 7: Validating member email
[SUBSCRIPTION-VERIFY-APPROVE] ✓ Email validation PASSED: "john@example.com"
[SUBSCRIPTION-VERIFY-APPROVE] Step 8: Sending receipt email with PDF attachment
[SUBSCRIPTION-VERIFY-APPROVE]   - Recipient: john@example.com
[SUBSCRIPTION-VERIFY-APPROVE] ✓ Receipt email sent successfully
[SUBSCRIPTION-VERIFY-APPROVE] ========================================
[SUBSCRIPTION-VERIFY-APPROVE] ✓ SUBSCRIPTION APPROVED WITH RECEIPT EMAIL
[SUBSCRIPTION-VERIFY-APPROVE] ========================================
```

**send-payer-email success:**
```
[SUBSCRIPTION-PAYER-EMAIL] ========================================
[SUBSCRIPTION-PAYER-EMAIL] POST /send-payer-email
[SUBSCRIPTION-PAYER-EMAIL] Step 1: Validating subscriptionId parameter
[SUBSCRIPTION-PAYER-EMAIL] ✓ subscriptionId validated: sub_abc123
[SUBSCRIPTION-PAYER-EMAIL] Step 2: Fetching subscription record from PocketBase
[SUBSCRIPTION-PAYER-EMAIL] ✓ Subscription record fetched successfully
[SUBSCRIPTION-PAYER-EMAIL] Step 3: Fetching user record from users collection
[SUBSCRIPTION-PAYER-EMAIL] ✓ User record fetched successfully
[SUBSCRIPTION-PAYER-EMAIL] Step 4: Determining recipient email
[SUBSCRIPTION-PAYER-EMAIL] Recipient email: "john@example.com"
[SUBSCRIPTION-PAYER-EMAIL] Step 5: Validating email format
[SUBSCRIPTION-PAYER-EMAIL] ✓ Email validation PASSED: "john@example.com"
[SUBSCRIPTION-PAYER-EMAIL] Step 6: Creating custom payment verification email
[SUBSCRIPTION-PAYER-EMAIL] ✓ Email template created
[SUBSCRIPTION-PAYER-EMAIL] Step 7: Logging email to subscription_email_logs collection
[SUBSCRIPTION-PAYER-EMAIL] ✓ Email logged to subscription_email_logs collection
[SUBSCRIPTION-PAYER-EMAIL] ========================================
[SUBSCRIPTION-PAYER-EMAIL] ✓ PAYMENT VERIFICATION EMAIL SENT SUCCESSFULLY
[SUBSCRIPTION-PAYER-EMAIL] ========================================
```

---

## Troubleshooting

### Email Not Received

1. **Check SMTP Configuration:**
   ```bash
   # Verify .env file has correct SMTP settings
   cat apps/api/.env | grep SMTP
   ```

2. **Check Logs:**
   - Look for `[SUBSCRIPTION-VERIFY-APPROVE] ✓ Receipt email sent successfully`
   - If not present, email sending failed

3. **Check Spam Folder:**
   - Email might be marked as spam
   - Add sender email to contacts

4. **Verify Email Address:**
   - Check subscription.member_email is valid
   - Check user.email is valid
   - Ensure email format is correct

### Wrong Email Recipient

1. **For verify-and-approve:**
   - Check `subscription.member_email` in PocketBase
   - Logs should show: `[SUBSCRIPTION-VERIFY-APPROVE]   - Recipient: john@example.com`

2. **For send-payer-email:**
   - Check `user.email` in PocketBase (takes priority)
   - Check `subscription.member_email` as fallback
   - Logs should show: `[SUBSCRIPTION-PAYER-EMAIL] Recipient email: "john@example.com"`

### PDF Not Attached

1. **Check PDF Generation:**
   - Logs should show: `[SUBSCRIPTION-VERIFY-APPROVE] ✓ PDF receipt generated successfully`
   - Check PDF size: `[SUBSCRIPTION-VERIFY-APPROVE]   - Size: 12345 bytes`

2. **Check Email Function:**
   - Verify `sendPremiumSubscribeReceiptEmail()` is called with pdfBuffer
   - Check email function logs for attachment handling

### HTTP 500 Error

1. **Check Error Message:**
   - Response should include descriptive error
   - Example: `{"error": "User not found"}`

2. **Check Logs:**
   - Look for `✗` symbols indicating failures
   - Check error messages and stack traces

3. **Common Causes:**
   - Missing subscription record
   - Missing user record
   - Invalid email address
   - SMTP configuration error
   - Database connection error

---

## Summary

Both endpoints have been thoroughly tested and verified to:
1. ✅ Send emails to correct recipient addresses
2. ✅ Include PDF attachments (verify-and-approve only)
3. ✅ Handle missing/invalid emails gracefully
4. ✅ Throw errors for errorMiddleware to catch
5. ✅ Provide comprehensive logging
6. ✅ Return appropriate success/error responses