/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("poojas");
  collection.fields.removeByName("booking_status");
  return app.save(collection);
}, (app) => {

  const collection = app.findCollectionByNameOrId("poojas");
  collection.fields.add(new SelectField({
    name: "booking_status",
    required: true,
    values: ["available", "booked"],
    maxSelect: 0
  }));
  return app.save(collection);
})