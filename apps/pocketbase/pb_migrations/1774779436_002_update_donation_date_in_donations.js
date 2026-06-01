/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("donations");
  const field = collection.fields.getByName("donation_date");
  field.required = false;
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("donations");
  const field = collection.fields.getByName("donation_date");
  field.required = true;
  return app.save(collection);
})