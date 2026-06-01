/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pooja_bookings");
  const field = collection.fields.getByName("booking_status");
  field.values = ["Confirmed", "Pending Approval", "Cancelled"];
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pooja_bookings");
  const field = collection.fields.getByName("booking_status");
  field.values = ["Pending Approval", "Confirmed", "Cancelled"];
  return app.save(collection);
})