/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("subscriptions");
  const field = collection.fields.getByName("status");
  field.required = true;
  field.values = ["Pending", "Approved", "Rejected"];
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("subscriptions");
  const field = collection.fields.getByName("status");
  field.required = true;
  field.values = ["Pending", "Approved"];
  return app.save(collection);
})