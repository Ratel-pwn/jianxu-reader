import * as SQLite from 'expo-sqlite';
import { createRepository, DATABASE_SCHEMA } from './repository';

let database: Promise<SQLite.SQLiteDatabase> | null = null;
export function getDatabase() {
 database ??= (async () => { const db = await SQLite.openDatabaseAsync('jianxu.db'); await db.execAsync(DATABASE_SCHEMA); return db; })().catch(error => { database = null; throw error; });
 return database;
}
export const { listBooks, getBook, findFingerprint, insertBook, savePosition, saveCutoff, removeBookRecord, listAnnotations, addAnnotation, deleteAnnotation, setSetting, getSetting } = createRepository(getDatabase);
