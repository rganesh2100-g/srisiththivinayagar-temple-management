// ===============================================================================
// mirror-donation.pb.js - H8 PocketBase -> PostgreSQL donation mirror hook
//
// Forwards every successful donations create/update to the Express API
// internal mirror endpoint (POST /internal/donation-mirror/donation).
//
// Registration is intentionally FIRST (aaa- prefix): a legacy after-update hook
// (donation-receipt-generation.pb.js) calls $app.save() inside onAfterUpdateSuccess,
// which triggers a nested-save failure in PB 0.38's JSVM — that abort skips any
// later-registered after-update hooks. Being registered first (plus the below
// before-update mirror) guarantees the pay load is mirrored even when a legacy
// hook throws after commit.
//
// Guarantees:
//   - NEVER throws: a mirror failure cannot roll back / fail the user's donation.
//   - Synchronous $http.send with a short timeout (JSVM has no true async here).
//   - Small bounded retry (2 attempts) - no queueing framework.
//   - Idempotency is guaranteed on the API side (upsert keyed on the PB id),
//     so retries can never produce duplicate PG donations or temple accounts.
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
    var MIRROR_PATH = "/internal/donation-mirror/donation";
    var API_BASE = $os.getenv("BOOKING_MIRROR_API_URL") || "http://localhost:3001";
    var MIRROR_SECRET = $os.getenv("BOOKING_MIRROR_SECRET");

    if (!MIRROR_SECRET) {
      console.log("[mirror-donation] BOOKING_MIRROR_SECRET not set; skipping mirror for " + record.id);
    } else {
      var dId = record.id || "";
      var userId = record.get("user") || null;
      var payload = {
        id: dId,
        user: userId,
        amount: record.get("amount"),
        donation_date: record.get("donation_date"),
        category: record.get("category"),
        status: record.get("status"),
        notes: record.get("notes"),
        approval_date: record.get("approval_date"),
        special_occasion: record.get("special_occasion"),
        is_deleted: record.get("is_deleted"),
        receipt_id: record.get("receipt_id"),
        receipt_number: record.get("receipt_number"),
        receipt_pdf: Array.isArray(record.get("receipt_pdf")) ? record.get("receipt_pdf")[0] : record.get("receipt_pdf"),
        receipt_created_at: record.get("receipt_created_at"),
        receipt_generated_date: record.get("receipt_generated_date"),
        receipt_sent_at: record.get("receipt_sent_at"),
        resend_receipt: record.get("resend_receipt"),
        payment_status: record.get("payment_status"),
        donation_description: record.get("donation_description"),
        created: record.get("created"),
        updated: record.get("updated"),
      };

      if (!dId || !userId) {
        console.log("[mirror-donation] skipping mirror for " + dId + ": missing required fields");
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
              console.log("[mirror-donation] mirrored " + dId + " -> API " + response.statusCode);
              lastError = null;
              break;
            }

            lastError = "http " + (response ? response.statusCode : "no-response");
            console.log("[mirror-donation] attempt " + attempts + " failed for " + dId + ": " + lastError);
          } catch (err) {
            lastError = err && err.message ? err.message : String(err);
            console.log("[mirror-donation] attempt " + attempts + " errored for " + dId + ": " + lastError);
          }
        }

        if (lastError) {
          console.log("[mirror-donation] mirror FAILED for " + dId + " after " + maxAttempts + " attempts: " + lastError);
        }
      }
    }
  } catch (err) {
    console.log("[mirror-donation] create handler error: " + (err && err.message ? err.message : String(err)));
  }

  e.next();
}, "donations");

