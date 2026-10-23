import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Crypto from 'expo-crypto';
import { addAnnotation, deleteAnnotation, getBook, getSetting, listAnnotations, saveCutoff, savePosition, setSetting } from '../../../services/database';
import { defaultTypography, type Annotation, type Book, type Locator, type Typography } from '../model/types';

export function useReader(id: string) {
  const [book, setBook] = useState<Book | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [target, setTarget] = useState<Locator | null>(null), [position, setPosition] = useState<Locator | null>(null), [cutoff, setCutoff] = useState<Locator | null>(null);
  const [notes, setNotes] = useState<Annotation[]>([]), [typography, setTypography] = useState(defaultTypography);
  const latest = useRef<Locator | null>(null), timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef(Promise.resolve());
  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    const value = latest.current;
    if (value) pending.current = pending.current.then(() => savePosition(id, value)).catch(() => setError('阅读位置未保存，请检查设备存储空间'));
    return pending.current;
  }, [id]);
  useEffect(() => {
    let active = true;
    Promise.all([getBook(id), listAnnotations(id), getSetting('typography', defaultTypography)]).then(([b, n, font]) => {
      if (!active) return;
      if (!b) { setError('这本书已被移除'); return; }
      setBook(b); setNotes(n); setTypography(font); setCutoff(b.cutoff);
      const initial = b.position || { href: b.chapters[0]?.href || 'original.pdf', chapter: 0, progression: 0, ...(b.format === 'pdf' ? { page: 1 } : {}) };
      setTarget(initial); setPosition(initial); latest.current = initial;
    }).catch(() => { if (active) setError('无法读取阅读记录'); }).finally(() => { if (active) setLoading(false); });
    const subscription = AppState.addEventListener('change', state => { if (state !== 'active') void flush(); });
    return () => { active = false; subscription.remove(); void flush(); };
  }, [id, flush]);
  function moved(value: Locator) {
    latest.current = value; setPosition(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), 450);
  }
  function navigate(value: Locator) { setTarget({ ...value }); moved(value); }
  async function mark() {
    if (!latest.current) return false;
    const boundary = { ...latest.current };
    try { await saveCutoff(id, boundary); setCutoff(boundary); return true; }
    catch { setError('伴读边界未保存，请重试'); return false; }
  }
  async function annotate(kind: Annotation['kind'], text: string, quote = '', location = latest.current) {
    if (!location) return;
    await addAnnotation({ id: Crypto.randomUUID(), bookId: id, kind, text: text.trim(), quote, locator: { ...location }, createdAt: Date.now() });
    setNotes(await listAnnotations(id));
  }
  async function removeNote(noteId: string) { await deleteAnnotation(noteId); setNotes(await listAnnotations(id)); }
  async function updateTypography(value: Typography) {
    try { await setSetting('typography', value); setTypography(value);
      if (latest.current) setTarget({ ...latest.current });
    } catch { setError('阅读外观未保存，请重试'); }
  }
  return { book, loading, error, setError, target, position, cutoff, notes, typography, moved, navigate, mark, annotate, removeNote, updateTypography, flush };
}
