/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("subscriptions");
  collection.fields.removeByName("membership_type");
  return app.save(collection);
}, (app) => {
  try {

  const collection = app.findCollectionByNameOrId("subscriptions");
  collection.fields.add(new TextField({
    name: "membership_type",
    required: true
  }));
  return app.save(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection not found, skipping revert");
      return;
    }
    throw e;
  }
})