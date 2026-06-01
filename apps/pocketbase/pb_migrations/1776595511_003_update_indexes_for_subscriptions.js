/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("subscriptions");
  collection.indexes.push("CREATE UNIQUE INDEX idx_subscriptions_transaction_id ON subscriptions (transaction_id)");
  collection.indexes.push("CREATE UNIQUE INDEX idx_subscriptions_transaction_reference ON subscriptions (transaction_reference)");
  return app.save(collection);
}, (app) => {
  try {
  const collection = app.findCollectionByNameOrId("subscriptions");
  collection.indexes = collection.indexes.filter(idx => !idx.includes("idx_subscriptions_transaction_id"));
  collection.indexes = collection.indexes.filter(idx => !idx.includes("idx_subscriptions_transaction_reference"));
  return app.save(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection not found, skipping revert");
      return;
    }
    throw e;
  }
})