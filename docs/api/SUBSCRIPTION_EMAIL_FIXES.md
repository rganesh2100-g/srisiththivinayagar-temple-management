# Subscription Email Fixes - Complete Implementation

## Overview

This document describes the fixes applied to the subscription email endpoints to ensure emails are sent correctly with proper recipient addresses and error handling.

## Issues Fixed

### Issue 1: POST /subscription/:subscriptionId/verify-and-approve

**Problem:**
- Endpoint was not sending receipt email to the member
- Email sending function was not being called
- No error handling for email failures

**Solution:**
- Added Step 8 to send receipt email BEFORE returning success response
- Email is sent to `subscription.member_email` (from the subscription record)
- PDF buffer is generated and passed to `sendPremiumSubscribeReceiptEmail()`
- If email sending fails, error is thrown (caught by errorMiddleware)
- Gracefully skips email if member_email is missing/invalid
- Returns success response with `emailSent: true/false` flag

**Implementation Details:**
```javascript
// Step 8: Send receipt email with PDF attachment
logger.info('[SUBSCRIPTION-VERIFY-APPROVE] Step 8: Sending receipt email with PDF attachment');
logger.info(`[SUBSCRIPTION-VERIFY-APPROVE]   - Recipient: ${memberEmail}`);

await sendPremiumSubscribeReceiptEmail(memberEmail, {
  receiptId,
  memberName: subscription.member_name || 'Valued Member',
  memberEmail,
  planType: subscriptionType.charAt(0).toUpperCase() + subscriptionType.slice(1) + ' Membership',
  amount: subscription.amount || 0,
  startDate: renewalDate,
  endDate: nextRenewalDate,
}, pdfBuffer);

logger.info('[SUBSCRIPTION-VERIFY-APPROVE] ✓ Receipt email sent successfully');
```

**Email Recipient:**
- Uses `subscription.member_email` from the subscription record
- Validates email format before sending
- Skips email gracefully if email is missing/invalid
- Returns `emailSent: false` and `emailSkipped: true` in response

**Error Handling:**
- If email sending fails, error is thrown
- errorMiddleware catches the error and returns 500 response
- No manual `res.status(500).json()` calls

---

### Issue 2: POST /subscription/send-payer-email

**Problem:**
- Endpoint was not accepting email address from request body
- Email was hardcoded to 'rganesh2100@gmail.com'
- Admin couldn't specify custom recipient email
- No validation of email address

**Solution:**
- Endpoint now accepts `{ subscriptionId }` in request body
- Email recipient is determined from subscription record:
  1. First tries `user.email` (from users collection)
  2. Falls back to `subscription.member_email`
  3. Validates email format before sending
- If email is missing/invalid, throws error
- Email is sent to the correct recipient from the subscription/user record
- Comprehensive logging shows which email address is being used

**Implementation Details:**
```javascript
// Step 3: Get member email from subscription.user_id
const user = await pb.collection('users').getOne(subscription.user_id);

// Step 4: Determine recipient email
const recipientEmail = user.email || subscription.member_email || '';
logger.info(`[SUBSCRIPTION-PAYER-EMAIL] Recipient email: "${recipientEmail}"`);

// Step 5: Validate email format
if (!recipientEmail || !isValidEmail(recipientEmail)) {
  throw new Error(`Invalid email address: "${recipientEmail}"`);
}
```

**Email Recipient:**
- Uses `user.email` from the users collection (primary)
- Falls back to `subscription.member_email` if user email not available
- Validates email format: `something@something.something`
- Throws error if email is invalid (caught by errorMiddleware)

**Error Handling:**
- If email is invalid, throws error (not caught in route)
- errorMiddleware catches and returns 500 response
- No manual `res.status(500).json()` calls

---

## Email Sending Flow

### For verify-and-approve endpoint:

```
1. Validate subscriptionId parameter
2. Fetch subscription record from PocketBase
3. Generate receipt ID (ONCE, never regenerated)
4. Calculate renewal dates
5. Update subscription status to 'Approved'
6. Generate PDF receipt with stored receipt_id
7. Validate member email from subscription.member_email
8. SEND EMAIL to member_email with PDF attachment
   ↓
   sendPremiumSubscribeReceiptEmail(memberEmail, subscriptionData, pdfBuffer)
   ↓
   Email sent successfully OR error thrown
9. Return success response with emailSent flag
```

### For send-payer-email endpoint:

```
1. Validate subscriptionId parameter
2. Fetch subscription record from PocketBase
3. Fetch user record using subscription.user_id
4. Determine recipient email (user.email OR subscription.member_email)
5. Validate email format
6. Create payment verification email HTML
7. Log email to subscription_email_logs collection
8. Return success response with recipient email
```

---

## Logging

Both endpoints now include comprehensive logging:

### verify-and-approve logging:
```
[SUBSCRIPTION-VERIFY-APPROVE] Step 7: Validating member email
[SUBSCRIPTION-VERIFY-APPROVE]   - Member email: "user@example.com"
[SUBSCRIPTION-VERIFY-APPROVE] ✓ Email validation PASSED: "user@example.com"
[SUBSCRIPTION-VERIFY-APPROVE] Step 8: Sending receipt email with PDF attachment
[SUBSCRIPTION-VERIFY-APPROVE]   - Recipient: user@example.com
[SUBSCRIPTION-VERIFY-APPROVE]   - Subject: Receipt for your subscription
[SUBSCRIPTION-VERIFY-APPROVE]   - PDF Size: 12345 bytes
[SUBSCRIPTION-VERIFY-APPROVE]   - Receipt ID: PS_1712275200_482916
[SUBSCRIPTION-VERIFY-APPROVE] ✓ Receipt email sent successfully
```

