import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { mkdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { createRepository, DATABASE_SCHEMA, type SqlDatabase } from '../src/services/repository';
import type { Book } from '../src/features/reader/model/types';

test('real SQLite repository restores positions independently of cutoff, notes and settings', async () => {
  mkdirSync('.private', { recursive: true });
  const path = join(process.cwd(), '.private', `reader-test-${randomUUID()}.sqlite`);
  let db = new DatabaseSync(path);
  db.exec(DATABASE_SCHEMA);
  const adapter: SqlDatabase = {
    runAsync: async (sql, ...params) => db.prepare(sql).run(...params),
    getFirstAsync: async <T,>(sql: string, ...params: (string | number | null)[]) => (db.prepare(sql).get(...params) || null) as T | null,
    getAllAsync: async <T,>(sql: string, ...params: (string | number | null)[]) => db.prepare(sql).all(...params) as T[],
  };
  const r = createRepository(async () => adapter);
  try {
    const book: Book = { id: 'book', fingerprint: 'unique-hash', title: '书', author: '作者', format: 'epub', originalUri: 'file://original.epub', directory: 'file://books/book', importedAt: 1, openedAt: 1, chapters: [{ id: 'one', href: 'one.xhtml', title: '第一章' }], position: null, cutoff: null };
    await r.insertBook(book);
    const cutoff = { href: 'one.xhtml', chapter: 0, block: 3, progression: .2 };
    const position = { href: 'one.xhtml', chapter: 0, block: 10, progression: .7 };
    await r.saveCutoff(book.id, cutoff);
    await r.savePosition(book.id, position);
    await r.addAnnotation({ id: 'note', bookId: book.id, kind: 'note', locator: cutoff, text: "引号 ' 也能保存", quote: '正文', createdAt: 10 });
    await r.setSetting('font', { size: 24 });
    db.close(); db = new DatabaseSync(path); db.exec('PRAGMA foreign_keys=ON');
    assert.deepEqual((await r.getBook(book.id))?.position, position);
    assert.deepEqual((await r.getBook(book.id))?.cutoff, cutoff);
    assert.equal((await r.listAnnotations(book.id))[0].text, "引号 ' 也能保存");
    assert.deepEqual(await r.getSetting('font', {}), { size: 24 });
    assert.equal(await r.findFingerprint('unique-hash'), book.id);
    await assert.rejects(() => r.insertBook({ ...book, id: 'duplicate' }));
    await r.removeBookRecord(book.id);
    assert.deepEqual(await r.listAnnotations(book.id), []);
    assert.deepEqual(await r.listBooks(), []);
  } finally { db.close(); unlinkSync(path); }
});
