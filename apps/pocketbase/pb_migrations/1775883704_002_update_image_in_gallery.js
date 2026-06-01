/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("gallery");
  const field = collection.fields.getByName("image");
  field.mimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"];
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("gallery");
  const field = collection.fields.getByName("image");
  field.mimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  return app.save(collection);
})