/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("subscriptions");
  collection.listRule = "@request.auth.role = 'admin'";
  collection.viewRule = "@request.auth.role = 'admin'";
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("subscriptions");
  collection.listRule = "user_id = @request.auth.id || @request.auth.role = 'admin'";
  collection.viewRule = "user_id = @request.auth.id || @request.auth.role = 'admin'";
  return app.save(collection);
})