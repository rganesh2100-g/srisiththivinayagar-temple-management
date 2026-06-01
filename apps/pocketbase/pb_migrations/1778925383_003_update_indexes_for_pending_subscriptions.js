/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pending_subscriptions");
  collection.indexes.push("CREATE INDEX idx_pending_subscriptions_user ON pending_subscriptions (user)");
  collection.indexes.push("CREATE INDEX idx_pending_subscriptions_subscription ON pending_subscriptions (subscription)");
  collection.indexes.push("CREATE INDEX idx_pending_subscriptions_status ON pending_subscriptions (status)");
  collection.indexes.push("CREATE INDEX idx_pending_subscriptions_payment_status ON pending_subscriptions (payment_status)");
  return app.save(collection);
}, (app) => {
  try {
  const collection = app.findCollectionByNameOrId("pending_subscriptions");
  collection.indexes = collection.indexes.filter(idx => !idx.includes("idx_pending_subscriptions_user"));
  collection.indexes = collection.indexes.filter(idx => !idx.includes("idx_pending_subscriptions_subscription"));
  collection.indexes = collection.indexes.filter(idx => !idx.includes("idx_pending_subscriptions_status"));
  collection.indexes = collection.indexes.filter(idx => !idx.includes("idx_pending_subscriptions_payment_status"));
  return app.save(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection not found, skipping revert");
      return;
    }
    throw e;
  }
})