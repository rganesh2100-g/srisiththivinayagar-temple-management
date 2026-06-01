/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("expenses");

  const existing = collection.fields.getByName("quantity");
  if (existing) {
    if (existing.type === "number") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("quantity"); // exists with wrong type, remove first
  }

  collection.fields.add(new NumberField({
    name: "quantity",
    required: false
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("expenses");
  collection.fields.removeByName("quantity");
  return app.save(collection);
})