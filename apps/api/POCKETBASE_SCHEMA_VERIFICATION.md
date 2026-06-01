# PocketBase Schema Verification Checklist

## Overview

This document provides a comprehensive checklist to verify the subscriptions collection schema in PocketBase and identify any schema issues that might be causing subscription creation failures.

## Required Fields in Subscriptions Collection

### 1. Core User Reference

- [ ] **Field Name**: `user_id`
  - **Type**: Relation (to users collection)
  - **Required**: YES
  - **Unique**: NO
  - **Indexed**: YES (recommended)
  - **Description**: Reference to the user creating the subscription
  - **Validation**: Must be a valid user ID from users collection

### 2. Contact Information

- [ ] **Field Name**: `email`
  - **Type**: Email
  - **Required**: YES
  - **Unique**: NO (multiple subscriptions can have same email)
  - **Indexed**: NO
  - **Description**: User's email address
  - **Validation**: Must be valid email format

- [ ] **Field Name**: `full_name`
  - **Type**: Text
  - **Required**: YES
  - **Unique**: NO
  - **Indexed**: NO
  - **Description**: User's full name
  - **Validation**: Non-empty string

- [ ] **Field Name**: `member_name`
  - **Type**: Text
  - **Required**: NO (optional)
  - **Unique**: NO
  - **Indexed**: NO
  - **Description**: Alternative name field for member
  - **Validation**: Non-empty string if provided

- [ ] **Field Name**: `member_email`
  - **Type**: Email
  - **Required**: NO (optional)
  - **Unique**: NO
  - **Indexed**: NO
  - **Description**: Alternative email field for member
  - **Validation**: Valid email format if provided

### 3. Subscription Details

- [ ] **Field Name**: `subscription_type`
  - **Type**: Text (or Select)
  - **Required**: YES
  - **Unique**: NO
  - **Indexed**: NO
  - **Description**: Type of subscription (e.g., 'Monthly', 'Yearly')
  - **Validation**: Non-empty string
  - **Allowed Values** (if Select): Monthly, Yearly, Quarterly, etc.

- [ ] **Field Name**: `amount`
  - **Type**: Number
  - **Required**: YES
  - **Unique**: NO
  - **Indexed**: NO
  - **Description**: Subscription amount
  - **Validation**: Must be positive number (> 0)
  - **Min Value**: 0 (or > 0 if enforced)
  - **Decimal Places**: 2 (for currency)

- [ ] **Field Name**: `membership_type`
  - **Type**: Text (or Select)
  - **Required**: YES
  - **Unique**: NO
  - **Indexed**: NO
  - **Description**: Type of membership (e.g., 'Premium', 'Standard')
  - **Validation**: Non-empty string
  - **Allowed Values** (if Select): Premium, Standard, Basic, etc.

### 4. Transaction Information

- [ ] **Field Name**: `transaction_reference`
  - **Type**: Text
  - **Required**: YES
  - **Unique**: YES ⚠️ CRITICAL
  - **Indexed**: YES (recommended)
  - **Description**: Unique transaction reference ID
  - **Validation**: Non-empty string, must be unique
  - **Note**: Duplicate values will cause 409 Conflict error

- [ ] **Field Name**: `transaction_id`
  - **Type**: Text
  - **Required**: YES
  - **Unique**: YES ⚠️ CRITICAL
  - **Indexed**: YES (recommended)
  - **Description**: Unique transaction ID
  - **Validation**: Non-empty string, must be unique
  - **Note**: Duplicate values will cause 409 Conflict error

### 5. Approval Status

- [ ] **Field Name**: `approval_status`
  - **Type**: Select
  - **Required**: YES
  - **Unique**: NO
  - **Indexed**: NO
  - **Description**: Approval status of subscription
  - **Allowed Values**: 
    - [ ] `pending_approval`
    - [ ] `approved`
    - [ ] `rejected`
  - **Default Value**: `pending_approval` (recommended)
  - **Validation**: Must be one of allowed values

### 6. Status Field

- [ ] **Field Name**: `status`
  - **Type**: Text (or Select)
  - **Required**: NO (optional)
  - **Unique**: NO
  - **Indexed**: NO
  - **Description**: General status of subscription
  - **Validation**: Non-empty string if provided
  - **Allowed Values** (if Select): Pending, Active, Cancelled, Expired, etc.

### 7. Optional Fields

- [ ] **Field Name**: `contact_number`
  - **Type**: Text
  - **Required**: NO (optional)
  - **Unique**: NO
  - **Indexed**: NO
  - **Description**: Contact phone number
  - **Validation**: Non-empty string if provided

