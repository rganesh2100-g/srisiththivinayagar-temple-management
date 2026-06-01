/// <reference path="../pb_data/types.d.ts" />
onRecordAfterUpdateSuccess((e) => {
  const status = e.record.get("status");
  const userEmail = e.record.get("user_email");
  
  if (status !== "Rejected" || !userEmail) {
    e.next();
    return;
  }
  
  const message = new MailerMessage({
    from: {
      address: $app.settings().meta.senderAddress,
      name: $app.settings().meta.senderName
    },
    to: [{ address: userEmail }],
    subject: "Premium Membership Request Rejected",
    html: "<h2>Premium Membership Request Rejected</h2><p>Your premium membership request was not approved. You can submit a new request anytime.</p>"
  });
  
  $app.newMailClient().send(message);
  e.next();
}, "subscriptions");