/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("festivals");
  collection.fields.removeByName("image_url");
  return app.save(collection);
}, (app) => {

  const collection = app.findCollectionByNameOrId("festivals");
  collection.fields.add(new TextField({
    name: "image_url",
    required: false,
    min: 0,
    max: 0
  }));
  return app.save(collection);
})