/// <reference path="../pb_data/types.d.ts" />
// Diagnostic Hook - Query subscriptions for ganesh@gmail.com
// This hook logs the full subscription record structure for debugging

onRecordsListRequest((e) => {
  // Only run this diagnostic for subscriptions collection
  if (e.collection.name !== 'subscriptions') {
    e.next();
    return;
  }

  console.log('[subscription-diagnostic] ===== SUBSCRIPTION QUERY DIAGNOSTIC =====');
  console.log('[subscription-diagnostic] Collection: ' + e.collection.name);
  console.log('[subscription-diagnostic] Request info: ' + JSON.stringify(e.requestInfo));

  try {
    // Query for ganesh's subscription
    const ganeshEmail = 'ganesh2100@gmail.com';
    console.log('[subscription-diagnostic] Searching for subscriptions with email: ' + ganeshEmail);

    // Try to find user first
    let ganeshUser = null;
    try {
      ganeshUser = $app.findFirstRecordByData('users', 'email', ganeshEmail);
      if (ganeshUser) {
        console.log('[subscription-diagnostic] Found user record for ' + ganeshEmail);
        console.log('[subscription-diagnostic] User ID: ' + ganeshUser.id);
        console.log('[subscription-diagnostic] User name: ' + (ganeshUser.get('name') || ganeshUser.get('full_name') || 'N/A'));
      } else {
        console.log('[subscription-diagnostic] User not found for email: ' + ganeshEmail);
      }
    } catch (err) {
      console.log('[subscription-diagnostic] Error finding user: ' + err.message);
    }

    // Query subscriptions - try multiple approaches
    console.log('[subscription-diagnostic] Attempting to query subscriptions...');

    // Approach 1: Query all subscriptions and log structure
    try {
      const allSubs = $app.findRecordsByFilter('subscriptions', 'status = "active"', { limit: 100 });
      console.log('[subscription-diagnostic] Found ' + allSubs.length + ' active subscriptions');
      
      if (allSubs.length > 0) {
        const firstSub = allSubs[0];
        console.log('[subscription-diagnostic] ===== FIRST SUBSCRIPTION RECORD STRUCTURE =====');
        console.log('[subscription-diagnostic] ID: ' + firstSub.id);
        console.log('[subscription-diagnostic] user field: ' + JSON.stringify(firstSub.get('user')));
        console.log('[subscription-diagnostic] user_id field: ' + firstSub.get('user_id'));
        console.log('[subscription-diagnostic] billing_cycle: ' + firstSub.get('billing_cycle'));
        console.log('[subscription-diagnostic] plan_type: ' + firstSub.get('plan_type'));
        console.log('[subscription-diagnostic] amount: ' + firstSub.get('amount'));
        console.log('[subscription-diagnostic] total_amount: ' + firstSub.get('total_amount'));
        console.log('[subscription-diagnostic] status: ' + firstSub.get('status'));
        console.log('[subscription-diagnostic] start_date: ' + firstSub.get('start_date'));
        console.log('[subscription-diagnostic] end_date: ' + firstSub.get('end_date'));
        console.log('[subscription-diagnostic] transaction_id: ' + firstSub.get('transaction_id'));
        console.log('[subscription-diagnostic] receipt_id: ' + firstSub.get('receipt_id'));
        console.log('[subscription-diagnostic] receipt_generated_at: ' + firstSub.get('receipt_generated_at'));
        
        // Log all fields
        console.log('[subscription-diagnostic] ===== ALL FIELDS =====');
        const fields = e.collection.fields;
        for (let i = 0; i < fields.length; i++) {
          const field = fields[i];
          const value = firstSub.get(field.name);
          console.log('[subscription-diagnostic] ' + field.name + ' (' + field.type + '): ' + JSON.stringify(value));
        }
      }
    } catch (err) {
      console.log('[subscription-diagnostic] Error querying subscriptions: ' + err.message);
    }

    // Approach 2: If we found ganesh user, query by user relation
    if (ganeshUser) {
      try {
        console.log('[subscription-diagnostic] Querying subscriptions for user ID: ' + ganeshUser.id);
        const ganeshSubs = $app.findRecordsByFilter('subscriptions', 'user = "' + ganeshUser.id + '"', { limit: 100 });
        console.log('[subscription-diagnostic] Found ' + ganeshSubs.length + ' subscriptions for ganesh (by user relation)');
        
        if (ganeshSubs.length > 0) {
          const ganeshSub = ganeshSubs[0];
          console.log('[subscription-diagnostic] ===== GANESH SUBSCRIPTION DETAILS =====');
          console.log('[subscription-diagnostic] ID: ' + ganeshSub.id);
          console.log('[subscription-diagnostic] user: ' + JSON.stringify(ganeshSub.get('user')));
          console.log('[subscription-diagnostic] user_id: ' + ganeshSub.get('user_id'));
          console.log('[subscription-diagnostic] billing_cycle: ' + ganeshSub.get('billing_cycle'));
          console.log('[subscription-diagnostic] plan_type: ' + ganeshSub.get('plan_type'));
          console.log('[subscription-diagnostic] total_amount: ' + ganeshSub.get('total_amount'));
          console.log('[subscription-diagnostic] status: ' + ganeshSub.get('status'));
          console.log('[subscription-diagnostic] start_date: ' + ganeshSub.get('start_date'));
          console.log('[subscription-diagnostic] end_date: ' + ganeshSub.get('end_date'));
          console.log('[subscription-diagnostic] receipt_id: ' + ganeshSub.get('receipt_id'));
        }
      } catch (err) {
        console.log('[subscription-diagnostic] Error querying by user relation: ' + err.message);
      }
    }

  } catch (err) {
    console.log('[subscription-diagnostic] FATAL ERROR: ' + err.message);
    console.log('[subscription-diagnostic] Stack: ' + err.stack);
  }

  console.log('[subscription-diagnostic] ===== END DIAGNOSTIC =====');
  e.next();
}, 'subscriptions');