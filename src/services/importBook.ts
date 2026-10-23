import * as Picker from 'expo-document-picker';
import { File, Directory, Paths } from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { openEpub } from '../features/import/model/epub';
import type { Book } from '../features/reader/model/types';
import { findFingerprint, insertBook, removeBookRecord } from './database';

let importing = false;
export async function pickAndImport(onProgress: (text: string) => void): Promise<string | null> {
  if (importing) return null;
  importing = true;
  let directory: Directory | null = null;
  try {
    const result = await Picker.getDocumentAsync({ type: ['application/pdf', 'application/epub+zip'], copyToCacheDirectory: true });
    if (result.canceled) return null;
    const asset = result.assets[0];
    const format = asset.name.toLowerCase().endsWith('.epub') ? 'epub' : asset.name.toLowerCase().endsWith('.pdf') ? 'pdf' : null;
    if (!format) throw new Error('请选择 PDF 或 EPUB 文件');
    const input = new File(asset.uri);
    const size = input.size;
    if (!size) throw new Error('文件为空或无法读取');
    if (size > (format === 'epub' ? 50 : 150) * 1024 * 1024) throw new Error(`${format.toUpperCase()} 文件过大，当前上限为 ${format === 'epub' ? 50 : 150} MB`);
    onProgress('正在检查文件…');
    const fingerprint = await ReactNativeBlobUtil.fs.hash(decodeURIComponent(asset.uri.replace(/^file:\/\//, '')), 'sha256');
    const existing = await findFingerprint(fingerprint);
    if (existing) return existing;
    const id = Crypto.randomUUID();
    directory = new Directory(Paths.document, 'books', id);
    directory.create({ intermediates: true });
    const original = new File(directory, `original.${format}`);
    input.copy(original);
    const book: Book = { id, fingerprint, title: asset.name.replace(/\.(pdf|epub)$/i, ''), author: '', format, originalUri: original.uri, directory: directory.uri, importedAt: Date.now(), openedAt: Date.now(), chapters: [], position: null, cutoff: null };
    if (format === 'epub') {
      const epub = await openEpub(await original.bytes());
      book.title = epub.title || book.title;
      book.author = epub.author;
      book.chapters = epub.chapters;
      for (let i = 0; i < epub.chapters.length; i++) {
        onProgress(`正在准备章节 ${i + 1} / ${epub.chapters.length}`);
        new File(directory, `chapter-${i}.html`).write(await epub.chapter(i));
      }
    } else {
      const handle = original.open();
      const header = await handle.readBytes(Math.min(1024, size));
      handle.close();
      if (!String.fromCharCode(...header).includes('%PDF-')) throw new Error('该文件不是有效 PDF');
    }
    await insertBook(book);
    directory = null;
    return id;
  } finally {
    if (directory?.exists) directory.delete();
    importing = false;
  }
}
export async function deleteBook(book: Book) {
  const directory = new Directory(book.directory);
  if (directory.exists) directory.delete();
  await removeBookRecord(book.id);
}
