// ===============================================================================
// mirror-pooja-booking.pb.js - H7 PocketBase -> PostgreSQL booking mirror hook
//
// Forwards every successful pooja_bookings create/update to the Express API
// internal mirror endpoint (POST /internal/booking-mirror/pooja-booking).
//
// Guarantees:
//   - NEVER throws: a mirror failure cannot roll back / fail the user's booking.
//   - Synchronous $http.send with a short timeout (JSVM has no true async here).
//   - Small bounded retry (2 attempts) - no queueing framework.
//   - Idempotency is guaranteed on the API side (upsert keyed on the PB booking id),
//     so retries can never produce duplicate PG bookings or temple accounts.
//   - No secrets are logged.
//
// WARNING - PB 0.38 JSVM constraint (proven empirically in this build):
//   Hook callbacks do NOT see top-level functions/consts/`globalThis` from the same
//   .pb.js file - every cross-reference throws "<name> is not defined" at runtime.
//   Even passing a top-level function by name to onRecordAfterCreateSuccess fails.
//   Only PB-injected globals ($os, $http, $app, JSON, Date, ...) are visible inside a
//   callback, so ALL logic must be physically inlined inside the callback body.
//   (Consequence: pre-existing hooks that call top-level helpers - e.g. auto-archive
//   and the receipt-generation hooks - are broken at runtime in this PB build.)
//
// Env (loaded from apps/pocketbase/.env at startup, or process environment):
//   BOOKING_MIRROR_SECRET  - shared secret (must match apps/api/.env)
//   BOOKING_MIRROR_API_URL - Express API base URL (default http://localhost:3001)
// ===============================================================================

onRecordAfterCreateSuccess((e) => {
  try {
    var record = e.record;
    var MIRROR_PATH = "/internal/booking-mirror/pooja-booking";
    var API_BASE = $os.getenv("BOOKING_MIRROR_API_URL") || "http://localhost:3001";
    var MIRROR_SECRET = $os.getenv("BOOKING_MIRROR_SECRET");

    if (!MIRROR_SECRET) {
      console.log("[mirror-pooja-booking] BOOKING_MIRROR_SECRET not set; skipping mirror for " + record.id);
    } else {
      var bookId = record.id || "";
      var userId = record.get("user") || null;
      var poojaId = record.get("pooja") || null;
      var payload = {
        id: bookId,
        user: userId,
        pooja: poojaId,
        name: record.get("name"),
        email: record.get("email"),
        user_contact: record.get("user_contact"),
        donation_amount: record.get("donation_amount"),
        fee_amount: record.get("fee_amount"),
        status: record.get("status"),
        payment_status: record.get("payment_status"),
        pooja_date: record.get("pooja_date"),
        booking_date: record.get("booking_date"),
        booking_time: record.get("booking_time"),
        time_slot: record.get("time_slot"),
        transaction_id: record.get("transaction_id"),
        receipt_id: record.get("receipt_id"),
        receipt_number: record.get("receipt_number"),
        receipt_pdf: Array.isArray(record.get("receipt_pdf")) ? record.get("receipt_pdf")[0] : record.get("receipt_pdf"),
        receipt_created_at: record.get("receipt_created_at"),
        receipt_sent_at: record.get("receipt_sent_at"),
        resend_receipt: record.get("resend_receipt"),
        pooja_name: record.get("pooja_name"),
        is_deleted: record.get("is_deleted"),
        created: record.get("created"),
        updated: record.get("updated"),
      };

      if (!bookId || !userId || !poojaId || !payload.email || !payload.status) {
        console.log("[mirror-pooja-booking] skipping mirror for " + bookId + ": incomplete booking payload");
      } else {
        var lastError = null;
        var attempts = 0;
        var maxAttempts = 2;

        while (attempts < maxAttempts) {
          attempts++;
          try {
            var response = $http.send({
              url: API_BASE + MIRROR_PATH,
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Booking-Mirror-Secret": MIRROR_SECRET,
              },
              body: JSON.stringify(payload),
              timeout: 4,
            });

            if (response && response.statusCode >= 200 && response.statusCode < 300) {
              console.log("[mirror-pooja-booking] mirrored " + bookId + " -> API " + response.statusCode);
              lastError = null;
              break;
            }

            lastError = "http " + (response ? response.statusCode : "no-response");
            console.log("[mirror-pooja-booking] attempt " + attempts + " failed for " + bookId + ": " + lastError);
          } catch (err) {
            lastError = err && err.message ? err.message : String(err);
            console.log("[mirror-pooja-booking] attempt " + attempts + " errored for " + bookId + ": " + lastError);
          }
        }

        if (lastError) {
          console.log("[mirror-pooja-booking] mirror FAILED for " + bookId + " after " + maxAttempts + " attempts: " + lastError);
        }
      }
    }
  } catch (err) {
    console.log("[mirror-pooja-booking] create handler error: " + (err && err.message ? err.message : String(err)));
  }

  e.next();
}, "pooja_bookings");

