import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash, scryptSync } from 'node:crypto';
import { createCommunityServer } from '../server/server.mjs';
import { resolveReport } from '../server/moderation.mjs';
import { hashPassword, verifyPassword } from '../server/passwords.mjs';

test('salted versioned passwords support legacy upgrade and reject incorrect values', async () => {
  const first = await hashPassword('long-password'), second = await hashPassword('long-password');
  assert.match(first.password, /^scrypt\$32768\$8\$3\$[a-f0-9]{128}$/);
  assert.notEqual(first.salt, second.salt);
  assert.equal((await verifyPassword('long-password', first)).valid, true);
  assert.equal((await verifyPassword('long-password2', first)).valid, false);
  const legacy = { salt: 'old-salt', password: scryptSync('long-password', 'old-salt', 64).toString('hex') };
  assert.deepEqual(await verifyPassword('long-password', legacy), { valid: true, needsUpgrade: true });
});

test('tokens are hashed, report decisions persist, repeat reports reopen, and account deletion cascades', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'jianxu-community-'));
  const path = join(directory, 'community.sqlite');
  const server = createCommunityServer({ databasePath: path });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const db = new DatabaseSync(path); db.exec('PRAGMA foreign_keys=ON');
  t.after(async () => { db.close(); await new Promise(resolve => server.close(resolve)); rmSync(directory, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (route, method, body, token) => {
    const res = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    assert.ok(res.ok, `${method} ${route}: ${res.status}`); return res.json();
  };
  const alice = await call('/auth/register', 'POST', { name: 'alice', password: 'long-password' });
  const bob = await call('/auth/register', 'POST', { name: 'bob', password: 'long-password' });
  const session = db.prepare('SELECT token FROM sessions WHERE user_id=?').get(alice.user.id);
  assert.notEqual(session.token, alice.token);
  assert.equal(session.token, createHash('sha256').update(alice.token).digest('hex'));
  const post = await call('/posts', 'POST', { body: 'root' }, alice.token);
  await call('/reports', 'POST', { postId: post.id, reason: 'review' }, bob.token);
  const report = db.prepare('SELECT id FROM reports').get();
  resolveReport(db, report.id, 'keep');
  assert.equal(db.prepare('SELECT status FROM reports').get().status, 'dismissed');
  await call('/reports', 'POST', { postId: post.id, reason: 'new evidence' }, bob.token);
  assert.equal(db.prepare('SELECT status FROM reports').get().status, 'pending');
  resolveReport(db, report.id, 'remove');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM posts').get().n, 0);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM moderation_actions').get().n, 2);
  await call('/account', 'DELETE', undefined, alice.token);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM sessions WHERE user_id=?').get(alice.user.id).n, 0);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM users WHERE id=?').get(alice.user.id).n, 0);
});
