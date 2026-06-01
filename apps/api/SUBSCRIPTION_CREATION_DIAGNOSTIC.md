# Subscription Creation Error Diagnostic Guide

## Overview

This document explains the diagnostic logging added to `apps/api/src/routes/subscription.js` around line 244 to help identify the root cause of subscription creation failures in PocketBase.

## What Was Added

### 1. Enhanced Error Logging (Lines 244-290)

The error handler now captures and logs:

```javascript
catch (pbError) {
  logger.error('[SUBSCRIPTION-CREATE] ========================================');
  logger.error('[SUBSCRIPTION-CREATE] ✗ POCKETBASE ERROR - SUBSCRIPTION CREATION FAILED');
  logger.error('[SUBSCRIPTION-CREATE] ========================================');
  logger.error(`[SUBSCRIPTION-CREATE] Error message: ${pbError.message}`);
  logger.error(`[SUBSCRIPTION-CREATE] Error name: ${pbError.name}`);
  logger.error(`[SUBSCRIPTION-CREATE] Error status: ${pbError.status || 'unknown'}`);
  logger.error(`[SUBSCRIPTION-CREATE] Error code: ${pbError.code || 'unknown'}`);
  logger.error('[SUBSCRIPTION-CREATE] Full error object:');
  logger.error('[SUBSCRIPTION-CREATE]', JSON.stringify(pbError, null, 2));
  
  // Log error data if available
  if (pbError.data) {
    logger.error('[SUBSCRIPTION-CREATE] Error data:');
    logger.error('[SUBSCRIPTION-CREATE]', JSON.stringify(pbError.data, null, 2));
  }
  
  // Log response if available
  if (pbError.response) {
    logger.error('[SUBSCRIPTION-CREATE] Error response:');
    logger.error('[SUBSCRIPTION-CREATE]', JSON.stringify(pbError.response, null, 2));
  }

  // Log validation errors if available
  if (pbError.data && pbError.data.data) {
    logger.error('[SUBSCRIPTION-CREATE] Validation errors:');
    Object.entries(pbError.data.data).forEach(([field, fieldError]) => {
      logger.error(`[SUBSCRIPTION-CREATE]   - ${field}: ${JSON.stringify(fieldError)}`);
    });
  }
}
```

### 2. User Existence Check (Lines 155-180)

Before attempting to create the subscription, the code now verifies that the user exists:

```javascript
logger.info('[SUBSCRIPTION-CREATE] DIAGNOSTIC: Checking if user exists in users collection');
logger.info(`[SUBSCRIPTION-CREATE]   - User ID to check: ${user_id}`);
try {
  const userRecord = await pb.collection('users').getOne(user_id);
  logger.info('[SUBSCRIPTION-CREATE] ✓ User record found in users collection');
  logger.info(`[SUBSCRIPTION-CREATE]   - User ID: ${userRecord.id}`);
  logger.info(`[SUBSCRIPTION-CREATE]   - User email: ${userRecord.email || 'N/A'}`);
  logger.info(`[SUBSCRIPTION-CREATE]   - User name: ${userRecord.name || 'N/A'}`);
} catch (userError) {
  logger.error('[SUBSCRIPTION-CREATE] ✗ User record NOT found in users collection');
  logger.error(`[SUBSCRIPTION-CREATE]   - User ID: ${user_id}`);
  logger.error(`[SUBSCRIPTION-CREATE]   - Error: ${userError.message}`);
  logger.error(`[SUBSCRIPTION-CREATE]   - Error status: ${userError.status || 'unknown'}`);
  logger.error(`[SUBSCRIPTION-CREATE]   - Error data: ${JSON.stringify(userError.data || {})}`);
  return res.status(400).json({
    success: false,
    message: `User with ID "${user_id}" not found in users collection`,
    diagnostic: {
      userNotFound: true,
      userId: user_id,
      errorMessage: userError.message,
    },
  });
}
```

### 3. Payload Inspection (Lines 220-230)

Before sending to PocketBase, the code logs the exact payload:

```javascript
logger.info('[SUBSCRIPTION-CREATE] DIAGNOSTIC: Full payload being sent to PocketBase');
logger.info('[SUBSCRIPTION-CREATE] Payload:', JSON.stringify(subscriptionData, null, 2));
logger.info('[SUBSCRIPTION-CREATE] Payload field types:');
Object.entries(subscriptionData).forEach(([key, value]) => {
  logger.info(`[SUBSCRIPTION-CREATE]   - ${key}: ${typeof value} = ${JSON.stringify(value)}`);
});
```

## How to Use This Diagnostic

### Step 1: Trigger the Error

Make a POST request to `/subscriptions/create` with test data:

