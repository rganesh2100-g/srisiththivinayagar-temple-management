/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const expense_categoriesCollection = app.findCollectionByNameOrId("expense_categories");
  const collection = app.findCollectionByNameOrId("expenses");

  const existing = collection.fields.getByName("category_id");
  if (existing) {
    if (existing.type === "relation") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("category_id"); // exists with wrong type, remove first
  }

  collection.fields.add(new RelationField({
    name: "category_id",
    required: true,
    collectionId: expense_categoriesCollection.id,
    maxSelect: 1
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("expenses");
  collection.fields.removeByName("category_id");
  return app.save(collection);
})