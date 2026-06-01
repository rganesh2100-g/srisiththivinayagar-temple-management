/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("subscriptions");
  collection.indexes.push("CREATE INDEX idx_subscriptions_user ON subscriptions (user)");
  collection.indexes.push("CREATE INDEX idx_subscriptions_status ON subscriptions (status)");
  collection.indexes.push("CREATE INDEX idx_subscriptions_plan_type ON subscriptions (plan_type)");
  return app.save(collection);
}, (app) => {
  try {
  const collection = app.findCollectionByNameOrId("subscriptions");
  collection.indexes = collection.indexes.filter(idx => !idx.includes("idx_subscriptions_user"));
  collection.indexes = collection.indexes.filter(idx => !idx.includes("idx_subscriptions_status"));
  collection.indexes = collection.indexes.filter(idx => !idx.includes("idx_subscriptions_plan_type"));
  return app.save(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection not found, skipping revert");
      return;
    }
    throw e;
  }
})