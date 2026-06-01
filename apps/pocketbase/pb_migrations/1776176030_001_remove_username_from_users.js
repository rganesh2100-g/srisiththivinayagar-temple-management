/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("users");
  collection.fields.removeByName("username");
  return app.save(collection);
}, (app) => {

  const collection = app.findCollectionByNameOrId("users");
  collection.fields.add(new TextField({
    name: "username",
    required: false
  }));
  return app.save(collection);
})