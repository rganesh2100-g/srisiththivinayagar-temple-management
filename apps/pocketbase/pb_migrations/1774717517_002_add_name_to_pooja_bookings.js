/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pooja_bookings");

  const existing = collection.fields.getByName("name");
  if (existing) {
    if (existing.type === "text") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("name"); // exists with wrong type, remove first
  }

  collection.fields.add(new TextField({
    name: "name",
    required: true
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pooja_bookings");
  collection.fields.removeByName("name");
  return app.save(collection);
})