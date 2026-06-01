/// <reference path="../pb_data/types.d.ts" />
onRecordUpdate((e) => {
  const expiryDate = e.record.get("expiry_date");
  
  if (!expiryDate) {
    e.next();
    return;
  }
  
  const expiry = new Date(expiryDate);
  const today = new Date();
  const daysUntilExpiry = Math.floor((expiry - today) / (1000 * 60 * 60 * 24));
  
  if (daysUntilExpiry === 7) {
    const userEmail = e.record.get("user_email");
    
    if (userEmail) {
      const message = new MailerMessage({
        from: {
          address: $app.settings().meta.senderAddress,
          name: $app.settings().meta.senderName
        },
        to: [{ address: userEmail }],
        subject: "Your Premium Membership is Expiring Soon",
        html: "<h2>Your Premium Membership is Expiring Soon</h2><p>Your premium membership will expire in 7 days. Click here to renew your membership.</p>"
      });
      
      $app.newMailClient().send(message);
    }
  }
  
  e.next();
}, "subscriptions");