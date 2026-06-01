/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("donations");
  collection.indexes.push("CREATE INDEX idx_donations_user ON donations (user)");
  collection.indexes.push("CREATE INDEX idx_donations_status ON donations (status)");
  collection.indexes.push("CREATE INDEX idx_donations_payment_status ON donations (payment_status)");
  collection.indexes.push("CREATE INDEX idx_donations_donation_date ON donations (donation_date)");
  return app.save(collection);
}, (app) => {
  try {
  const collection = app.findCollectionByNameOrId("donations");
  collection.indexes = collection.indexes.filter(idx => !idx.includes("idx_donations_user"));
  collection.indexes = collection.indexes.filter(idx => !idx.includes("idx_donations_status"));
  collection.indexes = collection.indexes.filter(idx => !idx.includes("idx_donations_payment_status"));
  collection.indexes = collection.indexes.filter(idx => !idx.includes("idx_donations_donation_date"));
  return app.save(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection not found, skipping revert");
      return;
    }
    throw e;
  }
})