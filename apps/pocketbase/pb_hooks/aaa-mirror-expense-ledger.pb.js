// ===============================================================================
// aaa-mirror-expense-ledger.pb.js - H9 PocketBase -> PostgreSQL expense ledger
// mirror hooks
//
// Forwards every successful create/update of the five H9 expense-ledger
// collections to the Express API internal mirror endpoints:
//   - expense_categories -> POST /internal/expense-mirror/expense-category
//   - classifications   -> POST /internal/expense-mirror/classification
//   - expenses          -> POST /internal/expense-mirror/expense
//   - vouchers          -> POST /internal/expense-mirror/voucher
//   - temple_accounts   -> POST /internal/expense-mirror/temple-account
//
// H9 remediation: the same five collections ALSO mirror deletions via
// DELETE /internal/expense-mirror/{resource} so PG always equals PB. Delete
// propagation is idempotent on the API side (deleteMany — a missing PG row is
// a 200 no-op), never creates cascades PB did not perform, and never weakens
// PB collection rules.
//
// Registration is under the aaa- prefix (loaded first) so the mirror fires
// before the legacy receipt/ledger hooks that can abort later after-update
// chains in PB 0.38's JSVM (see aaa-mirror-donation.pb.js for the full
// rationale — this file mirrors its guarantees exactly).
//
// Guarantees:
//   - NEVER throws: a mirror failure cannot roll back / fail the user's write.
//   - Synchronous $http.send with a short timeout (JSVM has no true async here).
//   - Small bounded retry (2 attempts) - no queueing framework.
//   - Idempotency is guaranteed on the API side (upsert keyed on the PB id /
//     deterministic temple_accounts id), so retries never create duplicates.
//   - No secrets are logged.
//
// WARNING - PB 0.38 JSVM constraint (proven empirically in this build):
//   Hook callbacks do NOT see top-level functions/consts/`globalThis` from the
//   same .pb.js file - every cross-reference throws "<name> is not defined" at
//   runtime. All logic must be physically inlined inside the callback body.
//
// Env (loaded from apps/pocketbase/.env at startup, or process environment):
//   BOOKING_MIRROR_SECRET  - shared secret (must match apps/api/.env)
//   BOOKING_MIRROR_API_URL - Express API base URL (default http://localhost:3001)
// ===============================================================================

// ---- expense_categories -------------------------------------------------------
onRecordAfterCreateSuccess((e) => {
  try {
    var record = e.record;
    var MIRROR_PATH = "/internal/expense-mirror/expense-category";
    var API_BASE = $os.getenv("BOOKING_MIRROR_API_URL") || "http://localhost:3001";
    var MIRROR_SECRET = $os.getenv("BOOKING_MIRROR_SECRET");

    if (!MIRROR_SECRET) {
      console.log("[mirror-expense-ledger] BOOKING_MIRROR_SECRET not set; skipping expense_categories mirror for " + record.id);
    } else {
      var cId = record.id || "";
      var payload = {
        id: cId,
        name: record.get("name"),
        description: record.get("description"),
        created_by: record.get("created_by"),
        created: record.get("created"),
        updated: record.get("updated"),
      };

      if (!cId || !payload.name) {
        console.log("[mirror-expense-ledger] skipping expense_categories mirror for " + cId + ": missing required fields");
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
              console.log("[mirror-expense-ledger] mirrored expense_categories " + cId + " -> API " + response.statusCode);
              lastError = null;
              break;
            }

            lastError = "http " + (response ? response.statusCode : "no-response");
            console.log("[mirror-expense-ledger] attempt " + attempts + " failed for expense_categories " + cId + ": " + lastError);
          } catch (err) {
            lastError = err && err.message ? err.message : String(err);
            console.log("[mirror-expense-ledger] attempt " + attempts + " errored for expense_categories " + cId + ": " + lastError);
          }
        }

        if (lastError) {
          console.log("[mirror-expense-ledger] expense_categories mirror FAILED for " + cId + " after " + maxAttempts + " attempts: " + lastError);
        }
      }
    }
  } catch (err) {
    console.log("[mirror-expense-ledger] expense_categories create handler error: " + (err && err.message ? err.message : String(err)));
  }

  e.next();
}, "expense_categories");

