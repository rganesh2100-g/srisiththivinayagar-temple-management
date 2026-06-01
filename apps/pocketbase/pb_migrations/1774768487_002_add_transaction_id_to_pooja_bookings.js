/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pooja_bookings");

  const existing = collection.fields.getByName("transaction_id");
  if (existing) {
    if (existing.type === "text") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("transaction_id"); // exists with wrong type, remove first
  }

  collection.fields.add(new TextField({
    name: "transaction_id",
    required: false
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pooja_bookings");
  collection.fields.removeByName("transaction_id");
  return app.save(collection);
})