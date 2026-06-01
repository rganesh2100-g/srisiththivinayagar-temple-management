/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("payment_records");
  collection.listRule = "@request.auth.id != '' && (user_id = @request.auth.id || @request.auth.role = 'admin')";
  collection.viewRule = "@request.auth.id != '' && (user_id = @request.auth.id || @request.auth.role = 'admin')";
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("payment_records");
  collection.listRule = "@request.auth.id != \"\" && user_email = @request.auth.email";
  collection.viewRule = "@request.auth.id != \"\" && user_email = @request.auth.email";
  return app.save(collection);
})