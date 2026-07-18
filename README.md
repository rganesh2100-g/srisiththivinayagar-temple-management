
```
Vinayagar site
├─ .nvmrc
├─ .version
├─ AGENTS.md
├─ apps
│  ├─ api
│  │  ├─ docs
│  │  │  └─ POCKETBASE_HOOKS_SETUP.md
│  │  ├─ eslint.config.mjs
│  │  ├─ package.json
│  │  ├─ PDF_ATTACHMENT_VERIFICATION.txt
│  │  ├─ POOJA_RECEIPT_VERIFICATION.txt
│  │  └─ src
│  │     ├─ api
│  │     │  └─ integrated-ai.js
│  │     ├─ constants
│  │     │  ├─ common.js
│  │     │  └─ prompts.js
│  │     ├─ main.js
│  │     ├─ middleware
│  │     │  ├─ auth.js
│  │     │  ├─ error.js
│  │     │  ├─ file-upload.js
│  │     │  ├─ global-rate-limit.js
│  │     │  ├─ index.js
│  │     │  ├─ integrated-ai-rate-limit.js
│  │     │  ├─ pocketbase-auth.js
│  │     │  └─ temple-transparency-auth.js
│  │     ├─ routes
│  │     │  ├─ account-types.js
│  │     │  ├─ admin-payments.js
│  │     │  ├─ admin-subscriptions.js
│  │     │  ├─ bank-account-config.js
│  │     │  ├─ bookingMessages.js
│  │     │  ├─ diagnostic.js
│  │     │  ├─ donations.js
│  │     │  ├─ expenses.js
│  │     │  ├─ health-check.js
│  │     │  ├─ index.js
│  │     │  ├─ integrated-ai.js
│  │     │  ├─ oauth.js
│  │     │  ├─ pendingSubscriptions.js
│  │     │  ├─ poojaBooking.js
│  │     │  ├─ poojas.js
│  │     │  ├─ receipts-generator.js
│  │     │  ├─ receipts.js
│  │     │  ├─ signup.js
│  │     │  ├─ softDeleteDonations.js
│  │     │  ├─ subscription.js
│  │     │  ├─ subscriptionReceipt.js
│  │     │  ├─ subscriptions-free.js
│  │     │  ├─ subscriptions-premium.js
│  │     │  ├─ subscriptions-user.js
│  │     │  ├─ subscriptions.js
│  │     │  ├─ temple-accounts.js
│  │     │  ├─ templeAccounts.js
│  │     │  ├─ templeAccountsExport.js
│  │     │  ├─ templeAccountsReport.js
│  │     │  ├─ templeReports.js
│  │     │  ├─ testEmail.js
│  │     │  └─ users.js
│  │     └─ utils
│  │        ├─ adminUserSetup.js
│  │        ├─ autoArchivePoojas.js
│  │        ├─ emailReceiptService.js
│  │        ├─ emailService.js
│  │        ├─ emailTemplates.js
│  │        ├─ logger.js
│  │        ├─ paymentReceivedEmailService.js
│  │        ├─ pdfReceiptGenerator.js
│  │        ├─ pocketbaseClient.js
│  │        ├─ pocketbaseEmailHelper.js
│  │        ├─ receiptGenerator.js
│  │        └─ receiptIdGenerator.js
│  ├─ pocketbase
│  │  ├─ .pocketbase-version
│  │  ├─ CHANGELOG.md
│  │  ├─ database-types.d.ts
│  │  ├─ LICENSE.md
│  │  ├─ package.json
│  │  ├─ pb_hooks
│  │  │  ├─ auto-archive-expired-poojas.pb.js
│  │  │  ├─ booking-approval-notification.pb.js
│  │  │  ├─ booking-message-admin-notification.pb.js
│  │  │  ├─ booking-message-notification.pb.js
│  │  │  ├─ builder-mailer.pb.js
│  │  │  ├─ contact-inquiry-notification.pb.js
│  │  │  ├─ custom-migrations-cmd.pb.js
│  │  │  ├─ debug-subscription-creation.pb.js
│  │  │  ├─ diagnostic-payments-schema.pb.js
│  │  │  ├─ diagnostic-queries.pb.js
│  │  │  ├─ diagnostic-subscriptions-analysis.pb.js
│  │  │  ├─ diagnostic-subscriptions-schema.pb.js
│  │  │  ├─ donation-confirmation-email.pb.js
│  │  │  ├─ donation-receipt-email.pb.js
│  │  │  ├─ donation-receipt-generation.pb.js
│  │  │  ├─ donation-temple-accounts.pb.js
│  │  │  ├─ external-dashboard.pb.js
│  │  │  ├─ fix_relational_fields_migration.pb.js
│  │  │  ├─ generate-subscription-receipt.pb.js
│  │  │  ├─ migration_summary.pb.js
│  │  │  ├─ payment-confirmation-email.pb.js
│  │  │  ├─ payment-notification.pb.js
│  │  │  ├─ payment-receipt-generation.pb.js
│  │  │  ├─ payments-auto-upgrade-to-premium.pb.js
│  │  │  ├─ pooja-booking-approval.pb.js
│  │  │  ├─ pooja-booking-confirmation-email.pb.js
│  │  │  ├─ pooja-booking-receipt-generation.pb.js
│  │  │  ├─ pooja-booking-temple-accounts.pb.js
│  │  │  ├─ populate_pooja_name.pb.js
│  │  │  ├─ resend-receipt-donation.pb.js
│  │  │  ├─ resend-receipt-email.pb.js
│  │  │  ├─ resend-receipt-payment.pb.js
│  │  │  ├─ resend-receipt-pooja.pb.js
│  │  │  ├─ set-default-approval-status.pb.js
│  │  │  ├─ subscription-approval-auto-update.pb.js
│  │  │  ├─ subscription-approved.pb.js
│  │  │  ├─ subscription-auto-downgrade.pb.js
│  │  │  ├─ subscription-auto-update-membership.pb.js
│  │  │  ├─ subscription-create-fixed.pb.js
│  │  │  ├─ subscription-created.pb.js
│  │  │  ├─ subscription-diagnostic-query.pb.js
│  │  │  ├─ subscription-expiry-reminder.pb.js
│  │  │  ├─ subscription-payment-completed.pb.js
│  │  │  ├─ subscription-payment-reminder.pb.js
│  │  │  ├─ subscription-receipt-documentation.pb.js
│  │  │  ├─ subscription-receipt-generation.pb.js
│  │  │  ├─ subscription-receipt-generator.pb.js
│  │  │  ├─ subscription-rejected.pb.js
│  │  │  ├─ subscriptions-auto-dates.pb.js
│  │  │  └─ users-set-default-account-type.pb.js
│  │  ├─ pb_migrations
│  │  │  ├─ 1759383931_initial_app_settings.js
│  │  │  ├─ 1764579159_create_superuser.js
│  │  │  ├─ 1769159103_disable_auth_alert_superusers.js
│  │  │  ├─ 1769164585_set_rate_limits.js
│  │  │  ├─ 1774197591_001_created_transactions.js
│  │  │  ├─ 1774197593_001_created_gallery.js
│  │  │  ├─ 1774197594_001_created_poojas.js
│  │  │  ├─ 1774197596_001_created_bookings.js
│  │  │  ├─ 1774197597_002_add_membershipTier_to_users.js
│  │  │  ├─ 1774197599_002_add_joinDate_to_users.js
│  │  │  ├─ 1774197600_002_add_phone_to_users.js
│  │  │  ├─ 1774197602_002_add_address_to_users.js
│  │  │  ├─ 1774378654_001_configure_oauth_google_for_users.js
│  │  │  ├─ 1774457617_002_add_preferred_language_to_users.js
│  │  │  ├─ 1774613137_002_add_fontSizePreference_to_users.js
│  │  │  ├─ 1774618476_001_add_role_to_users.js
│  │  │  ├─ 1774618478_002_created_poojas.js
│  │  │  ├─ 1774618480_002_created_pooja_bookings.js
│  │  │  ├─ 1774618481_002_created_donations.js
│  │  │  ├─ 1774618484_002_created_festivals.js
│  │  │  ├─ 1774618485_002_created_volunteer_participation.js
│  │  │  ├─ 1774618486_002_created_admin_messages.js
│  │  │  ├─ 1774618488_002_created_user_preferences.js
│  │  │  ├─ 1774619061_001_add_membership_type_to_users.js
│  │  │  ├─ 1774619063_001_created_expenses.js
│  │  │  ├─ 1774619065_001_created_membership_fees.js
│  │  │  ├─ 1774619066_002_add_fee_amount_to_pooja_bookings.js
│  │  │  ├─ 1774619068_002_add_approval_date_to_donations.js
│  │  │  ├─ 1774619070_002_add_notification_preference_to_user_preferences.js
│  │  │  ├─ 1774630340_001_created_premium_upgrade_requests.js
│  │  │  ├─ 1774699873_001_created_subscriptions.js
│  │  │  ├─ 1774699875_001_created_temple_accounts.js
│  │  │  ├─ 1774717362_002_update_rules_for_poojas.js
│  │  │  ├─ 1774717364_002_add_category_to_poojas.js
│  │  │  ├─ 1774717365_002_add_available_dates_to_poojas.js
│  │  │  ├─ 1774717367_002_add_time_slots_to_poojas.js
│  │  │  ├─ 1774717369_002_add_donation_amount_to_poojas.js
│  │  │  ├─ 1774717512_002_update_rules_for_poojas.js
│  │  │  ├─ 1774717513_002_add_pooja_date_to_pooja_bookings.js
│  │  │  ├─ 1774717515_002_add_time_slot_to_pooja_bookings.js
│  │  │  ├─ 1774717517_002_add_name_to_pooja_bookings.js
│  │  │  ├─ 1774717518_002_add_email_to_pooja_bookings.js
│  │  │  ├─ 1774717520_002_add_phone_to_pooja_bookings.js
│  │  │  ├─ 1774717521_002_add_donation_amount_to_pooja_bookings.js
│  │  │  ├─ 1774717523_002_update_status_in_pooja_bookings.js
│  │  │  ├─ 1774717526_002_update_rules_for_pooja_bookings.js
│  │  │  ├─ 1774718654_002_add_status_to_poojas.js
│  │  │  ├─ 1774722602_001_add_festival_to_poojas.js
│  │  │  ├─ 1774722603_002_created_bookings.js
│  │  │  ├─ 1774723591_002_add_availabilityType_to_poojas.js
│  │  │  ├─ 1774723592_002_add_specificDates_to_poojas.js
│  │  │  ├─ 1774723594_002_add_specificDays_to_poojas.js
│  │  │  ├─ 1774723596_002_add_timeSlots_to_poojas.js
│  │  │  ├─ 1774723598_002_add_selectedDate_to_bookings.js
│  │  │  ├─ 1774723599_002_add_selectedTimeSlot_to_bookings.js
│  │  │  ├─ 1774723601_002_add_bookingStatus_to_bookings.js
│  │  │  ├─ 1774763216_002_add_isArchived_to_poojas.js
│  │  │  ├─ 1774763218_002_add_archivedAt_to_poojas.js
│  │  │  ├─ 1774767403_002_add_booking_time_to_pooja_bookings.js
│  │  │  ├─ 1774767405_002_add_updated_at_to_pooja_bookings.js
│  │  │  ├─ 1774767406_002_rename_phone_to_user_contact_in_pooja_bookings.js
│  │  │  ├─ 1774767408_002_rename_status_to_booking_status_in_pooja_bookings.js
│  │  │  ├─ 1774767409_003_update_booking_status_in_pooja_bookings.js
│  │  │  ├─ 1774767411_004_update_rules_for_pooja_bookings.js
│  │  │  ├─ 1774767627_002_add_status_to_pooja_bookings.js
│  │  │  ├─ 1774768485_001_created_booking_messages.js
│  │  │  ├─ 1774768487_002_add_transaction_id_to_pooja_bookings.js
│  │  │  ├─ 1774768488_003_update_status_in_pooja_bookings.js
│  │  │  ├─ 1774778965_001_created_donations.js
│  │  │  ├─ 1774779435_002_update_user_id_in_donations.js
│  │  │  ├─ 1774779436_002_update_donation_date_in_donations.js
│  │  │  ├─ 1774779438_002_update_rules_for_donations.js
│  │  │  ├─ 1774779936_002_add_annadhanam_amount_to_temple_accounts.js
│  │  │  ├─ 1774779938_002_add_temple_maintenance_amount_to_temple_accounts.js
│  │  │  ├─ 1774779940_002_add_goshala_amount_to_temple_accounts.js
│  │  │  ├─ 1774779941_002_add_veda_pathshala_amount_to_temple_accounts.js
│  │  │  ├─ 1774779943_002_add_general_fund_amount_to_temple_accounts.js
│  │  │  ├─ 1774779945_002_add_total_amount_to_temple_accounts.js
│  │  │  ├─ 1774779946_002_update_month_in_temple_accounts.js
│  │  │  ├─ 1774779948_002_update_year_in_temple_accounts.js
│  │  │  ├─ 1774779950_002_add_special_occasion_to_donations.js
│  │  │  ├─ 1774779951_002_update_status_in_donations.js
│  │  │  ├─ 1774781039_002_add_pooja_services_amount_to_temple_accounts.js
│  │  │  ├─ 1774792070_001_created_subscription_reminders.js
│  │  │  ├─ 1774828800_create_integrated_ai_messages.js
│  │  │  ├─ 1774828801_create_integrated_ai_images.js
│  │  │  ├─ 1774828802_enable_batch_api.js
│  │  │  ├─ 1775201121_002_add_date_to_poojas.js
│  │  │  ├─ 1775201123_002_add_time_slot_to_poojas.js
│  │  │  ├─ 1775201124_002_add_booking_status_to_poojas.js
│  │  │  ├─ 1775201126_002_add_pooja_id_to_pooja_bookings.js
│  │  │  ├─ 1775201127_003_update_rules_for_poojas.js
│  │  │  ├─ 1775206872_001_created_pooja_archive.js
│  │  │  ├─ 1775206874_002_add_god_to_poojas.js
│  │  │  ├─ 1775206876_002_add_pooja_name_to_poojas.js
│  │  │  ├─ 1775206877_002_add_dates_to_poojas.js
│  │  │  ├─ 1775206879_002_add_days_to_poojas.js
│  │  │  ├─ 1775206881_002_add_time_slots_to_poojas.js
│  │  │  ├─ 1775206883_002_update_category_in_poojas.js
│  │  │  ├─ 1775206885_002_update_donation_amount_in_poojas.js
│  │  │  ├─ 1775206886_002_update_status_in_poojas.js
│  │  │  ├─ 1775206888_003_update_rules_for_poojas.js
│  │  │  ├─ 1775206890_004_add_pooja_id_to_pooja_bookings.js
│  │  │  ├─ 1775207084_001_created_poojas.js
│  │  │  ├─ 1775207087_001_created_pooja_bookings.js
│  │  │  ├─ 1775207093_001_created_pooja_archive.js
│  │  │  ├─ 1775208670_001_remove_booking_status_from_poojas.js
│  │  │  ├─ 1775208672_002_remove_date_from_poojas.js
│  │  │  ├─ 1775208674_003_remove_time_slot_from_poojas.js
│  │  │  ├─ 1775208675_004_remove_pooja_name_from_poojas.js
│  │  │  ├─ 1775208677_005_update_name_in_poojas.js
│  │  │  ├─ 1775208679_006_update_god_in_poojas.js
│  │  │  ├─ 1775208681_007_update_category_in_poojas.js
│  │  │  ├─ 1775208682_008_update_donation_amount_in_poojas.js
│  │  │  ├─ 1775208684_009_update_status_in_poojas.js
│  │  │  ├─ 1775208686_010_update_rules_for_poojas.js
│  │  │  ├─ 1775218002_001_created_payment_accounts.js
│  │  │  ├─ 1775220351_001_update_status_in_poojas.js
│  │  │  ├─ 1775220352_002_update_rules_for_poojas.js
│  │  │  ├─ 1775225460_002_update_rules_for_poojas.js
│  │  │  ├─ 1775227098_002_update_rules_for_pooja_bookings.js
│  │  │  ├─ 1775228278_001_add_is_deleted_to_pooja_bookings.js
│  │  │  ├─ 1775228280_001_add_is_deleted_to_donations.js
│  │  │  ├─ 1775228282_001_add_is_deleted_to_festivals.js
│  │  │  ├─ 1775228283_001_add_is_deleted_to_poojas.js
│  │  │  ├─ 1775237524_001_created_notifications.js
│  │  │  ├─ 1775237526_001_created_accounts_ledger.js
│  │  │  ├─ 1775237528_002_add_receipt_id_to_pooja_bookings.js
│  │  │  ├─ 1775237529_002_add_receipt_pdf_to_pooja_bookings.js
│  │  │  ├─ 1775237531_002_add_receipt_created_at_to_pooja_bookings.js
│  │  │  ├─ 1775237533_002_add_receipt_id_to_donations.js
│  │  │  ├─ 1775237535_002_add_receipt_pdf_to_donations.js
│  │  │  ├─ 1775237541_002_add_receipt_created_at_to_donations.js
│  │  │  ├─ 1775382060_002_add_pooja_name_to_pooja_bookings.js
│  │  │  ├─ 1775390737_002_add_receipt_id_to_donations.js
│  │  │  ├─ 1775390738_002_add_receipt_generated_date_to_donations.js
│  │  │  ├─ 1775409476_002_add_classification_to_temple_accounts.js
│  │  │  ├─ 1775409478_002_add_description_to_temple_accounts.js
│  │  │  ├─ 1775409480_002_add_transaction_id_to_temple_accounts.js
│  │  │  ├─ 1775409482_002_add_status_to_temple_accounts.js
│  │  │  ├─ 1775409484_002_add_notes_to_temple_accounts.js
│  │  │  ├─ 1775409509_004_update_rules_for_temple_accounts.js
│  │  │  ├─ 1775491364_001_created_contact_inquiries.js
│  │  │  ├─ 1775498412_001_created_subscription_approval_logs.js
│  │  │  ├─ 1775499191_002_add_entry_type_to_temple_accounts.js
│  │  │  ├─ 1775499193_002_add_subscription_type_to_temple_accounts.js
│  │  │  ├─ 1775500120_003_add_transactionId_to_subscriptions.js
│  │  │  ├─ 1775500122_003_add_receipt_id_to_subscriptions.js
│  │  │  ├─ 1775580651_001_created_subscriptions.js
│  │  │  ├─ 1775580654_001_created_transactions.js
│  │  │  ├─ 1775580658_001_created_subscription_comments.js
│  │  │  ├─ 1775580661_001_created_subscription_email_logs.js
│  │  │  ├─ 1775580703_001_deleted_transactions.js
│  │  │  ├─ 1775580865_001_created_subscription_comments.js
│  │  │  ├─ 1775580867_001_created_payment_records.js
│  │  │  ├─ 1775580877_002_update_indexes_for_payment_records.js
│  │  │  ├─ 1775581034_002_add_admin_notes_to_subscriptions.js
│  │  │  ├─ 1775666952_001_created_transactions.js
│  │  │  ├─ 1775709407_disable_auth_alert_users.js
│  │  │  ├─ 1775870519_002_add_order_to_gallery.js
│  │  │  ├─ 1775870521_003_update_rules_for_gallery.js
│  │  │  ├─ 1775878065_001_created_photo_categories.js
│  │  │  ├─ 1775878067_002_add_category_id_to_gallery.js
│  │  │  ├─ 1775878069_002_add_is_published_to_gallery.js
│  │  │  ├─ 1775878071_002_add_archived_to_gallery.js
│  │  │  ├─ 1775878072_002_add_storage_size_to_gallery.js
│  │  │  ├─ 1775878074_003_update_rules_for_gallery.js
│  │  │  ├─ 1775883704_002_update_image_in_gallery.js
│  │  │  ├─ 1775885080_002_add_default_expanded_to_photo_categories.js
│  │  │  ├─ 1775886161_002_add_is_published_to_photo_categories.js
│  │  │  ├─ 1775898944_001_created_expense_categories.js
│  │  │  ├─ 1775898945_002_created_expenses.js
│  │  │  ├─ 1775899543_002_add_quantity_to_expenses.js
│  │  │  ├─ 1775899992_002_add_category_id_to_expenses.js
│  │  │  ├─ 1775900000_004_update_indexes_for_expenses.js
│  │  │  ├─ 1775912293_002_add_bill_file_to_expenses.js
│  │  │  ├─ 1775914043_001_created_classifications.js
│  │  │  ├─ 1775914045_001_created_vouchers.js
│  │  │  ├─ 1775914047_002_add_classification_to_expenses.js
│  │  │  ├─ 1775914049_002_add_voucher_id_to_expenses.js
│  │  │  ├─ 1775914540_002_add_status_to_vouchers.js
│  │  │  ├─ 1775923862_002_add_paid_to_to_expenses.js
│  │  │  ├─ 1775924256_002_add_description_to_expenses.js
│  │  │  ├─ 1775924258_002_add_payment_method_to_expenses.js
│  │  │  ├─ 1775985679_002_add_published_to_poojas.js
│  │  │  ├─ 1776015876_002_add_iban_to_payment_accounts.js
│  │  │  ├─ 1776022300_002_add_payment_link_to_payment_accounts.js
│  │  │  ├─ 1776023514_001_update_rules_for_transactions.js
│  │  │  ├─ 1776082204_001_created_renewals.js
│  │  │  ├─ 1776082207_002_add_approval_status_to_users.js
│  │  │  ├─ 1776082210_002_add_subscription_expiry_date_to_users.js
│  │  │  ├─ 1776082212_002_add_last_renewal_date_to_users.js
│  │  │  ├─ 1776094637_001_remove_image_url_from_festivals.js
│  │  │  ├─ 1776094640_002_add_image_to_festivals.js
│  │  │  ├─ 1776098458_002_update_rules_for_subscriptions.js
│  │  │  ├─ 1776151401_002_add_membership_type_to_premium_upgrade_requests.js
│  │  │  ├─ 1776151403_003_update_rules_for_premium_upgrade_requests.js
│  │  │  ├─ 1776154502_002_add_transaction_reference_to_subscriptions.js
│  │  │  ├─ 1776154504_002_add_payment_status_to_subscriptions.js
│  │  │  ├─ 1776154506_002_add_created_at_to_subscriptions.js
│  │  │  ├─ 1776154542_003_remove_membership_type_from_subscriptions.js
│  │  │  ├─ 1776154546_004_add_membership_type_to_subscriptions.js
│  │  │  ├─ 1776156666_002_add_subscription_status_to_users.js
│  │  │  ├─ 1776159777_001_update_rules_for_subscriptions.js
│  │  │  ├─ 1776159779_002_add_user_id_to_payment_records.js
│  │  │  ├─ 1776159803_004_update_rules_for_payment_records.js
│  │  │  ├─ 1776160011_001_update_rules_for_subscriptions.js
│  │  │  ├─ 1776160050_001_update_rules_for_payment_records.js
│  │  │  ├─ 1776166714_002_remove_transactionId_from_subscriptions.js
│  │  │  ├─ 1776166716_002_remove_category_from_subscriptions.js
│  │  │  ├─ 1776166718_002_remove_receipt_id_from_subscriptions.js
│  │  │  ├─ 1776166720_002_remove_admin_notes_from_subscriptions.js
│  │  │  ├─ 1776166722_002_remove_transaction_reference_from_subscriptions.js
│  │  │  ├─ 1776166724_002_remove_payment_status_from_subscriptions.js
│  │  │  ├─ 1776166726_002_remove_created_at_from_subscriptions.js
│  │  │  ├─ 1776166728_002_remove_membership_type_from_subscriptions.js
│  │  │  ├─ 1776166731_002_update_amount_in_payment_records.js
│  │  │  ├─ 1776166733_002_update_user_email_in_payment_records.js
│  │  │  ├─ 1776166735_003_update_rules_for_subscriptions.js
│  │  │  ├─ 1776166737_003_update_rules_for_payment_records.js
│  │  │  ├─ 1776172069_002_update_subscription_type_in_subscriptions.js
│  │  │  ├─ 1776172071_002_update_amount_in_subscriptions.js
│  │  │  ├─ 1776172073_002_update_status_in_subscriptions.js
│  │  │  ├─ 1776172076_002_update_rules_for_subscriptions.js
│  │  │  ├─ 1776172078_002_add_transaction_id_to_subscriptions.js
│  │  │  ├─ 1776172081_002_add_created_date_to_subscriptions.js
│  │  │  ├─ 1776172083_002_add_expiry_date_to_subscriptions.js
│  │  │  ├─ 1776172086_002_add_premium_status_to_users.js
│  │  │  ├─ 1776173001_001_created_subscriptions.js
│  │  │  ├─ 1776173908_001_deleted_subscriptions.js
│  │  │  ├─ 1776173910_002_created_subscriptions.js
│  │  │  ├─ 1776175014_002_add_user_id_to_users.js
│  │  │  ├─ 1776175191_002_add_username_to_users.js
│  │  │  ├─ 1776175194_002_update_membership_type_in_users.js
│  │  │  ├─ 1776176030_001_remove_username_from_users.js
│  │  │  ├─ 1776176142_002_remove_user_id_from_users.js
│  │  │  ├─ 1776183877_002_add_membership_to_users.js
│  │  │  ├─ 1776183880_002_add_user_role_to_users.js
│  │  │  ├─ 1776183882_002_add_blocked_to_users.js
│  │  │  ├─ 1776183884_002_add_archived_to_users.js
│  │  │  ├─ 1776183886_003_add_membership_type_to_subscriptions.js
│  │  │  ├─ 1776183889_003_add_transaction_reference_to_subscriptions.js
│  │  │  ├─ 1776183894_003_add_payment_status_to_subscriptions.js
│  │  │  ├─ 1776183897_003_add_approval_date_to_subscriptions.js
│  │  │  ├─ 1776183899_003_add_expiry_date_to_subscriptions.js
│  │  │  ├─ 1776183901_003_add_rejection_reason_to_subscriptions.js
│  │  │  ├─ 1776183903_003_add_created_at_to_subscriptions.js
│  │  │  ├─ 1776183905_003_add_updated_at_to_subscriptions.js
│  │  │  ├─ 1776183907_004_update_rules_for_subscriptions.js
│  │  │  ├─ 1776219060_002_update_status_in_subscriptions.js
│  │  │  ├─ 1776359220_001_created_receipts.js
│  │  │  ├─ 1776359223_001_created_messages.js
│  │  │  ├─ 1776359225_001_created_notifications.js
│  │  │  ├─ 1776359228_002_add_next_renewal_date_to_subscriptions.js
│  │  │  ├─ 1776359230_002_add_approval_status_to_subscriptions.js
│  │  │  ├─ 1776359232_002_add_receipt_id_to_subscriptions.js
│  │  │  ├─ 1776359235_002_add_renewal_count_to_subscriptions.js
│  │  │  ├─ 1776359237_002_add_is_blocked_to_users.js
│  │  │  ├─ 1776359239_002_add_is_deleted_to_users.js
│  │  │  ├─ 1776359241_002_add_deleted_at_to_users.js
│  │  │  ├─ 1776359244_002_add_blocked_at_to_users.js
│  │  │  ├─ 1776359246_002_update_indexes_for_receipts.js
│  │  │  ├─ 1776359364_002_add_payment_status_to_subscriptions.js
│  │  │  ├─ 1776359691_002_update_rules_for_subscriptions.js
│  │  │  ├─ 1776359741_002_add_created_at_to_subscriptions.js
│  │  │  ├─ 1776446081_001_update_rules_for_subscriptions.js
│  │  │  ├─ 1776447399_002_update_rules_for_users.js
│  │  │  ├─ 1776447401_003_add_full_name_to_users.js
│  │  │  ├─ 1776447413_005_update_membership_type_in_users.js
│  │  │  ├─ 1776447416_006_update_indexes_for_users.js
│  │  │  ├─ 1776447420_007_update_rules_for_subscriptions.js
│  │  │  ├─ 1776447422_008_update_status_in_subscriptions.js
│  │  │  ├─ 1776447424_009_update_indexes_for_subscriptions.js
│  │  │  ├─ 1776447436_010_update_approval_status_in_users.js
│  │  │  ├─ 1776448223_002_update_rules_for_subscriptions.js
│  │  │  ├─ 1776448225_002_add_email_to_subscriptions.js
│  │  │  ├─ 1776496364_002_add_notes_to_subscriptions.js
│  │  │  ├─ 1776496825_001_deleted_subscriptions.js
│  │  │  ├─ 1776496828_002_created_subscriptions.js
│  │  │  ├─ 1776496830_004_add_full_name_to_users.js
│  │  │  ├─ 1776496833_005_update_membership_type_in_users.js
│  │  │  ├─ 1776496835_006_update_approval_status_in_users.js
│  │  │  ├─ 1776496837_007_update_rules_for_users.js
│  │  │  ├─ 1776497406_002_update_rules_for_subscriptions.js
│  │  │  ├─ 1776497419_003_update_user_id_in_subscriptions.js
│  │  │  ├─ 1776497432_004_update_indexes_for_users.js
│  │  │  ├─ 1776497728_002_update_rules_for_subscriptions.js
│  │  │  ├─ 1776571755_002_created_approval_logs.js
│  │  │  ├─ 1776575248_001_update_rules_for_subscriptions.js
│  │  │  ├─ 1776583707_002_update_rules_for_subscriptions.js
│  │  │  ├─ 1776583952_002_update_rules_for_subscriptions.js
│  │  │  ├─ 1776584134_001_update_rules_for_users.js
│  │  │  ├─ 1776584136_002_update_rules_for_subscriptions.js
│  │  │  ├─ 1776584141_003_update_user_id_in_subscriptions.js
│  │  │  ├─ 1776592641_001_update_rules_for_subscriptions.js
│  │  │  ├─ 1776593118_001_update_rules_for_subscriptions.js
│  │  │  ├─ 1776593329_002_update_rules_for_subscriptions.js
│  │  │  ├─ 1776593703_002_update_rules_for_subscriptions.js
│  │  │  ├─ 1776595420_002_update_rules_for_subscriptions.js
│  │  │  ├─ 1776595500_002_update_rules_for_subscriptions.js
│  │  │  ├─ 1776595511_003_update_indexes_for_subscriptions.js
│  │  │  ├─ 1776596281_001_update_rules_for_subscriptions.js
│  │  │  ├─ 1776598367_002_add_contact_number_to_subscriptions.js
│  │  │  ├─ 1776598369_002_add_membershipTier_to_subscriptions.js
│  │  │  ├─ 1776598372_002_add_premiumPlan_to_subscriptions.js
│  │  │  ├─ 1776598374_003_update_rules_for_subscriptions.js
│  │  │  ├─ 1776599000_002_update_rules_for_subscriptions.js
│  │  │  ├─ 1776600085_001_update_rules_for_subscriptions.js
│  │  │  ├─ 1776602048_001_created_pending_subscriptions.js
│  │  │  ├─ 1776603830_002_update_rules_for_pending_subscriptions.js
│  │  │  ├─ 1776620112_002_add_status_to_pending_subscriptions.js
│  │  │  ├─ 1776620122_004_update_rules_for_pending_subscriptions.js
│  │  │  ├─ 1776620866_001_update_role_in_users.js
│  │  │  ├─ 1776937013_002_update_rules_for_subscriptions.js
│  │  │  ├─ 1776939240_002_created_subscriptions.js
│  │  │  ├─ 1776939267_001_remove_subscription_id_from_approval_logs.js
│  │  │  ├─ 1776939269_002_deleted_subscriptions.js
│  │  │  ├─ 1776939271_003_created_subscriptions.js
│  │  │  ├─ 1776939480_001_update_membership_type_in_subscriptions.js
│  │  │  ├─ 1776939483_001_update_approval_status_in_subscriptions.js
│  │  │  ├─ 1776939486_002_update_rules_for_subscriptions.js
│  │  │  ├─ 1776939592_001_remove_membership_type_from_subscriptions.js
│  │  │  ├─ 1776939594_001_remove_approval_status_from_subscriptions.js
│  │  │  ├─ 1776939597_002_add_membership_type_to_subscriptions.js
│  │  │  ├─ 1776939599_002_add_approval_status_to_subscriptions.js
│  │  │  ├─ 1776940075_001_deleted_subscriptions.js
│  │  │  ├─ 1776940077_002_created_subscriptions.js
│  │  │  ├─ 1776943003_001_created_account_types.js
│  │  │  ├─ 1776943005_002_add_account_type_to_users.js
│  │  │  ├─ 1776943008_002_add_account_type_status_to_users.js
│  │  │  ├─ 1776947402_001_add_user_to_subscriptions.js
│  │  │  ├─ 1776947404_001_add_membership_type_to_subscriptions.js
│  │  │  ├─ 1776947407_001_add_amount_to_subscriptions.js
│  │  │  ├─ 1776947409_001_add_transaction_id_to_subscriptions.js
│  │  │  ├─ 1776947411_001_add_transaction_ref_to_subscriptions.js
│  │  │  ├─ 1776947414_001_add_start_date_to_subscriptions.js
│  │  │  ├─ 1776947416_001_add_end_date_to_subscriptions.js
│  │  │  ├─ 1776947419_001_add_approval_status_to_subscriptions.js
│  │  │  ├─ 1776955140_001_created_page_access.js
│  │  │  ├─ 1776972546_002_update_membership_type_in_subscriptions.js
│  │  │  ├─ 1776972548_003_rename_membership_type_to_plan_type_in_subscriptions.js
│  │  │  ├─ 1776972551_004_rename_approval_status_to_status_in_subscriptions.js
│  │  │  ├─ 1776972557_005_add_billing_cycle_to_subscriptions.js
│  │  │  ├─ 1776972563_006_add_custom_donation_to_subscriptions.js
│  │  │  ├─ 1776972565_007_add_total_amount_to_subscriptions.js
│  │  │  ├─ 1776972567_008_add_admin_notes_to_subscriptions.js
│  │  │  ├─ 1776972606_009_update_rules_for_subscriptions.js
│  │  │  ├─ 1776974261_001_created_bank_account_config.js
│  │  │  ├─ 1777101268_002_add_subscription_type_to_payment_records.js
│  │  │  ├─ 1777101271_002_add_payment_method_to_payment_records.js
│  │  │  ├─ 1777101273_002_add_notes_to_payment_records.js
│  │  │  ├─ 1777101276_002_add_created_at_to_payment_records.js
│  │  │  ├─ 1777101278_002_add_updated_at_to_payment_records.js
│  │  │  ├─ 1777101280_003_update_status_in_payment_records.js
│  │  │  ├─ 1777101282_004_update_rules_for_payment_records.js
│  │  │  ├─ 1777101382_002_add_approval_date_to_payment_records.js
│  │  │  ├─ 1777101384_002_add_approved_by_to_payment_records.js
│  │  │  ├─ 1777101387_003_update_rules_for_payment_records.js
│  │  │  ├─ 1777101460_003_add_user_id_to_payment_records.js
│  │  │  ├─ 1777101463_004_remove_status_from_payment_records.js
│  │  │  ├─ 1777101465_005_add_status_to_payment_records.js
│  │  │  ├─ 1777101467_006_update_transaction_id_in_payment_records.js
│  │  │  ├─ 1777101469_006_update_subscription_type_in_payment_records.js
│  │  │  ├─ 1777101472_006_update_amount_in_payment_records.js
│  │  │  ├─ 1777101474_006_update_payment_method_in_payment_records.js
│  │  │  ├─ 1777101476_006_update_user_email_in_payment_records.js
│  │  │  ├─ 1777101478_007_update_rules_for_payment_records.js
│  │  │  ├─ 1777101491_008_update_rules_for_payment_records.js
│  │  │  ├─ 1777102000_002_add_start_date_to_payment_records.js
│  │  │  ├─ 1777102003_002_add_end_date_to_payment_records.js
│  │  │  ├─ 1777103812_002_add_full_name_to_payment_records.js
│  │  │  ├─ 1777103815_002_add_email_to_payment_records.js
│  │  │  ├─ 1777103817_002_add_contact_number_to_payment_records.js
│  │  │  ├─ 1777103820_002_add_address_to_payment_records.js
│  │  │  ├─ 1777103822_002_add_communication_preference_to_payment_records.js
│  │  │  ├─ 1777103825_002_add_transaction_reference_to_payment_records.js
│  │  │  ├─ 1777109970_001_deleted_payment_records.js
│  │  │  ├─ 1777109972_002_created_payments.js
│  │  │  ├─ 1777110058_001_update_rules_for_payments.js
│  │  │  ├─ 1777121046_001_created_pages.js
│  │  │  ├─ 1777121048_002_created_page_access.js
│  │  │  ├─ 1777128329_002_add_email_to_payments.js
│  │  │  ├─ 1777133261_002_rename_sender_id_to_sender_email_in_booking_messages.js
│  │  │  ├─ 1777133330_002_rename_user_id_to_email_in_premium_upgrade_requests.js
│  │  │  ├─ 1777133333_002_rename_user_id_to_email_in_subscription_reminders.js
│  │  │  ├─ 1777133367_003_update_rules_for_booking_messages.js
│  │  │  ├─ 1777133370_003_update_rules_for_premium_upgrade_requests.js
│  │  │  ├─ 1777133372_003_update_rules_for_subscription_reminders.js
│  │  │  ├─ 1777133407_003_update_rules_for_pooja_bookings.js
│  │  │  ├─ 1777133499_003_update_rules_for_pending_subscriptions.js
│  │  │  ├─ 1777133631_002_update_account_type_in_users.js
│  │  │  ├─ 1777133634_002_add_fullName_to_users.js
│  │  │  ├─ 1777180733_003_add_user_id_to_subscriptions.js
│  │  │  ├─ 1777180746_001_update_rules_for_subscriptions.js
│  │  │  ├─ 1777180748_002_remove_user_from_subscriptions.js
│  │  │  ├─ 1777181048_002_add_user_to_subscriptions.js
│  │  │  ├─ 1777184411_002_update_rules_for_subscriptions.js
│  │  │  ├─ 1777184413_002_update_plan_type_in_subscriptions.js
│  │  │  ├─ 1777184416_002_update_status_in_subscriptions.js
│  │  │  ├─ 1777197975_001_deleted_page_access.js
│  │  │  ├─ 1777199085_002_update_subscription_status_in_users.js
│  │  │  ├─ 1777200758_002_update_rules_for_payments.js
│  │  │  ├─ 1777570576_002_add_receipt_pdf_to_payments.js
│  │  │  ├─ 1777570579_002_add_receipt_id_to_payments.js
│  │  │  ├─ 1777570581_002_add_receipt_generated_at_to_payments.js
│  │  │  ├─ 1777571642_002_add_receipt_pdf_to_payments.js
│  │  │  ├─ 1777571645_002_add_receipt_id_to_payments.js
│  │  │  ├─ 1777571647_002_add_receipt_generated_at_to_payments.js
│  │  │  ├─ 1777596270_002_add_receipt_pdf_to_payments.js
│  │  │  ├─ 1777596273_002_add_receipt_id_to_payments.js
│  │  │  ├─ 1777596276_002_add_receipt_generated_at_to_payments.js
│  │  │  ├─ 1777597321_002_update_rules_for_receipts.js
│  │  │  ├─ 1777597323_003_add_payment_to_receipts.js
│  │  │  ├─ 1777597326_004_add_receipts_to_payments.js
│  │  │  ├─ 1777597352_005_update_indexes_for_receipts.js
│  │  │  ├─ 1777597434_002_add_receipt_pdf_to_receipts.js
│  │  │  ├─ 1777807633_002_add_receipt_pdf_to_pooja_bookings.js
│  │  │  ├─ 1777807636_002_add_receipt_number_to_pooja_bookings.js
│  │  │  ├─ 1777807638_002_add_receipt_sent_at_to_pooja_bookings.js
│  │  │  ├─ 1777807641_002_add_resend_receipt_to_pooja_bookings.js
│  │  │  ├─ 1777807644_002_add_receipt_pdf_to_donations.js
│  │  │  ├─ 1777807646_002_add_receipt_number_to_donations.js
│  │  │  ├─ 1777807649_002_add_receipt_sent_at_to_donations.js
│  │  │  ├─ 1777807651_002_add_resend_receipt_to_donations.js
│  │  │  ├─ 1777807654_002_add_receipt_pdf_to_payments.js
│  │  │  ├─ 1777807656_002_add_receipt_number_to_payments.js
│  │  │  ├─ 1777807659_002_add_receipt_sent_at_to_payments.js
│  │  │  ├─ 1777807662_002_add_resend_receipt_to_payments.js
│  │  │  ├─ 1777815441_001_created_page_access.js
│  │  │  ├─ 1777820721_001_created_user_account_assignments.js
│  │  │  ├─ 1778923981_001_remove_user_id_from_pooja_bookings.js
│  │  │  ├─ 1778923985_001_remove_pooja_id_from_pooja_bookings.js
│  │  │  ├─ 1778924002_001_add_user_to_pooja_bookings.js
│  │  │  ├─ 1778924005_001_add_pooja_to_pooja_bookings.js
│  │  │  ├─ 1778924008_001_add_user_to_donations.js
│  │  │  ├─ 1778924011_001_add_user_to_pending_subscriptions.js
│  │  │  ├─ 1778924014_001_add_subscription_to_pending_subscriptions.js
│  │  │  ├─ 1778924022_002_update_rules_for_pooja_bookings.js
│  │  │  ├─ 1778924025_002_update_rules_for_donations.js
│  │  │  ├─ 1778924028_002_update_rules_for_pending_subscriptions.js
│  │  │  ├─ 1778924044_003_remove_user_id_from_donations.js
│  │  │  ├─ 1778924047_003_remove_user_id_from_pending_subscriptions.js
│  │  │  ├─ 1778924979_002_add_image_to_poojas.js
│  │  │  ├─ 1778924982_002_add_price_to_poojas.js
│  │  │  ├─ 1778924985_002_add_priest_name_to_poojas.js
│  │  │  ├─ 1778924988_002_add_location_to_poojas.js
│  │  │  ├─ 1778924990_002_update_duration_in_poojas.js
│  │  │  ├─ 1778924993_002_add_payment_status_to_pooja_bookings.js
│  │  │  ├─ 1778924996_002_add_payment_status_to_donations.js
│  │  │  ├─ 1778924999_002_add_donation_description_to_donations.js
│  │  │  ├─ 1778925001_002_add_payment_status_to_pending_subscriptions.js
│  │  │  ├─ 1778925004_002_add_start_date_to_pending_subscriptions.js
│  │  │  ├─ 1778925007_002_add_end_date_to_pending_subscriptions.js
│  │  │  ├─ 1778925010_002_add_renewal_date_to_pending_subscriptions.js
│  │  │  ├─ 1778925013_002_add_description_to_subscriptions.js
│  │  │  ├─ 1778925015_002_add_duration_months_to_subscriptions.js
│  │  │  ├─ 1778925018_002_add_renewal_type_to_subscriptions.js
│  │  │  ├─ 1778925021_002_add_city_to_users.js
│  │  │  ├─ 1778925024_002_add_state_to_users.js
│  │  │  ├─ 1778925026_002_add_pincode_to_users.js
│  │  │  ├─ 1778925038_003_update_status_in_pooja_bookings.js
│  │  │  ├─ 1778925041_003_update_status_in_donations.js
│  │  │  ├─ 1778925044_003_update_status_in_pending_subscriptions.js
│  │  │  ├─ 1778925202_002_update_name_in_poojas.js
│  │  │  ├─ 1778925206_002_update_description_in_poojas.js
│  │  │  ├─ 1778925209_002_update_price_in_poojas.js
│  │  │  ├─ 1778925212_002_update_duration_in_poojas.js
│  │  │  ├─ 1778925216_002_update_priest_name_in_poojas.js
│  │  │  ├─ 1778925219_002_update_location_in_poojas.js
│  │  │  ├─ 1778925222_002_update_image_in_poojas.js
│  │  │  ├─ 1778925225_002_update_availabilityType_in_poojas.js
│  │  │  ├─ 1778925229_002_update_specificDates_in_poojas.js
│  │  │  ├─ 1778925232_002_update_specificDays_in_poojas.js
│  │  │  ├─ 1778925235_002_update_timeSlots_in_poojas.js
│  │  │  ├─ 1778925238_002_update_user_in_pooja_bookings.js
│  │  │  ├─ 1778925242_002_update_pooja_in_pooja_bookings.js
│  │  │  ├─ 1778925245_002_update_booking_date_in_pooja_bookings.js
│  │  │  ├─ 1778925248_002_update_time_slot_in_pooja_bookings.js
│  │  │  ├─ 1778925251_002_update_status_in_pooja_bookings.js
│  │  │  ├─ 1778925254_002_update_payment_status_in_pooja_bookings.js
│  │  │  ├─ 1778925258_002_update_donation_amount_in_pooja_bookings.js
│  │  │  ├─ 1778925261_002_update_name_in_pooja_bookings.js
│  │  │  ├─ 1778925264_002_update_email_in_pooja_bookings.js
│  │  │  ├─ 1778925268_002_update_user_contact_in_pooja_bookings.js
│  │  │  ├─ 1778925271_002_update_user_in_donations.js
│  │  │  ├─ 1778925275_002_update_amount_in_donations.js
│  │  │  ├─ 1778925278_002_update_donation_description_in_donations.js
│  │  │  ├─ 1778925281_002_update_status_in_donations.js
│  │  │  ├─ 1778925285_002_update_payment_status_in_donations.js
│  │  │  ├─ 1778925288_002_update_category_in_donations.js
│  │  │  ├─ 1778925291_002_update_user_in_pending_subscriptions.js
│  │  │  ├─ 1778925295_002_update_subscription_in_pending_subscriptions.js
│  │  │  ├─ 1778925298_002_update_start_date_in_pending_subscriptions.js
│  │  │  ├─ 1778925301_002_update_end_date_in_pending_subscriptions.js
│  │  │  ├─ 1778925305_002_update_renewal_date_in_pending_subscriptions.js
│  │  │  ├─ 1778925308_002_update_status_in_pending_subscriptions.js
│  │  │  ├─ 1778925312_002_update_payment_status_in_pending_subscriptions.js
│  │  │  ├─ 1778925315_002_update_plan_type_in_subscriptions.js
│  │  │  ├─ 1778925318_002_update_amount_in_subscriptions.js
│  │  │  ├─ 1778925322_002_update_duration_months_in_subscriptions.js
│  │  │  ├─ 1778925325_002_update_renewal_type_in_subscriptions.js
│  │  │  ├─ 1778925329_002_update_status_in_subscriptions.js
│  │  │  ├─ 1778925332_002_update_user_in_subscriptions.js
│  │  │  ├─ 1778925335_002_update_start_date_in_subscriptions.js
│  │  │  ├─ 1778925338_002_update_end_date_in_subscriptions.js
│  │  │  ├─ 1778925342_002_update_billing_cycle_in_subscriptions.js
│  │  │  ├─ 1778925345_002_update_email_in_users.js
│  │  │  ├─ 1778925348_002_update_password_in_users.js
│  │  │  ├─ 1778925352_002_update_name_in_users.js
│  │  │  ├─ 1778925356_002_update_phone_in_users.js
│  │  │  ├─ 1778925359_002_update_address_in_users.js
│  │  │  ├─ 1778925363_002_update_city_in_users.js
│  │  │  ├─ 1778925366_002_update_state_in_users.js
│  │  │  ├─ 1778925369_002_update_pincode_in_users.js
│  │  │  ├─ 1778925373_003_update_indexes_for_poojas.js
│  │  │  ├─ 1778925376_003_update_indexes_for_pooja_bookings.js
│  │  │  ├─ 1778925379_003_update_indexes_for_donations.js
│  │  │  ├─ 1778925383_003_update_indexes_for_pending_subscriptions.js
│  │  │  ├─ 1778925386_003_update_indexes_for_subscriptions.js
│  │  │  ├─ 1778925398_003_update_indexes_for_users.js
│  │  │  ├─ 1778934142_002_update_priest_name_in_poojas.js
│  │  │  ├─ 1778934145_002_update_description_in_poojas.js
│  │  │  ├─ 1778934147_002_update_location_in_poojas.js
│  │  │  ├─ 1779014615_002_remove_priest_name_from_poojas.js
│  │  │  ├─ 1779014619_002_remove_location_from_poojas.js
│  │  │  ├─ 1779014624_002_remove_image_from_poojas.js
│  │  │  ├─ 1779015409_002_add_is_archived_to_poojas.js
│  │  │  └─ 1779016927_002_update_transaction_id_in_pooja_bookings.js
│  │  └─ scripts
│  │     └─ setup.sh
│  └─ web
│     ├─ components.json
│     ├─ eslint.config.mjs
│     ├─ index.html
│     ├─ jsconfig.json
│     ├─ package.json
│     ├─ plugins
│     │  ├─ selection-mode
│     │  │  ├─ selection-mode-script.js
│     │  │  └─ vite-plugin-selection-mode.js
│     │  ├─ utils
│     │  │  └─ ast-utils.js
│     │  ├─ visual-editor
│     │  │  ├─ edit-mode-script.js
│     │  │  ├─ visual-editor-config.js
│     │  │  ├─ vite-plugin-edit-mode.js
│     │  │  └─ vite-plugin-react-inline-editor.js
│     │  ├─ vite-plugin-iframe-route-restoration.js
│     │  └─ vite-plugin-pocketbase-auth.js
│     ├─ postcss.config.js
│     ├─ public
│     │  ├─ .htaccess
│     │  ├─ manifest.json
│     │  └─ service-worker.js
│     ├─ src
│     │  ├─ App.jsx
│     │  ├─ components
│     │  │  ├─ AccountTypeAccessMatrix.jsx
│     │  │  ├─ AccountTypeDisplay.jsx
│     │  │  ├─ AdminDonationApprovalPage.css
│     │  │  ├─ AdminDonationApprovalPage.jsx
│     │  │  ├─ AdminExpenseManagerNav.jsx
│     │  │  ├─ AdminLayout.jsx
│     │  │  ├─ AdminNav.jsx
│     │  │  ├─ AdminSubscriptionDashboard.jsx
│     │  │  ├─ ApprovalHistoryCardView.jsx
│     │  │  ├─ ApprovalHistoryFilters.jsx
│     │  │  ├─ ApprovalHistoryListView.jsx
│     │  │  ├─ ApprovalHistoryPagination.jsx
│     │  │  ├─ ApprovalHistorySearch.jsx
│     │  │  ├─ ApprovalHistorySortDropdown.jsx
│     │  │  ├─ ApprovalHistoryViewToggle.jsx
│     │  │  ├─ BookingCard.jsx
│     │  │  ├─ BookingDetailsCard.jsx
│     │  │  ├─ BookingModal.jsx
│     │  │  ├─ ContactForm.jsx
│     │  │  ├─ DashboardLayout.jsx
│     │  │  ├─ DashboardNav.jsx
│     │  │  ├─ DashboardRouter.jsx
│     │  │  ├─ DonationActivityCard.jsx
│     │  │  ├─ DonationDetailsModal.jsx
│     │  │  ├─ DonationHistorySection.jsx
│     │  │  ├─ DonationSuccessModal.jsx
│     │  │  ├─ DynamicSidebar.jsx
│     │  │  ├─ EditCategoryModal.jsx
│     │  │  ├─ EmailReportModal.css
│     │  │  ├─ EmailReportModal.jsx
│     │  │  ├─ ErrorBoundary.jsx
│     │  │  ├─ ExcelExportButton.jsx
│     │  │  ├─ ExpenseDetailModal.jsx
│     │  │  ├─ FestivalModal.jsx
│     │  │  ├─ Footer.jsx
│     │  │  ├─ GlobalOfflineBanner.jsx
│     │  │  ├─ Header.jsx
│     │  │  ├─ ImageLightbox.jsx
│     │  │  ├─ integrated-ai-chat.jsx
│     │  │  ├─ LanguageSwitcher.jsx
│     │  │  ├─ MessageInput.jsx
│     │  │  ├─ MessageModal.jsx
│     │  │  ├─ MessageThread.jsx
│     │  │  ├─ NotFoundPage.jsx
│     │  │  ├─ NotificationPreferences.jsx
│     │  │  ├─ NotificationsCenter.jsx
│     │  │  ├─ PageAccessMatrix.jsx
│     │  │  ├─ PaymentAccountDetails.jsx
│     │  │  ├─ PaymentDetailsModal.jsx
│     │  │  ├─ PoojaApprovalDetailsModal.jsx
│     │  │  ├─ PoojaApprovalQueue.jsx
│     │  │  ├─ PoojaCard.jsx
│     │  │  ├─ PoojaEntriesList.jsx
│     │  │  ├─ PoojaSlotSelector.jsx
│     │  │  ├─ PremiumActionCards.jsx
│     │  │  ├─ PremiumApprovalModal.jsx
│     │  │  ├─ PremiumPaymentModal.jsx
│     │  │  ├─ PremiumProfileSection.jsx
│     │  │  ├─ PremiumUpgradeModal.jsx
│     │  │  ├─ PremiumUpgradeSection.jsx
│     │  │  ├─ ProtectedRoute.jsx
│     │  │  ├─ PublishToggle.jsx
│     │  │  ├─ ReceiptTemplate.jsx
│     │  │  ├─ ReceiptViewer.jsx
│     │  │  ├─ RenewalApprovalModal.jsx
│     │  │  ├─ RenewalModal.jsx
│     │  │  ├─ ResendReceiptModal.jsx
│     │  │  ├─ ScrollToTop.jsx
│     │  │  ├─ Sidebar.jsx
│     │  │  ├─ SideMenu.jsx
│     │  │  ├─ SoftDeleteConfirmationDialog.jsx
│     │  │  ├─ StatCard.jsx
│     │  │  ├─ SubscriptionHistorySection.jsx
│     │  │  ├─ SubscriptionHistorySidebar.jsx
│     │  │  ├─ SubscriptionPaymentModal.jsx
│     │  │  ├─ SubscriptionStatusCard.jsx
│     │  │  ├─ TimeSlotDisplay.jsx
│     │  │  ├─ TransactionVerificationModal.jsx
│     │  │  ├─ ui
│     │  │  │  ├─ accordion.jsx
│     │  │  │  ├─ alert-dialog.jsx
│     │  │  │  ├─ alert.jsx
│     │  │  │  ├─ aspect-ratio.jsx
│     │  │  │  ├─ avatar.jsx
│     │  │  │  ├─ badge.jsx
│     │  │  │  ├─ breadcrumb.jsx
│     │  │  │  ├─ button-group.jsx
│     │  │  │  ├─ button.jsx
│     │  │  │  ├─ calendar.jsx
│     │  │  │  ├─ card.jsx
│     │  │  │  ├─ carousel.jsx
│     │  │  │  ├─ chart.jsx
│     │  │  │  ├─ checkbox.jsx
│     │  │  │  ├─ collapsible.jsx
│     │  │  │  ├─ command.jsx
│     │  │  │  ├─ context-menu.jsx
│     │  │  │  ├─ dialog.jsx
│     │  │  │  ├─ drawer.jsx
│     │  │  │  ├─ dropdown-menu.jsx
│     │  │  │  ├─ empty.jsx
│     │  │  │  ├─ field.jsx
│     │  │  │  ├─ form.jsx
│     │  │  │  ├─ hover-card.jsx
│     │  │  │  ├─ input-group.jsx
│     │  │  │  ├─ input-otp.jsx
│     │  │  │  ├─ input.jsx
│     │  │  │  ├─ item.jsx
│     │  │  │  ├─ kbd.jsx
│     │  │  │  ├─ label.jsx
│     │  │  │  ├─ menubar.jsx
│     │  │  │  ├─ navigation-menu.jsx
│     │  │  │  ├─ pagination.jsx
│     │  │  │  ├─ popover.jsx
│     │  │  │  ├─ progress.jsx
│     │  │  │  ├─ radio-group.jsx
│     │  │  │  ├─ resizable.jsx
│     │  │  │  ├─ scroll-area.jsx
│     │  │  │  ├─ select.jsx
│     │  │  │  ├─ separator.jsx
│     │  │  │  ├─ sheet.jsx
│     │  │  │  ├─ sidebar.jsx
│     │  │  │  ├─ skeleton.jsx
│     │  │  │  ├─ slider.jsx
│     │  │  │  ├─ sonner.jsx
│     │  │  │  ├─ spinner.jsx
│     │  │  │  ├─ switch.jsx
│     │  │  │  ├─ table.jsx
│     │  │  │  ├─ tabs.jsx
│     │  │  │  ├─ textarea.jsx
│     │  │  │  ├─ toast.jsx
│     │  │  │  ├─ toaster.jsx
│     │  │  │  ├─ toggle-group.jsx
│     │  │  │  ├─ toggle.jsx
│     │  │  │  └─ tooltip.jsx
│     │  │  ├─ UnifiedDashboardSidebar.jsx
│     │  │  ├─ UpgradePromptModal.jsx
│     │  │  ├─ UpgradeSuccessModal.jsx
│     │  │  ├─ UserAccountTypeManager.jsx
│     │  │  ├─ UserProfileSection.jsx
│     │  │  ├─ VideoLightbox.jsx
│     │  │  └─ WidgetCard.jsx
│     │  ├─ constants
│     │  │  └─ ErrorConstants.js
│     │  ├─ contexts
│     │  │  ├─ AccessibilityContext.jsx
│     │  │  ├─ AuthContext.jsx
│     │  │  └─ ErrorContext.jsx
│     │  ├─ hooks
│     │  │  ├─ index.js
│     │  │  ├─ use-animated-text.jsx
│     │  │  ├─ use-integrated-ai.jsx
│     │  │  ├─ use-mobile.jsx
│     │  │  ├─ use-toast.js
│     │  │  ├─ useAutoArchivePooja.js
│     │  │  ├─ useBookingForm.js
│     │  │  ├─ useLanguage.js
│     │  │  ├─ useLanguage.jsx
│     │  │  ├─ usePaymentAccount.js
│     │  │  ├─ useSubscriptionAccess.js
│     │  │  ├─ useSubscriptionData.js
│     │  │  ├─ useSubscriptionStatus.js
│     │  │  ├─ useUpgradeStatus.js
│     │  │  └─ useUserIdGenerator.js
│     │  ├─ i18n
│     │  │  ├─ config.js
│     │  │  └─ locales
│     │  │     ├─ de.json
│     │  │     ├─ en.json
│     │  │     └─ ta.json
│     │  ├─ index.css
│     │  ├─ lib
│     │  │  ├─ accessibilityUtils.js
│     │  │  ├─ adminUtils.js
│     │  │  ├─ apiServerClient.js
│     │  │  ├─ envUtils.js
│     │  │  ├─ germanTimeUtils.js
│     │  │  ├─ getNextAvailableDate.js
│     │  │  ├─ getUsersMap.js
│     │  │  ├─ integratedAiClient.js
│     │  │  ├─ logger.js
│     │  │  ├─ pbHelper.js
│     │  │  ├─ pocketbaseClient.js
│     │  │  ├─ relationshipVerification.js
│     │  │  ├─ translations.js
│     │  │  ├─ userValidation.js
│     │  │  ├─ utils.js
│     │  │  ├─ validationUtils.js
│     │  │  └─ videoUtils.js
│     │  ├─ main.jsx
│     │  ├─ pages
│     │  │  ├─ AboutPage.jsx
│     │  │  ├─ AccountTypeSettings.jsx
│     │  │  ├─ AdminAuditLogs.jsx
│     │  │  ├─ AdminDashboard.jsx
│     │  │  ├─ AdminDiagnosticPage.jsx
│     │  │  ├─ AdminDonationApprovalPage.jsx
│     │  │  ├─ AdminGalleryManagement.jsx
│     │  │  ├─ AdminMessages.jsx
│     │  │  ├─ AdminMonthlyDetailReport.jsx
│     │  │  ├─ AdminPaymentAccountPage.jsx
│     │  │  ├─ AdminPaymentsPage.jsx
│     │  │  ├─ AdminPoojaApprovals.jsx
│     │  │  ├─ AdminPoojaArchive.jsx
│     │  │  ├─ AdminPoojaCreate.jsx
│     │  │  ├─ AdminRoleManagement.jsx
│     │  │  ├─ AdminSubscriptionManagement.jsx
│     │  │  ├─ AdminSubscriptionsPage.jsx
│     │  │  ├─ AdminTempleAccounts.jsx
│     │  │  ├─ AdminTemplePaymentAccounts.jsx
│     │  │  ├─ BookingConfirmationPage.jsx
│     │  │  ├─ BookingSuccessPage.jsx
│     │  │  ├─ BookPoojaPage.jsx
│     │  │  ├─ CategoryMasterPage.jsx
│     │  │  ├─ ComingSoonAdminPooja.jsx
│     │  │  ├─ ComingSoonPooja.jsx
│     │  │  ├─ ContactPage.jsx
│     │  │  ├─ DashboardPage.jsx
│     │  │  ├─ DonationTracker.jsx
│     │  │  ├─ ExpenseManagerPage.jsx
│     │  │  ├─ FestivalManager.jsx
│     │  │  ├─ FinancialTransparency.jsx
│     │  │  ├─ FreeMemberDashboard.jsx
│     │  │  ├─ FreeMembershipPage.jsx
│     │  │  ├─ GalleryPage.jsx
│     │  │  ├─ Home.jsx
│     │  │  ├─ HomePage.jsx
│     │  │  ├─ LoginPage.jsx
│     │  │  ├─ MembershipPage.jsx
│     │  │  ├─ MembershipSelectionPage.jsx
│     │  │  ├─ MyActivity.jsx
│     │  │  ├─ MyBookingsPage.jsx
│     │  │  ├─ MyProfile.jsx
│     │  │  ├─ Notifications.jsx
│     │  │  ├─ PaymentPage.jsx
│     │  │  ├─ PaymentSubscriptionPage.jsx
│     │  │  ├─ PaymentSummaryPage.jsx
│     │  │  ├─ PoojaBookingPage.jsx
│     │  │  ├─ PoojaCheckoutPage.jsx
│     │  │  ├─ PoojaDetailPage.jsx
│     │  │  ├─ PoojaOfferingsPage.jsx
│     │  │  ├─ PoojaSchedulePage.jsx
│     │  │  ├─ PremiumDashboard.jsx
│     │  │  ├─ PremiumMemberDashboard.jsx
│     │  │  ├─ PremiumMembershipPage.jsx
│     │  │  ├─ ProfileSettings.jsx
│     │  │  ├─ RenewalPaymentPage.jsx
│     │  │  ├─ SanthaHistoryPage.jsx
│     │  │  ├─ SignupPage.jsx
│     │  │  ├─ SubscriptionPage.jsx
│     │  │  ├─ SubscriptionThankYouPage.jsx
│     │  │  ├─ TempleDonatePage.jsx
│     │  │  ├─ UpcomingFestivals.jsx
│     │  │  ├─ UpgradePaymentPage.jsx
│     │  │  ├─ UserAccountAssignmentPage.jsx
│     │  │  ├─ UserDashboard.jsx
│     │  │  ├─ UserManagement.jsx
│     │  │  ├─ UserMessagesPage.jsx
│     │  │  └─ UserPageManagement.jsx
│     │  └─ utils
│     │     ├─ apiServerClient.js
│     │     ├─ createFreeSubscription.js
│     │     ├─ poojaUtils.js
│     │     └─ toast.js
│     ├─ tailwind.config.js
│     ├─ tools
│     │  ├─ generate-llms.js
│     │  └─ install-missing-components.js
│     └─ vite.config.js
├─ docs
│  ├─ api
│  │  ├─ AUDIT_AUTH_SYSTEM.md
│  │  ├─ AUTHENTICATION_AUDIT_COMPLETE.md
│  │  ├─ AUTH_SYSTEM_VERIFICATION.md
│  │  ├─ DIAGNOSTIC_IMPLEMENTATION_SUMMARY.md
│  │  ├─ POCKETBASE_SCHEMA_VERIFICATION.md
│  │  ├─ QUICK_DIAGNOSTIC_REFERENCE.md
│  │  ├─ RECEIPT_ID_SYSTEM_IMPLEMENTATION.md
│  │  ├─ SUBSCRIPTION_CREATION_DIAGNOSTIC.md
│  │  ├─ SUBSCRIPTION_EMAIL_BEFORE_AFTER.md
│  │  ├─ SUBSCRIPTION_EMAIL_FIXES.md
│  │  ├─ SUBSCRIPTION_EMAIL_FIXES_SUMMARY.md
│  │  └─ SUBSCRIPTION_EMAIL_TESTING_GUIDE.md
│  ├─ API_ARCHITECTURE_BLUEPRINT.md
│  ├─ ARCHITECTURE_BLUEPRINT.md
│  ├─ AUDIT_REPORT.md
│  ├─ BACKEND_SERVICE_ARCHITECTURE_BLUEPRINT.md
│  ├─ DATA_ARCHITECTURE_BLUEPRINT.md
│  ├─ DEPLOYMENT_INFRASTRUCTURE_BLUEPRINT.md
│  ├─ DEVOPS_CICD_ARCHITECTURE_BLUEPRINT.md
│  ├─ FONT_AUDIT.md
│  ├─ PROJECT_SUMMARY.md
│  ├─ SECURITY_ARCHITECTURE_BLUEPRINT.md
│  └─ TESTING_QA_ARCHITECTURE_BLUEPRINT.md
├─ find_mods.js
├─ package-lock.json
├─ package.json
├─ parse_migrations.js
├─ parse_migrations2.js
├─ parse_migrations3.js
├─ parse_migrations4.js
├─ README.md
└─ SUMMARY

```