onRecordAfterUpdateSuccess((e) => {
  try {
    var record = e.record;
    var MIRROR_PATH = "/internal/expense-mirror/expense-category";
    var API_BASE = $os.getenv("BOOKING_MIRROR_API_URL") || "http://localhost:3001";
    var MIRROR_SECRET = $os.getenv("BOOKING_MIRROR_SECRET");

    if (!MIRROR_SECRET) {
      console.log("[mirror-expense-ledger] BOOKING_MIRROR_SECRET not set; skipping expense_categories mirror for " + record.id);
    } else {
      var cId = record.id || "";
      var payload = {
        id: cId,
        name: record.get("name"),
        description: record.get("description"),
        created_by: record.get("created_by"),
        created: record.get("created"),
        updated: record.get("updated"),
      };

      if (!cId || !payload.name) {
        console.log("[mirror-expense-ledger] skipping expense_categories mirror for " + cId + ": missing required fields");
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
              console.log("[mirror-expense-ledger] mirrored expense_categories " + cId + " -> API " + response.statusCode);
              lastError = null;
              break;
            }

            lastError = "http " + (response ? response.statusCode : "no-response");
            console.log("[mirror-expense-ledger] attempt " + attempts + " failed for expense_categories " + cId + ": " + lastError);
          } catch (err) {
            lastError = err && err.message ? err.message : String(err);
            console.log("[mirror-expense-ledger] attempt " + attempts + " errored for expense_categories " + cId + ": " + lastError);
          }
        }

        if (lastError) {
          console.log("[mirror-expense-ledger] expense_categories mirror FAILED for " + cId + " after " + maxAttempts + " attempts: " + lastError);
        }
      }
    }
  } catch (err) {
    console.log("[mirror-expense-ledger] expense_categories update handler error: " + (err && err.message ? err.message : String(err)));
  }

  e.next();
}, "expense_categories");

// ---- classifications ----------------------------------------------------------
onRecordAfterCreateSuccess((e) => {
  try {
    var record = e.record;
    var MIRROR_PATH = "/internal/expense-mirror/classification";
    var API_BASE = $os.getenv("BOOKING_MIRROR_API_URL") || "http://localhost:3001";
    var MIRROR_SECRET = $os.getenv("BOOKING_MIRROR_SECRET");

    if (!MIRROR_SECRET) {
      console.log("[mirror-expense-ledger] BOOKING_MIRROR_SECRET not set; skipping classifications mirror for " + record.id);
    } else {
      var cId = record.id || "";
      var payload = {
        id: cId,
        name: record.get("name"),
        description: record.get("description"),
        created: record.get("created"),
        updated: record.get("updated"),
      };

      if (!cId || !payload.name) {
        console.log("[mirror-expense-ledger] skipping classifications mirror for " + cId + ": missing required fields");
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
              console.log("[mirror-expense-ledger] mirrored classifications " + cId + " -> API " + response.statusCode);
              lastError = null;
              break;
            }

            lastError = "http " + (response ? response.statusCode : "no-response");
            console.log("[mirror-expense-ledger] attempt " + attempts + " failed for classifications " + cId + ": " + lastError);
          } catch (err) {
            lastError = err && err.message ? err.message : String(err);
            console.log("[mirror-expense-ledger] attempt " + attempts + " errored for classifications " + cId + ": " + lastError);
          }
        }

        if (lastError) {
          console.log("[mirror-expense-ledger] classifications mirror FAILED for " + cId + " after " + maxAttempts + " attempts: " + lastError);
        }
      }
    }
  } catch (err) {
    console.log("[mirror-expense-ledger] classifications create handler error: " + (err && err.message ? err.message : String(err)));
  }

  e.next();
}, "classifications");

