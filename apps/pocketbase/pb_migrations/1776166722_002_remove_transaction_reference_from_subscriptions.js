/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("subscriptions");
  collection.fields.removeByName("transaction_reference");
  return app.save(collection);
}, (app) => {

  const collection = app.findCollectionByNameOrId("subscriptions");
  collection.fields.add(new TextField({
    name: "transaction_reference",
    required: false
  }));
  return app.save(collection);
})