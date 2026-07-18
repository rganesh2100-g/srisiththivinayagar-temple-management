import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dir = path.join(__dirname, 'apps', 'pocketbase', 'pb_migrations');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort();

// Map of collection -> last creation file timestamp
const lastCreation = {
  'users': null, // built-in
  'poojas': '1775207084',
  'pooja_bookings': '1775207087',
  'donations': '1774778965',
  'subscriptions': '1776940077',
  'pending_subscriptions': '1776602048',
  'payments': '1777109972',
  'approval_logs': '1776571755',
  'temple_accounts': '1774699875',
  'expenses': '1775898945',
  'membership_fees': '1774619065',
  'gallery': '1774197593',
  'festivals': '1774618484',
  'volunteer_participation': '1774618485',
  'admin_messages': '1774618486',
  'user_preferences': '1774618488',
  'subscription_reminders': '1774792070',
  'booking_messages': '1774768485',
  'page_access': '1777815441',
  'premium_upgrade_requests': '1774630340',
  'integrated_ai_messages': '1774828800',
  'integrated_ai_images': '1774828801',
  'payment_accounts': '1775218002',
};

// For each collection, find all modification files after last creation
for (const [collName, ts] of Object.entries(lastCreation)) {
  if (!ts) continue;
  
  const mods = [];
  for (const f of files) {
    const fts = f.split('_')[0];
    if (fts <= ts) continue;
    
    const content = fs.readFileSync(path.join(dir, f), 'utf8');
    
    // Check if this file references the collection
    if (!content.includes(`"${collName}"`) && !content.includes(`'${collName}'`)) continue;
    
    // Skip files that are about other collections but happen to mention this one
    // Only include files that actually modify this collection
    const hasFieldOp = content.includes('fields.add(') || content.includes('removeByName(') || content.includes('renameField(');
    const hasDelete = content.includes('app.delete(');
    const hasFind = content.includes(`findCollectionByNameOrId("${collName}")`) || content.includes(`findCollectionByNameOrId('${collName}')`);
    const hasNewCollection = content.includes('new Collection(') && content.includes(`"name": "${collName}"`);
    
    if (hasFind || hasNewCollection) {
      mods.push(f);
    }
  }
  
  if (mods.length > 0) {
    console.log(`\n${collName} (last creation: ${ts}): ${mods.length} modification files:`);
    for (const m of mods) {
      console.log(`  ${m}`);
    }
  } else {
    console.log(`\n${collName} (last creation: ${ts}): NO modifications after creation`);
  }
}
