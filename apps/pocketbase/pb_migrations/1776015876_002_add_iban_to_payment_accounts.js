/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("payment_accounts");

  const existing = collection.fields.getByName("iban");
  if (existing) {
    if (existing.type === "text") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("iban"); // exists with wrong type, remove first
  }

  collection.fields.add(new TextField({
    name: "iban",
    required: false
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("payment_accounts");
  collection.fields.removeByName("iban");
  return app.save(collection);
})