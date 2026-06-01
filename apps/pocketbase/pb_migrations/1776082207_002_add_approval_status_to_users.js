/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("users");

  const existing = collection.fields.getByName("approval_status");
  if (existing) {
    if (existing.type === "select") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("approval_status"); // exists with wrong type, remove first
  }

  collection.fields.add(new SelectField({
    name: "approval_status",
    required: false,
    values: ["pending_approval", "approved", "renewal_pending_approval"]
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("users");
  collection.fields.removeByName("approval_status");
  return app.save(collection);
})