- [ ] **Field Name**: `membershipTier`
  - **Type**: Text (or Select)
  - **Required**: NO (optional)
  - **Unique**: NO
  - **Indexed**: NO
  - **Description**: Membership tier level
  - **Validation**: Non-empty string if provided

- [ ] **Field Name**: `premiumPlan`
  - **Type**: Text (or Select)
  - **Required**: NO (optional)
  - **Unique**: NO
  - **Indexed**: NO
  - **Description**: Premium plan name
  - **Validation**: Non-empty string if provided

### 8. Receipt Fields (Added by Approval Process)

- [ ] **Field Name**: `receipt_id`
  - **Type**: Text
  - **Required**: NO (optional, added during approval)
  - **Unique**: YES (recommended)
  - **Indexed**: NO
  - **Description**: Receipt ID generated during approval
  - **Validation**: Non-empty string if provided

- [ ] **Field Name**: `renewal_date`
  - **Type**: Date
  - **Required**: NO (optional, added during approval)
  - **Unique**: NO
  - **Indexed**: NO
  - **Description**: Subscription renewal date
  - **Validation**: Valid date if provided

- [ ] **Field Name**: `next_renewal_date`
  - **Type**: Date
  - **Required**: NO (optional, added during approval)
  - **Unique**: NO
  - **Indexed**: NO
  - **Description**: Next renewal date
  - **Validation**: Valid date if provided

- [ ] **Field Name**: `approved_date`
  - **Type**: Date
  - **Required**: NO (optional, added during approval)
  - **Unique**: NO
  - **Indexed**: NO
  - **Description**: Date subscription was approved
  - **Validation**: Valid date if provided

## API Rules Verification

### Create Rule

- [ ] **Current Rule**: ___________________________________
- [ ] **Should Allow**: Backend/Admin to create subscriptions
- [ ] **Check**: Is the rule blocking admin operations?
- [ ] **Recommended**: `@request.auth.id != ''` (authenticated users) or empty (allow all)

### Read Rule

- [ ] **Current Rule**: ___________________________________
- [ ] **Should Allow**: Users to read their own subscriptions
- [ ] **Check**: Is the rule too restrictive?
- [ ] **Recommended**: `user_id = @request.auth.id` (users see own) or empty (allow all)

### Update Rule

- [ ] **Current Rule**: ___________________________________
- [ ] **Should Allow**: Backend/Admin to update subscriptions
- [ ] **Check**: Is the rule blocking admin operations?
- [ ] **Recommended**: `@request.auth.id != ''` (authenticated) or empty (allow all)

### Delete Rule

- [ ] **Current Rule**: ___________________________________
- [ ] **Should Allow**: Backend/Admin to delete subscriptions
- [ ] **Check**: Is the rule blocking admin operations?
- [ ] **Recommended**: `@request.auth.id != ''` (authenticated) or empty (allow all)

## Unique Constraint Verification

### Critical: transaction_reference

- [ ] **Is Unique**: YES / NO
- [ ] **Current Values in Database**:
  ```
  TXN_001
  TXN_002
  TXN_003
  ```
- [ ] **Duplicates Found**: YES / NO
- [ ] **If Duplicates**: List them: ___________________________________
- [ ] **Action**: Delete duplicate records or use unique values

### Critical: transaction_id

- [ ] **Is Unique**: YES / NO
- [ ] **Current Values in Database**:
  ```
  TXN_ID_001
  TXN_ID_002
  TXN_ID_003
  ```
- [ ] **Duplicates Found**: YES / NO
- [ ] **If Duplicates**: List them: ___________________________________
- [ ] **Action**: Delete duplicate records or use unique values

### Optional: receipt_id

- [ ] **Is Unique**: YES / NO
- [ ] **Duplicates Found**: YES / NO
- [ ] **If Duplicates**: List them: ___________________________________

## Field Type Verification

### Verify Each Field Type Matches Expected

| Field Name | Expected Type | Actual Type | Match? | Notes |
|---|---|---|---|---|
| user_id | Relation (users) | | ☐ | |
| email | Email | | ☐ | |
| full_name | Text | | ☐ | |
| member_name | Text | | ☐ | |
| member_email | Email | | ☐ | |
| subscription_type | Text/Select | | ☐ | |
| amount | Number | | ☐ | |
| membership_type | Text/Select | | ☐ | |
| transaction_reference | Text | | ☐ | |
| transaction_id | Text | | ☐ | |
| approval_status | Select | | ☐ | |
| status | Text/Select | | ☐ | |
| contact_number | Text | | ☐ | |
| membershipTier | Text/Select | | ☐ | |
| premiumPlan | Text/Select | | ☐ | |
| receipt_id | Text | | ☐ | |
| renewal_date | Date | | ☐ | |
| next_renewal_date | Date | | ☐ | |
| approved_date | Date | | ☐ | |

