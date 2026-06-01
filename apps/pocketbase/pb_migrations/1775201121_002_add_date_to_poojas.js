/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("poojas");

  const existing = collection.fields.getByName("date");
  if (existing) {
    if (existing.type === "date") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("date"); // exists with wrong type, remove first
  }

  collection.fields.add(new DateField({
    name: "date",
    required: true
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("poojas");
  collection.fields.removeByName("date");
  return app.save(collection);
})