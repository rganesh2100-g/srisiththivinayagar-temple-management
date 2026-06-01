/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pooja_bookings");

  const existing = collection.fields.getByName("pooja_name");
  if (existing) {
    if (existing.type === "text") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("pooja_name"); // exists with wrong type, remove first
  }

  collection.fields.add(new TextField({
    name: "pooja_name",
    required: false
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pooja_bookings");
  collection.fields.removeByName("pooja_name");
  return app.save(collection);
})