## Validation Rules Verification

### Email Fields

- [ ] `email` field has email validation
- [ ] `member_email` field has email validation (if required)

### Number Fields

- [ ] `amount` field has minimum value validation (> 0)
- [ ] `amount` field has decimal places set to 2

### Select Fields

- [ ] `approval_status` has correct options: pending_approval, approved, rejected
- [ ] `subscription_type` has correct options (if Select type)
- [ ] `membership_type` has correct options (if Select type)

### Relation Fields

- [ ] `user_id` relation points to `users` collection
- [ ] `user_id` relation is required
- [ ] `user_id` relation allows cascade delete (optional)

## Common Schema Issues Checklist

### Issue 1: Missing Required Fields

- [ ] All required fields listed above exist in the collection
- [ ] No required fields are marked as optional
- [ ] All field names match exactly (case-sensitive)

### Issue 2: Wrong Field Types

- [ ] `amount` is Number type (not Text)
- [ ] `user_id` is Relation type (not Text)
- [ ] `approval_status` is Select type (not Text)
- [ ] Email fields are Email type (not Text)

### Issue 3: Unique Constraint Issues

- [ ] `transaction_reference` is marked as unique
- [ ] `transaction_id` is marked as unique
- [ ] No duplicate values exist for unique fields
- [ ] Unique constraints are properly indexed

### Issue 4: API Rule Issues

- [ ] Create rule allows backend/admin operations
- [ ] Update rule allows backend/admin operations
- [ ] Delete rule allows backend/admin operations
- [ ] No overly restrictive rules blocking operations

### Issue 5: Validation Rule Issues

- [ ] Email fields validate email format
- [ ] Number fields validate positive values
- [ ] Select fields validate against allowed options
- [ ] Required fields cannot be empty

## How to Check in PocketBase Admin Panel

### Step 1: Navigate to Collections

1. Open PocketBase Admin Panel
2. Click on "Collections" in the left sidebar
3. Find and click on "subscriptions" collection

### Step 2: Review Fields

1. Click on "Fields" tab
2. For each field, verify:
   - Field name matches exactly
   - Field type is correct
   - Required checkbox is set correctly
   - Unique checkbox is set correctly (for transaction_reference and transaction_id)

### Step 3: Review API Rules

1. Click on "API Rules" tab
2. Check each rule (Create, Read, Update, Delete)
3. Verify rules are not too restrictive

### Step 4: Review Indexes

1. Click on "Indexes" tab
2. Verify unique fields are indexed:
   - transaction_reference
   - transaction_id
   - receipt_id (optional)

### Step 5: Check for Duplicates

1. Click on "Records" tab
2. Look for duplicate values in:
   - transaction_reference
   - transaction_id
3. If duplicates found, delete or update them

## Diagnostic Test

### Test 1: Create a Test Subscription

```bash
curl -X POST http://localhost:3001/hcgi/api/subscription/create \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "[VALID_USER_ID]",
    "email": "test@example.com",
    "full_name": "Test User",
    "subscription_type": "Monthly",
    "amount": 99.99,
    "membership_type": "Premium",
    "transaction_reference": "TEST_TXN_001",
    "transaction_id": "TEST_ID_001"
  }'
```

### Expected Results

- [ ] Status 201 (Created) - Success
- [ ] Status 400 (Bad Request) - Check validation errors
- [ ] Status 409 (Conflict) - Check for duplicate transaction_reference or transaction_id
- [ ] Status 500 (Server Error) - Check API logs for detailed error

## Summary Checklist

- [ ] All required fields exist in subscriptions collection
- [ ] All field types are correct
- [ ] All required fields are marked as required
- [ ] Unique constraints are set on transaction_reference and transaction_id
- [ ] No duplicate values exist in unique fields
- [ ] API rules allow backend/admin operations
- [ ] Email validation is enabled for email fields
- [ ] Number validation is enabled for amount field
- [ ] Select fields have correct allowed values
- [ ] Relation field (user_id) points to users collection
- [ ] Field names match exactly (case-sensitive)
- [ ] No extra fields that might cause issues
- [ ] Indexes are created for unique fields

## Notes

**Date**: _______________

**Verified By**: _______________

**Issues Found**: 

_______________________________________________________________________________

_______________________________________________________________________________

**Actions Taken**:

_______________________________________________________________________________

_______________________________________________________________________________

**Result**: ✓ PASSED / ✗ FAILED