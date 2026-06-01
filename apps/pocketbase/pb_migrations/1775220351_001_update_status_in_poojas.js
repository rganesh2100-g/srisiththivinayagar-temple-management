/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("poojas");
  const field = collection.fields.getByName("status");
  field.values = ["draft", "published", "archived"];
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("poojas");
  const field = collection.fields.getByName("status");
  field.values = ["draft", "published"];
  return app.save(collection);
})