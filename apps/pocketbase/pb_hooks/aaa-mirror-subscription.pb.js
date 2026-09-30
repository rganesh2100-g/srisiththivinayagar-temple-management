// ===============================================================================
// aaa-mirror-subscription.pb.js - H10 PocketBase -> PostgreSQL subscription mirror
//
// Forwards every successful subscriptions create/update to the Express API
// internal mirror endpoint (POST /internal/subscription-mirror/subscription).
//
// Guarantees:
//   - NEVER throws: a mirror failure cannot roll back / fail the user's
//     subscription submission or the admin's approval.
//   - Synchronous $http.send with a short timeout (JSVM has no true async here).
//   - Small bounded retry (2 attempts) - no queueing framework.
//   - Idempotency is guaranteed on the API side (upsert keyed on the PB id),
//     so retries can never produce duplicate PG subscriptions.
//   - No secrets are logged.
//
// Ordering note: the "aaa-" prefix makes this hook load before the other
// subscription hooks, so the mirror sees the record as the mounted admin route
// wrote it.
//
// WARNING - PB 0.38 JSVM constraint (proven empirically in this build):
//   Hook callbacks do NOT see top-level functions/consts/`globalThis` from the
//   same .pb.js file - every cross-reference throws "<name> is not defined" at
//   runtime. All logic must be physically inlined inside the callback body.
//
// Env (loaded from the process environment):
//   BOOKING_MIRROR_SECRET  - shared secret (must match apps/api/.env)
//   BOOKING_MIRROR_API_URL - Express API base URL (default http://localhost:3001)
// ===============================================================================

onRecordAfterCreateSuccess((e) => {
  try {
    var record = e.record;
    var MIRROR_PATH = "/internal/subscription-mirror/subscription";
    var API_BASE = $os.getenv("BOOKING_MIRROR_API_URL") || "http://localhost:3001";
    var MIRROR_SECRET = $os.getenv("BOOKING_MIRROR_SECRET");

    if (!MIRROR_SECRET) {
      console.log("[mirror-subscription] BOOKING_MIRROR_SECRET not set; skipping mirror for " + record.id);
    } else {
      var subId = record.id || "";
      var userId = record.get("user") || null;
      var payload = {
        id: subId,
        user: userId,
        user_id: record.get("user_id"),
        plan_type: record.get("plan_type"),
        amount: record.get("amount"),
        custom_donation: record.get("custom_donation"),
        total_amount: record.get("total_amount"),
        billing_cycle: record.get("billing_cycle"),
        duration_months: record.get("duration_months"),
        renewal_type: record.get("renewal_type"),
        start_date: record.get("start_date"),
        end_date: record.get("end_date"),
        status: record.get("status"),
        transaction_id: record.get("transaction_id"),
        transaction_ref: record.get("transaction_ref"),
        admin_notes: record.get("admin_notes"),
        description: record.get("description"),
        created: record.get("created"),
        updated: record.get("updated"),
      };

      if (!subId || !userId) {
        console.log("[mirror-subscription] skipping mirror for " + subId + ": missing required fields");
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
              console.log("[mirror-subscription] mirrored " + subId + " -> API " + response.statusCode);
              lastError = null;
              break;
            }

            lastError = "http " + (response ? response.statusCode : "no-response");
            console.log("[mirror-subscription] attempt " + attempts + " failed for " + subId + ": " + lastError);
          } catch (err) {
            lastError = err && err.message ? err.message : String(err);
            console.log("[mirror-subscription] attempt " + attempts + " errored for " + subId + ": " + lastError);
          }
        }

        if (lastError) {
          console.log("[mirror-subscription] mirror FAILED for " + subId + " after " + maxAttempts + " attempts: " + lastError);
        }
      }
    }
  } catch (err) {
    console.log("[mirror-subscription] create handler error: " + (err && err.message ? err.message : String(err)));
  }

  e.next();
}, "subscriptions");

onRecordAfterUpdateSuccess((e) => {
  try {
    var record = e.record;
    var MIRROR_PATH = "/internal/subscription-mirror/subscription";
    var API_BASE = $os.getenv("BOOKING_MIRROR_API_URL") || "http://localhost:3001";
    var MIRROR_SECRET = $os.getenv("BOOKING_MIRROR_SECRET");

    if (!MIRROR_SECRET) {
      console.log("[mirror-subscription] BOOKING_MIRROR_SECRET not set; skipping mirror for " + record.id);
    } else {
      var subId = record.id || "";
      var userId = record.get("user") || null;
      var payload = {
        id: subId,
        user: userId,
        user_id: record.get("user_id"),
        plan_type: record.get("plan_type"),
        amount: record.get("amount"),
        custom_donation: record.get("custom_donation"),
        total_amount: record.get("total_amount"),
        billing_cycle: record.get("billing_cycle"),
        duration_months: record.get("duration_months"),
        renewal_type: record.get("renewal_type"),
        start_date: record.get("start_date"),
        end_date: record.get("end_date"),
        status: record.get("status"),
        transaction_id: record.get("transaction_id"),
        transaction_ref: record.get("transaction_ref"),
        admin_notes: record.get("admin_notes"),
        description: record.get("description"),
        created: record.get("created"),
        updated: record.get("updated"),
      };

      if (!subId || !userId) {
        console.log("[mirror-subscription] skipping mirror for " + subId + ": missing required fields");
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
              console.log("[mirror-subscription] mirrored " + subId + " status=" + payload.status + " -> API " + response.statusCode);
              lastError = null;
              break;
            }

            lastError = "http " + (response ? response.statusCode : "no-response");
            console.log("[mirror-subscription] attempt " + attempts + " failed for " + subId + ": " + lastError);
          } catch (err) {
            lastError = err && err.message ? err.message : String(err);
            console.log("[mirror-subscription] attempt " + attempts + " errored for " + subId + ": " + lastError);
          }
        }

        if (lastError) {
          console.log("[mirror-subscription] mirror FAILED for " + subId + " after " + maxAttempts + " attempts: " + lastError);
        }
      }
    }
  } catch (err) {
    console.log("[mirror-subscription] update handler error: " + (err && err.message ? err.message : String(err)));
  }

  e.next();
}, "subscriptions");
