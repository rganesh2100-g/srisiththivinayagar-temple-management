/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pending_subscriptions");
  collection.viewRule = "@request.auth.role = 'admin' || email = @request.auth.email";
  return app.save(collection);
}, (app) => {
  try {
  const collection = app.findCollectionByNameOrId("pending_subscriptions");
  collection.viewRule = "@request.auth.role = 'admin' || user_id = @request.auth.id";
  return app.save(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection not found, skipping revert");
      return;
    }
    throw e;
  }
})