import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, createHash } from 'node:crypto';
import { hashPassword, verifyPassword } from './passwords.mjs';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const hash = value => createHash('sha256').update(value).digest('hex');
class HTTPError extends Error { constructor(status, message) { super(message); this.status = status; } }
const fail = (status, message) => { throw new HTTPError(status, message); };
const positiveId = value => typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : fail(400, '无效内容编号');
const text = (value, max, label) => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max ? value.trim() : fail(400, `${label}格式不正确`);

export function createCommunityServer({ databasePath = ':memory:', now = () => Date.now() } = {}) {
  if (databasePath !== ':memory:') mkdirSync(dirname(databasePath), { recursive: true });
  const db = new DatabaseSync(databasePath);
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL, password TEXT NOT NULL, salt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS posts(id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, parent_id INTEGER REFERENCES posts(id) ON DELETE CASCADE, body TEXT NOT NULL, book_title TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS blocks(user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, target_id INTEGER REFERENCES users(id) ON DELETE CASCADE, PRIMARY KEY(user_id,target_id));
    CREATE TABLE IF NOT EXISTS reports(id INTEGER PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE, reason TEXT NOT NULL, created_at INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending', UNIQUE(user_id,post_id));
    CREATE TABLE IF NOT EXISTS moderation_actions(id INTEGER PRIMARY KEY, report_id INTEGER NOT NULL, post_id INTEGER NOT NULL, decision TEXT NOT NULL, created_at INTEGER NOT NULL);`);
  const limits = new Map();
  let activeHashes = 0;
  async function withHashLimit(action) {
    if (activeHashes >= 2) fail(429, '登录请求较多，请稍后重试');
    activeHashes++;
    try { return await action(); } finally { activeHashes--; }
  }
  function rate(key, max = 60) {
    const entry = limits.get(key) || { at: now(), count: 0 };
    if (now() - entry.at > 60000) { entry.at = now(); entry.count = 0; }
    entry.count++; limits.set(key, entry);
    if (entry.count > max) fail(429, '操作过于频繁，请稍后重试');
    if (limits.size > 10000) for (const [k, v] of limits) if (now() - v.at > 60000) limits.delete(k);
  }
  async function body(req) {
    let size = 0; const chunks = [];
    for await (const chunk of req) { size += chunk.length; if (size > 16000) fail(413, '内容过长'); chunks.push(chunk); }
    try {
      const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Expected object');
      return parsed;
    } catch { fail(400, '请求内容无效'); }
  }
  function auth(req) {
    const token = (req.headers.authorization || '').match(/^Bearer ([a-f0-9]{64})$/)?.[1];
    if (!token) fail(401, '请先登录');
    const user = db.prepare('SELECT users.id, users.name FROM sessions JOIN users ON users.id=sessions.user_id WHERE token=? AND expires>?').get(hash(token), now());
    if (!user) fail(401, '登录已失效，请重新登录');
    return user;
  }
  const postQuery = `SELECT posts.id, posts.user_id AS authorId, users.name AS author, posts.parent_id AS parentId, posts.body, posts.book_title AS bookTitle, posts.created_at AS createdAt FROM posts JOIN users ON users.id=posts.user_id`;
  function visiblePost(id, user) {
    const post = db.prepare(postQuery + ' WHERE posts.id=? AND posts.user_id NOT IN (SELECT target_id FROM blocks WHERE user_id=?) AND posts.user_id NOT IN (SELECT user_id FROM blocks WHERE target_id=?)').get(id, user.id, user.id);
    if (!post) fail(404, '内容不存在或不可见');
    if (post.parentId !== null) {
      const parent = db.prepare('SELECT id FROM posts WHERE id=? AND user_id NOT IN (SELECT target_id FROM blocks WHERE user_id=?) AND user_id NOT IN (SELECT user_id FROM blocks WHERE target_id=?)').get(post.parentId, user.id, user.id);
      if (!parent) fail(404, '内容不存在或不可见');
    }
    return post;
  }
  const server = createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff');
    const send = (status, value) => { res.writeHead(status); res.end(JSON.stringify(value)); };
    try {
      const path = new URL(req.url, 'http://localhost').pathname;
      rate(req.socket.remoteAddress || 'unknown');
      if (req.method === 'GET' && path === '/health') return send(200, { status: 'ok', version: 1 });
      if (req.method === 'POST' && ['/auth/register', '/auth/login'].includes(path)) {
        rate(`auth:${req.socket.remoteAddress}`, 10);
        const input = await body(req), name = text(input.name, 30, '用户名'), password = input.password;
        if (typeof password !== 'string' || password.length < 10 || password.length > 128) fail(400, '密码需要 10 至 128 个字符');
        rate(`account:${name.toLowerCase()}`, 10);
        let user = db.prepare('SELECT * FROM users WHERE name=?').get(name);
        if (path.endsWith('register')) {
          if (user) fail(409, '用户名已被使用');
          const encoded = await withHashLimit(() => hashPassword(password));
          try { db.prepare('INSERT INTO users(name,password,salt) VALUES(?,?,?)').run(name, encoded.password, encoded.salt); } catch { fail(409, '用户名已被使用'); }
          user = db.prepare('SELECT * FROM users WHERE name=?').get(name);
        } else {
          const check = await withHashLimit(() => verifyPassword(password, user));
          if (!check.valid) fail(401, '用户名或密码不正确');
          if (check.needsUpgrade) {
            const encoded = await withHashLimit(() => hashPassword(password));
            db.prepare('UPDATE users SET password=?,salt=? WHERE id=?').run(encoded.password, encoded.salt, user.id);
          }
        }
        const token = randomBytes(32).toString('hex');
        db.prepare('DELETE FROM sessions WHERE expires<=?').run(now());
        db.prepare('INSERT INTO sessions(token,user_id,expires) VALUES(?,?,?)').run(hash(token), user.id, now() + 7 * 86400000);
        return send(200, { token, user: { id: user.id, name: user.name } });
      }
      const user = auth(req);
      if (req.method === 'GET' && path === '/me') return send(200, user);
      if (req.method === 'POST' && path === '/auth/logout') { db.prepare('DELETE FROM sessions WHERE token=?').run(hash((req.headers.authorization || '').replace(/^Bearer /, ''))); return send(200, { ok: true }); }
      if (req.method === 'DELETE' && path === '/account') { db.prepare('DELETE FROM users WHERE id=?').run(user.id); return send(200, { ok: true }); }
      if (req.method === 'GET' && path === '/posts') {
        return send(200, db.prepare(postQuery + ' WHERE parent_id IS NULL AND user_id NOT IN (SELECT target_id FROM blocks WHERE user_id=?) AND user_id NOT IN (SELECT user_id FROM blocks WHERE target_id=?) ORDER BY posts.id DESC LIMIT 50').all(user.id, user.id));
      }
      if (req.method === 'POST' && path === '/posts') {
        rate(`write:${user.id}`, 15);
        const input = await body(req), content = text(input.body, 5000, '内容');
        if (input.bookTitle !== undefined && (typeof input.bookTitle !== 'string' || input.bookTitle.length > 200)) fail(400, '书名不能超过 200 个字符');
        const bookTitle = input.bookTitle?.trim() || '';
        const parentId = input.parentId === undefined ? null : positiveId(input.parentId);
        if (parentId !== null) { const parent = visiblePost(parentId, user); if (parent.parentId !== null) fail(400, '请回复主题帖'); }
        const result = db.prepare('INSERT INTO posts(user_id,parent_id,body,book_title,created_at) VALUES(?,?,?,?,?)').run(user.id, parentId, content, bookTitle, now());
        return send(201, visiblePost(Number(result.lastInsertRowid), user));
      }
      const thread = path.match(/^\/posts\/(\d+)$/);
      if (req.method === 'GET' && thread) {
        const post = visiblePost(Number(thread[1]), user);
        const replies = db.prepare(postQuery + ' WHERE parent_id=? AND user_id NOT IN (SELECT target_id FROM blocks WHERE user_id=?) AND user_id NOT IN (SELECT user_id FROM blocks WHERE target_id=?) ORDER BY posts.id LIMIT 100').all(post.id, user.id, user.id);
        return send(200, { post, replies });
      }
      if (req.method === 'DELETE' && thread) {
        const post = visiblePost(Number(thread[1]), user); if (post.authorId !== user.id) fail(403, '只能删除自己的内容');
        db.prepare('DELETE FROM posts WHERE id=?').run(post.id); return send(200, { ok: true });
      }
      if (req.method === 'POST' && path === '/reports') {
        const input = await body(req), post = visiblePost(positiveId(input.postId), user), reason = text(input.reason, 500, '举报原因');
        if (post.authorId === user.id) fail(400, '不能举报自己的内容');
        db.prepare("INSERT INTO reports(user_id,post_id,reason,created_at) VALUES(?,?,?,?) ON CONFLICT(user_id,post_id) DO UPDATE SET reason=excluded.reason,status='pending',created_at=excluded.created_at").run(user.id, post.id, reason, now());
        return send(201, { ok: true, status: 'pending' });
      }
      if (req.method === 'GET' && path === '/blocks') return send(200, db.prepare('SELECT users.id,users.name FROM blocks JOIN users ON users.id=blocks.target_id WHERE user_id=?').all(user.id));
      const block = path.match(/^\/blocks\/(\d+)$/);
      if (block && req.method === 'POST') {
        const target = Number(block[1]); if (target === user.id || !db.prepare('SELECT id FROM users WHERE id=?').get(target)) fail(400, '无法屏蔽该用户');
        db.prepare('INSERT OR IGNORE INTO blocks(user_id,target_id) VALUES(?,?)').run(user.id, target); return send(200, { ok: true });
      }
      if (block && req.method === 'DELETE') { db.prepare('DELETE FROM blocks WHERE user_id=? AND target_id=?').run(user.id, Number(block[1])); return send(200, { ok: true }); }
      fail(404, '接口不存在');
    } catch (error) { send(error instanceof HTTPError ? error.status : 500, { error: error instanceof HTTPError ? error.message : '服务暂时不可用' }); }
  });
  server.on('close', () => db.close());
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const path = resolve(dirname(fileURLToPath(import.meta.url)), 'data/community.sqlite');
  const server = createCommunityServer({ databasePath: path });
  server.listen(4318, '127.0.0.1', () => console.log('Community development server: http://127.0.0.1:4318 (local only)'));
}
