/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const festivalsCollection = app.findCollectionByNameOrId("festivals");
  const collection = app.findCollectionByNameOrId("poojas");

  const existing = collection.fields.getByName("festival");
  if (existing) {
    if (existing.type === "relation") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("festival"); // exists with wrong type, remove first
  }

  collection.fields.add(new RelationField({
    name: "festival",
    required: false,
    collectionId: festivalsCollection.id,
    maxSelect: 1
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("poojas");
  collection.fields.removeByName("festival");
  return app.save(collection);
})