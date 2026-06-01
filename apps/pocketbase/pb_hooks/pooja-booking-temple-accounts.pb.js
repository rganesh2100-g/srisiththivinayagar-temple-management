/// <reference path="../pb_data/types.d.ts" />
onRecordAfterCreateSuccess((e) => {
  try {
    const booking = e.record;
    const userId = booking.get("user_id");
    const donationAmount = booking.get("donation_amount");
    const poojaDate = booking.get("pooja_date");
    const bookingDate = booking.get("booking_date");

    if (donationAmount && donationAmount > 0) {
      // Create temple account entry for pooja donation
      const templeAccount = new Record();
      templeAccount.collection().name = "temple_accounts";
      templeAccount.set("member_name", userId);
      templeAccount.set("amount", donationAmount);
      templeAccount.set("category", "Pooja Services");
      templeAccount.set("date", poojaDate || bookingDate);
      templeAccount.set("month", new Date(poojaDate || bookingDate).toLocaleString('default', { month: 'long' }));
      templeAccount.set("year", new Date(poojaDate || bookingDate).getFullYear());
      templeAccount.set("transaction_id", booking.id);

      $app.dao().saveRecord(templeAccount);
    }
  } catch (error) {
    console.log("Error creating temple account from pooja booking:", error.message);
  }
  e.next();
}, "pooja_bookings");

onRecordAfterUpdateSuccess((e) => {
  try {
    const booking = e.record;
    const original = e.record.original();
    
    // Only process if status changed to Confirmed
    if (original.get("status") !== "Confirmed" && booking.get("status") === "Confirmed") {
      const userId = booking.get("user_id");
      const donationAmount = booking.get("donation_amount");
      const poojaDate = booking.get("pooja_date");
      const bookingDate = booking.get("booking_date");

      if (donationAmount && donationAmount > 0) {
        // Create temple account entry for pooja donation
        const templeAccount = new Record();
        templeAccount.collection().name = "temple_accounts";
        templeAccount.set("member_name", userId);
        templeAccount.set("amount", donationAmount);
        templeAccount.set("category", "Pooja Services");
        templeAccount.set("date", poojaDate || bookingDate);
        templeAccount.set("month", new Date(poojaDate || bookingDate).toLocaleString('default', { month: 'long' }));
        templeAccount.set("year", new Date(poojaDate || bookingDate).getFullYear());
        templeAccount.set("transaction_id", booking.id);

        $app.dao().saveRecord(templeAccount);
      }
    }
  } catch (error) {
    console.log("Error updating temple account from pooja booking:", error.message);
  }
  e.next();
}, "pooja_bookings");