onRecordAfterUpdateSuccess((e) => {
  try {
    var record = e.record;
    var MIRROR_PATH = "/internal/expense-mirror/classification";
    var API_BASE = $os.getenv("BOOKING_MIRROR_API_URL") || "http://localhost:3001";
    var MIRROR_SECRET = $os.getenv("BOOKING_MIRROR_SECRET");

    if (!MIRROR_SECRET) {
      console.log("[mirror-expense-ledger] BOOKING_MIRROR_SECRET not set; skipping classifications mirror for " + record.id);
    } else {
      var cId = record.id || "";
      var payload = {
        id: cId,
        name: record.get("name"),
        description: record.get("description"),
        created: record.get("created"),
        updated: record.get("updated"),
      };

      if (!cId || !payload.name) {
        console.log("[mirror-expense-ledger] skipping classifications mirror for " + cId + ": missing required fields");
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
              console.log("[mirror-expense-ledger] mirrored classifications " + cId + " -> API " + response.statusCode);
              lastError = null;
              break;
            }

            lastError = "http " + (response ? response.statusCode : "no-response");
            console.log("[mirror-expense-ledger] attempt " + attempts + " failed for classifications " + cId + ": " + lastError);
          } catch (err) {
            lastError = err && err.message ? err.message : String(err);
            console.log("[mirror-expense-ledger] attempt " + attempts + " errored for classifications " + cId + ": " + lastError);
          }
        }

        if (lastError) {
          console.log("[mirror-expense-ledger] classifications mirror FAILED for " + cId + " after " + maxAttempts + " attempts: " + lastError);
        }
      }
    }
  } catch (err) {
    console.log("[mirror-expense-ledger] classifications update handler error: " + (err && err.message ? err.message : String(err)));
  }

  e.next();
}, "classifications");

// ---- expenses -----------------------------------------------------------------
onRecordAfterCreateSuccess((e) => {
  try {
    var record = e.record;
    var MIRROR_PATH = "/internal/expense-mirror/expense";
    var API_BASE = $os.getenv("BOOKING_MIRROR_API_URL") || "http://localhost:3001";
    var MIRROR_SECRET = $os.getenv("BOOKING_MIRROR_SECRET");

    if (!MIRROR_SECRET) {
      console.log("[mirror-expense-ledger] BOOKING_MIRROR_SECRET not set; skipping expenses mirror for " + record.id);
    } else {
      var eId = record.id || "";
      var payload = {
        id: eId,
        category_id: record.get("category_id") || null,
        amount: record.get("amount"),
        date: record.get("date"),
        paid_to: record.get("paid_to"),
        payment_method: record.get("payment_method"),
        bill_file: record.get("bill_file"),
        created_by: record.get("created_by"),
        quantity: record.get("quantity"),
        classification: record.get("classification"),
        voucher_id: record.get("voucher_id") || null,
        description: record.get("description"),
        created: record.get("created"),
        updated: record.get("updated"),
      };

      if (!eId || !payload.category_id || payload.amount === null || payload.amount === undefined) {
        console.log("[mirror-expense-ledger] skipping expenses mirror for " + eId + ": missing required fields");
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
              console.log("[mirror-expense-ledger] mirrored expenses " + eId + " -> API " + response.statusCode);
              lastError = null;
              break;
            }

            lastError = "http " + (response ? response.statusCode : "no-response");
            console.log("[mirror-expense-ledger] attempt " + attempts + " failed for expenses " + eId + ": " + lastError);
          } catch (err) {
            lastError = err && err.message ? err.message : String(err);
            console.log("[mirror-expense-ledger] attempt " + attempts + " errored for expenses " + eId + ": " + lastError);
          }
        }

        if (lastError) {
          console.log("[mirror-expense-ledger] expenses mirror FAILED for " + eId + " after " + maxAttempts + " attempts: " + lastError);
        }
      }
    }
  } catch (err) {
    console.log("[mirror-expense-ledger] expenses create handler error: " + (err && err.message ? err.message : String(err)));
  }

  e.next();
}, "expenses");

