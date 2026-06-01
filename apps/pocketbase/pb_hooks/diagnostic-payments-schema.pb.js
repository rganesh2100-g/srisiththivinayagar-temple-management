/// <reference path="../pb_data/types.d.ts" />
// Diagnostic hook to log payments collection schema
onRecordCreateRequest((e) => {
  // This hook will log the payments collection structure when any record is created
  // It helps verify the actual schema in the running PocketBase instance
  
  const collection = $app.findCollectionByNameOrId('pbc_3241778380');
  if (collection) {
    console.log('=== PAYMENTS COLLECTION DIAGNOSTIC ===');
    console.log('Collection ID: ' + collection.id);
    console.log('Collection Name: ' + collection.name);
    console.log('Total Fields: ' + collection.schema.length);
    console.log('\n--- ALL FIELDS ---');
    
    collection.schema.forEach((field) => {
      console.log('Field: ' + field.name + ' | Type: ' + field.type + ' | Required: ' + field.required);
    });
    
    console.log('\n--- CHECKING FOR RECEIPT FIELDS ---');
    const receiptPdfField = collection.schema.find(f => f.name === 'receipt_pdf');
    const receiptIdField = collection.schema.find(f => f.name === 'receipt_id');
    const receiptGeneratedAtField = collection.schema.find(f => f.name === 'receipt_generated_at');
    
    console.log('receipt_pdf exists: ' + (receiptPdfField ? 'YES' : 'NO'));
    console.log('receipt_id exists: ' + (receiptIdField ? 'YES' : 'NO'));
    console.log('receipt_generated_at exists: ' + (receiptGeneratedAtField ? 'YES' : 'NO'));
  }
  
  e.next();
}, 'payments');