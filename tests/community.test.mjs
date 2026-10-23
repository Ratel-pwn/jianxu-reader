import { test } from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { Buffer } from 'node:buffer';
import { createCommunityServer } from '../server/server.mjs';

test('real HTTP community persists posts, enforces ownership, report/block and deletion', async t => {
  const server = createCommunityServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function call(path, method = 'GET', body, token) {
    const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, data: await response.json() };
  }
  assert.equal((await call('/posts')).status, 401);
  const alice = (await call('/auth/register', 'POST', { name: '甲', password: 'long-password-1' })).data;
  const bob = (await call('/auth/register', 'POST', { name: '乙', password: 'long-password-2' })).data;
  const created = await call('/posts', 'POST', { body: '讨论中的真实内容', bookTitle: '原创书' }, alice.token);
  assert.equal(created.status, 201);
  const postId = created.data.id;
  assert.equal((await call('/posts', 'GET', undefined, bob.token)).data.length, 1);
  assert.equal((await call(`/posts/${postId}`, 'DELETE', undefined, bob.token)).status, 403);
  assert.equal((await call('/posts', 'POST', { body: '回复', parentId: postId }, bob.token)).status, 201);
  assert.equal((await call(`/posts/${postId}`, 'GET', undefined, alice.token)).data.replies.length, 1);
  assert.equal((await call('/reports', 'POST', { postId, reason: '测试举报' }, bob.token)).data.status, 'pending');
  assert.equal((await call(`/blocks/${alice.user.id}`, 'POST', undefined, bob.token)).status, 200);
  assert.equal((await call('/posts', 'GET', undefined, bob.token)).data.length, 0);
  assert.equal((await call(`/posts/${postId}`, 'GET', undefined, bob.token)).status, 404);
  await call(`/blocks/${alice.user.id}`, 'DELETE', undefined, bob.token);
  assert.equal((await call('/posts', 'GET', undefined, bob.token)).data.length, 1);
  assert.equal((await call('/account', 'DELETE', undefined, alice.token)).status, 200);
  assert.equal((await call('/me', 'GET', undefined, alice.token)).status, 401);
  assert.equal((await call('/posts', 'GET', undefined, bob.token)).data.length, 0);
  assert.equal((await call(`/posts/${postId}`, 'GET', undefined, bob.token)).status, 404);
});

test('split UTF-8 request bytes preserve Chinese text and invalid JSON shapes return 400', async t => {
  const server = createCommunityServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const payload = Buffer.from(JSON.stringify({ name: '\u9605\u8bfb\u8005', password: 'long-password-3' }));
  const split = payload.indexOf(Buffer.from('\u9605')) + 1;
  const result = await new Promise((resolve, reject) => {
    const req = request(base + '/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' } }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(Buffer.concat(chunks).toString('utf8')) }));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.write(payload.subarray(0, split));
    setTimeout(() => req.end(payload.subarray(split)), 30);
  });
  assert.equal(result.status, 200);
  assert.equal(result.data.user.name, '\u9605\u8bfb\u8005');
  const invalid = await fetch(base + '/auth/login', { method: 'POST', body: 'null' });
  assert.equal(invalid.status, 400);
});
