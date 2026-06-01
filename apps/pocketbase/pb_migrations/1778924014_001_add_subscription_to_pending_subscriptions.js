/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const pbc_7437911837Collection = app.findCollectionByNameOrId("pbc_7437911837");
  const collection = app.findCollectionByNameOrId("pending_subscriptions");

  const existing = collection.fields.getByName("subscription");
  if (existing) {
    if (existing.type === "relation") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("subscription"); // exists with wrong type, remove first
  }

  collection.fields.add(new RelationField({
    name: "subscription",
    required: false,
    collectionId: pbc_7437911837Collection.id,
    maxSelect: 1
  }));

  return app.save(collection);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("pending_subscriptions");
    collection.fields.removeByName("subscription");
    return app.save(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection not found, skipping revert");
      return;
    }
    throw e;
  }
})