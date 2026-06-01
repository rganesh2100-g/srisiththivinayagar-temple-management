/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pooja_bookings");
  const field = collection.fields.getByName("status");
  field.values = ["Pending Approval", "Awaiting User Response", "Confirmed", "Cancelled", "Completed"];
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pooja_bookings");
  const field = collection.fields.getByName("status");
  field.values = ["Pending Approval", "Confirmed", "Cancelled", "Completed"];
  return app.save(collection);
})