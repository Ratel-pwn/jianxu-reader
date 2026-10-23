export type BookFormat = 'epub' | 'pdf';
export type Locator = {
  href: string;
  chapter: number;
  progression: number;
  fragment?: string;
  quote?: string;
  page?: number;
  block?: number;
};
export type Chapter = { id: string; href: string; title: string };
export type Book = {
  id: string;
  fingerprint: string;
  title: string;
  author: string;
  format: BookFormat;
  originalUri: string;
  directory: string;
  importedAt: number;
  openedAt: number;
  chapters: Chapter[];
  position: Locator | null;
  cutoff: Locator | null;
};
export type Annotation = {
  id: string;
  bookId: string;
  kind: 'bookmark' | 'note' | 'highlight';
  locator: Locator;
  text: string;
  quote: string;
  createdAt: number;
};
export type Typography = { size: number; lineHeight: number; theme: 'paper' | 'light' | 'dark' };
export const defaultTypography: Typography = { size: 20, lineHeight: 1.8, theme: 'paper' };

export function isLocator(value: unknown): value is Locator {
  if (!value || typeof value !== 'object') return false;
  const v = value as Locator;
  return typeof v.href === 'string' && v.href.length < 2000 && Number.isInteger(v.chapter) && v.chapter >= 0 &&
    Number.isFinite(v.progression) && v.progression >= 0 && v.progression <= 1 &&
    (v.page === undefined || (Number.isInteger(v.page) && v.page > 0)) &&
    (v.block === undefined || (Number.isInteger(v.block) && v.block >= 0)) &&
    (v.fragment === undefined || (typeof v.fragment === 'string' && v.fragment.length < 500)) &&
    (v.quote === undefined || (typeof v.quote === 'string' && v.quote.length <= 500));
}

export function beforeOrAt(location: Locator, boundary: Locator): boolean {
  if (location.page !== undefined && boundary.page !== undefined) return location.page <= boundary.page;
  if (location.chapter === boundary.chapter && location.block !== undefined && boundary.block !== undefined) return location.block <= boundary.block;
  return location.chapter < boundary.chapter ||
    (location.chapter === boundary.chapter && location.progression <= boundary.progression);
}

export function locatorLabel(location: Locator | null, chapters: Chapter[]): string {
  if (!location) return '尚未标记';
  if (location.page) return `第 ${location.page} 页`;
  return `${chapters[location.chapter]?.title || `第 ${location.chapter + 1} 章`} · ${Math.round(location.progression * 100)}%`;
}
