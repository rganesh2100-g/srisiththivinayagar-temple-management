/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("users");

  const existing = collection.fields.getByName("subscription_expiry_date");
  if (existing) {
    if (existing.type === "date") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("subscription_expiry_date"); // exists with wrong type, remove first
  }

  collection.fields.add(new DateField({
    name: "subscription_expiry_date",
    required: false
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("users");
  collection.fields.removeByName("subscription_expiry_date");
  return app.save(collection);
})