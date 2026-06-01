/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("temple_accounts");

  const existing = collection.fields.getByName("annadhanam_amount");
  if (existing) {
    if (existing.type === "number") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("annadhanam_amount"); // exists with wrong type, remove first
  }

  collection.fields.add(new NumberField({
    name: "annadhanam_amount",
    required: false
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("temple_accounts");
  collection.fields.removeByName("annadhanam_amount");
  return app.save(collection);
})