onRecordAfterUpdateSuccess((e) => {
  try {
    var record = e.record;
    var MIRROR_PATH = "/internal/booking-mirror/pooja-booking";
    var API_BASE = $os.getenv("BOOKING_MIRROR_API_URL") || "http://localhost:3001";
    var MIRROR_SECRET = $os.getenv("BOOKING_MIRROR_SECRET");

    if (!MIRROR_SECRET) {
      console.log("[mirror-pooja-booking] BOOKING_MIRROR_SECRET not set; skipping mirror for " + record.id);
    } else {
      var bookId = record.id || "";
      var userId = record.get("user") || null;
      var poojaId = record.get("pooja") || null;
      var payload = {
        id: bookId,
        user: userId,
        pooja: poojaId,
        name: record.get("name"),
        email: record.get("email"),
        user_contact: record.get("user_contact"),
        donation_amount: record.get("donation_amount"),
        fee_amount: record.get("fee_amount"),
        status: record.get("status"),
        payment_status: record.get("payment_status"),
        pooja_date: record.get("pooja_date"),
        booking_date: record.get("booking_date"),
        booking_time: record.get("booking_time"),
        time_slot: record.get("time_slot"),
        transaction_id: record.get("transaction_id"),
        receipt_id: record.get("receipt_id"),
        receipt_number: record.get("receipt_number"),
        receipt_pdf: Array.isArray(record.get("receipt_pdf")) ? record.get("receipt_pdf")[0] : record.get("receipt_pdf"),
        receipt_created_at: record.get("receipt_created_at"),
        receipt_sent_at: record.get("receipt_sent_at"),
        resend_receipt: record.get("resend_receipt"),
        pooja_name: record.get("pooja_name"),
        is_deleted: record.get("is_deleted"),
        created: record.get("created"),
        updated: record.get("updated"),
      };

      if (!bookId || !userId || !poojaId || !payload.email || !payload.status) {
        console.log("[mirror-pooja-booking] skipping mirror for " + bookId + ": incomplete booking payload");
      } else {
        var lastError = null;
        var attempts = 0;
        var maxAttempts = 2;

        while (attempts < maxAttempts) {
          attempts++;
          try {
            var response = $http.send({
              url: API_BASE + MIRROR_PATH,
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Booking-Mirror-Secret": MIRROR_SECRET,
              },
              body: JSON.stringify(payload),
              timeout: 4,
            });

            if (response && response.statusCode >= 200 && response.statusCode < 300) {
              console.log("[mirror-pooja-booking] mirrored " + bookId + " -> API " + response.statusCode);
              lastError = null;
              break;
            }

            lastError = "http " + (response ? response.statusCode : "no-response");
            console.log("[mirror-pooja-booking] attempt " + attempts + " failed for " + bookId + ": " + lastError);
          } catch (err) {
            lastError = err && err.message ? err.message : String(err);
            console.log("[mirror-pooja-booking] attempt " + attempts + " errored for " + bookId + ": " + lastError);
          }
        }

        if (lastError) {
          console.log("[mirror-pooja-booking] mirror FAILED for " + bookId + " after " + maxAttempts + " attempts: " + lastError);
        }
      }
    }
  } catch (err) {
    console.log("[mirror-pooja-booking] update handler error: " + (err && err.message ? err.message : String(err)));
  }

  e.next();
}, "pooja_bookings");
