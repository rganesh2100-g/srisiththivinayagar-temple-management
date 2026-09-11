// ===============================================================================
// mirror-payment.pb.js - H8 PocketBase -> PostgreSQL payment mirror hook
//
// Forwards every successful payments create/update to the Express API
// internal mirror endpoint (POST /internal/payment-mirror/payment).
//
// Guarantees:
//   - NEVER throws: a mirror failure cannot roll back / fail the user's payment.
//   - Synchronous $http.send with a short timeout (JSVM has no true async here).
//   - Small bounded retry (2 attempts) - no queueing framework.
//   - Idempotency is guaranteed on the API side (upsert keyed on the PB id),
//     so retries can never produce duplicate PG payments or temple accounts.
//   - No secrets are logged.
//
// WARNING - PB 0.38 JSVM constraint (proven empirically in this build):
//   Hook callbacks do NOT see top-level functions/consts/`globalThis` from the same
//   .pb.js file - every cross-reference throws "<name> is not defined" at runtime.
//   All logic must be physically inlined inside the callback body.
//
// Env (loaded from apps/pocketbase/.env at startup, or process environment):
//   BOOKING_MIRROR_SECRET  - shared secret (must match apps/api/.env)
//   BOOKING_MIRROR_API_URL - Express API base URL (default http://localhost:3001)
// ===============================================================================

onRecordAfterCreateSuccess((e) => {
  try {
    var record = e.record;
    var MIRROR_PATH = "/internal/payment-mirror/payment";
    var API_BASE = $os.getenv("BOOKING_MIRROR_API_URL") || "http://localhost:3001";
    var MIRROR_SECRET = $os.getenv("BOOKING_MIRROR_SECRET");

    if (!MIRROR_SECRET) {
      console.log("[mirror-payment] BOOKING_MIRROR_SECRET not set; skipping mirror for " + record.id);
    } else {
      var pId = record.id || "";
      var userId = record.get("user") || null;
      var payload = {
        id: pId,
        user: userId,
        amount: record.get("amount"),
        plan_type: record.get("plan_type"),
        status: record.get("status"),
        transaction_id: record.get("transaction_id"),
        transaction_ref: record.get("transaction_ref"),
        billing_cycle: record.get("billing_cycle"),
        custom_donation: record.get("custom_donation"),
        total_amount: record.get("total_amount"),
        start_date: record.get("start_date"),
        end_date: record.get("end_date"),
        admin_notes: record.get("admin_notes"),
        approved_by: record.get("approved_by") || null,
        approved_at: record.get("approved_at"),
        email: record.get("email"),
        receipt_id: record.get("receipt_id"),
        receipt_number: record.get("receipt_number"),
        receipt_pdf: Array.isArray(record.get("receipt_pdf")) ? record.get("receipt_pdf")[0] : record.get("receipt_pdf"),
        receipt_generated_at: record.get("receipt_generated_at"),
        receipt_sent_at: record.get("receipt_sent_at"),
        resend_receipt: record.get("resend_receipt"),
        created: record.get("created"),
        updated: record.get("updated"),
      };

      if (!pId || !userId) {
        console.log("[mirror-payment] skipping mirror for " + pId + ": missing required fields");
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
              console.log("[mirror-payment] mirrored " + pId + " -> API " + response.statusCode);
              lastError = null;
              break;
            }

            lastError = "http " + (response ? response.statusCode : "no-response");
            console.log("[mirror-payment] attempt " + attempts + " failed for " + pId + ": " + lastError);
          } catch (err) {
            lastError = err && err.message ? err.message : String(err);
            console.log("[mirror-payment] attempt " + attempts + " errored for " + pId + ": " + lastError);
          }
        }

        if (lastError) {
          console.log("[mirror-payment] mirror FAILED for " + pId + " after " + maxAttempts + " attempts: " + lastError);
        }
      }
    }
  } catch (err) {
    console.log("[mirror-payment] create handler error: " + (err && err.message ? err.message : String(err)));
  }

  e.next();
}, "payments");

