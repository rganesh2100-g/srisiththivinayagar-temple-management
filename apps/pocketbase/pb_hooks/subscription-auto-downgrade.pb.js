/// <reference path="../pb_data/types.d.ts" />
cronAdd('subscription_downgrade_job', '0 0 * * *', () => {
  try {
    // Query users collection for expired Premium subscriptions
    const expiredPremiumUsers = $app.findAllRecords('users', "membershipTier = 'Premium' && subscriptionEndDate < @now");
    
    let downgradedCount = 0;
    
    // Process each expired Premium user
    expiredPremiumUsers.forEach((user) => {
      try {
        // Update membership tier to Free and clear subscription end date
        user.set('membershipTier', 'Free');
        user.set('subscriptionEndDate', null);
        
        // Save the updated user record
        $app.save(user);
        downgradedCount++;
        
        // Send notification email to the downgraded user
        const userEmail = user.get('email');
        const userName = user.get('name') || 'User';
        
        const message = new MailerMessage({
          from: {
            address: $app.settings().meta.senderAddress,
            name: $app.settings().meta.senderName
          },
          to: [{ address: userEmail }],
          subject: 'Your Premium Subscription Has Expired',
          html: '<h2>Subscription Downgraded</h2>' +
                '<p>Hello ' + userName + ',</p>' +
                '<p>Your Premium subscription has expired and your account has been automatically downgraded to the Free tier.</p>' +
                '<p>You can renew your Premium subscription at any time to regain access to premium features.</p>' +
                '<p>Thank you for being a valued member!</p>'
        });
        
        $app.newMailClient().send(message);
      } catch (userError) {
        console.log('Error processing user ' + user.id + ': ' + userError.message);
      }
    });
    
    console.log('Subscription downgrade job completed. Downgraded ' + downgradedCount + ' users from Premium to Free tier.');
  } catch (error) {
    console.log('Error in subscription_downgrade_job: ' + error.message);
  }
});