/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const pbc_9972305308Collection = app.findCollectionByNameOrId("pbc_9972305308");
  const collection = app.findCollectionByNameOrId("pooja_bookings");

  const existing = collection.fields.getByName("pooja");
  if (existing) {
    if (existing.type === "relation") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("pooja"); // exists with wrong type, remove first
  }

  collection.fields.add(new RelationField({
    name: "pooja",
    required: true,
    collectionId: pbc_9972305308Collection.id,
    maxSelect: 1
  }));

  return app.save(collection);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("pooja_bookings");
    collection.fields.removeByName("pooja");
    return app.save(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection not found, skipping revert");
      return;
    }
    throw e;
  }
})