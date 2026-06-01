/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pooja_bookings");
  const field = collection.fields.getByName("status");
  field.name = "booking_status";
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pooja_bookings");
  const field = collection.fields.getByName("booking_status");
  field.name = "status";
  return app.save(collection);
})