onRecordAfterUpdateSuccess((e) => {
  try {
    var record = e.record;
    var MIRROR_PATH = "/internal/expense-mirror/expense";
    var API_BASE = $os.getenv("BOOKING_MIRROR_API_URL") || "http://localhost:3001";
    var MIRROR_SECRET = $os.getenv("BOOKING_MIRROR_SECRET");

    if (!MIRROR_SECRET) {
      console.log("[mirror-expense-ledger] BOOKING_MIRROR_SECRET not set; skipping expenses mirror for " + record.id);
    } else {
      var eId = record.id || "";
      var payload = {
        id: eId,
        category_id: record.get("category_id") || null,
        amount: record.get("amount"),
        date: record.get("date"),
        paid_to: record.get("paid_to"),
        payment_method: record.get("payment_method"),
        bill_file: record.get("bill_file"),
        created_by: record.get("created_by"),
        quantity: record.get("quantity"),
        classification: record.get("classification"),
        voucher_id: record.get("voucher_id") || null,
        description: record.get("description"),
        created: record.get("created"),
        updated: record.get("updated"),
      };

      if (!eId || !payload.category_id || payload.amount === null || payload.amount === undefined) {
        console.log("[mirror-expense-ledger] skipping expenses mirror for " + eId + ": missing required fields");
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
              console.log("[mirror-expense-ledger] mirrored expenses " + eId + " -> API " + response.statusCode);
              lastError = null;
              break;
            }

            lastError = "http " + (response ? response.statusCode : "no-response");
            console.log("[mirror-expense-ledger] attempt " + attempts + " failed for expenses " + eId + ": " + lastError);
          } catch (err) {
            lastError = err && err.message ? err.message : String(err);
            console.log("[mirror-expense-ledger] attempt " + attempts + " errored for expenses " + eId + ": " + lastError);
          }
        }

        if (lastError) {
          console.log("[mirror-expense-ledger] expenses mirror FAILED for " + eId + " after " + maxAttempts + " attempts: " + lastError);
        }
      }
    }
  } catch (err) {
    console.log("[mirror-expense-ledger] expenses update handler error: " + (err && err.message ? err.message : String(err)));
  }

  e.next();
}, "expenses");

// ---- vouchers -----------------------------------------------------------------
onRecordAfterCreateSuccess((e) => {
  try {
    var record = e.record;
    var MIRROR_PATH = "/internal/expense-mirror/voucher";
    var API_BASE = $os.getenv("BOOKING_MIRROR_API_URL") || "http://localhost:3001";
    var MIRROR_SECRET = $os.getenv("BOOKING_MIRROR_SECRET");

    if (!MIRROR_SECRET) {
      console.log("[mirror-expense-ledger] BOOKING_MIRROR_SECRET not set; skipping vouchers mirror for " + record.id);
    } else {
      var vId = record.id || "";
      var payload = {
        id: vId,
        voucher_id: record.get("voucher_id"),
        expense_id: record.get("expense_id") || null,
        amount: record.get("amount"),
        category: record.get("category"),
        paid_to: record.get("paid_to"),
        date: record.get("date"),
        description: record.get("description"),
        status: record.get("status"),
        created: record.get("created"),
        updated: record.get("updated"),
      };

      if (!vId || payload.amount === null || payload.amount === undefined) {
        console.log("[mirror-expense-ledger] skipping vouchers mirror for " + vId + ": missing required fields");
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
              console.log("[mirror-expense-ledger] mirrored vouchers " + vId + " -> API " + response.statusCode);
              lastError = null;
              break;
            }

            lastError = "http " + (response ? response.statusCode : "no-response");
            console.log("[mirror-expense-ledger] attempt " + attempts + " failed for vouchers " + vId + ": " + lastError);
          } catch (err) {
            lastError = err && err.message ? err.message : String(err);
            console.log("[mirror-expense-ledger] attempt " + attempts + " errored for vouchers " + vId + ": " + lastError);
          }
        }

        if (lastError) {
          console.log("[mirror-expense-ledger] vouchers mirror FAILED for " + vId + " after " + maxAttempts + " attempts: " + lastError);
        }
      }
    }
  } catch (err) {
    console.log("[mirror-expense-ledger] vouchers create handler error: " + (err && err.message ? err.message : String(err)));
  }

  e.next();
}, "vouchers");

