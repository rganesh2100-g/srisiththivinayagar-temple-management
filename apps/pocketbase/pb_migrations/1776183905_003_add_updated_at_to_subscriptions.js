/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("subscriptions");

  const existing = collection.fields.getByName("updated_at");
  if (existing) {
    if (existing.type === "autodate") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("updated_at"); // exists with wrong type, remove first
  }

  collection.fields.add(new AutodateField({
    name: "updated_at",
    onCreate: true,
    onUpdate: true
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("subscriptions");
  collection.fields.removeByName("updated_at");
  return app.save(collection);
})