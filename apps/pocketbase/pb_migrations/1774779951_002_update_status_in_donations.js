/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("donations");
  const field = collection.fields.getByName("status");
  field.values = ["pending", "approved", "rejected"];
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("donations");
  const field = collection.fields.getByName("status");
  field.values = ["pending", "approved"];
  return app.save(collection);
})