/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const receiptsCollection = app.findCollectionByNameOrId("receipts");
  const collection = app.findCollectionByNameOrId("payments");

  const existing = collection.fields.getByName("receipts");
  if (existing) {
    if (existing.type === "relation") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("receipts"); // exists with wrong type, remove first
  }

  collection.fields.add(new RelationField({
    name: "receipts",
    collectionId: receiptsCollection.id
  }));

  return app.save(collection);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("payments");
    collection.fields.removeByName("receipts");
    return app.save(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection not found, skipping revert");
      return;
    }
    throw e;
  }
})