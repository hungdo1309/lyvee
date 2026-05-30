/**
 * One-time migration: backfill items.visibleTo and mark groups.visibleToMigrated.
 *
 * Prerequisites:
 *   - npm install in functions/ (includes firebase-admin)
 *   - A Firebase service account key (no gcloud required):
 *       Firebase Console → Project settings → Service accounts
 *       → Generate new private key → save JSON locally (do not commit)
 *
 * Usage:
 *   npm run migrate:visible-to:dry-run -- --credentials path/to/key.json
 *   npm run migrate:visible-to -- --credentials path/to/key.json
 *
 * Or set GOOGLE_APPLICATION_CREDENTIALS to the key path before running.
 */

import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const admin = require(join(__dirname, '../functions/node_modules/firebase-admin'));

function getArgValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index + 1 >= process.argv.length) return null;
  return process.argv[index + 1];
}

const firebaserc = JSON.parse(
  readFileSync(join(__dirname, '../.firebaserc'), 'utf8')
);
const projectId =
  process.env.GCLOUD_PROJECT ||
  process.env.FIREBASE_PROJECT ||
  firebaserc.projects.default;

const dryRun = process.argv.includes('--dry-run');
const credentialsPath = resolve(
  getArgValue('--credentials') ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    ''
);
const BATCH_LIMIT = 500;

if (!credentialsPath || !existsSync(credentialsPath)) {
  console.error(
    'Missing Firebase credentials.\n\n' +
      'Download a service account key from Firebase Console:\n' +
      '  Project settings → Service accounts → Generate new private key\n\n' +
      'Then run:\n' +
      '  npm run migrate:visible-to:dry-run -- --credentials path/to/key.json\n\n' +
      'Or set GOOGLE_APPLICATION_CREDENTIALS to the key path.'
  );
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(credentialsPath, 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id || projectId,
  });
}

const db = admin.firestore();

function uniqueIds(ids) {
  return [...new Set(ids.filter(Boolean))];
}

function computeVisibleTo(item, groupMembers) {
  const alwaysVisible = uniqueIds([item.createdBy, ...(item.assignedTo ?? [])]);

  switch (item.visibility) {
    case 'everyone':
      return uniqueIds([...groupMembers, ...alwaysVisible]);
    case 'private':
      return alwaysVisible;
    case 'custom':
      return uniqueIds([...alwaysVisible, ...(item.allowedMembers ?? [])]);
    default:
      return alwaysVisible;
  }
}

function sameMembers(left, right) {
  if (left.length !== right.length) return false;
  const set = new Set(left);
  return right.every((id) => set.has(id));
}

function visibleToNeedsUpdate(item, groupMembers) {
  const expected = computeVisibleTo(item, groupMembers);
  const current = item.visibleTo ?? [];
  return current.length === 0 || !sameMembers(current, expected);
}

async function migrateGroup(groupDoc) {
  const group = { id: groupDoc.id, ...groupDoc.data() };
  const members = group.members ?? [];
  const itemsSnap = await db.collection('items').where('groupId', '==', group.id).get();

  let batch = db.batch();
  let batchSize = 0;
  let updatedItems = 0;

  for (const itemDoc of itemsSnap.docs) {
    const item = { id: itemDoc.id, ...itemDoc.data() };
    if (!visibleToNeedsUpdate(item, members)) continue;

    const visibleTo = computeVisibleTo(item, members);
    if (!dryRun) {
      batch.update(itemDoc.ref, { visibleTo });
    }
    batchSize += 1;
    updatedItems += 1;

    if (batchSize >= BATCH_LIMIT) {
      if (!dryRun) await batch.commit();
      batch = db.batch();
      batchSize = 0;
    }
  }

  if (batchSize > 0 && !dryRun) {
    await batch.commit();
  }

  if (!dryRun) {
    await groupDoc.ref.set({ visibleToMigrated: true }, { merge: true });
  }

  return {
    groupId: group.id,
    groupName: group.name ?? group.id,
    totalItems: itemsSnap.size,
    updatedItems,
  };
}

async function main() {
  console.log(`Project: ${projectId}`);
  console.log(dryRun ? 'Dry run (no writes)' : 'Live migration');

  const groupsSnap = await db.collection('groups').get();
  let totalUpdated = 0;

  for (const groupDoc of groupsSnap.docs) {
    const result = await migrateGroup(groupDoc);
    totalUpdated += result.updatedItems;
    console.log(
      `${result.groupName}: ${result.updatedItems}/${result.totalItems} items updated`
    );
  }

  console.log(`Done. ${totalUpdated} item(s) ${dryRun ? 'would be ' : ''}updated across ${groupsSnap.size} group(s).`);
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
