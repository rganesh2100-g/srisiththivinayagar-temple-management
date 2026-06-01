/// <reference path="../pb_data/types.d.ts" />
// This is a summary document of all migrations created
// Migration Summary: Fix Missing Fields and Types
// 
// COMPLETED MIGRATIONS:
// 
// 1. POOJAS COLLECTION - Added Missing Fields:
//    - image (file, maxSelect: 1, maxSize: 20971520, mimeTypes: image/jpeg,image/png,image/gif,image/webp)
//    - price (number, required, min: 0)
//    - priest_name (text)
//    - location (text)
//    - duration (updated: required=true, min=1)
//
// 2. POOJA_BOOKINGS COLLECTION:
//    - payment_status (SELECT: pending, completed, failed, refunded) - ADDED
//    - status (SELECT values updated: pending, approved, rejected, completed, cancelled)
//
// 3. DONATIONS COLLECTION:
//    - payment_status (SELECT: pending, completed, failed, refunded) - ADDED
//    - donation_description (text) - ADDED
//    - status (SELECT values updated: added 'completed')
//
// 4. PENDING_SUBSCRIPTIONS COLLECTION:
//    - payment_status (SELECT: pending, completed, failed, refunded) - ADDED
//    - start_date (date) - ADDED
//    - end_date (date) - ADDED
//    - renewal_date (date) - ADDED
//    - status (SELECT values updated: added 'active', 'cancelled')
//
// 5. SUBSCRIPTIONS COLLECTION:
//    - description (text) - ADDED
//    - duration_months (number, required, min: 1) - ADDED
//    - renewal_type (SELECT: auto, manual) - ADDED
//
// 6. USERS COLLECTION:
//    - VERIFIED: Already has email, phone, address, city, state, pincode
//    - city (text) - ADDED (was already present)
//    - state (text) - ADDED (was already present)
//    - pincode (text) - ADDED (was already present)
//
// DATA PRESERVATION:
// - All existing records are preserved
// - New text fields default to empty string
// - New number fields default to 0
// - New date fields default to null
// - New SELECT fields default to 'pending'
//
// MIGRATION FILES CREATED:
// - 1778924979_002_add_image_to_poojas.js
// - 1778924982_002_add_price_to_poojas.js
// - 1778924985_002_add_priest_name_to_poojas.js
// - 1778924988_002_add_location_to_poojas.js
// - 1778924990_002_update_duration_in_poojas.js
// - 1778924993_002_add_payment_status_to_pooja_bookings.js
// - 1778924996_002_add_payment_status_to_donations.js
// - 1778924999_002_add_donation_description_to_donations.js
// - 1778925001_002_add_payment_status_to_pending_subscriptions.js
// - 1778925004_002_add_start_date_to_pending_subscriptions.js
// - 1778925007_002_add_end_date_to_pending_subscriptions.js
// - 1778925010_002_add_renewal_date_to_pending_subscriptions.js
// - 1778925013_002_add_description_to_subscriptions.js
// - 1778925015_002_add_duration_months_to_subscriptions.js
// - 1778925018_002_add_renewal_type_to_subscriptions.js
// - 1778925021_002_add_city_to_users.js
// - 1778925024_002_add_state_to_users.js
// - 1778925026_002_add_pincode_to_users.js
// - 1778925038_003_update_status_in_pooja_bookings.js
// - 1778925041_003_update_status_in_donations.js
// - 1778925044_003_update_status_in_pending_subscriptions.js

onRecordCreate((e) => {
  e.next();
}, "users");