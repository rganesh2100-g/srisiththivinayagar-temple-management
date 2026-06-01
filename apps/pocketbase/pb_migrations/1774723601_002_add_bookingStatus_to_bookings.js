/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("bookings");

  const existing = collection.fields.getByName("bookingStatus");
  if (existing) {
    if (existing.type === "select") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("bookingStatus"); // exists with wrong type, remove first
  }

  collection.fields.add(new SelectField({
    name: "bookingStatus",
    required: false,
    values: ["Pending", "Confirmed", "Cancelled"]
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("bookings");
  collection.fields.removeByName("bookingStatus");
  return app.save(collection);
})