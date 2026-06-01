/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("photo_categories");

  const existing = collection.fields.getByName("default_expanded");
  if (existing) {
    if (existing.type === "bool") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("default_expanded"); // exists with wrong type, remove first
  }

  collection.fields.add(new BoolField({
    name: "default_expanded",
    required: false
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("photo_categories");
  collection.fields.removeByName("default_expanded");
  return app.save(collection);
})