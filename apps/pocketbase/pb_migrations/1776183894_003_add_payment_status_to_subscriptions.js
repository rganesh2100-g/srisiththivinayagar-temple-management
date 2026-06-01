/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("subscriptions");

  const existing = collection.fields.getByName("payment_status");
  if (existing) {
    if (existing.type === "select") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("payment_status"); // exists with wrong type, remove first
  }

  collection.fields.add(new SelectField({
    name: "payment_status",
    required: true,
    values: ["pending", "approved", "rejected", "expired"]
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("subscriptions");
  collection.fields.removeByName("payment_status");
  return app.save(collection);
})