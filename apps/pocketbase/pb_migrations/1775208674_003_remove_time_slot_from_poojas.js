/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("poojas");
  collection.fields.removeByName("time_slot");
  return app.save(collection);
}, (app) => {

  const collection = app.findCollectionByNameOrId("poojas");
  collection.fields.add(new TextField({
    name: "time_slot",
    required: true,
    min: 0,
    max: 0
  }));
  return app.save(collection);
})