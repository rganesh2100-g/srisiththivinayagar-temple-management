/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("payment_records");
  collection.indexes.push("CREATE UNIQUE INDEX idx_payment_records_transaction_id ON payment_records (transaction_id)");
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("payment_records");
  collection.indexes = collection.indexes.filter(idx => !idx.includes("idx_payment_records_transaction_id"));
  return app.save(collection);
})