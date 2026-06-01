/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("expenses");
  collection.indexes.push("CREATE INDEX idx_expenses_category_id ON expenses (category_id)");
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("expenses");
  collection.indexes = collection.indexes.filter(idx => !idx.includes("idx_expenses_category_id"));
  return app.save(collection);
})