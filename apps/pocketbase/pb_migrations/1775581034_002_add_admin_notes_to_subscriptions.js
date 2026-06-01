/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("subscriptions");

  const existing = collection.fields.getByName("admin_notes");
  if (existing) {
    if (existing.type === "text") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("admin_notes"); // exists with wrong type, remove first
  }

  collection.fields.add(new TextField({
    name: "admin_notes",
    required: false
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("subscriptions");
  collection.fields.removeByName("admin_notes");
  return app.save(collection);
})