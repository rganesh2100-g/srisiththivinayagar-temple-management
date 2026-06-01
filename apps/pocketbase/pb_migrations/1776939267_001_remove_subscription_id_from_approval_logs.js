/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("approval_logs");
  collection.fields.removeByName("subscription_id");
  return app.save(collection);
}, (app) => {
  try {

  const pbc_8556100861Collection = app.findCollectionByNameOrId("pbc_8556100861");
  const collection = app.findCollectionByNameOrId("approval_logs");
  collection.fields.add(new RelationField({
    name: "subscription_id",
    required: true,
    collectionId: pbc_8556100861Collection.id,
    maxSelect: 1
  }));
  return app.save(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection not found, skipping revert");
      return;
    }
    throw e;
  }
})