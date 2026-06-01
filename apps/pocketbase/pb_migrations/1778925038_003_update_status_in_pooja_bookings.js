/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pooja_bookings");
  const field = collection.fields.getByName("status");
  field.values = ["pending", "approved", "rejected", "completed", "cancelled"];
  return app.save(collection);
}, (app) => {
  try {
  const collection = app.findCollectionByNameOrId("pooja_bookings");
  const field = collection.fields.getByName("status");
  if (!field) { console.log("Field not found, skipping revert"); return; }
  field.values = ["Pending Approval", "Awaiting User Response", "Confirmed", "Cancelled", "Completed"];
  return app.save(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection or field not found, skipping revert");
      return;
    }
    throw e;
  }
})