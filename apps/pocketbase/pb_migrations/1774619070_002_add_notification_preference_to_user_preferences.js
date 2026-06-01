/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("user_preferences");

  const existing = collection.fields.getByName("notification_preference");
  if (existing) {
    if (existing.type === "select") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("notification_preference"); // exists with wrong type, remove first
  }

  collection.fields.add(new SelectField({
    name: "notification_preference",
    required: false,
    values: ["all", "important", "none"]
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("user_preferences");
  collection.fields.removeByName("notification_preference");
  return app.save(collection);
})