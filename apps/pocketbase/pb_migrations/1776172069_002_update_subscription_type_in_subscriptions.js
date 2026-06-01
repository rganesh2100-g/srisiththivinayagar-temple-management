/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("subscriptions");
  const field = collection.fields.getByName("subscription_type");
  field.required = true;
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("subscriptions");
  const field = collection.fields.getByName("subscription_type");
  field.required = true;
  return app.save(collection);
})