onRecordAfterUpdateSuccess((e) => {
  try {
    var record = e.record;
    var MIRROR_PATH = "/internal/expense-mirror/voucher";
    var API_BASE = $os.getenv("BOOKING_MIRROR_API_URL") || "http://localhost:3001";
    var MIRROR_SECRET = $os.getenv("BOOKING_MIRROR_SECRET");

    if (!MIRROR_SECRET) {
      console.log("[mirror-expense-ledger] BOOKING_MIRROR_SECRET not set; skipping vouchers mirror for " + record.id);
    } else {
      var vId = record.id || "";
      var payload = {
        id: vId,
        voucher_id: record.get("voucher_id"),
        expense_id: record.get("expense_id") || null,
        amount: record.get("amount"),
        category: record.get("category"),
        paid_to: record.get("paid_to"),
        date: record.get("date"),
        description: record.get("description"),
        status: record.get("status"),
        created: record.get("created"),
        updated: record.get("updated"),
      };

      if (!vId || payload.amount === null || payload.amount === undefined) {
        console.log("[mirror-expense-ledger] skipping vouchers mirror for " + vId + ": missing required fields");
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
              console.log("[mirror-expense-ledger] mirrored vouchers " + vId + " -> API " + response.statusCode);
              lastError = null;
              break;
            }

            lastError = "http " + (response ? response.statusCode : "no-response");
            console.log("[mirror-expense-ledger] attempt " + attempts + " failed for vouchers " + vId + ": " + lastError);
          } catch (err) {
            lastError = err && err.message ? err.message : String(err);
            console.log("[mirror-expense-ledger] attempt " + attempts + " errored for vouchers " + vId + ": " + lastError);
          }
        }

        if (lastError) {
          console.log("[mirror-expense-ledger] vouchers mirror FAILED for " + vId + " after " + maxAttempts + " attempts: " + lastError);
        }
      }
    }
  } catch (err) {
    console.log("[mirror-expense-ledger] vouchers update handler error: " + (err && err.message ? err.message : String(err)));
  }

  e.next();
}, "vouchers");

// ---- temple_accounts ----------------------------------------------------------
onRecordAfterCreateSuccess((e) => {
  try {
    var record = e.record;
    var MIRROR_PATH = "/internal/expense-mirror/temple-account";
    var API_BASE = $os.getenv("BOOKING_MIRROR_API_URL") || "http://localhost:3001";
    var MIRROR_SECRET = $os.getenv("BOOKING_MIRROR_SECRET");

    if (!MIRROR_SECRET) {
      console.log("[mirror-expense-ledger] BOOKING_MIRROR_SECRET not set; skipping temple_accounts mirror for " + record.id);
    } else {
      var tId = record.id || "";
      var payload = {
        id: tId,
        member_name: record.get("member_name"),
        amount: record.get("amount"),
        category: record.get("category"),
        date: record.get("date"),
        month: record.get("month"),
        year: record.get("year"),
        transaction_id: record.get("transaction_id"),
        classification: record.get("classification"),
        description: record.get("description"),
        status: record.get("status"),
        notes: record.get("notes"),
        entry_type: record.get("entry_type"),
        subscription_id: record.get("subscription_id") || null,
        subscription_type: record.get("subscription_type"),
        annadhanam_amount: record.get("annadhanam_amount"),
        temple_maintenance_amount: record.get("temple_maintenance_amount"),
        goshala_amount: record.get("goshala_amount"),
        veda_pathshala_amount: record.get("veda_pathshala_amount"),
        general_fund_amount: record.get("general_fund_amount"),
        total_amount: record.get("total_amount"),
        pooja_services_amount: record.get("pooja_services_amount"),
        created: record.get("created"),
        updated: record.get("updated"),
      };

      if (!tId || payload.amount === null || payload.amount === undefined) {
        console.log("[mirror-expense-ledger] skipping temple_accounts mirror for " + tId + ": missing required fields");
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
              console.log("[mirror-expense-ledger] mirrored temple_accounts " + tId + " -> API " + response.statusCode);
              lastError = null;
              break;
            }

            lastError = "http " + (response ? response.statusCode : "no-response");
            console.log("[mirror-expense-ledger] attempt " + attempts + " failed for temple_accounts " + tId + ": " + lastError);
          } catch (err) {
            lastError = err && err.message ? err.message : String(err);
            console.log("[mirror-expense-ledger] attempt " + attempts + " errored for temple_accounts " + tId + ": " + lastError);
          }
        }

        if (lastError) {
          console.log("[mirror-expense-ledger] temple_accounts mirror FAILED for " + tId + " after " + maxAttempts + " attempts: " + lastError);
        }
      }
    }
  } catch (err) {
    console.log("[mirror-expense-ledger] temple_accounts create handler error: " + (err && err.message ? err.message : String(err)));
  }

  e.next();
}, "temple_accounts");

