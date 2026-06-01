/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const paymentsCollection = app.findCollectionByNameOrId("payments");
  const collection = app.findCollectionByNameOrId("receipts");

  const existing = collection.fields.getByName("payment");
  if (existing) {
    if (existing.type === "relation") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("payment"); // exists with wrong type, remove first
  }

  collection.fields.add(new RelationField({
    name: "payment",
    required: true,
    collectionId: paymentsCollection.id,
    maxSelect: 1
  }));

  return app.save(collection);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("receipts");
    collection.fields.removeByName("payment");
    return app.save(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection not found, skipping revert");
      return;
    }
    throw e;
  }
})