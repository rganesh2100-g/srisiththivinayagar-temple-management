/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("gallery");

  const existing = collection.fields.getByName("archived");
  if (existing) {
    if (existing.type === "bool") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("archived"); // exists with wrong type, remove first
  }

  collection.fields.add(new BoolField({
    name: "archived",
    required: false
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("gallery");
  collection.fields.removeByName("archived");
  return app.save(collection);
})