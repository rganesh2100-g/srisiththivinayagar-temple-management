/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("users");

  const existing = collection.fields.getByName("membership_type");
  if (existing) {
    if (existing.type === "select") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("membership_type"); // exists with wrong type, remove first
  }

  collection.fields.add(new SelectField({
    name: "membership_type",
    required: false,
    values: ["free", "premium"]
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("users");
  collection.fields.removeByName("membership_type");
  return app.save(collection);
})