onRecordAfterUpdateSuccess((e) => {
  try {
    var record = e.record;
    var MIRROR_PATH = "/internal/donation-mirror/donation";
    var API_BASE = $os.getenv("BOOKING_MIRROR_API_URL") || "http://localhost:3001";
    var MIRROR_SECRET = $os.getenv("BOOKING_MIRROR_SECRET");

    if (!MIRROR_SECRET) {
      console.log("[mirror-donation] BOOKING_MIRROR_SECRET not set; skipping mirror for " + record.id);
    } else {
      var dId = record.id || "";
      var userId = record.get("user") || null;
      var payload = {
        id: dId,
        user: userId,
        amount: record.get("amount"),
        donation_date: record.get("donation_date"),
        category: record.get("category"),
        status: record.get("status"),
        notes: record.get("notes"),
        approval_date: record.get("approval_date"),
        special_occasion: record.get("special_occasion"),
        is_deleted: record.get("is_deleted"),
        receipt_id: record.get("receipt_id"),
        receipt_number: record.get("receipt_number"),
        receipt_pdf: Array.isArray(record.get("receipt_pdf")) ? record.get("receipt_pdf")[0] : record.get("receipt_pdf"),
        receipt_created_at: record.get("receipt_created_at"),
        receipt_generated_date: record.get("receipt_generated_date"),
        receipt_sent_at: record.get("receipt_sent_at"),
        resend_receipt: record.get("resend_receipt"),
        payment_status: record.get("payment_status"),
        donation_description: record.get("donation_description"),
        created: record.get("created"),
        updated: record.get("updated"),
      };

      if (!dId || !userId) {
        console.log("[mirror-donation] skipping mirror for " + dId + ": missing required fields");
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
              console.log("[mirror-donation] mirrored " + dId + " -> API " + response.statusCode);
              lastError = null;
              break;
            }

            lastError = "http " + (response ? response.statusCode : "no-response");
            console.log("[mirror-donation] attempt " + attempts + " failed for " + dId + ": " + lastError);
          } catch (err) {
            lastError = err && err.message ? err.message : String(err);
            console.log("[mirror-donation] attempt " + attempts + " errored for " + dId + ": " + lastError);
          }
        }

        if (lastError) {
          console.log("[mirror-donation] mirror FAILED for " + dId + " after " + maxAttempts + " attempts: " + lastError);
        }
      }
    }
  } catch (err) {
    console.log("[mirror-donation] update handler error: " + (err && err.message ? err.message : String(err)));
  }

  e.next();
}, "donations");

// PRE-COMMIT update mirror: fires right before the record is persisted
// (OnRecordUpdateExecute), so it runs even when a legacy after-update hook's
// nested $app.save() aborts the after-success chain in PB 0.38's JSVM
// (record IS committed, but later-registered after-update handlers are skipped).
// Note: onRecordBeforeUpdateSuccess does NOT exist in this PB build.
// Mirrors only the mutation-critical fields (status/amount/approval) and NOT
// receipt_* fields: the legacy receipt generator sets those on a record and
// then calls $app.save() which throws in this build, so the receipt values it
// set before that save are never committed — mirroring them would over-state PG.
onRecordUpdateExecute((e) => {
  try {
    var record = e.record;
    var MIRROR_PATH = "/internal/donation-mirror/donation";
    var API_BASE = $os.getenv("BOOKING_MIRROR_API_URL") || "http://localhost:3001";
    var MIRROR_SECRET = $os.getenv("BOOKING_MIRROR_SECRET");

    if (!MIRROR_SECRET) {
      console.log("[mirror-donation-pre] BOOKING_MIRROR_SECRET not set; skipping mirror for " + record.id);
    } else {
      var dId = record.id || "";
      var userId = record.get("user") || null;
      var payload = {
        id: dId,
        user: userId,
        amount: record.get("amount"),
        donation_date: record.get("donation_date"),
        category: record.get("category"),
        status: record.get("status"),
        notes: record.get("notes"),
        approval_date: record.get("approval_date"),
        special_occasion: record.get("special_occasion"),
        is_deleted: record.get("is_deleted"),
        payment_status: record.get("payment_status"),
        donation_description: record.get("donation_description"),
      };

      if (!dId || !userId) {
        console.log("[mirror-donation-pre] skipping mirror for " + dId + ": missing required fields");
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
              console.log("[mirror-donation-pre] mirrored " + dId + " status=" + payload.status + " -> API " + response.statusCode);
              lastError = null;
              break;
            }

            lastError = "http " + (response ? response.statusCode : "no-response");
            console.log("[mirror-donation-pre] attempt " + attempts + " failed for " + dId + ": " + lastError);
          } catch (err) {
            lastError = err && err.message ? err.message : String(err);
            console.log("[mirror-donation-pre] attempt " + attempts + " errored for " + dId + ": " + lastError);
          }
        }

        if (lastError) {
          console.log("[mirror-donation-pre] mirror FAILED for " + dId + " after " + maxAttempts + " attempts: " + lastError);
        }
      }
    }
  } catch (err) {
    console.log("[mirror-donation-pre] update handler error: " + (err && err.message ? err.message : String(err)));
  }

  e.next();
}, "donations");