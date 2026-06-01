/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pooja_bookings");
  collection.listRule = "email = @request.auth.email || @request.auth.role = 'admin'";
  collection.viewRule = "email = @request.auth.email || @request.auth.role = 'admin'";
  return app.save(collection);
}, (app) => {
  try {
  const collection = app.findCollectionByNameOrId("pooja_bookings");
  collection.listRule = "user_id = @request.auth.id || @request.auth.role = 'admin'";
  collection.viewRule = "user_id = @request.auth.id || @request.auth.role = 'admin'";
  return app.save(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection not found, skipping revert");
      return;
    }
    throw e;
  }
})