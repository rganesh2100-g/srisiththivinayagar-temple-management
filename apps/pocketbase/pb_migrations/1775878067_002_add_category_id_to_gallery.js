/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const photo_categoriesCollection = app.findCollectionByNameOrId("photo_categories");
  const collection = app.findCollectionByNameOrId("gallery");

  const existing = collection.fields.getByName("category_id");
  if (existing) {
    if (existing.type === "relation") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("category_id"); // exists with wrong type, remove first
  }

  collection.fields.add(new RelationField({
    name: "category_id",
    required: false,
    collectionId: photo_categoriesCollection.id,
    maxSelect: 1
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("gallery");
  collection.fields.removeByName("category_id");
  return app.save(collection);
})