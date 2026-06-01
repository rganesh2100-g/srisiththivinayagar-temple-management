/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("expenses");

  const existing = collection.fields.getByName("voucher_id");
  if (existing) {
    if (existing.type === "text") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("voucher_id"); // exists with wrong type, remove first
  }

  collection.fields.add(new TextField({
    name: "voucher_id",
    required: false
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("expenses");
  collection.fields.removeByName("voucher_id");
  return app.save(collection);
})