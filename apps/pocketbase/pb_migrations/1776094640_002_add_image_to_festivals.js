/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("festivals");

  const existing = collection.fields.getByName("image");
  if (existing) {
    if (existing.type === "file") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("image"); // exists with wrong type, remove first
  }

  collection.fields.add(new FileField({
    name: "image",
    required: false,
    maxSelect: 1,
    maxSize: 20971520
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("festivals");
  collection.fields.removeByName("image");
  return app.save(collection);
})