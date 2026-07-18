import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dir = path.join(__dirname, 'apps', 'pocketbase', 'pb_migrations');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort();

// Track all collection states
const collections = {}; // name -> { fields: Map, exists: bool, created_at_file: string }
const deletedCollections = new Set();

for (const f of files) {
  const content = fs.readFileSync(path.join(dir, f), 'utf8');
  
  // 1. Check for new Collection() creation (full definition)
  const newCollectionPattern = /new Collection\(\{([\s\S]*?)\}\s*\)\s*\)/g;
  let match;
  while ((match = newCollectionPattern.exec(content)) !== null) {
    // Extract collection name
    const nameMatch = match[1].match(/"name":\s*"(\w+)"/);
    if (!nameMatch) continue;
    const name = nameMatch[1];
    
    if (name === 'users') continue; // users is a built-in collection
    
    // Skip if this file has try/catch for "already exists"
    // (This is a create-or-skip pattern, not a drop-and-recreate)
    
    // Extract fields
    const fields = [];
    const fieldPattern = /\{\s*"autogeneratePattern"[\s\S]*?"name":\s*"(\w+)"[\s\S]*?"type":\s*"(\w+)"[\s\S]*?\}/g;
    const fieldsSection = match[1];
    
    // Simpler approach - find all field blocks
    const fieldBlockPattern = /"name":\s*"(\w+)"[^}]*?"type":\s*"(\w+)"/g;
    let fm;
    while ((fm = fieldBlockPattern.exec(fieldsSection)) !== null) {
      fields.push({ name: fm[1], type: fm[2] });
    }
    
    collections[name] = {
      fields: fields,
      exists: true,
      created_at_file: f
    };
  }
  
  // 2. Check for field modifications on existing collections
  const modifyPattern = /findCollectionByNameOrId\("(\w+)"\)/g;
  let mm;
  const modifiedCollections = new Set();
  while ((mm = modifyPattern.exec(content)) !== null) {
    modifiedCollections.add(mm[1]);
  }
  
  // 3. Check for field additions
  const addFieldPattern = /new (\w+)\(\{[\s\S]*?name:\s*["'](\w+)["'][\s\S]*?\}/g;
  let am;
  while ((am = addFieldPattern.exec(content)) !== null) {
    const fieldType = am[1];
    const fieldName = am[2];
    // Find which collection this is for
    for (const collName of modifiedCollections) {
      if (!collections[collName]) {
        collections[collName] = { fields: [], exists: false, created_at_file: f };
      }
      // Check if field already exists
      const existing = collections[collName].fields.find(f => f.name === fieldName);
      if (!existing) {
        collections[collName].fields.push({ name: fieldName, type: fieldType });
      } else {
        // Update type if it changed
        existing.type = fieldType;
      }
    }
  }
  
  // 4. Check for field removals
  const removePattern = /removeByName\(["'](\w+)["']\)/g;
  let rm;
  while ((rm = removePattern.exec(content)) !== null) {
    const fieldName = rm[1];
    for (const collName of modifiedCollections) {
      if (collections[collName]) {
        collections[collName].fields = collections[collName].fields.filter(f => f.name !== fieldName);
      }
    }
  }
  
  // 5. Check for collection deletion via app.delete
  const deletePattern = /findCollectionByNameOrId\(["'](\w+)["']\)/g;
  // Check if this is a drop migration (has app.delete with findCollection)
  if (content.includes('app.delete(') && content.includes('findCollectionByNameOrId')) {
    let dm;
    while ((dm = deletePattern.exec(content)) !== null) {
      const collName = dm[1];
      if (collections[collName]) {
        collections[collName].exists = false;
      }
      deletedCollections.add(collName);
    }
  }
}

// Print results
console.log('\n=== EXISTING COLLECTIONS ===');
const activeCollections = Object.entries(collections).filter(([name, c]) => c.exists).sort();
for (const [name, c] of activeCollections) {
  console.log(`\n${name} (${c.fields.length} fields) [created in: ${c.created_at_file}]`);
  for (const field of c.fields) {
    console.log(`  ${field.name}: ${field.type}`);
  }
}

console.log('\n\n=== DELETED/INACTIVE COLLECTIONS ===');
const inactive = Object.entries(collections).filter(([name, c]) => !c.exists).sort();
for (const [name, c] of inactive) {
  console.log(`${name} [created in: ${c.created_at_file}]`);
}

// Also list files that use findCollectionByNameOrId for each collection
console.log('\n\n=== MIGRATION FILES PER COLLECTION ===');
for (const f of files) {
  const content = fs.readFileSync(path.join(dir, f), 'utf8');
  const matches = [...content.matchAll(/findCollectionByNameOrId\(["'](\w+)["']\)/g)].map(m => m[1]);
  if (matches.length > 0) {
    const unique = [...new Set(matches)];
    console.log(`${f}: ${unique.join(', ')}`);
  }
}