```bash
curl -X POST http://localhost:3001/hcgi/api/subscription/create \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user_123",
    "email": "test@example.com",
    "full_name": "Test User",
    "subscription_type": "Monthly",
    "amount": 99.99,
    "membership_type": "Premium",
    "transaction_reference": "TXN_001",
    "transaction_id": "TXN_ID_001"
  }'
```

### Step 2: Check the Logs

Look for these log sections in the API server output:

#### Section A: User Existence Check

```
[SUBSCRIPTION-CREATE] DIAGNOSTIC: Checking if user exists in users collection
[SUBSCRIPTION-CREATE]   - User ID to check: test_user_123
[SUBSCRIPTION-CREATE] ✓ User record found in users collection
  OR
[SUBSCRIPTION-CREATE] ✗ User record NOT found in users collection
[SUBSCRIPTION-CREATE]   - User ID: test_user_123
[SUBSCRIPTION-CREATE]   - Error: Record not found
```

**What it means:**
- ✓ = User exists in the users collection (good)
- ✗ = User does NOT exist (this is a problem)

#### Section B: Payload Inspection

```
[SUBSCRIPTION-CREATE] DIAGNOSTIC: Full payload being sent to PocketBase
[SUBSCRIPTION-CREATE] Payload:
{
  "user_id": "test_user_123",
  "email": "test@example.com",
  "full_name": "Test User",
  "subscription_type": "Monthly",
  "amount": 99.99,
  "membership_type": "Premium",
  "transaction_reference": "TXN_001",
  "transaction_id": "TXN_ID_001",
  "approval_status": "pending_approval",
  "status": "Pending"
}
[SUBSCRIPTION-CREATE] Payload field types:
[SUBSCRIPTION-CREATE]   - user_id: string = "test_user_123"
[SUBSCRIPTION-CREATE]   - email: string = "test@example.com"
[SUBSCRIPTION-CREATE]   - amount: number = 99.99
...
```

**What to check:**
- Are all field types correct? (string, number, etc.)
- Are all required fields present?
- Are there any unexpected fields?

#### Section C: PocketBase Error Response

```
[SUBSCRIPTION-CREATE] ✗ POCKETBASE ERROR - SUBSCRIPTION CREATION FAILED
[SUBSCRIPTION-CREATE] Error message: [SPECIFIC ERROR MESSAGE]
[SUBSCRIPTION-CREATE] Error name: [ERROR NAME]
[SUBSCRIPTION-CREATE] Error status: [HTTP STATUS CODE]
[SUBSCRIPTION-CREATE] Error code: [ERROR CODE]
[SUBSCRIPTION-CREATE] Full error object:
{
  "message": "...",
  "status": 400,
  "code": "...",
  "data": {
    "data": {
      "field_name": {
        "code": "validation_error_code",
        "message": "Specific validation error message"
      }
    }
  }
}
[SUBSCRIPTION-CREATE] Validation errors:
[SUBSCRIPTION-CREATE]   - field_name: {"code":"...","message":"..."}
```

**What to look for:**
- **400 Bad Request**: Usually a validation error (check the field-specific errors)
- **403 Forbidden**: Usually an API rule or permission issue
- **409 Conflict**: Usually a unique constraint violation (duplicate transaction_reference or transaction_id)
- **422 Unprocessable Entity**: Usually a field type mismatch or missing required field

## Common Issues and Solutions

### Issue 1: User Not Found

**Log Output:**
```
[SUBSCRIPTION-CREATE] ✗ User record NOT found in users collection
[SUBSCRIPTION-CREATE]   - User ID: test_user_123
[SUBSCRIPTION-CREATE]   - Error: Record not found
```

**Solution:**
1. Verify the user_id is correct
2. Check that the user exists in the users collection in PocketBase
3. Ensure the user record has all required fields (email, name, etc.)

### Issue 2: Validation Error on Specific Field

**Log Output:**
```
[SUBSCRIPTION-CREATE] Validation errors:
[SUBSCRIPTION-CREATE]   - transaction_reference: {"code":"validation_required","message":"Missing required field"}
```

**Solution:**
1. Check that the field is being sent in the request
2. Verify the field value is not empty or null
3. Check the field type matches what PocketBase expects
4. Verify the field name matches the PocketBase schema exactly

### Issue 3: Unique Constraint Violation

**Log Output:**
```
[SUBSCRIPTION-CREATE] Error status: 409
[SUBSCRIPTION-CREATE] Validation errors:
[SUBSCRIPTION-CREATE]   - transaction_reference: {"code":"validation_unique","message":"Value must be unique"}
```

**Solution:**
1. Check if a subscription with this transaction_reference already exists
2. Use a unique transaction_reference value
3. Check PocketBase schema to see which fields have unique constraints

