# Complete Receipt ID System Overhaul - Implementation Summary

## Overview

This document describes the complete receipt ID system overhaul that has been implemented across the API. The system ensures that each receipt gets a unique ID that is generated ONCE and never regenerated.

## Architecture

### Receipt ID Format

Three types of receipt IDs are generated with different prefixes:

1. **Donation Receipts**: `DONATION_{timestamp}_{random6digits}`
   - Example: `DONATION_1712275200_482916`
   - Used for donation approvals

2. **Pooja Booking Receipts**: `POOJA_{timestamp}_{random6digits}`
   - Example: `POOJA_1712275200_482916`
   - Used for pooja booking confirmations

3. **Premium Subscription Receipts**: `PS_{timestamp}_{random6digits}`
   - Example: `PS_1712275200_482916`
   - Used for premium subscription approvals

## Key Principles

1. **Generate Once**: Receipt ID is generated exactly once during approval/confirmation
2. **Store Immediately**: Receipt ID is stored in the database immediately after generation
3. **Never Regenerate**: The same stored ID is used for all subsequent operations
4. **Unique Prefixes**: Each transaction type has a unique prefix
5. **Timestamp + Random**: Combination ensures uniqueness

## Files Created

### 1. Receipt ID Generator

**File**: `apps/api/src/utils/receiptIdGenerator.js`

Provides three functions for generating unique receipt IDs:
- `generateDonationReceiptId()` - Returns DONATION_{timestamp}_{random}
- `generatePoojaReceiptId()` - Returns POOJA_{timestamp}_{random}
- `generatePremiumSubscriptionReceiptId()` - Returns PS_{timestamp}_{random}

## Files Updated

### 1. Donations Route

**File**: `apps/api/src/routes/donations.js`

Updates:
- POST /donations/approve - Generates and stores receipt ID, generates PDF, sends email
- GET /receipts/donations/:donationId/generate-receipt - Downloads receipt using stored ID
- POST /donations/:donationId/resend-receipt - Resends receipt using stored ID

### 2. Pooja Booking Route

**File**: `apps/api/src/routes/poojaBooking.js`

Updates:
- POST /pooja-bookings/send-confirmation - Generates and stores receipt ID, generates PDF, sends email
- POST /pooja-bookings/:id/resend-receipt - Resends receipt using stored ID

### 3. Email Receipt Service

**File**: `apps/api/src/utils/emailReceiptService.js`

Updates:
- `sendDonationReceiptEmail(donationData, pdfBuffer, receiptId)` - Accepts pre-generated PDF and receipt ID
- `sendPoojaReceiptEmail(poojaData, pdfBuffer, receiptId)` - Accepts pre-generated PDF and receipt ID

## Critical Implementation Details

### Receipt ID Generation (ONCE)

```javascript
const receiptId = generateDonationReceiptId();
// Returns: "DONATION_1712275200_482916"
```

### Receipt ID Storage

```javascript
await pb.collection('donations').update(donationId, {
  receipt_id: receiptId,
  receipt_generated_date: receiptGeneratedDate,
  status: 'approved',
});
```

### PDF Generation with Stored ID

```javascript
const pdfBuffer = await generateDonationReceiptPDF(donationData, receiptId);
// Uses the STORED receipt_id, never generates a new one
```

### Email Sending with Stored ID

```javascript
await sendDonationReceiptEmail(donationData, pdfBuffer, receiptId);
// Receives pre-generated PDF and stored receipt_id
```

## Logging

Comprehensive logging is implemented at every step:

- Receipt ID generation logs the ID, timestamp, and random component
- Database updates log the stored receipt ID
- PDF generation logs the receipt ID being used
- Email sending logs the receipt ID in subject and body
- All errors are logged with full context

## Error Handling

All errors are thrown (not caught) to bubble up to the error middleware:

- Missing or invalid receipt ID
- Missing or invalid PDF buffer
- Missing or invalid email
- Database update failures
- PDF generation failures
- Email sending failures

## API Endpoints

### Donation Endpoints

1. **POST /donations/approve**
   - Generates receipt ID
   - Stores in database
   - Generates PDF
   - Sends email
   - Returns receipt_id

2. **GET /receipts/donations/:donationId/generate-receipt**
   - Uses stored receipt_id
   - Generates PDF
   - Returns PDF file

3. **POST /donations/:donationId/resend-receipt**
   - Uses stored receipt_id
   - Generates PDF
   - Sends email

### Pooja Booking Endpoints

1. **POST /pooja-bookings/send-confirmation**
   - Generates receipt ID
   - Stores in database
   - Generates PDF
   - Sends email
   - Returns receipt_id

2. **POST /pooja-bookings/:id/resend-receipt**
   - Uses stored receipt_id
   - Generates PDF
   - Sends email

## Database Requirements

### Donations Collection
- `receipt_id` (text) - Unique receipt ID
- `receipt_generated_date` (text) - Generation date (YYYY-MM-DD)
- `status` (select) - Must support 'approved'

### Pooja Bookings Collection
- `receipt_id` (text) - Unique receipt ID
- `receipt_generated_date` (text) - Generation date (YYYY-MM-DD)
- `status` (select) - Must support 'Confirmed'

## Status

✅ **IMPLEMENTATION COMPLETE**

All files have been created and updated with:
- Unique receipt ID generation
- One-time generation and permanent storage
- Comprehensive logging
- Proper error handling
- Clean separation of concerns
- No duplicate or regenerated receipt IDs