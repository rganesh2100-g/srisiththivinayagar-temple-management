/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("poojas");
  const field = collection.fields.getByName("specificDays");
  field.required = true;
  field.min = 1;
  field.max = 500;
  return app.save(collection);
}, (app) => {
  try {
  const collection = app.findCollectionByNameOrId("poojas");
  const field = collection.fields.getByName("specificDays");
  if (!field) { console.log("Field not found, skipping revert"); return; }
  field.required = false;
  field.min = 0;
  field.max = 0;
  return app.save(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection or field not found, skipping revert");
      return;
    }
    throw e;
  }
})