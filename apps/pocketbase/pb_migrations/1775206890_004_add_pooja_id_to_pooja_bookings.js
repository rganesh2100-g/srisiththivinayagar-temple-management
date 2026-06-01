/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pooja_bookings");

  const existing = collection.fields.getByName("pooja_id");
  if (existing) {
    if (existing.type === "text") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("pooja_id"); // exists with wrong type, remove first
  }

  collection.fields.add(new TextField({
    name: "pooja_id",
    required: true
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pooja_bookings");
  collection.fields.removeByName("pooja_id");
  return app.save(collection);
})