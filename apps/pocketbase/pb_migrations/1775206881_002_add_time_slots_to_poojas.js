/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("poojas");

  const existing = collection.fields.getByName("time_slots");
  if (existing) {
    if (existing.type === "text") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("time_slots"); // exists with wrong type, remove first
  }

  collection.fields.add(new TextField({
    name: "time_slots"
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("poojas");
  collection.fields.removeByName("time_slots");
  return app.save(collection);
})