onRecordAfterUpdateSuccess((e) => {
  try {
    var record = e.record;
    var MIRROR_PATH = "/internal/expense-mirror/temple-account";
    var API_BASE = $os.getenv("BOOKING_MIRROR_API_URL") || "http://localhost:3001";
    var MIRROR_SECRET = $os.getenv("BOOKING_MIRROR_SECRET");

    if (!MIRROR_SECRET) {
      console.log("[mirror-expense-ledger] BOOKING_MIRROR_SECRET not set; skipping temple_accounts mirror for " + record.id);
    } else {
      var tId = record.id || "";
      var payload = {
        id: tId,
        member_name: record.get("member_name"),
        amount: record.get("amount"),
        category: record.get("category"),
        date: record.get("date"),
        month: record.get("month"),
        year: record.get("year"),
        transaction_id: record.get("transaction_id"),
        classification: record.get("classification"),
        description: record.get("description"),
        status: record.get("status"),
        notes: record.get("notes"),
        entry_type: record.get("entry_type"),
        subscription_id: record.get("subscription_id") || null,
        subscription_type: record.get("subscription_type"),
        annadhanam_amount: record.get("annadhanam_amount"),
        temple_maintenance_amount: record.get("temple_maintenance_amount"),
        goshala_amount: record.get("goshala_amount"),
        veda_pathshala_amount: record.get("veda_pathshala_amount"),
        general_fund_amount: record.get("general_fund_amount"),
        total_amount: record.get("total_amount"),
        pooja_services_amount: record.get("pooja_services_amount"),
        created: record.get("created"),
        updated: record.get("updated"),
      };

      if (!tId || payload.amount === null || payload.amount === undefined) {
        console.log("[mirror-expense-ledger] skipping temple_accounts mirror for " + tId + ": missing required fields");
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
              console.log("[mirror-expense-ledger] mirrored temple_accounts " + tId + " -> API " + response.statusCode);
              lastError = null;
              break;
            }

            lastError = "http " + (response ? response.statusCode : "no-response");
            console.log("[mirror-expense-ledger] attempt " + attempts + " failed for temple_accounts " + tId + ": " + lastError);
          } catch (err) {
            lastError = err && err.message ? err.message : String(err);
            console.log("[mirror-expense-ledger] attempt " + attempts + " errored for temple_accounts " + tId + ": " + lastError);
          }
        }

        if (lastError) {
          console.log("[mirror-expense-ledger] temple_accounts mirror FAILED for " + tId + " after " + maxAttempts + " attempts: " + lastError);
        }
      }
    }
  } catch (err) {
    console.log("[mirror-expense-ledger] temple_accounts update handler error: " + (err && err.message ? err.message : String(err)));
  }

  e.next();
}, "temple_accounts");

// ---- delete propagation (H9 remediation) -------------------------------------
// PB afterDelete hooks mirror the deletion into PG via the same internal API
// (same secret + retry + never-throw guarantees). Deletes are idempotent.
// expense_categories
onRecordAfterDeleteSuccess((e) => {
  try {
    var record = e.record;
    var MIRROR_PATH = "/internal/expense-mirror/expense-category";
    var API_BASE = $os.getenv("BOOKING_MIRROR_API_URL") || "http://localhost:3001";
    var MIRROR_SECRET = $os.getenv("BOOKING_MIRROR_SECRET");

    if (!MIRROR_SECRET) {
      console.log("[mirror-expense-ledger] BOOKING_MIRROR_SECRET not set; skipping expense_categories delete mirror for " + record.id);
    } else {
      var cId = record.id || "";
      var payload = { id: cId, transaction_id: null };
      var lastError = null;
      var attempts = 0;
      var maxAttempts = 2;

      while (attempts < maxAttempts) {
        attempts++;
        try {
          var response = $http.send({
            url: API_BASE + MIRROR_PATH,
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              "X-Booking-Mirror-Secret": MIRROR_SECRET,
            },
            body: JSON.stringify(payload),
            timeout: 4,
          });

          if (response && response.statusCode >= 200 && response.statusCode < 300) {
            console.log("[mirror-expense-ledger] deleted expense_categories " + cId + " -> API " + response.statusCode);
            lastError = null;
            break;
          }

          lastError = "http " + (response ? response.statusCode : "no-response");
          console.log("[mirror-expense-ledger] delete attempt " + attempts + " failed for expense_categories " + cId + ": " + lastError);
        } catch (err) {
          lastError = err && err.message ? err.message : String(err);
          console.log("[mirror-expense-ledger] delete attempt " + attempts + " errored for expense_categories " + cId + ": " + lastError);
        }
      }

      if (lastError) {
        console.log("[mirror-expense-ledger] expense_categories delete mirror FAILED for " + cId + " after " + maxAttempts + " attempts: " + lastError);
      }
    }
  } catch (err) {
    console.log("[mirror-expense-ledger] expense_categories delete handler error: " + (err && err.message ? err.message : String(err)));
  }

  e.next();
}, "expense_categories");

