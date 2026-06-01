/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("subscriptions");
  collection.fields.removeByName("transactionId");
  return app.save(collection);
}, (app) => {

  const collection = app.findCollectionByNameOrId("subscriptions");
  collection.fields.add(new TextField({
    name: "transactionId",
    required: false
  }));
  return app.save(collection);
})