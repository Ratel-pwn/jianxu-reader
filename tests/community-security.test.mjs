import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCommunityServer } from '../server/server.mjs';

async function setup(t) {
  let clock = Date.now();
  const server = createCommunityServer({ now: () => clock });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (path, method = 'GET', body, token) => {
    const r = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: r.status, data: await r.json() };
  };
  return { call, advance: delta => { clock += delta; } };
}

test('blocking a thread author also hides third-party replies by direct ID', async t => {
  const { call } = await setup(t);
  const register = async name => (await call('/auth/register', 'POST', { name, password: 'long-password' })).data;
  const alice = await register('alice'), bob = await register('bob'), charlie = await register('charlie');
  const root = (await call('/posts', 'POST', { body: 'root' }, alice.token)).data;
  const reply = (await call('/posts', 'POST', { body: 'reply', parentId: root.id }, charlie.token)).data;
  await call(`/blocks/${alice.user.id}`, 'POST', undefined, bob.token);
  assert.equal((await call(`/posts/${reply.id}`, 'GET', undefined, bob.token)).status, 404);
  assert.equal((await call('/reports', 'POST', { postId: reply.id, reason: 'reason' }, bob.token)).status, 404);
});

test('password whitespace is significant; session expiry and logout revoke access', async t => {
  const { call, advance } = await setup(t);
  const password = ' long-password ';
  const first = (await call('/auth/register', 'POST', { name: 'alice', password })).data;
  assert.equal((await call('/auth/login', 'POST', { name: 'alice', password: password.trim() })).status, 401);
  const login = await call('/auth/login', 'POST', { name: 'alice', password });
  assert.equal(login.status, 200);
  await call('/auth/logout', 'POST', undefined, first.token);
  assert.equal((await call('/me', 'GET', undefined, first.token)).status, 401);
  advance(7 * 86400000 + 1);
  assert.equal((await call('/me', 'GET', undefined, login.data.token)).status, 401);
});

test('malformed IDs and oversized titles are rejected without server errors', async t => {
  const { call } = await setup(t);
  const user = (await call('/auth/register', 'POST', { name: 'alice', password: 'long-password' })).data;
  for (const parentId of ['abc', [], {}, -1, 0, 1.5, 1e30]) {
    assert.equal((await call('/posts', 'POST', { body: 'text', parentId }, user.token)).status, 400);
  }
  assert.equal((await call('/posts', 'POST', { body: 'text', bookTitle: 'x'.repeat(201) }, user.token)).status, 400);
});
