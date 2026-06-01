/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("bookings");

  const existing = collection.fields.getByName("selectedDate");
  if (existing) {
    if (existing.type === "date") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("selectedDate"); // exists with wrong type, remove first
  }

  collection.fields.add(new DateField({
    name: "selectedDate",
    required: false
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("bookings");
  collection.fields.removeByName("selectedDate");
  return app.save(collection);
})