/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("booking_messages");
  collection.listRule = "booking_id.email = @request.auth.email || @request.auth.role = 'admin'";
  collection.viewRule = "booking_id.email = @request.auth.email || @request.auth.role = 'admin'";
  return app.save(collection);
}, (app) => {
  try {
  const collection = app.findCollectionByNameOrId("booking_messages");
  collection.listRule = "booking_id.user_id = @request.auth.id || @request.auth.role = 'admin'";
  collection.viewRule = "booking_id.user_id = @request.auth.id || @request.auth.role = 'admin'";
  return app.save(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection not found, skipping revert");
      return;
    }
    throw e;
  }
})