### Issue 4: Field Type Mismatch

**Log Output:**
```
[SUBSCRIPTION-CREATE] Payload field types:
[SUBSCRIPTION-CREATE]   - amount: string = "99.99"  <-- WRONG! Should be number
```

**Solution:**
1. Ensure amount is sent as a number, not a string
2. Check all field types in the payload match the schema
3. Verify no unexpected type conversions are happening

### Issue 5: Missing Required Field

**Log Output:**
```
[SUBSCRIPTION-CREATE] Payload:
{
  "user_id": "test_user_123",
  "email": "test@example.com",
  "full_name": "Test User",
  "subscription_type": "Monthly",
  "amount": 99.99,
  "membership_type": "Premium",
  "transaction_reference": "TXN_001"
  // ❌ MISSING: transaction_id
}
```

**Solution:**
1. Check the PocketBase schema for all required fields
2. Ensure all required fields are included in the request
3. Verify field names match exactly (case-sensitive)

## PocketBase Schema Verification Checklist

When reviewing the error logs, verify these fields exist in the subscriptions collection:

- [ ] `user_id` (relation to users, required)
- [ ] `email` (email, required)
- [ ] `full_name` (text, required)
- [ ] `member_name` (text, optional)
- [ ] `member_email` (email, optional)
- [ ] `subscription_type` (text, required)
- [ ] `amount` (number, required)
- [ ] `membership_type` (text, required)
- [ ] `transaction_reference` (text, required, unique)
- [ ] `transaction_id` (text, required, unique)
- [ ] `approval_status` (select: pending_approval/approved/rejected, required)
- [ ] `status` (text, optional)
- [ ] `contact_number` (text, optional)
- [ ] `membershipTier` (text, optional)
- [ ] `premiumPlan` (text, optional)

## API Rules to Check

In PocketBase Admin Panel, check the subscriptions collection API rules:

1. **Create Rule**: Who can create subscriptions?
   - Should allow backend/admin to create
   - Check if there are any restrictions

2. **Update Rule**: Who can update subscriptions?
   - Should allow backend/admin to update

3. **Delete Rule**: Who can delete subscriptions?
   - Should allow backend/admin to delete

4. **List Rule**: Who can list subscriptions?
   - Should allow authenticated users

## Authentication Check

The PocketBase client in `apps/api/src/utils/pocketbaseClient.js` should be using admin auth. Verify:

1. Is the client authenticated as admin?
2. Are there any API rules blocking admin operations?
3. Is the POCKETBASE_URL correct?

## Next Steps

1. **Run the diagnostic**: Make a POST request to `/subscriptions/create` with test data
2. **Collect the logs**: Copy all `[SUBSCRIPTION-CREATE]` log lines
3. **Analyze the error**: Use the sections above to identify the issue
4. **Fix the problem**: Based on the error type, apply the appropriate solution
5. **Test again**: Verify the subscription is created successfully

## Log Output Example (Success)

