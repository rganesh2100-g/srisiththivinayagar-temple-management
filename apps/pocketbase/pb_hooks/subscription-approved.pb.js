/// <reference path="../pb_data/types.d.ts" />
onRecordAfterUpdateSuccess((e) => {
  const status = e.record.get("status");
  const userId = e.record.get("user_id");
  const userEmail = e.record.get("user_email");
  
  if (status !== "Approved" || !userEmail) {
    e.next();
    return;
  }
  
  const message = new MailerMessage({
    from: {
      address: $app.settings().meta.senderAddress,
      name: $app.settings().meta.senderName
    },
    to: [{ address: userEmail }],
    subject: "Premium Membership Approved!",
    html: "<h2>Premium Membership Approved!</h2><p>Congratulations! Your premium membership has been approved and is now active.</p>"
  });
  
  $app.newMailClient().send(message);
  
  try {
    const user = $app.findRecordById("users", userId);
    if (user) {
      user.set("premium_status", "Active");
      $app.save(user);
    }
  } catch (err) {
    console.log("Error updating user premium_status: " + err.message);
  }
  
  e.next();
}, "subscriptions");