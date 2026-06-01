/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("temple_accounts");

  const existing = collection.fields.getByName("subscription_type");
  if (existing) {
    if (existing.type === "select") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("subscription_type"); // exists with wrong type, remove first
  }

  collection.fields.add(new SelectField({
    name: "subscription_type",
    required: false,
    values: ["Monthly", "Yearly"]
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("temple_accounts");
  collection.fields.removeByName("subscription_type");
  return app.save(collection);
})