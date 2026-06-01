/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("poojas");
  const field = collection.fields.getByName("price");
  field.required = true;
  field.min = 0;
  field.max = 100000;
  return app.save(collection);
}, (app) => {
  try {
  const collection = app.findCollectionByNameOrId("poojas");
  const field = collection.fields.getByName("price");
  if (!field) { console.log("Field not found, skipping revert"); return; }
  field.required = true;
  field.min = 0;
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