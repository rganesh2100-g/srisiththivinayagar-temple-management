/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("users");

  const existing = collection.fields.getByName("subscription_status");
  if (existing) {
    if (existing.type === "select") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("subscription_status"); // exists with wrong type, remove first
  }

  collection.fields.add(new SelectField({
    name: "subscription_status",
    required: false,
    values: ["free", "premium"]
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("users");
  collection.fields.removeByName("subscription_status");
  return app.save(collection);
})