/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("subscriptions");
  collection.listRule = "user_id.id = @request.auth.id || @request.auth.role = 'admin'";
  collection.viewRule = "user_id.id = @request.auth.id || @request.auth.role = 'admin'";
  collection.createRule = "";
  collection.updateRule = "@request.auth.role = 'admin'";
  collection.deleteRule = "@request.auth.role = 'admin'";
  return app.save(collection);
}, (app) => {
  try {
  const collection = app.findCollectionByNameOrId("subscriptions");
  collection.createRule = "";
  collection.listRule = "user_id.id = @request.auth.id || @request.auth.role = 'admin'";
  collection.viewRule = "user_id.id = @request.auth.id || @request.auth.role = 'admin'";
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