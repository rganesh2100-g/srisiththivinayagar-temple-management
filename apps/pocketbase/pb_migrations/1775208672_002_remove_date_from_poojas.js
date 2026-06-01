/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("poojas");
  collection.fields.removeByName("date");
  return app.save(collection);
}, (app) => {

  const collection = app.findCollectionByNameOrId("poojas");
  collection.fields.add(new DateField({
    name: "date",
    required: true
  }));
  return app.save(collection);
})