# Quick Diagnostic Reference - Subscription Creation Errors

## TL;DR - Quick Start

### 1. Run This Test

```bash
curl -X POST http://localhost:3001/hcgi/api/subscription/create \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "[REPLACE_WITH_VALID_USER_ID]",
    "email": "test@example.com",
    "full_name": "Test User",
    "subscription_type": "Monthly",
    "amount": 99.99,
    "membership_type": "Premium",
    "transaction_reference": "TEST_TXN_001",
    "transaction_id": "TEST_ID_001"
  }'
```

### 2. Look for These Log Sections

#### Section A: User Check
```
[SUBSCRIPTION-CREATE] DIAGNOSTIC: Checking if user exists in users collection
[SUBSCRIPTION-CREATE] ✓ User record found  <-- GOOD
  OR
[SUBSCRIPTION-CREATE] ✗ User record NOT found  <-- BAD
```

#### Section B: Payload
```
[SUBSCRIPTION-CREATE] DIAGNOSTIC: Full payload being sent to PocketBase
[SUBSCRIPTION-CREATE] Payload field types:
[SUBSCRIPTION-CREATE]   - amount: number = 99.99  <-- Check types are correct
```

#### Section C: Error (if it fails)
```
[SUBSCRIPTION-CREATE] ✗ POCKETBASE ERROR - SUBSCRIPTION CREATION FAILED
[SUBSCRIPTION-CREATE] Error status: 400  <-- Check this number
[SUBSCRIPTION-CREATE] Validation errors:
[SUBSCRIPTION-CREATE]   - field_name: {"code":"error_code"}  <-- Check which field failed
```

### 3. Match Your Error to This Table

| Error Status | Error Code | Problem | Fix |
|---|---|---|---|
| 400 | validation_required | Missing required field | Add the missing field to request |
| 400 | validation_invalid_data_type | Wrong field type | Ensure amount is number, not string |
| 400 | validation_invalid_email | Bad email format | Use valid email format |
| 404 | record_not_found | User doesn't exist | Verify user_id is correct |
| 409 | validation_unique | Duplicate transaction_reference or transaction_id | Use unique values |
| 500 | (any) | Server error | Check API logs for details |

## Diagnostic Checklist

### Before Testing

- [ ] Do you have a valid user_id? (Check PocketBase users collection)
- [ ] Is the user_id in the correct format?
- [ ] Does the user exist in the users collection?

### When Testing

- [ ] Copy the exact error message from logs
- [ ] Note the HTTP status code (400, 409, 500, etc.)
- [ ] Note the error code (validation_unique, validation_required, etc.)
- [ ] Note which field has the error (if shown)

### After Testing

- [ ] Check if user exists: ✓ or ✗?
- [ ] Check if payload types are correct: all strings/numbers as expected?
- [ ] Check if error is about a specific field: which one?
- [ ] Check if error is about unique constraint: transaction_reference or transaction_id?

## Common Issues - Quick Fixes

### Issue: "User with ID ... not found"

**Cause**: User doesn't exist in users collection

**Fix**:
1. Go to PocketBase Admin Panel
2. Click Collections > users
3. Find a valid user ID
4. Use that user_id in your test request

### Issue: "validation_unique" on transaction_reference or transaction_id

**Cause**: That value already exists in the database

**Fix**:
1. Use a different transaction_reference value (e.g., TEST_TXN_002 instead of TEST_TXN_001)
2. Use a different transaction_id value (e.g., TEST_ID_002 instead of TEST_ID_001)
3. Or delete the old record from PocketBase

### Issue: "validation_invalid_data_type" on amount

**Cause**: amount is being sent as a string instead of a number

**Fix**:
1. In your request, send `"amount": 99.99` (number, no quotes)
2. NOT `"amount": "99.99"` (string, with quotes)

### Issue: "validation_required" on a field

**Cause**: Required field is missing from request

**Fix**:
1. Check which field is missing (shown in error)
2. Add it to your request
3. Required fields: user_id, email, full_name, subscription_type, amount, membership_type, transaction_reference, transaction_id

### Issue: "validation_invalid_email"

**Cause**: Email format is invalid

**Fix**:
1. Use valid email format: `something@something.something`
2. Example: `test@example.com`

## PocketBase Schema Quick Check

### Required Fields (Must Exist)

