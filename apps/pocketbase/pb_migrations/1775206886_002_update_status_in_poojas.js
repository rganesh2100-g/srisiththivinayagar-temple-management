/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("poojas");
  const field = collection.fields.getByName("status");
  field.required = true;
  field.values = ["draft", "published"];
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("poojas");
  const field = collection.fields.getByName("status");
  field.required = false;
  field.values = ["Published", "Draft"];
  return app.save(collection);
})