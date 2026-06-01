/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("donations");

  const existing = collection.fields.getByName("receipt_created_at");
  if (existing) {
    if (existing.type === "date") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("receipt_created_at"); // exists with wrong type, remove first
  }

  collection.fields.add(new DateField({
    name: "receipt_created_at",
    required: false
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("donations");
  collection.fields.removeByName("receipt_created_at");
  return app.save(collection);
})