/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("subscriptions");

  const existing = collection.fields.getByName("membership_type");
  if (existing) {
    if (existing.type === "text") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("membership_type"); // exists with wrong type, remove first
  }

  collection.fields.add(new TextField({
    name: "membership_type",
    required: true
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("subscriptions");
  collection.fields.removeByName("membership_type");
  return app.save(collection);
})