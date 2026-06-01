/// <reference path="../pb_data/types.d.ts" />
onRecordCreate((e) => {
  const poojaName = e.record.get("pooja_name");
  
  // If pooja_name is empty or null, try to populate it
  if (!poojaName || poojaName.trim() === "") {
    // Try to get pooja details from pooja_id
    const poojaId = e.record.get("pooja_id");
    if (poojaId) {
      try {
        const pooja = $app.findRecordById("poojas", poojaId);
        if (pooja) {
          e.record.set("pooja_name", pooja.get("name"));
        }
      } catch (err) {
        // If pooja not found, use a default
        e.record.set("pooja_name", "General Pooja Service");
      }
    } else {
      // No pooja_id, use default
      e.record.set("pooja_name", "General Pooja Service");
    }
  }
  
  // Ensure donation_amount is non-zero
  const donationAmount = e.record.get("donation_amount");
  if (!donationAmount || donationAmount === 0) {
    e.record.set("donation_amount", 1);
  }
  
  // Ensure email is valid
  const email = e.record.get("email");
  if (!email || email.trim() === "") {
    e.record.set("email", "noemail@temple.local");
  }
  
  e.next();
}, "pooja_bookings");

onRecordUpdate((e) => {
  const poojaName = e.record.get("pooja_name");
  
  // If pooja_name is empty or null, try to populate it
  if (!poojaName || poojaName.trim() === "") {
    // Try to get pooja details from pooja_id
    const poojaId = e.record.get("pooja_id");
    if (poojaId) {
      try {
        const pooja = $app.findRecordById("poojas", poojaId);
        if (pooja) {
          e.record.set("pooja_name", pooja.get("name"));
        }
      } catch (err) {
        // If pooja not found, use a default
        e.record.set("pooja_name", "General Pooja Service");
      }
    } else {
      // No pooja_id, use default
      e.record.set("pooja_name", "General Pooja Service");
    }
  }
  
  // Ensure donation_amount is non-zero
  const donationAmount = e.record.get("donation_amount");
  if (!donationAmount || donationAmount === 0) {
    e.record.set("donation_amount", 1);
  }
  
  // Ensure email is valid
  const email = e.record.get("email");
  if (!email || email.trim() === "") {
    e.record.set("email", "noemail@temple.local");
  }
  
  e.next();
}, "pooja_bookings");