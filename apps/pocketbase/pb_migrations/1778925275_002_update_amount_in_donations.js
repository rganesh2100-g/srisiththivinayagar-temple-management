/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("donations");
  const field = collection.fields.getByName("amount");
  field.required = true;
  field.min = 1;
  field.max = 1000000;
  return app.save(collection);
}, (app) => {
  try {
  const collection = app.findCollectionByNameOrId("donations");
  const field = collection.fields.getByName("amount");
  if (!field) { console.log("Field not found, skipping revert"); return; }
  field.required = true;
  field.min = None;
  field.max = None;
  return app.save(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection or field not found, skipping revert");
      return;
    }
    throw e;
  }
})