import type { Book, Annotation, Locator } from '../features/reader/model/types';
export interface SqlDatabase {
 runAsync(sql: string, ...params: (string | number | null)[]): Promise<unknown>;
 getFirstAsync<T>(sql: string, ...params: (string | number | null)[]): Promise<T | null>;
 getAllAsync<T>(sql: string, ...params: (string | number | null)[]): Promise<T[]>;
}
export const DATABASE_SCHEMA = "PRAGMA journal_mode = WAL;\n      PRAGMA foreign_keys = ON;\n      CREATE TABLE IF NOT EXISTS books (\n        id TEXT PRIMARY KEY, fingerprint TEXT UNIQUE NOT NULL, document TEXT NOT NULL,\n        position TEXT, cutoff TEXT, opened_at INTEGER NOT NULL\n      );\n      CREATE TABLE IF NOT EXISTS annotations (\n        id TEXT PRIMARY KEY, book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,\n        kind TEXT NOT NULL, locator TEXT NOT NULL, text TEXT NOT NULL, quote TEXT NOT NULL, created_at INTEGER NOT NULL\n      );\n      CREATE INDEX IF NOT EXISTS annotations_book ON annotations(book_id, created_at DESC);\n      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);\n      PRAGMA user_version = 1;";
export function createRepository(getDatabase: () => Promise<SqlDatabase>) {
type BookRow = { document: string; position: string | null; cutoff: string | null; opened_at: number };
function decodeBook(row: BookRow): Book {
  return { ...JSON.parse(row.document), position: row.position ? JSON.parse(row.position) : null, cutoff: row.cutoff ? JSON.parse(row.cutoff) : null, openedAt: row.opened_at };
}
async function listBooks() {
  const db = await getDatabase();
  return (await db.getAllAsync<BookRow>('SELECT * FROM books ORDER BY opened_at DESC')).map(decodeBook);
}
async function getBook(id: string) {
  const row = await (await getDatabase()).getFirstAsync<BookRow>('SELECT * FROM books WHERE id = ?', id);
  return row ? decodeBook(row) : null;
}
async function findFingerprint(fingerprint: string) {
  const row = await (await getDatabase()).getFirstAsync<{ id: string }>('SELECT id FROM books WHERE fingerprint = ?', fingerprint);
  return row?.id;
}
async function insertBook(book: Book) {
  await (await getDatabase()).runAsync('INSERT INTO books (id, fingerprint, document, opened_at) VALUES (?, ?, ?, ?)', book.id, book.fingerprint, JSON.stringify(book), book.openedAt);
}
async function savePosition(id: string, locator: Locator) {
  await (await getDatabase()).runAsync('UPDATE books SET position = ?, opened_at = ? WHERE id = ?', JSON.stringify(locator), Date.now(), id);
}
async function saveCutoff(id: string, locator: Locator | null) {
  await (await getDatabase()).runAsync('UPDATE books SET cutoff = ? WHERE id = ?', locator ? JSON.stringify(locator) : null, id);
}
async function removeBookRecord(id: string) {
  await (await getDatabase()).runAsync('DELETE FROM books WHERE id = ?', id);
}
async function listAnnotations(bookId: string): Promise<Annotation[]> {
  const rows = await (await getDatabase()).getAllAsync<{ id: string; book_id: string; kind: Annotation['kind']; locator: string; text: string; quote: string; created_at: number }>('SELECT * FROM annotations WHERE book_id = ? ORDER BY created_at DESC', bookId);
  return rows.map(r => ({ id: r.id, bookId: r.book_id, kind: r.kind, locator: JSON.parse(r.locator), text: r.text, quote: r.quote, createdAt: r.created_at }));
}
async function addAnnotation(note: Annotation) {
  await (await getDatabase()).runAsync('INSERT INTO annotations (id, book_id, kind, locator, text, quote, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', note.id, note.bookId, note.kind, JSON.stringify(note.locator), note.text, note.quote, note.createdAt);
}
async function deleteAnnotation(id: string) {
  await (await getDatabase()).runAsync('DELETE FROM annotations WHERE id = ?', id);
}
async function setSetting<T>(key: string, value: T) {
  await (await getDatabase()).runAsync('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', key, JSON.stringify(value));
}
async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await (await getDatabase()).getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
  if (!row) return fallback;
  try { return JSON.parse(row.value) as T; } catch { return fallback; }
}

return { listBooks, getBook, findFingerprint, insertBook, savePosition, saveCutoff, removeBookRecord, listAnnotations, addAnnotation, deleteAnnotation, setSetting, getSetting };
}
