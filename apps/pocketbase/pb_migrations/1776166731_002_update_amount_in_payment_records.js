/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("payment_records");
  const field = collection.fields.getByName("amount");
  field.min = 0.01;
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("payment_records");
  const field = collection.fields.getByName("amount");
  field.min = None;
  return app.save(collection);
})