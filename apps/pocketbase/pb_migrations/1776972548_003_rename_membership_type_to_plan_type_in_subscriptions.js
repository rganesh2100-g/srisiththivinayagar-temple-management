/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("subscriptions");
  const field = collection.fields.getByName("membership_type");
  field.name = "plan_type";
  return app.save(collection);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("subscriptions");
    const field = collection.fields.getByName("plan_type");
    if (!field) { console.log("Field not found, skipping revert"); return; }
    field.name = "membership_type";
    return app.save(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection or field not found, skipping revert");
      return;
    }
    throw e;
  }
})