- [ ] user_id (Relation to users collection)
- [ ] email (Email type)
- [ ] full_name (Text type)
- [ ] subscription_type (Text type)
- [ ] amount (Number type)
- [ ] membership_type (Text type)
- [ ] transaction_reference (Text type, UNIQUE)
- [ ] transaction_id (Text type, UNIQUE)
- [ ] approval_status (Select type with: pending_approval, approved, rejected)

### How to Check in PocketBase

1. Open PocketBase Admin Panel
2. Click Collections
3. Click subscriptions
4. Click Fields tab
5. Verify each field exists with correct type
6. Check that transaction_reference and transaction_id are marked as UNIQUE

## Logging Output Examples

### Success (Status 201)

```
[SUBSCRIPTION-CREATE] ✓ User record found in users collection
[SUBSCRIPTION-CREATE] DIAGNOSTIC: Full payload being sent to PocketBase
[SUBSCRIPTION-CREATE]   - amount: number = 99.99
[SUBSCRIPTION-CREATE] ✓ Subscription record created successfully
[SUBSCRIPTION-CREATE] ✓ SUBSCRIPTION CREATED SUCCESSFULLY
```

### Failure - User Not Found (Status 400)

```
[SUBSCRIPTION-CREATE] ✗ User record NOT found in users collection
[SUBSCRIPTION-CREATE]   - User ID: invalid_user_id
[SUBSCRIPTION-CREATE]   - Error: Record not found
```

### Failure - Unique Constraint (Status 409)

```
[SUBSCRIPTION-CREATE] Error status: 409
[SUBSCRIPTION-CREATE] Validation errors:
[SUBSCRIPTION-CREATE]   - transaction_reference: {"code":"validation_unique","message":"Value must be unique"}
```

### Failure - Field Type (Status 400)

```
[SUBSCRIPTION-CREATE] Payload field types:
[SUBSCRIPTION-CREATE]   - amount: string = "99.99"  <-- WRONG! Should be number
[SUBSCRIPTION-CREATE] Error status: 400
[SUBSCRIPTION-CREATE] Validation errors:
[SUBSCRIPTION-CREATE]   - amount: {"code":"validation_invalid_data_type"}
```

## Step-by-Step Debugging

### Step 1: Verify User Exists

```bash
# In PocketBase Admin Panel:
# 1. Collections > users
# 2. Find a user record
# 3. Copy the user ID
# 4. Use it in your test request
```

### Step 2: Verify Field Types

```bash
# In your curl request, check:
# - "amount": 99.99  (number, no quotes)
# - "email": "test@example.com"  (string, with quotes)
# - "user_id": "user_123"  (string, with quotes)
```

### Step 3: Verify Unique Values

```bash
# Use unique values for:
# - "transaction_reference": "TEST_TXN_001"  (change 001 each time)
# - "transaction_id": "TEST_ID_001"  (change 001 each time)
```

### Step 4: Check Logs

```bash
# Look for these sections in API server output:
# 1. [SUBSCRIPTION-CREATE] DIAGNOSTIC: Checking if user exists
# 2. [SUBSCRIPTION-CREATE] DIAGNOSTIC: Full payload being sent
# 3. [SUBSCRIPTION-CREATE] ✗ POCKETBASE ERROR (if it fails)
```

### Step 5: Match Error to Table

```bash
# Find your error status code in the table above
# Find your error code in the table above
# Apply the fix
```

## Files to Read

1. **SUBSCRIPTION_CREATION_DIAGNOSTIC.md** - Full diagnostic guide with examples
2. **POCKETBASE_SCHEMA_VERIFICATION.md** - Complete schema checklist
3. **DIAGNOSTIC_IMPLEMENTATION_SUMMARY.md** - What was added and why

## Key Points

✓ **NO CREATION LOGIC WAS CHANGED** - Only logging was added

✓ **All errors are logged with full details** - Check the logs for exact error message

✓ **User must exist** - Verify user_id is valid and user exists in users collection

✓ **Field types matter** - amount must be number, not string

✓ **Unique fields must be unique** - transaction_reference and transaction_id must not be duplicated

✓ **All required fields must be present** - Don't skip any required fields

## Need More Help?

1. Read **SUBSCRIPTION_CREATION_DIAGNOSTIC.md** for detailed explanations
2. Read **POCKETBASE_SCHEMA_VERIFICATION.md** to verify your schema
3. Check the logs for the exact error message
4. Match your error to the table above
5. Apply the fix
6. Test again