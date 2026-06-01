/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pending_subscriptions");

  const existing = collection.fields.getByName("payment_status");
  if (existing) {
    if (existing.type === "select") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("payment_status"); // exists with wrong type, remove first
  }

  collection.fields.add(new SelectField({
    name: "payment_status",
    values: ["pending", "completed", "failed", "refunded"]
  }));

  return app.save(collection);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("pending_subscriptions");
    collection.fields.removeByName("payment_status");
    return app.save(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection not found, skipping revert");
      return;
    }
    throw e;
  }
})