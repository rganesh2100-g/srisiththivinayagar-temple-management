/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("booking_messages");
  const field = collection.fields.getByName("sender_id");
  field.name = "sender_email";
  return app.save(collection);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("booking_messages");
    const field = collection.fields.getByName("sender_email");
    if (!field) { console.log("Field not found, skipping revert"); return; }
    field.name = "sender_id";
    return app.save(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection or field not found, skipping revert");
      return;
    }
    throw e;
  }
})