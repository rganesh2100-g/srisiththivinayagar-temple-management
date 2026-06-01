/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("poojas");
  collection.listRule = "status = 'published'";
  collection.viewRule = "status = 'published'";
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("poojas");
  collection.listRule = "status = 'published'";
  collection.viewRule = "status = 'published'";
  return app.save(collection);
})