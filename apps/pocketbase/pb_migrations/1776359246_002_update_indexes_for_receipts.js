/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("receipts");
  collection.indexes.push("CREATE UNIQUE INDEX idx_receipts_receipt_id ON receipts (receipt_id)");
  return app.save(collection);
}, (app) => {
  try {
  const collection = app.findCollectionByNameOrId("receipts");
  collection.indexes = collection.indexes.filter(idx => !idx.includes("idx_receipts_receipt_id"));
  return app.save(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection not found, skipping revert");
      return;
    }
    throw e;
  }
})