/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pooja_bookings");

  const existing = collection.fields.getByName("booking_time");
  if (existing) {
    if (existing.type === "text") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("booking_time"); // exists with wrong type, remove first
  }

  collection.fields.add(new TextField({
    name: "booking_time",
    required: true
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pooja_bookings");
  collection.fields.removeByName("booking_time");
  return app.save(collection);
})