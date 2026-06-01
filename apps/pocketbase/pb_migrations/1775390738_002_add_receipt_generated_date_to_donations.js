/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("donations");

  const existing = collection.fields.getByName("receipt_generated_date");
  if (existing) {
    if (existing.type === "date") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("receipt_generated_date"); // exists with wrong type, remove first
  }

  collection.fields.add(new DateField({
    name: "receipt_generated_date",
    required: false
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("donations");
  collection.fields.removeByName("receipt_generated_date");
  return app.save(collection);
})