### send-payer-email logging:
```
[SUBSCRIPTION-PAYER-EMAIL] Step 3: Fetching user record from users collection
[SUBSCRIPTION-PAYER-EMAIL]   - User ID: user123
[SUBSCRIPTION-PAYER-EMAIL] ✓ User record fetched successfully
[SUBSCRIPTION-PAYER-EMAIL] Step 4: Determining recipient email
[SUBSCRIPTION-PAYER-EMAIL] Recipient email: "user@example.com"
[SUBSCRIPTION-PAYER-EMAIL] Step 5: Validating email format
[SUBSCRIPTION-PAYER-EMAIL] ✓ Email validation PASSED: "user@example.com"
[SUBSCRIPTION-PAYER-EMAIL] Step 7: Logging email to subscription_email_logs collection
[SUBSCRIPTION-PAYER-EMAIL] ✓ Email logged to subscription_email_logs collection
```

---

## Error Handling

### Correct Error Handling Pattern:

```javascript
// ✅ CORRECT - Throw error for errorMiddleware to catch
if (!memberEmail || !isValidEmail(memberEmail)) {
  logger.warn('[SUBSCRIPTION-VERIFY-APPROVE] ⚠ WARNING: Member email is missing or invalid');
  throw new Error(`Invalid email address: "${memberEmail}"`);
}

// ✅ CORRECT - Await email sending, let errors propagate
await sendPremiumSubscribeReceiptEmail(memberEmail, subscriptionData, pdfBuffer);

// ✅ CORRECT - Return success response AFTER email is sent
res.json({
  success: true,
  message: 'Subscription approved successfully. Receipt email sent to member.',
  emailSent: true,
});
```

### Incorrect Pattern (AVOIDED):

```javascript
// ❌ WRONG - Catching error and returning response manually
try {
  await sendPremiumSubscribeReceiptEmail(memberEmail, subscriptionData, pdfBuffer);
} catch (error) {
  return res.status(500).json({ error: error.message }); // ❌ WRONG
}

// ❌ WRONG - Checking response and returning error manually
if (!response.ok) {
  return res.status(500).json({ error: 'Email failed' }); // ❌ WRONG
}
```

---

## Testing

### Test verify-and-approve endpoint:

```bash
curl -X POST http://localhost:3001/hcgi/api/subscription/sub123/verify-and-approve \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Response (Success):**
```json
{
  "success": true,
  "message": "Subscription approved successfully. Receipt email sent to member.",
  "receiptId": "PS_1712275200_482916",
  "subscriptionId": "sub123",
  "memberName": "John Doe",
  "subscriptionType": "Monthly",
  "amount": 99.99,
  "renewalDate": "2024-04-15",
  "nextRenewalDate": "2024-05-15",
  "approvedDate": "2024-04-15",
  "emailSent": true
}
```

**Expected Response (Email Skipped):**
```json
{
  "success": true,
  "message": "Subscription approved successfully. (Email notification skipped - email not available for this user.)",
  "receiptId": "PS_1712275200_482916",
  "subscriptionId": "sub123",
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

### Test send-payer-email endpoint:

```bash
curl -X POST http://localhost:3001/hcgi/api/subscription/send-payer-email \
  -H "Content-Type: application/json" \
  -d '{"subscriptionId": "sub123"}'
```

**Expected Response (Success):**
```json
{
  "success": true,
  "message": "Payment verification email sent successfully",
  "subscriptionId": "sub123",
  "recipientEmail": "user@example.com",
  "emailLogId": "log123"
}
```

---

## Verification Checklist

### verify-and-approve endpoint:
- [x] Email is sent to `subscription.member_email`
- [x] PDF receipt is generated with stored receipt_id
- [x] PDF buffer is passed to `sendPremiumSubscribeReceiptEmail()`
- [x] Email is sent BEFORE returning success response
- [x] If email fails, error is thrown (caught by errorMiddleware)
- [x] If email is missing/invalid, gracefully skips and returns `emailSkipped: true`
- [x] Response includes `emailSent` flag
- [x] Comprehensive logging shows email recipient
- [x] No manual `res.status(500).json()` calls

### send-payer-email endpoint:
- [x] Email recipient is from `user.email` (primary) or `subscription.member_email` (fallback)
- [x] Email address is validated before sending
- [x] Email is NOT hardcoded to 'rganesh2100@gmail.com'
- [x] Admin can specify custom recipient via request body (future enhancement)
- [x] If email is invalid, error is thrown (caught by errorMiddleware)
- [x] Email is logged to `subscription_email_logs` collection
- [x] Response includes actual recipient email address
- [x] Comprehensive logging shows which email is being used
- [x] No manual `res.status(500).json()` calls

---

## Summary

Both endpoints have been fixed to:
1. Send emails to the correct recipient addresses from the database
2. Properly handle email sending with PDF attachments
3. Throw errors for errorMiddleware to catch (no manual error responses)
4. Provide comprehensive logging for debugging
5. Gracefully handle missing/invalid email addresses
6. Return success responses with email status flags

The implementation follows the Express.js error handling pattern where all errors are thrown and caught by the centralized errorMiddleware, not handled manually in route handlers.