/// <reference path="../pb_data/types.d.ts" />
onRecordAfterCreateSuccess((e) => {
  const userId = e.record.get("user_id");
  const userEmail = e.record.get("user_email");
  
  if (!userEmail) {
    e.next();
    return;
  }
  
  const message = new MailerMessage({
    from: {
      address: $app.settings().meta.senderAddress,
      name: $app.settings().meta.senderName
    },
    to: [{ address: userEmail }],
    subject: "Premium Membership Request Received",
    html: "<h2>Premium Membership Request Received</h2><p>Your premium membership request is pending admin approval. We will notify you once it is reviewed.</p>"
  });
  
  $app.newMailClient().send(message);
  e.next();
}, "subscriptions");