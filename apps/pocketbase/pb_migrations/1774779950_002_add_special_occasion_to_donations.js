/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("donations");

  const existing = collection.fields.getByName("special_occasion");
  if (existing) {
    if (existing.type === "text") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("special_occasion"); // exists with wrong type, remove first
  }

  collection.fields.add(new TextField({
    name: "special_occasion",
    required: false
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("donations");
  collection.fields.removeByName("special_occasion");
  return app.save(collection);
})