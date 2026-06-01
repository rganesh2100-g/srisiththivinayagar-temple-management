/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("subscriptions");
  collection.fields.removeByName("created_at");
  return app.save(collection);
}, (app) => {

  const collection = app.findCollectionByNameOrId("subscriptions");
  collection.fields.add(new AutodateField({
    name: "created_at",
    onCreate: true,
    onUpdate: false
  }));
  return app.save(collection);
})