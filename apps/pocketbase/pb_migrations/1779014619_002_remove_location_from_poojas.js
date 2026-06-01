/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("poojas");
  collection.fields.removeByName("location");
  return app.save(collection);
}, (app) => {
  try {

  const collection = app.findCollectionByNameOrId("poojas");
  collection.fields.add(new TextField({
    name: "location",
    required: true,
    min: 1,
    max: 200
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