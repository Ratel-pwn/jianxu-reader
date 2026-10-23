import { DatabaseSync } from 'node:sqlite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveReport } from './moderation.mjs';

const db = new DatabaseSync(resolve(dirname(fileURLToPath(import.meta.url)), 'data/community.sqlite'));
db.exec('PRAGMA foreign_keys=ON');
const [command = 'list', rawId, decision] = process.argv.slice(2);
if (command === 'list') {
  console.table(db.prepare('SELECT reports.id, reports.post_id, reports.reason, reports.created_at, posts.body FROM reports JOIN posts ON posts.id=reports.post_id WHERE status=? ORDER BY reports.id').all('pending'));
} else if (command === 'resolve' && Number.isInteger(Number(rawId)) && ['keep', 'remove'].includes(decision)) {
  resolveReport(db, Number(rawId), decision);
  console.log(`Report ${rawId}: ${decision}`);
} else if (command === 'history') {
  console.table(db.prepare('SELECT * FROM moderation_actions ORDER BY id DESC LIMIT 100').all());
} else throw new Error('Usage: node server/moderate.mjs list | resolve REPORT_ID keep|remove');
db.close();
