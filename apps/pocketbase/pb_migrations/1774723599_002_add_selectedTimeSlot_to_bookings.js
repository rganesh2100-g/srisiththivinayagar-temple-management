/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("bookings");

  const existing = collection.fields.getByName("selectedTimeSlot");
  if (existing) {
    if (existing.type === "text") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("selectedTimeSlot"); // exists with wrong type, remove first
  }

  collection.fields.add(new TextField({
    name: "selectedTimeSlot",
    required: false
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("bookings");
  collection.fields.removeByName("selectedTimeSlot");
  return app.save(collection);
})