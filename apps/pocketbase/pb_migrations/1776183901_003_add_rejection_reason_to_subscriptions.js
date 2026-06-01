/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("subscriptions");

  const existing = collection.fields.getByName("rejection_reason");
  if (existing) {
    if (existing.type === "text") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("rejection_reason"); // exists with wrong type, remove first
  }

  collection.fields.add(new TextField({
    name: "rejection_reason",
    required: false
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("subscriptions");
  collection.fields.removeByName("rejection_reason");
  return app.save(collection);
})