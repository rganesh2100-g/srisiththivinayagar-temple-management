/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("users");
  collection.fields.removeByName("user_id");
  return app.save(collection);
}, (app) => {

  const collection = app.findCollectionByNameOrId("users");
  collection.fields.add(new TextField({
    name: "user_id",
    required: true
  }));
  return app.save(collection);
})