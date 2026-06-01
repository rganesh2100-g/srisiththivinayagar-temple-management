/// <reference path="../pb_data/types.d.ts" />
cronAdd('subscription_payment_reminder_job', '0 9 * * *', () => {
  try {
    console.log('[Subscription Reminder] Job started at ' + new Date().toISOString());
    
    // Query all active subscriptions with Premium tier
    const subscriptions = $app.findAllRecords('subscriptions', {
      filter: "status = 'active' && tier = 'Premium'",
      expand: 'userId'
    });
    
    let remindersSent = 0;
    let errors = 0;
    
    for (let i = 0; i < subscriptions.length; i++) {
      try {
        const subscription = subscriptions[i];
        const userId = subscription.get('userId');
        const renewalDate = new Date(subscription.get('renewal_date'));
        const amountDue = subscription.get('amount_due');
        const paymentLink = subscription.get('payment_link');
        const reminderSentFlag = subscription.get('reminder_sent_3_5_days');
        
        // Calculate days until renewal
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        renewalDate.setHours(0, 0, 0, 0);
        
        const daysUntilRenewal = Math.floor((renewalDate - today) / (1000 * 60 * 60 * 24));
        
        // Check if within 3-5 day window and reminder not yet sent
        if ((daysUntilRenewal === 3 || daysUntilRenewal === 4 || daysUntilRenewal === 5) && !reminderSentFlag) {
          
          // Get user email
          const user = $app.findRecordById('users', userId);
          if (!user) {
            console.log('[Subscription Reminder] User not found for subscription ' + subscription.id);
            continue;
          }
          
          const userEmail = user.get('email');
          const userName = user.get('name') || 'Premium Member';
          
          // Format renewal date for email
          const formattedDate = renewalDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
          
          // Send reminder email
          const message = new MailerMessage({
            from: {
              address: $app.settings().meta.senderAddress,
              name: $app.settings().meta.senderName
            },
            to: [{ address: userEmail }],
            subject: 'Your Premium Subscription Renewal is Due Soon',
            html: '<h2>Hello ' + userName + ',</h2>' +
                  '<p>Your Premium subscription will renew on <strong>' + formattedDate + '</strong>.</p>' +
                  '<p><strong>Renewal Amount:</strong> $' + amountDue + '</p>' +
                  '<p>Please ensure your payment method is up to date. If payment fails, your subscription will automatically downgrade to a free account.</p>' +
                  '<p><a href="' + paymentLink + '" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Update Payment Method</a></p>' +
                  '<p>If you have any questions, please contact our support team.</p>' +
                  '<p>Best regards,<br>The Premium Team</p>'
          });
          
          $app.newMailClient().send(message);
          
          // Mark reminder as sent by updating the subscription record
          subscription.set('reminder_sent_3_5_days', true);
          subscription.set('reminder_sent_at', new Date().toISOString());
          $app.save(subscription);
          
          remindersSent++;
          console.log('[Subscription Reminder] Reminder sent to ' + userEmail + ' (days until renewal: ' + daysUntilRenewal + ')');
        }
      } catch (err) {
        errors++;
        console.log('[Subscription Reminder] Error processing subscription: ' + err.message);
        // Continue processing other subscriptions
      }
    }
    
    console.log('[Subscription Reminder] Job completed. Reminders sent: ' + remindersSent + ', Errors: ' + errors);
  } catch (err) {
    console.log('[Subscription Reminder] Critical error: ' + err.message);
  }
});