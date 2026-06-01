/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("gallery");

  const existing = collection.fields.getByName("storage_size");
  if (existing) {
    if (existing.type === "number") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("storage_size"); // exists with wrong type, remove first
  }

  collection.fields.add(new NumberField({
    name: "storage_size",
    required: false
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("gallery");
  collection.fields.removeByName("storage_size");
  return app.save(collection);
})