// classifications
onRecordAfterDeleteSuccess((e) => {
  try {
    var record = e.record;
    var MIRROR_PATH = "/internal/expense-mirror/classification";
    var API_BASE = $os.getenv("BOOKING_MIRROR_API_URL") || "http://localhost:3001";
    var MIRROR_SECRET = $os.getenv("BOOKING_MIRROR_SECRET");

    if (!MIRROR_SECRET) {
      console.log("[mirror-expense-ledger] BOOKING_MIRROR_SECRET not set; skipping classifications delete mirror for " + record.id);
    } else {
      var cId = record.id || "";
      var payload = { id: cId, transaction_id: null };
      var lastError = null;
      var attempts = 0;
      var maxAttempts = 2;

      while (attempts < maxAttempts) {
        attempts++;
        try {
          var response = $http.send({
            url: API_BASE + MIRROR_PATH,
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              "X-Booking-Mirror-Secret": MIRROR_SECRET,
            },
            body: JSON.stringify(payload),
            timeout: 4,
          });

          if (response && response.statusCode >= 200 && response.statusCode < 300) {
            console.log("[mirror-expense-ledger] deleted classifications " + cId + " -> API " + response.statusCode);
            lastError = null;
            break;
          }

          lastError = "http " + (response ? response.statusCode : "no-response");
          console.log("[mirror-expense-ledger] delete attempt " + attempts + " failed for classifications " + cId + ": " + lastError);
        } catch (err) {
          lastError = err && err.message ? err.message : String(err);
          console.log("[mirror-expense-ledger] delete attempt " + attempts + " errored for classifications " + cId + ": " + lastError);
        }
      }

      if (lastError) {
        console.log("[mirror-expense-ledger] classifications delete mirror FAILED for " + cId + " after " + maxAttempts + " attempts: " + lastError);
      }
    }
  } catch (err) {
    console.log("[mirror-expense-ledger] classifications delete handler error: " + (err && err.message ? err.message : String(err)));
  }

  e.next();
}, "classifications");

// expenses
onRecordAfterDeleteSuccess((e) => {
  try {
    var record = e.record;
    var MIRROR_PATH = "/internal/expense-mirror/expense";
    var API_BASE = $os.getenv("BOOKING_MIRROR_API_URL") || "http://localhost:3001";
    var MIRROR_SECRET = $os.getenv("BOOKING_MIRROR_SECRET");

    if (!MIRROR_SECRET) {
      console.log("[mirror-expense-ledger] BOOKING_MIRROR_SECRET not set; skipping expenses delete mirror for " + record.id);
    } else {
      var eId = record.id || "";
      var payload = { id: eId, transaction_id: null };
      var lastError = null;
      var attempts = 0;
      var maxAttempts = 2;

      while (attempts < maxAttempts) {
        attempts++;
        try {
          var response = $http.send({
            url: API_BASE + MIRROR_PATH,
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              "X-Booking-Mirror-Secret": MIRROR_SECRET,
            },
            body: JSON.stringify(payload),
            timeout: 4,
          });

          if (response && response.statusCode >= 200 && response.statusCode < 300) {
            console.log("[mirror-expense-ledger] deleted expenses " + eId + " -> API " + response.statusCode);
            lastError = null;
            break;
          }

          lastError = "http " + (response ? response.statusCode : "no-response");
          console.log("[mirror-expense-ledger] delete attempt " + attempts + " failed for expenses " + eId + ": " + lastError);
        } catch (err) {
          lastError = err && err.message ? err.message : String(err);
          console.log("[mirror-expense-ledger] delete attempt " + attempts + " errored for expenses " + eId + ": " + lastError);
        }
      }

      if (lastError) {
        console.log("[mirror-expense-ledger] expenses delete mirror FAILED for " + eId + " after " + maxAttempts + " attempts: " + lastError);
      }
    }
  } catch (err) {
    console.log("[mirror-expense-ledger] expenses delete handler error: " + (err && err.message ? err.message : String(err)));
  }

  e.next();
}, "expenses");

