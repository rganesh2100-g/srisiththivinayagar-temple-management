/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("temple_accounts");

  const existing = collection.fields.getByName("pooja_services_amount");
  if (existing) {
    if (existing.type === "number") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("pooja_services_amount"); // exists with wrong type, remove first
  }

  collection.fields.add(new NumberField({
    name: "pooja_services_amount",
    required: false
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("temple_accounts");
  collection.fields.removeByName("pooja_services_amount");
  return app.save(collection);
})