```
[SUBSCRIPTION-CREATE] ========================================
[SUBSCRIPTION-CREATE] POST /create - Create subscription request received
[SUBSCRIPTION-CREATE] ========================================
[SUBSCRIPTION-CREATE] Step 1: Validating required fields
[SUBSCRIPTION-CREATE] ✓ user_id validated: user_123
[SUBSCRIPTION-CREATE] ✓ email parameter present: test@example.com
[SUBSCRIPTION-CREATE] ✓ Email format validation PASSED: "test@example.com"
[SUBSCRIPTION-CREATE] ✓ full_name validated: Test User
[SUBSCRIPTION-CREATE] ✓ subscription_type validated: Monthly
[SUBSCRIPTION-CREATE] ✓ amount validated: €99.99
[SUBSCRIPTION-CREATE] ✓ membership_type validated: Premium
[SUBSCRIPTION-CREATE] ✓ transaction_reference validated: TXN_001
[SUBSCRIPTION-CREATE] ✓ transaction_id validated: TXN_ID_001
[SUBSCRIPTION-CREATE] ✓ All required fields validated successfully
[SUBSCRIPTION-CREATE] DIAGNOSTIC: Checking if user exists in users collection
[SUBSCRIPTION-CREATE]   - User ID to check: user_123
[SUBSCRIPTION-CREATE] ✓ User record found in users collection
[SUBSCRIPTION-CREATE]   - User ID: user_123
[SUBSCRIPTION-CREATE]   - User email: test@example.com
[SUBSCRIPTION-CREATE]   - User name: Test User
[SUBSCRIPTION-CREATE] Step 2: Building subscription data
[SUBSCRIPTION-CREATE] DIAGNOSTIC: Full payload being sent to PocketBase
[SUBSCRIPTION-CREATE] Payload:
{
  "user_id": "user_123",
  "email": "test@example.com",
  "full_name": "Test User",
  "member_name": "Test User",
  "member_email": "test@example.com",
  "subscription_type": "Monthly",
  "amount": 99.99,
  "membership_type": "Premium",
  "transaction_reference": "TXN_001",
  "transaction_id": "TXN_ID_001",
  "approval_status": "pending_approval",
  "status": "Pending"
}
[SUBSCRIPTION-CREATE] Payload field types:
[SUBSCRIPTION-CREATE]   - user_id: string = "user_123"
[SUBSCRIPTION-CREATE]   - email: string = "test@example.com"
[SUBSCRIPTION-CREATE]   - full_name: string = "Test User"
[SUBSCRIPTION-CREATE]   - member_name: string = "Test User"
[SUBSCRIPTION-CREATE]   - member_email: string = "test@example.com"
[SUBSCRIPTION-CREATE]   - subscription_type: string = "Monthly"
[SUBSCRIPTION-CREATE]   - amount: number = 99.99
[SUBSCRIPTION-CREATE]   - membership_type: string = "Premium"
[SUBSCRIPTION-CREATE]   - transaction_reference: string = "TXN_001"
[SUBSCRIPTION-CREATE]   - transaction_id: string = "TXN_ID_001"
[SUBSCRIPTION-CREATE]   - approval_status: string = "pending_approval"
[SUBSCRIPTION-CREATE]   - status: string = "Pending"
[SUBSCRIPTION-CREATE] Step 3: Creating subscription record in PocketBase
[SUBSCRIPTION-CREATE]   - Collection: subscriptions
[SUBSCRIPTION-CREATE]   - Attempting to create record...
[SUBSCRIPTION-CREATE] ✓ Subscription record created successfully
[SUBSCRIPTION-CREATE]   - Record ID: sub_abc123
[SUBSCRIPTION-CREATE]   - Created at: 2024-04-15T10:30:00.000Z
[SUBSCRIPTION-CREATE] ========================================
[SUBSCRIPTION-CREATE] ✓ SUBSCRIPTION CREATED SUCCESSFULLY
[SUBSCRIPTION-CREATE] ========================================
[SUBSCRIPTION-CREATE] Record ID: sub_abc123
[SUBSCRIPTION-CREATE] User: Test User
[SUBSCRIPTION-CREATE] Email: test@example.com
[SUBSCRIPTION-CREATE] Amount: €99.99
[SUBSCRIPTION-CREATE] Status: pending_approval
```

## Log Output Example (Failure - User Not Found)

```
[SUBSCRIPTION-CREATE] DIAGNOSTIC: Checking if user exists in users collection
[SUBSCRIPTION-CREATE]   - User ID to check: nonexistent_user
[SUBSCRIPTION-CREATE] ✗ User record NOT found in users collection
[SUBSCRIPTION-CREATE]   - User ID: nonexistent_user
[SUBSCRIPTION-CREATE]   - Error: Record not found
[SUBSCRIPTION-CREATE]   - Error status: 404
[SUBSCRIPTION-CREATE]   - Error data: {"code":"record_not_found","message":"The requested record was not found."}
```

## Log Output Example (Failure - Validation Error)

```
[SUBSCRIPTION-CREATE] ✗ POCKETBASE ERROR - SUBSCRIPTION CREATION FAILED
[SUBSCRIPTION-CREATE] Error message: Failed to create record.
[SUBSCRIPTION-CREATE] Error name: ClientResponseError
[SUBSCRIPTION-CREATE] Error status: 400
[SUBSCRIPTION-CREATE] Error code: validation_invalid_data_type
[SUBSCRIPTION-CREATE] Full error object:
{
  "message": "Failed to create record.",
  "status": 400,
  "code": "validation_invalid_data_type",
  "data": {
    "data": {
      "amount": {
        "code": "validation_invalid_data_type",
        "message": "Invalid data type."
      }
    }
  }
}
[SUBSCRIPTION-CREATE] Validation errors:
[SUBSCRIPTION-CREATE]   - amount: {"code":"validation_invalid_data_type","message":"Invalid data type."}
```

## Summary

The diagnostic logging now provides:

1. ✓ **User existence verification** - Confirms user exists before attempting creation
2. ✓ **Payload inspection** - Shows exact data being sent to PocketBase
3. ✓ **Field type validation** - Confirms all fields have correct types
4. ✓ **Detailed error capture** - Logs complete error object with validation details
5. ✓ **Error categorization** - Identifies specific field validation errors

Use this information to identify and fix the root cause of subscription creation failures.