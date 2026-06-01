/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pooja_bookings");
  collection.indexes.push("CREATE INDEX idx_pooja_bookings_user ON pooja_bookings (user)");
  collection.indexes.push("CREATE INDEX idx_pooja_bookings_pooja ON pooja_bookings (pooja)");
  collection.indexes.push("CREATE INDEX idx_pooja_bookings_status ON pooja_bookings (status)");
  collection.indexes.push("CREATE INDEX idx_pooja_bookings_payment_status ON pooja_bookings (payment_status)");
  collection.indexes.push("CREATE INDEX idx_pooja_bookings_booking_date ON pooja_bookings (booking_date)");
  return app.save(collection);
}, (app) => {
  try {
  const collection = app.findCollectionByNameOrId("pooja_bookings");
  collection.indexes = collection.indexes.filter(idx => !idx.includes("idx_pooja_bookings_user"));
  collection.indexes = collection.indexes.filter(idx => !idx.includes("idx_pooja_bookings_pooja"));
  collection.indexes = collection.indexes.filter(idx => !idx.includes("idx_pooja_bookings_status"));
  collection.indexes = collection.indexes.filter(idx => !idx.includes("idx_pooja_bookings_payment_status"));
  collection.indexes = collection.indexes.filter(idx => !idx.includes("idx_pooja_bookings_booking_date"));
  return app.save(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection not found, skipping revert");
      return;
    }
    throw e;
  }
})