/// <reference path="../pb_data/types.d.ts" />
// SUBSCRIPTION RECEIPT GENERATION - DOCUMENTATION & REFERENCE
// 
// This file documents the subscription structure and receipt generation process
// 
// SUBSCRIPTIONS COLLECTION STRUCTURE:
// ===================================
// Field Name          | Type      | Required | Notes
// -------------------|-----------|----------|--------------------------------------------------
// id                  | text      | yes      | Auto-generated 15-char ID
// user                | relation  | yes      | Relation to users collection (primary key)
// user_id             | text      | yes      | Backup text field storing user ID
// billing_cycle       | text      | yes      | Values: 'Monthly', 'Yearly', or custom
// plan_type           | select    | yes      | Values: ['premium']
// amount              | number    | no       | Individual amount (deprecated, use total_amount)
// total_amount        | number    | yes      | Total subscription amount (includes donation)
// custom_donation     | number    | no       | Additional donation amount
// status              | select    | yes      | Values: ['pending', 'active', 'rejected']
// transaction_id      | text      | no       | Payment gateway transaction ID
// transaction_ref     | text      | no       | Payment reference
// start_date          | date      | no       | Subscription start date
// end_date            | date      | no       | Subscription end date
// admin_notes         | text      | no       | Admin comments
// receipt_id          | text      | no       | Generated receipt ID (format: SB_YEARLY_XXXXXX)
// receipt_generated_at| text      | no       | Timestamp when receipt was generated
// receipt_data        | json      | no       | Full receipt data as JSON
// created             | autodate  | yes      | Auto-set on creation
// updated             | autodate  | yes      | Auto-updated on changes
//
// RECEIPT ID FORMAT:
// ==================
// Format: SB_{BILLING_CYCLE}_{RANDOM_6_DIGITS}
// Examples:
//   - SB_YEARLY_123456 (for yearly subscriptions)
//   - SB_MONTHLY_789012 (for monthly subscriptions)
//   - SB_CUSTOM_345678 (for custom billing cycles)
//
// RECEIPT GENERATION FLOW:
// ========================
// 1. Hook triggers on subscription creation or status update to 'active'
// 2. Validates subscription status is 'active' (approved)
// 3. Retrieves user information from 'user' relation field
// 4. Fallback to 'user_id' text field if relation fails
// 5. Fetches user record to get email and name
// 6. Generates unique receipt ID based on billing_cycle
// 7. Creates receipt data object with all subscription details
// 8. Updates subscription record with:
//    - receipt_id: Generated receipt ID
//    - receipt_generated_at: Current timestamp
//    - receipt_data: Full receipt data as JSON
// 9. Logs all operations for debugging
//
// QUERYING SUBSCRIPTIONS:
// =======================
// By user relation:
//   $app.findRecordsByFilter('subscriptions', 'user = "USER_ID"')
//
// By status:
//   $app.findRecordsByFilter('subscriptions', 'status = "active"')
//
// By user AND status:
//   $app.findRecordsByFilter('subscriptions', 'user = "USER_ID" && status = "active"')
//
// EXAMPLE GANESH SUBSCRIPTION:
// ============================
// User: ganesh2100@gmail.com
// Plan: Premium
// Amount: 10.00 €
// Billing Cycle: Yearly
// Status: active (approved)
// Start Date: 2025-04-30
// End Date: 2026-04-30
// Receipt ID: SB_YEARLY_XXXXXX (auto-generated)
//
// DEBUGGING:
// ==========
// Check PocketBase logs for:
// - [subscription-receipt-generation] messages for receipt generation
// - [subscription-diagnostic] messages for query diagnostics
// - Verify user relation vs user_id field is being used correctly
// - Confirm receipt_id format matches expected pattern
// - Verify receipt_generated_at timestamp is set

// This is a documentation hook - no actual code execution
// All receipt generation logic is in subscription-receipt-generation.pb.js