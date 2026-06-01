/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("poojas");

  const existing = collection.fields.getByName("specificDays");
  if (existing) {
    if (existing.type === "text") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("specificDays"); // exists with wrong type, remove first
  }

  collection.fields.add(new TextField({
    name: "specificDays",
    required: false
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("poojas");
  collection.fields.removeByName("specificDays");
  return app.save(collection);
})