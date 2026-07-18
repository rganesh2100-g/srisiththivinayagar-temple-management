import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dir = path.join(__dirname, 'apps', 'pocketbase', 'pb_migrations');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort();

// For each collection, find:
// 1. All files that create it with new Collection()
// 2. All files that modify it (add/remove/rename fields, or delete)
// 3. Track the LAST creation event (which replaces everything)
// 4. Then apply all subsequent modifications

const collections = {};

for (const f of files) {
  const content = fs.readFileSync(path.join(dir, f), 'utf8');
  
  // Check if this file creates collections with new Collection()
  if (content.includes('new Collection(')) {
    // Find all collection names created in this file
    // Parse the Collection constructors
    const collPattern = /new Collection\(\{([\s\S]*?)\}\s*\)\s*\)/g;
    let cm;
    while ((cm = collPattern.exec(content)) !== null) {
      const block = cm[1];
      const nameMatch = block.match(/"name":\s*"(\w+)"/);
      if (!nameMatch) continue;
      const name = nameMatch[1];
      
      if (name === 'users') continue; // skip built-in
      
      if (!collections[name]) collections[name] = { events: [] };
      collections[name].events.push({ file: f, type: 'create_full', block });
    }
  }
  
  // Check for field modifications and deletions
  const modCollections = new Set();
  const findPattern = /findCollectionByNameOrId\(["'](\w+)["']\)/g;
  let fm;
  while ((fm = findPattern.exec(content)) !== null) {
    modCollections.add(fm[1]);
  }
  
  for (const collName of modCollections) {
    if (!collections[collName]) collections[collName] = { events: [] };
    
    // Check for field additions
    const addFieldPattern = /fields\.add\(new\s+(\w+)\((\{[\s\S]*?\})\)\)/g;
    let am;
    while ((am = addFieldPattern.exec(content)) !== null) {
      collections[collName].events.push({ file: f, type: 'addField', fieldType: am[1], fieldDef: am[2] });
    }
    
    // Check for field removals
    const removePattern = /collection\.fields\.removeByName\(["'](\w+)["']\)/g;
    let rm;
    while ((rm = removePattern.exec(content)) !== null) {
      collections[collName].events.push({ file: f, type: 'removeField', fieldName: rm[1] });
    }
    
    // Check for renames
    const renamePattern = /collection\.renameField\(["'](\w+)["'],\s*["'](\w+)["']\)/g;
    let rn;
    while ((rn = renamePattern.exec(content)) !== null) {
      collections[collName].events.push({ file: f, type: 'renameField', from: rn[1], to: rn[2] });
    }
    
    // Check for delete (app.delete(collection))
    if (content.includes('app.delete(collection)') || content.includes('app.delete( collection)')) {
      collections[collName].events.push({ file: f, type: 'delete' });
    }
  }
}

// Now simulate each collection
console.log('=== FINAL COLLECTION STATES ===\n');

const targetCollections = [
  'users', 'poojas', 'pooja_bookings', 'donations', 'subscriptions',
  'pending_subscriptions', 'payments', 'approval_logs', 'temple_accounts',
  'expenses', 'membership_fees', 'gallery', 'festivals', 'volunteer_participation',
  'admin_messages', 'user_preferences', 'subscription_reminders', 'booking_messages',
  'page_access', 'premium_upgrade_requests', 'integrated_ai_messages', 'integrated_ai_images',
  'payment_accounts'
];

for (const name of targetCollections) {
  if (!collections[name]) {
    console.log(`\n--- ${name} --- NOT FOUND in any migration`);
    continue;
  }
  
  const events = collections[name].events;
  
  // Find the last create_full event
  let lastCreateIdx = -1;
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].type === 'create_full') {
      lastCreateIdx = i;
      break;
    }
  }
  
  // Check if deleted after last creation
  let deleted = false;
  let lastDeleteIdx = -1;
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].type === 'delete') {
      lastDeleteIdx = i;
      deleted = true;
      break;
    }
  }
  
  if (deleted && lastDeleteIdx > lastCreateIdx) {
    console.log(`\n--- ${name} --- DELETED (last delete at ${events[lastDeleteIdx].file})`);
    continue;
  }
  
  // Parse fields from last create
  const fields = new Map();
  if (lastCreateIdx >= 0) {
    const block = events[lastCreateIdx].block;
    const createFile = events[lastCreateIdx].file;
    
    // Parse field blocks
    let depth = 0;
    let start = -1;
    for (let i = 0; i < block.length; i++) {
      if (block[i] === '{') {
        if (depth === 0) start = i;
        depth++;
      } else if (block[i] === '}') {
        depth--;
        if (depth === 0 && start >= 0) {
          const fieldBlock = block.substring(start, i + 1);
          const nameMatch = fieldBlock.match(/"name":\s*"(\w+)"/);
          const typeMatch = fieldBlock.match(/"type":\s*"(\w+)"/);
          if (nameMatch && typeMatch && nameMatch[1] !== 'id' && nameMatch[1] !== 'created' && nameMatch[1] !== 'updated') {
            const opts = {};
            
            // Select values
            const valMatch = fieldBlock.match(/"values":\s*\[([\s\S]*?)\]/);
            if (valMatch) opts.values = [...valMatch[1].matchAll(/"(\w+)"/g)].map(m => m[1]);
            
            // Required
            const reqMatch = fieldBlock.match(/"required":\s*(true|false)/);
            if (reqMatch) opts.required = reqMatch[1] === 'true';
            
            // Default value
            const defMatch = fieldBlock.match(/"defaultValue":\s*"?([^"\n]+)"?/);
            if (defMatch) opts.defaultValue = defMatch[1].trim();
            
            // CollectionId (relation)
            const collIdMatch = fieldBlock.match(/"collectionId":\s*"(\w+)"/);
            if (collIdMatch) opts.collectionId = collIdMatch[1];
            
            // maxSelect
            const msMatch = fieldBlock.match(/"maxSelect":\s*(\d+)/);
            if (msMatch) opts.maxSelect = parseInt(msMatch[1]);
            
            // File options
            const mimeMatch = fieldBlock.match(/"mimeTypes":\s*\[([\s\S]*?)\]/);
            if (mimeMatch) opts.mimeTypes = [...mimeMatch[1].matchAll(/"([^"]+)"/g)].map(m => m[1]);
            const sizeMatch = fieldBlock.match(/"maxSize":\s*(\d+)/);
            if (sizeMatch) opts.maxSize = parseInt(sizeMatch[1]);
            const thumbsMatch = fieldBlock.match(/"thumbs":\s*\[([\s\S]*?)\]/);
            if (thumbsMatch) opts.thumbs = [...thumbsMatch[1].matchAll(/"([^"]+)"/g)].map(m => m[1]);
            
            // Autodate options
            const ocMatch = fieldBlock.match(/"onCreate":\s*(true|false)/);
            const ouMatch = fieldBlock.match(/"onUpdate":\s*(true|false)/);
            if (ocMatch) opts.onCreate = ocMatch[1] === 'true';
            if (ouMatch) opts.onUpdate = ouMatch[1] === 'true';
            
            // onlyInt
            const iiMatch = fieldBlock.match(/"onlyInt":\s*(true|false)/);
            if (iiMatch) opts.onlyInt = iiMatch[1] === 'true';
            
            // hidden
            const hidMatch = fieldBlock.match(/"hidden":\s*(true|false)/);
            if (hidMatch) opts.hidden = hidMatch[1] === 'true';
            
            // presentable
            const presMatch = fieldBlock.match(/"presentable":\s*(true|false)/);
            if (presMatch) opts.presentable = presMatch[1] === 'true';
            
            // system
            const sysMatch = fieldBlock.match(/"system":\s*(true|false)/);
            if (sysMatch) opts.system = sysMatch[1] === 'true';
            
            // pattern
            const patMatch = fieldBlock.match(/"pattern":\s*"([^"]*)"/);
            if (patMatch && patMatch[1]) opts.pattern = patMatch[1];
            
            // min/max for text
            const minMatch = fieldBlock.match(/"min":\s*(\d+)/);
            const maxMatch2 = fieldBlock.match(/"max":\s*(\d+)/);
            if (minMatch) opts.min = parseInt(minMatch[1]);
            if (maxMatch2) opts.max = parseInt(maxMatch2[1]);
            
            fields.set(nameMatch[1], { type: typeMatch[1], ...opts });
          }
          start = -1;
        }
      }
    }
    
    console.log(`\n--- ${name} [created in: ${createFile}] ---`);
    
    // Apply subsequent events
    for (let i = lastCreateIdx + 1; i < events.length; i++) {
      const ev = events[i];
      if (ev.type === 'addField') {
        const fieldOpts = {};
        // Parse field options from fieldDef
        const fd = ev.fieldDef;
        const nameMatch = fd.match(/name:\s*["'](\w+)["']/);
        if (!nameMatch) continue;
        
        const valMatch = fd.match(/values:\s*\[([^\]]+)\]/);
        if (valMatch) fieldOpts.values = [...valMatch[1].matchAll(/"(\w+)"/g)].map(m => m[1]);
        
        const reqMatch = fd.match(/required:\s*(true|false)/);
        if (reqMatch) fieldOpts.required = reqMatch[1] === 'true';
        
        const collIdMatch = fd.match(/collectionId:\s*["'](\w+)["']/);
        if (collIdMatch) fieldOpts.collectionId = collIdMatch[1];
        
        const msMatch = fd.match(/maxSelect:\s*(\d+)/);
        if (msMatch) fieldOpts.maxSelect = parseInt(msMatch[1]);
        
        const defMatch = fd.match(/defaultValue:\s*["']([^"']+)["']/);
        if (defMatch) fieldOpts.defaultValue = defMatch[1];
        
        const ocMatch = fd.match(/onCreate:\s*(true|false)/);
        const ouMatch = fd.match(/onUpdate:\s*(true|false)/);
        if (ocMatch) fieldOpts.onCreate = ocMatch[1] === 'true';
        if (ouMatch) fieldOpts.onUpdate = ouMatch[1] === 'true';
        
        const iiMatch = fd.match(/onlyInt:\s*(true|false)/);
        if (iiMatch) fieldOpts.onlyInt = iiMatch[1] === 'true';
        
        // File options
        const mimeMatch = fd.match(/mimeTypes:\s*\[([^\]]+)\]/);
        if (mimeMatch) fieldOpts.mimeTypes = [...mimeMatch[1].matchAll(/"([^"]+)"/g)].map(m => m[1]);
        const sizeMatch = fd.match(/maxSize:\s*(\d+)/);
        if (sizeMatch) fieldOpts.maxSize = parseInt(sizeMatch[1]);
        
        fields.set(nameMatch[1], { type: ev.fieldType, ...fieldOpts, addedAt: ev.file });
      } else if (ev.type === 'removeField') {
        fields.delete(ev.fieldName);
      } else if (ev.type === 'renameField') {
        const f = fields.get(ev.from);
        if (f) {
          fields.delete(ev.from);
          fields.set(ev.to, f);
        }
      }
    }
    
    // Print fields
    for (const [fname, fdef] of fMapSort(fields)) {
      let extra = '';
      if (fdef.values && fdef.values.length > 0) extra += ` values=[${fdef.values.join(',')}]`;
      if (fdef.required) extra += ' required';
      if (fdef.defaultValue !== undefined) extra += ` default="${fdef.defaultValue}"`;
      if (fdef.collectionId) extra += ` ->collection=${fdef.collectionId}`;
      if (fdef.maxSelect) extra += ` maxSelect=${fdef.maxSelect}`;
      if (fdef.mimeTypes && fdef.mimeTypes.length > 0) extra += ` mime=[${fdef.mimeTypes.join(',')}]`;
      if (fdef.onCreate !== undefined) extra += ` onCreate=${fdef.onCreate}`;
      if (fdef.onUpdate !== undefined) extra += ` onUpdate=${fdef.onUpdate}`;
      if (fdef.onlyInt !== undefined) extra += ` onlyInt=${fdef.onlyInt}`;
      if (fdef.addedAt) extra += ` [added:${fdef.addedAt}]`;
      console.log(`  ${fname}: ${fdef.type}${extra}`);
    }
  } else {
    console.log(`\n--- ${name} --- NO CREATION EVENT FOUND`);
  }
}

function* fMapSort(map) {
  const entries = [...map.entries()];
  entries.sort((a, b) => a[0].localeCompare(b[0]));
  yield* entries;
}
