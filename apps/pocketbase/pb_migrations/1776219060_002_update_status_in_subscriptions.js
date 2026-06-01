/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("subscriptions");
  
  // Check if status field exists before modifying
  try {
    const field = collection.fields.getByName("status");
    field.type = "select";
    field.values = ["pending", "approved", "rejected", "expired"];
    return app.save(collection);
  } catch (e) {
    // Field doesn't exist, skip migration
    console.log("Status field not found in subscriptions collection, skipping migration");
    return null;
  }
}, (app) => {
  const collection = app.findCollectionByNameOrId("subscriptions");
  
  // Check if status field exists before reverting
  try {
    const field = collection.fields.getByName("status");
    field.type = "text";
    return app.save(collection);
  } catch (e) {
    // Field doesn't exist, skip revert
    console.log("Status field not found in subscriptions collection, skipping revert");
    return null;
  }
})