/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("poojas");

  const existing = collection.fields.getByName("booking_status");
  if (existing) {
    if (existing.type === "select") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("booking_status"); // exists with wrong type, remove first
  }

  collection.fields.add(new SelectField({
    name: "booking_status",
    required: true,
    values: ["available", "booked"]
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("poojas");
  collection.fields.removeByName("booking_status");
  return app.save(collection);
})