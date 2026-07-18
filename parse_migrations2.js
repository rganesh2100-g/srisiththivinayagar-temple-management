import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dir = path.join(__dirname, 'apps', 'pocketbase', 'pb_migrations');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort();

// More thorough analysis: extract all operations per collection
const collOps = {}; // collection name -> [{file, operation, details}]

for (const f of files) {
  const content = fs.readFileSync(path.join(dir, f), 'utf8');
  
  // Find all collections mentioned in this file
  const mentioned = new Set();
  const findMatches = content.matchAll(/findCollectionByNameOrId\(["'](\w+)["']\)/g);
  for (const m of findMatches) mentioned.add(m[1]);
  
  // Find collection names in new Collection() calls
  const newCollMatches = content.matchAll(/"name":\s*"(\w+)"/g);
  const newCollNames = new Set();
  for (const m of newCollMatches) {
    // Only include if near a "new Collection(" pattern
    if (content.includes('new Collection(')) {
      newCollNames.add(m[1]);
    }
  }
  
  // For each mentioned collection, determine what operation was done
  for (const coll of mentioned) {
    if (!collOps[coll]) collOps[coll] = [];
    
    // Was a field added?
    const addFieldRegex = new RegExp(`findCollectionByNameOrId\\(["']${coll}["']\\)[\\s\\S]*?fields\\.add\\(new\\s+(\\w+)\\(\\{[\\s\\S]*?name:\\s*["']([\\w]+)["']`, 'g');
    let am;
    while ((am = addFieldRegex.exec(content)) !== null) {
      collOps[coll].push({ file: f, op: 'addField', fieldType: am[1], fieldName: am[2] });
    }
    
    // Was a field removed?
    const removeFieldRegex = new RegExp(`findCollectionByNameOrId\\(["']${coll}["']\\)[\\s\\S]*?removeByName\\(["']([\\w]+)["']\\)`, 'g');
    let rm;
    while ((rm = removeFieldRegex.exec(content)) !== null) {
      collOps[coll].push({ file: f, op: 'removeField', fieldName: rm[1] });
    }
    
    // Was a field renamed?
    const renameRegex = new RegExp(`findCollectionByNameOrId\\(["']${coll}["']\\)[\\s\\S]*?renameField\\(["']([\\w]+)["'],\\s*["']([\\w]+)["']\\)`, 'g');
    let rn;
    while ((rn = renameRegex.exec(content)) !== null) {
      collOps[coll].push({ file: f, op: 'renameField', from: rn[1], to: rn[2] });
    }
    
    // Was a field modified (type change etc)?
    const modFieldRegex = new RegExp(`findCollectionByNameOrId\\(["']${coll}["']\\)[\\s\\S]*?fields\\.findByName\\(["']([\\w]+)["']\\)`, 'g');
    let mf;
    while ((mf = modFieldRegex.exec(content)) !== null) {
      collOps[coll].push({ file: f, op: 'modifyField', fieldName: mf[1] });
    }
    
    // Was the collection deleted?
    if (content.includes(`app.delete(`) && content.includes(`findCollectionByNameOrId("${coll}")`)) {
      collOps[coll].push({ file: f, op: 'delete' });
    }
  }
  
  // Check for full recreation (delete + new Collection with same name)
  for (const coll of newCollNames) {
    if (!collOps[coll]) collOps[coll] = [];
    
    // Check if this file deletes AND recreates
    const hasDelete = content.includes(`app.delete(`) && content.includes(`findCollectionByNameOrId("${coll}")`);
    const hasNew = content.includes(`new Collection(`) && content.includes(`"name": "${coll}"`);
    
    if (hasNew) {
      collOps[coll].push({ file: f, op: 'createOrReplace', isNew: true });
    }
  }
  
  // Also check for standalone field add patterns (not preceded by findCollection)
  // These use a different pattern where they find the collection first, then add
  const standaloneAddPattern = /(?:const collection = )?app\.findCollectionByNameOrId\(["'](\w+)["']\);[\s\S]*?collection\.fields\.add\(new\s+(\w+)\(\{[\s\S]*?name:\s*["']([\w]+)["']/g;
  let sa;
  while ((sa = standaloneAddPattern.exec(content)) !== null) {
    const coll = sa[1];
    if (!collOps[coll]) collOps[coll] = [];
    // Avoid duplicates
    const already = collOps[coll].some(op => op.file === f && op.op === 'addField' && op.fieldName === sa[3]);
    if (!already) {
      collOps[coll].push({ file: f, op: 'addField', fieldType: sa[2], fieldName: sa[3] });
    }
  }
  
  const standaloneRemovePattern = /(?:const collection = )?app\.findCollectionByNameOrId\(["'](\w+)["']\);[\s\S]*?collection\.fields\.removeByName\(["']([\w]+)["']\)/g;
  let sr;
  while ((sr = standaloneRemovePattern.exec(content)) !== null) {
    const coll = sr[1];
    if (!collOps[coll]) collOps[coll] = [];
    const already = collOps[coll].some(op => op.file === f && op.op === 'removeField' && op.fieldName === sr[2]);
    if (!already) {
      collOps[coll].push({ file: f, op: 'removeField', fieldName: sr[2] });
    }
  }
}

// Now simulate each collection's evolution
console.log('=== ALL COLLECTION OPERATIONS (sorted by file) ===\n');

const allCollNames = Object.keys(collOps).sort();
for (const coll of allCollNames) {
  const ops = collOps[coll].sort((a, b) => a.file.localeCompare(b.file));
  console.log(`\n--- ${coll} ---`);
  for (const op of ops) {
    if (op.op === 'addField') console.log(`  ${op.file}: ADD FIELD ${op.fieldName} (${op.fieldType})`);
    else if (op.op === 'removeField') console.log(`  ${op.file}: REMOVE FIELD ${op.fieldName}`);
    else if (op.op === 'renameField') console.log(`  ${op.file}: RENAME FIELD ${op.from} -> ${op.to}`);
    else if (op.op === 'modifyField') console.log(`  ${op.file}: MODIFY FIELD ${op.fieldName}`);
    else if (op.op === 'delete') console.log(`  ${op.file}: DELETE COLLECTION`);
    else if (op.op === 'createOrReplace') console.log(`  ${op.file}: CREATE/REPLACE COLLECTION`);
  }
}
