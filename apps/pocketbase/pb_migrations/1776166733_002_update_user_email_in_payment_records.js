/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("payment_records");
  const field = collection.fields.getByName("user_email");
  field.required = true;
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("payment_records");
  const field = collection.fields.getByName("user_email");
  field.required = false;
  return app.save(collection);
})