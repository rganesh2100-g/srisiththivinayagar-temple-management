/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("temple_accounts");
  const field = collection.fields.getByName("year");
  field.required = true;
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("temple_accounts");
  const field = collection.fields.getByName("year");
  field.required = false;
  return app.save(collection);
})