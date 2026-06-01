/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("users");

  const existing = collection.fields.getByName("fontSizePreference");
  if (existing) {
    if (existing.type === "select") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("fontSizePreference"); // exists with wrong type, remove first
  }

  collection.fields.add(new SelectField({
    name: "fontSizePreference",
    required: false,
    values: ["0.9", "1.0", "1.2"]
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("users");
  collection.fields.removeByName("fontSizePreference");
  return app.save(collection);
})