// vouchers
onRecordAfterDeleteSuccess((e) => {
  try {
    var record = e.record;
    var MIRROR_PATH = "/internal/expense-mirror/voucher";
    var API_BASE = $os.getenv("BOOKING_MIRROR_API_URL") || "http://localhost:3001";
    var MIRROR_SECRET = $os.getenv("BOOKING_MIRROR_SECRET");

    if (!MIRROR_SECRET) {
      console.log("[mirror-expense-ledger] BOOKING_MIRROR_SECRET not set; skipping vouchers delete mirror for " + record.id);
    } else {
      var vId = record.id || "";
      var payload = { id: vId, transaction_id: null };
      var lastError = null;
      var attempts = 0;
      var maxAttempts = 2;

      while (attempts < maxAttempts) {
        attempts++;
        try {
          var response = $http.send({
            url: API_BASE + MIRROR_PATH,
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              "X-Booking-Mirror-Secret": MIRROR_SECRET,
            },
            body: JSON.stringify(payload),
            timeout: 4,
          });

          if (response && response.statusCode >= 200 && response.statusCode < 300) {
            console.log("[mirror-expense-ledger] deleted vouchers " + vId + " -> API " + response.statusCode);
            lastError = null;
            break;
          }

          lastError = "http " + (response ? response.statusCode : "no-response");
          console.log("[mirror-expense-ledger] delete attempt " + attempts + " failed for vouchers " + vId + ": " + lastError);
        } catch (err) {
          lastError = err && err.message ? err.message : String(err);
          console.log("[mirror-expense-ledger] delete attempt " + attempts + " errored for vouchers " + vId + ": " + lastError);
        }
      }

      if (lastError) {
        console.log("[mirror-expense-ledger] vouchers delete mirror FAILED for " + vId + " after " + maxAttempts + " attempts: " + lastError);
      }
    }
  } catch (err) {
    console.log("[mirror-expense-ledger] vouchers delete handler error: " + (err && err.message ? err.message : String(err)));
  }

  e.next();
}, "vouchers");

// temple_accounts (transaction_id forwarded so the API derives ta_<txn> and
// also defends the ta_pb_<id> fallback + transactionId-match delete)
onRecordAfterDeleteSuccess((e) => {
  try {
    var record = e.record;
    var MIRROR_PATH = "/internal/expense-mirror/temple-account";
    var API_BASE = $os.getenv("BOOKING_MIRROR_API_URL") || "http://localhost:3001";
    var MIRROR_SECRET = $os.getenv("BOOKING_MIRROR_SECRET");

    if (!MIRROR_SECRET) {
      console.log("[mirror-expense-ledger] BOOKING_MIRROR_SECRET not set; skipping temple_accounts delete mirror for " + record.id);
    } else {
      var tId = record.id || "";
      var payload = { id: tId, transaction_id: record.get("transaction_id") || null };
      var lastError = null;
      var attempts = 0;
      var maxAttempts = 2;

      while (attempts < maxAttempts) {
        attempts++;
        try {
          var response = $http.send({
            url: API_BASE + MIRROR_PATH,
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              "X-Booking-Mirror-Secret": MIRROR_SECRET,
            },
            body: JSON.stringify(payload),
            timeout: 4,
          });

          if (response && response.statusCode >= 200 && response.statusCode < 300) {
            console.log("[mirror-expense-ledger] deleted temple_accounts " + tId + " -> API " + response.statusCode);
            lastError = null;
            break;
          }

          lastError = "http " + (response ? response.statusCode : "no-response");
          console.log("[mirror-expense-ledger] delete attempt " + attempts + " failed for temple_accounts " + tId + ": " + lastError);
        } catch (err) {
          lastError = err && err.message ? err.message : String(err);
          console.log("[mirror-expense-ledger] delete attempt " + attempts + " errored for temple_accounts " + tId + ": " + lastError);
        }
      }

      if (lastError) {
        console.log("[mirror-expense-ledger] temple_accounts delete mirror FAILED for " + tId + " after " + maxAttempts + " attempts: " + lastError);
      }
    }
  } catch (err) {
    console.log("[mirror-expense-ledger] temple_accounts delete handler error: " + (err && err.message ? err.message : String(err)));
  }

  e.next();
}, "temple_accounts");