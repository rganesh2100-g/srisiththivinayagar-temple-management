/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("subscriptions");
  collection.listRule = "user.id = @request.auth.id";
  collection.viewRule = "user.id = @request.auth.id";
  collection.createRule = "@request.auth.id != \"\"";
  collection.updateRule = "@request.auth.role = 'admin'";
  collection.deleteRule = "@request.auth.role = 'admin'";
  return app.save(collection);
}, (app) => {
  try {
  const collection = app.findCollectionByNameOrId("subscriptions");
  collection.createRule = "@request.auth.id != \"\"";
  collection.listRule = "user.id = @request.auth.id";
  collection.viewRule = "user.id = @request.auth.id";
  collection.updateRule = "@request.auth.role = 'admin'";
  collection.deleteRule = "@request.auth.role = 'admin'";
  return app.save(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection not found, skipping revert");
      return;
    }
    throw e;
  }
})