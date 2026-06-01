/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("temple_accounts");

  const existing = collection.fields.getByName("notes");
  if (existing) {
    if (existing.type === "text") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("notes"); // exists with wrong type, remove first
  }

  collection.fields.add(new TextField({
    name: "notes",
    required: false
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("temple_accounts");
  collection.fields.removeByName("notes");
  return app.save(collection);
})