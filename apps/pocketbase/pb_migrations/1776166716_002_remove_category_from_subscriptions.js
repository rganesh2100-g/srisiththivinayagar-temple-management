/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("subscriptions");
  collection.fields.removeByName("category");
  return app.save(collection);
}, (app) => {

  const collection = app.findCollectionByNameOrId("subscriptions");
  collection.fields.add(new TextField({
    name: "category",
    required: false
  }));
  return app.save(collection);
})