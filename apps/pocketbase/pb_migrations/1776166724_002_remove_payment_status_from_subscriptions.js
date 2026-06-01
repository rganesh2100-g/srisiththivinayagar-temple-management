/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("subscriptions");
  collection.fields.removeByName("payment_status");
  return app.save(collection);
}, (app) => {

  const collection = app.findCollectionByNameOrId("subscriptions");
  collection.fields.add(new SelectField({
    name: "payment_status",
    required: false,
    values: ["pending", "approved", "rejected"]
  }));
  return app.save(collection);
})