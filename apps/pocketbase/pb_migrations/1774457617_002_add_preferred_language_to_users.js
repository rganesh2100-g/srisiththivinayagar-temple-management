/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("users");

  const existing = collection.fields.getByName("preferred_language");
  if (existing) {
    if (existing.type === "select") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("preferred_language"); // exists with wrong type, remove first
  }

  collection.fields.add(new SelectField({
    name: "preferred_language",
    required: false,
    values: ["Tamil", "English", "Deutsch"]
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("users");
  collection.fields.removeByName("preferred_language");
  return app.save(collection);
})