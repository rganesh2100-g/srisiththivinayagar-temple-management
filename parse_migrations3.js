import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dir = path.join(__dirname, 'apps', 'pocketbase', 'pb_migrations');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort();

// We'll extract the "up" function body from each file and analyze it
// Focus on tracking the FINAL state of each collection

// Map of collection name -> { fields: Map<name, {type, options}>, deleted: bool, lastCreationFile: string }
const state = {};

function getState(name) {
  if (!state[name]) {
    state[name] = { fields: new Map(), deleted: false, lastCreationFile: null };
  }
  return state[name];
}

function extractUpFunction(content) {
  // Find the migrate() call and extract the first function
  const match = content.match(/migrate\(\s*(?:async\s+)?\(?app\)?\s*(?:=>|function)\s*\{([\s\S]*?)\}\s*,\s*\(?app\)?/);
  if (match) return match[1];
  // Try alternative: migrate(function(app) { ... })
  const match2 = content.match(/migrate\(function\s*\(app\)\s*\{([\s\S]*?)\}\s*,\s*function/);
  if (match2) return match2[1];
  return null;
}

function extractFieldDefs(str) {
  // Find all field definition blocks in a new Collection({...}) call
  const fields = [];
  // Match each field object: { "name": "xxx", "type": "yyy", ... }
  const fieldPattern = /\{\s*"autogeneratePattern"[\s\S]*?"name":\s*"(\w+)"[\s\S]*?"type":\s*"(\w+)"[\s\S]*?\}/g;
  let m;
  while ((m = fieldPattern.exec(str)) !== null) {
    // Don't include system fields like id, created, updated
    if (m[1] === 'id') continue;
    fields.push({ name: m[1], type: m[2] });
  }
  
  // Also match non-standard field orderings
  const fieldPattern2 = /"name":\s*"(\w+)"[\s\S]*?"type":\s*"(\w+)"/g;
  while ((m = fieldPattern2.exec(str)) !== null) {
    if (m[1] === 'id' || m[1] === 'created' || m[1] === 'updated') continue;
    if (!fields.find(f => f.name === m[1])) {
      fields.push({ name: m[1], type: m[2] });
    }
  }
  
  return fields;
}

function extractCollectionName(str) {
  const m = str.match(/"name":\s*"(\w+)"/);
  return m ? m[1] : null;
}

function extractFieldName(str) {
  const m = str.match(/name:\s*["'](\w+)["']/);
  return m ? m[1] : null;
}

function extractFieldType(str) {
  const m = str.match(/new\s+(\w+)\(/);
  return m ? m[1] : null;
}

for (const f of files) {
  const content = fs.readFileSync(path.join(dir, f), 'utf8');
  const upBody = extractUpFunction(content);
  if (!upBody) continue;
  
  // Detect what type of migration this is
  
  // 1. Full collection creation: new Collection({...})
  if (upBody.includes('new Collection(')) {
    const collName = extractCollectionName(upBody);
    if (collName && collName !== 'users') {
      const s = getState(collName);
      s.fields = new Map();
      s.deleted = false;
      s.lastCreationFile = f;
      
      // Extract field definitions from the Collection constructor
      // Find the fields array
      const fieldsMatch = upBody.match(/"fields":\s*\[([\s\S]*?)\],\s*"id":/);
      if (fieldsMatch) {
        // Parse individual field objects
        let depth = 0;
        let start = -1;
        let inFields = false;
        const fieldsStr = fieldsMatch[1];
        
        for (let i = 0; i < fieldsStr.length; i++) {
          if (fieldsStr[i] === '{') {
            if (depth === 0) start = i;
            depth++;
          } else if (fieldsStr[i] === '}') {
            depth--;
            if (depth === 0 && start >= 0) {
              const fieldObj = fieldsStr.substring(start, i + 1);
              const nameMatch = fieldObj.match(/"name":\s*"(\w+)"/);
              const typeMatch = fieldObj.match(/"type":\s*"(\w+)"/);
              if (nameMatch && typeMatch && nameMatch[1] !== 'id' && nameMatch[1] !== 'created' && nameMatch[1] !== 'updated') {
                const opts = {};
                
                // Extract select values
                const valMatch = fieldObj.match(/"values":\s*\[([\s\S]*?)\]/);
                if (valMatch) {
                  opts.values = valMatch[1].match(/"(\w+)"/g)?.map(v => v.replace(/"/g, '')) || [];
                }
                
                // Extract required
                const reqMatch = fieldObj.match(/"required":\s*(true|false)/);
                if (reqMatch) opts.required = reqMatch[1] === 'true';
                
                // Extract relation details
                const collMatch = fieldObj.match(/"collectionId":\s*"(\w+)"/);
                if (collMatch) opts.collectionId = collMatch[1];
                const maxSelectMatch = fieldObj.match(/"maxSelect":\s*(\d+)/);
                if (maxSelectMatch) opts.maxSelect = parseInt(maxSelectMatch[1]);
                
                // Extract default
                const defMatch = fieldObj.match(/"defaultValue":\s*"?([\w\d\[\]{}\", ]+)"?/);
                if (defMatch) opts.defaultValue = defMatch[1].replace(/"/g, '');
                
                // Extract file options
                const mimeMatch = fieldObj.match(/"mimeTypes":\s*\[([\s\S]*?)\]/);
                if (mimeMatch) opts.mimeTypes = mimeMatch[1].match(/"([^"]+)"/g)?.map(v => v.replace(/"/g, '')) || [];
                const sizeMatch = fieldObj.match(/"maxSize":\s*(\d+)/);
                if (sizeMatch) opts.maxSize = parseInt(sizeMatch[1]);
                const thumbsMatch = fieldObj.match(/"thumbs":\s*\[([\s\S]*?)\]/);
                if (thumbsMatch) opts.thumbs = thumbsMatch[1].match(/"([^"]+)"/g)?.map(v => v.replace(/"/g, '')) || [];
                
                s.fields.set(nameMatch[1], { type: typeMatch[1], ...opts });
              }
              start = -1;
            }
          }
        }
      }
    }
  }
  
  // 2. Collection deletion: app.delete(app.findCollectionByNameOrId("xxx"))
  if (upBody.includes('app.delete(') && upBody.includes('findCollectionByNameOrId')) {
    const delMatch = upBody.match(/app\.delete\(app\.findCollectionByNameOrId\(["'](\w+)["']\)\)/);
    if (delMatch) {
      const s = getState(delMatch[1]);
      s.deleted = true;
      s.fields = new Map();
    }
    // Also check for collection variable pattern
    const delMatch2 = upBody.match(/const collection = app\.findCollectionByNameOrId\(["'](\w+)["']\)[\s\S]*?app\.delete\(collection\)/);
    if (delMatch2) {
      const s = getState(delMatch2[1]);
      s.deleted = true;
      s.fields = new Map();
    }
  }
  
  // 3. Field addition: collection.fields.add(new XxxField({name: "xxx", ...}))
  if (upBody.includes('fields.add(')) {
    const collMatch = upBody.match(/app\.findCollectionByNameOrId\(["'](\w+)["']\)/);
    if (!collMatch) continue;
    const collName = collMatch[1];
    const s = getState(collName);
    
    // Find all field.add calls
    const addPattern = /fields\.add\(new\s+(\w+)\((\{[\s\S]*?\})\)\)/g;
    let am;
    while ((am = addPattern.exec(upBody)) !== null) {
      const fieldType = am[1];
      const fieldDef = am[2];
      const nameMatch = fieldDef.match(/name:\s*["'](\w+)["']/);
      if (!nameMatch) continue;
      const fieldName = nameMatch[1];
      
      // Check for remove first (some migrations do remove then add = rename)
      const hasRemove = upBody.includes(`removeByName("${fieldName}")`) || upBody.includes(`removeByName('${fieldName}')`);
      
      const opts = {};
      const valMatch = fieldDef.match(/values:\s*\[([\s\S]*?)\]/);
      if (valMatch) {
        opts.values = valMatch[1].match(/"(\w+)"/g)?.map(v => v.replace(/"/g, '')) || [];
      }
      const reqMatch = fieldDef.match(/required:\s*(true|false)/);
      if (reqMatch) opts.required = reqMatch[1] === 'true';
      
      // Extract relation/collectionId
      const collIdMatch = fieldDef.match(/collectionId:\s*["'](\w+)["']/);
      if (collIdMatch) opts.collectionId = collIdMatch[1];
      
      // Extract maxSelect  
      const maxSelMatch = fieldDef.match(/maxSelect:\s*(\d+)/);
      if (maxSelMatch) opts.maxSelect = parseInt(maxSelMatch[1]);
      
      // Extract defaultValue
      const defMatch = fieldDef.match(/defaultValue:\s*["']([^"']+)["']/);
      if (defMatch) opts.defaultValue = defMatch[1];
      
      // Extract file options
      const mimeMatch = fieldDef.match(/mimeTypes:\s*\[([\s\S]*?)\]/);
      if (mimeMatch) opts.mimeTypes = mimeMatch[1].match(/"([^"]+)"/g)?.map(v => v.replace(/"/g, '')) || [];
      const sizeMatch = fieldDef.match(/maxSize:\s*(\d+)/);
      if (sizeMatch) opts.maxSize = parseInt(sizeMatch[1]);
      const thumbsMatch = fieldDef.match(/thumbs:\s*\[([\s\S]*?)\]/);
      if (thumbsMatch) opts.thumbs = thumbsMatch[1].match(/"([^"]+)"/g)?.map(v => v.replace(/"/g, '')) || [];
      
      // Extract hidden
      const hidMatch = fieldDef.match(/hidden:\s*(true|false)/);
      if (hidMatch) opts.hidden = hidMatch[1] === 'true';
      
      // Extract presentable
      const presMatch = fieldDef.match(/presentable:\s*(true|false)/);
      if (presMatch) opts.presentable = presMatch[1] === 'true';
      
      // Extract system
      const sysMatch = fieldDef.match(/system:\s*(true|false)/);
      if (sysMatch) opts.system = sysMatch[1] === 'true';
      
      // Extract autodate options
      const onCreateMatch = fieldDef.match(/onCreate:\s*(true|false)/);
      const onUpdateMatch = fieldDef.match(/onUpdate:\s*(true|false)/);
      if (onCreateMatch) opts.onCreate = onCreateMatch[1] === 'true';
      if (onUpdateMatch) opts.onUpdate = onUpdateMatch[1] === 'true';
      
      // Extract number options
      const onlyIntMatch = fieldDef.match(/onlyInt:\s*(true|false)/);
      if (onlyIntMatch) opts.onlyInt = onlyIntMatch[1] === 'true';
      
      // Extract min/max for text
      const minMatch = fieldDef.match(/min:\s*(\d+)/);
      const maxMatch = fieldDef.match(/max:\s*(\d+)/);
      if (minMatch) opts.min = parseInt(minMatch[1]);
      if (maxMatch) opts.max = parseInt(maxMatch[1]);
      
      // Extract pattern
      const patMatch = fieldDef.match(/pattern:\s*"([^"]+)"/);
      if (patMatch) opts.pattern = patMatch[1];
      
      // Extract max for number
      const numMaxMatch = fieldDef.match(/max:\s*(null|\d+)/);
      if (numMaxMatch && numMaxMatch[1] !== 'null') opts.numMax = parseInt(numMaxMatch[1]);
      
      s.fields.set(fieldName, { type: fieldType, ...opts });
    }
  }
  
  // 4. Field removal: collection.fields.removeByName("xxx")
  if (upBody.includes('removeByName(')) {
    const collMatch = upBody.match(/app\.findCollectionByNameOrId\(["'](\w+)["']\)/);
    if (!collMatch) continue;
    const collName = collMatch[1];
    const s = getState(collName);
    
    const removePattern = /removeByName\(["'](\w+)["']\)/g;
    let rm;
    while ((rm = removePattern.exec(upBody)) !== null) {
      s.fields.delete(rm[1]);
    }
  }
  
  // 5. Field rename: collection.renameField("old", "new")
  if (upBody.includes('renameField(')) {
    const collMatch = upBody.match(/app\.findCollectionByNameOrId\(["'](\w+)["']\)/);
    if (!collMatch) continue;
    const collName = collMatch[1];
    const s = getState(collName);
    
    const renamePattern = /renameField\(["'](\w+)["'],\s*["'](\w+)["']\)/g;
    let rn;
    while ((rn = renamePattern.exec(upBody)) !== null) {
      const oldField = s.fields.get(rn[1]);
      if (oldField) {
        s.fields.delete(rn[1]);
        s.fields.set(rn[2], oldField);
      }
    }
  }
}

// Print final results
const activeNames = Object.keys(state).filter(n => !state[n].deleted && state[n].fields.size > 0).sort();
const deletedNames = Object.keys(state).filter(n => state[n].deleted).sort();
const inactiveNames = Object.keys(state).filter(n => !state[n].deleted && state[n].fields.size === 0).sort();

console.log('=== ACTIVE COLLECTIONS (with fields) ===');
for (const name of activeNames) {
  const s = state[name];
  console.log(`\n--- ${name} [last created: ${s.lastCreationFile}] ---`);
  for (const [fname, fdef] of s.fields) {
    let extra = '';
    if (fdef.values) extra += ` values=[${fdef.values.join(',')}]`;
    if (fdef.required) extra += ' required';
    if (fdef.defaultValue) extra += ` default="${fdef.defaultValue}"`;
    if (fdef.collectionId) extra += ` -> ${fdef.collectionId}`;
    if (fdef.maxSelect) extra += ` maxSelect=${fdef.maxSelect}`;
    if (fdef.mimeTypes) extra += ` mime=[${fdef.mimeTypes.join(',')}]`;
    if (fdef.onCreate !== undefined) extra += ` onCreate=${fdef.onCreate}`;
    if (fdef.onUpdate !== undefined) extra += ` onUpdate=${fdef.onUpdate}`;
    if (fdef.onlyInt !== undefined) extra += ` onlyInt=${fdef.onlyInt}`;
    console.log(`  ${fname}: ${fdef.type}${extra}`);
  }
}

console.log('\n\n=== DELETED COLLECTIONS ===');
for (const name of deletedNames) {
  console.log(name);
}

console.log('\n\n=== EMPTY/INACTIVE COLLECTIONS (no fields tracked) ===');
for (const name of inactiveNames) {
  console.log(name);
}
