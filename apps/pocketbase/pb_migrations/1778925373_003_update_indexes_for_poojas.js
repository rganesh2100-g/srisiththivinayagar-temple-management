/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("poojas");
  collection.indexes.push("CREATE INDEX idx_poojas_name ON poojas (name)");
  collection.indexes.push("CREATE INDEX idx_poojas_availabilityType ON poojas (availabilityType)");
  collection.indexes.push("CREATE INDEX idx_poojas_status ON poojas (status)");
  return app.save(collection);
}, (app) => {
  try {
  const collection = app.findCollectionByNameOrId("poojas");
  collection.indexes = collection.indexes.filter(idx => !idx.includes("idx_poojas_name"));
  collection.indexes = collection.indexes.filter(idx => !idx.includes("idx_poojas_availabilityType"));
  collection.indexes = collection.indexes.filter(idx => !idx.includes("idx_poojas_status"));
  return app.save(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection not found, skipping revert");
      return;
    }
    throw e;
  }
})