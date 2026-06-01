/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("poojas");
  collection.fields.removeByName("pooja_name");
  return app.save(collection);
}, (app) => {

  const collection = app.findCollectionByNameOrId("poojas");
  collection.fields.add(new TextField({
    name: "pooja_name",
    required: true,
    min: 0,
    max: 0
  }));
  return app.save(collection);
})