// PRE-COMMIT update mirror: fires right before the record is persisted
// (OnRecordUpdateExecute), so it runs even when a legacy after-update hook's
// nested $app.save() aborts the after-success chain in PB 0.38's JSVM.
// Note: onRecordBeforeUpdateSuccess does NOT exist in this PB build.
onRecordUpdateExecute((e) => {
  try {
    var record = e.record;
    var MIRROR_PATH = "/internal/payment-mirror/payment";
    var API_BASE = $os.getenv("BOOKING_MIRROR_API_URL") || "http://localhost:3001";
    var MIRROR_SECRET = $os.getenv("BOOKING_MIRROR_SECRET");

    if (!MIRROR_SECRET) {
      console.log("[mirror-payment-pre] BOOKING_MIRROR_SECRET not set; skipping mirror for " + record.id);
    } else {
      var pId = record.id || "";
      var userId = record.get("user") || null;
      var payload = {
        id: pId,
        user: userId,
        amount: record.get("amount"),
        plan_type: record.get("plan_type"),
        status: record.get("status"),
        transaction_id: record.get("transaction_id"),
        transaction_ref: record.get("transaction_ref"),
        billing_cycle: record.get("billing_cycle"),
        custom_donation: record.get("custom_donation"),
        total_amount: record.get("total_amount"),
        start_date: record.get("start_date"),
        end_date: record.get("end_date"),
        email: record.get("email"),
        created: record.get("created"),
        updated: record.get("updated"),
      };

      if (!pId || !userId) {
        console.log("[mirror-payment-pre] skipping mirror for " + pId + ": missing required fields");
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
              console.log("[mirror-payment-pre] mirrored " + pId + " status=" + payload.status + " -> API " + response.statusCode);
              lastError = null;
              break;
            }

            lastError = "http " + (response ? response.statusCode : "no-response");
            console.log("[mirror-payment-pre] attempt " + attempts + " failed for " + pId + ": " + lastError);
          } catch (err) {
            lastError = err && err.message ? err.message : String(err);
            console.log("[mirror-payment-pre] attempt " + attempts + " errored for " + pId + ": " + lastError);
          }
        }

        if (lastError) {
          console.log("[mirror-payment-pre] mirror FAILED for " + pId + " after " + maxAttempts + " attempts: " + lastError);
        }
      }
    }
  } catch (err) {
    console.log("[mirror-payment-pre] update handler error: " + (err && err.message ? err.message : String(err)));
  }

  e.next();
}, "payments");

onRecordAfterUpdateSuccess((e) => {
  try {
    var record = e.record;
    var MIRROR_PATH = "/internal/payment-mirror/payment";
    var API_BASE = $os.getenv("BOOKING_MIRROR_API_URL") || "http://localhost:3001";
    var MIRROR_SECRET = $os.getenv("BOOKING_MIRROR_SECRET");

    if (!MIRROR_SECRET) {
      console.log("[mirror-payment] BOOKING_MIRROR_SECRET not set; skipping mirror for " + record.id);
    } else {
      var pId = record.id || "";
      var userId = record.get("user") || null;
      var payload = {
        id: pId,
        user: userId,
        amount: record.get("amount"),
        plan_type: record.get("plan_type"),
        status: record.get("status"),
        transaction_id: record.get("transaction_id"),
        transaction_ref: record.get("transaction_ref"),
        billing_cycle: record.get("billing_cycle"),
        custom_donation: record.get("custom_donation"),
        total_amount: record.get("total_amount"),
        start_date: record.get("start_date"),
        end_date: record.get("end_date"),
        admin_notes: record.get("admin_notes"),
        approved_by: record.get("approved_by") || null,
        approved_at: record.get("approved_at"),
        email: record.get("email"),
        receipt_id: record.get("receipt_id"),
        receipt_number: record.get("receipt_number"),
        receipt_pdf: Array.isArray(record.get("receipt_pdf")) ? record.get("receipt_pdf")[0] : record.get("receipt_pdf"),
        receipt_generated_at: record.get("receipt_generated_at"),
        receipt_sent_at: record.get("receipt_sent_at"),
        resend_receipt: record.get("resend_receipt"),
        created: record.get("created"),
        updated: record.get("updated"),
      };

      if (!pId || !userId) {
        console.log("[mirror-payment] skipping mirror for " + pId + ": missing required fields");
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
              console.log("[mirror-payment] mirrored " + pId + " -> API " + response.statusCode);
              lastError = null;
              break;
            }

            lastError = "http " + (response ? response.statusCode : "no-response");
            console.log("[mirror-payment] attempt " + attempts + " failed for " + pId + ": " + lastError);
          } catch (err) {
            lastError = err && err.message ? err.message : String(err);
            console.log("[mirror-payment] attempt " + attempts + " errored for " + pId + ": " + lastError);
          }
        }

        if (lastError) {
          console.log("[mirror-payment] mirror FAILED for " + pId + " after " + maxAttempts + " attempts: " + lastError);
        }
      }
    }
  } catch (err) {
    console.log("[mirror-payment] update handler error: " + (err && err.message ? err.message : String(err)));
  }

  e.next();
}, "payments");