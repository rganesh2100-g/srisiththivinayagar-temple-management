/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("festivals");

  const existing = collection.fields.getByName("is_deleted");
  if (existing) {
    if (existing.type === "bool") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("is_deleted"); // exists with wrong type, remove first
  }

  collection.fields.add(new BoolField({
    name: "is_deleted",
    required: false
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("festivals");
  collection.fields.removeByName("is_deleted");
  return app.save(collection);
})