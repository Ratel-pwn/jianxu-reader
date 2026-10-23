import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';
import { parseDocument, DomUtils } from 'htmlparser2';
import { Element, Text, type AnyNode } from 'domhandler';
import { render } from 'dom-serializer';
import { fromByteArray } from 'base64-js';
import { resolveArchivePath, validateZip } from './archive';
import { readBoundedText, safeInlineStyle, validateMarkup } from './publicationSafety';
import type { Chapter } from '../../reader/model/types';

const xml = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@', removeNSPrefix: true, processEntities: false });
const asArray = <T,>(value: T | T[] | undefined): T[] => value === undefined ? [] : Array.isArray(value) ? value : [value];
const textValue = (value: unknown): string => typeof value === 'string' ? value : value && typeof value === 'object' ? String((value as Record<string, unknown>)['#text'] || '') : '';
const tags = new Set('body section article div p h1 h2 h3 h4 h5 h6 span b strong i em u s del blockquote pre code ul ol li dl dt dd br hr img a table thead tbody tr th td caption figure figcaption ruby rt rp sup sub'.split(' '));
const removed = new Set('script style iframe object embed form input button video audio source link meta base svg math noscript'.split(' '));
const blocks = new Set('p h1 h2 h3 h4 h5 h6 li blockquote pre figcaption td dd'.split(' '));
const imageTypes: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' };

export async function sanitizeChapter(source: string, href: string, image: (path: string) => Promise<string | null>): Promise<string> {
  const doc = parseDocument(source, { decodeEntities: true });
  validateMarkup(doc.children);
  const root = DomUtils.findOne(n => n.name === 'body', doc.children, true);
  let serial = 0, imageCharacters = 0;
  async function clean(nodes: AnyNode[]): Promise<AnyNode[]> {
    const result: AnyNode[] = [];
    for (const node of nodes) {
      if (node.type === 'text') { result.push(new Text(node.data)); continue; }
      if (!(node instanceof Element)) continue;
      const name = node.name.toLowerCase().split(':').pop() || '';
      if (removed.has(name)) continue;
      const children = await clean(node.children);
      if (!tags.has(name)) { result.push(...children); continue; }
      const attrs: Record<string, string> = {};
      const style = safeInlineStyle(node.attribs.style, name === 'img');
      if (style) attrs.style = style;
      if (/^[a-zA-Z-]{2,30}$/.test(node.attribs.lang || '')) attrs.lang = node.attribs.lang;
      if (['ltr', 'rtl', 'auto'].includes(node.attribs.dir)) attrs.dir = node.attribs.dir;
      if (node.attribs.id && /^[\w:.-]{1,200}$/.test(node.attribs.id)) attrs.id = node.attribs.id;
      if (blocks.has(name) && !DomUtils.findOne(child => blocks.has(child.name), node.children, true)) attrs['data-location'] = `block-${serial++}`;
      if (name === 'img') {
        try {
          const path = resolveArchivePath(href, node.attribs.src || '');
          const src = await image(path);
          if (src && src.length <= 8 * 1024 * 1024 && imageCharacters + src.length <= 12 * 1024 * 1024) { imageCharacters += src.length; attrs.src = src; attrs.alt = (node.attribs.alt || '').slice(0, 500); }
          else { result.push(new Text(node.attribs.alt || '[图片不可用]')); continue; }
        } catch { result.push(new Text('[外部图片已阻止]')); continue; }
      }
      if (name === 'a' && node.attribs.href) {
        try {
          const value = node.attribs.href;
          const target = value.startsWith('#') ? href : resolveArchivePath(href, value);
          attrs['data-link'] = target + (value.includes('#') ? '#' + value.split('#').slice(1).join('#') : '');
          attrs.role = 'link';
          attrs.tabindex = '0';
        } catch { /* External publication links stay inert. */ }
      }
      if (name === 'td' || name === 'th') {
        for (const key of ['rowspan', 'colspan']) if (/^[1-9][0-9]?$/.test(node.attribs[key] || '')) attrs[key] = node.attribs[key];
      }
      result.push(new Element(name, attrs, children));
    }
    return result;
  }
  return render(await clean(root?.children || doc.children), { encodeEntities: 'utf8' });
}

export async function openEpub(bytes: Uint8Array) {
  validateZip(bytes);
  const zip = await JSZip.loadAsync(bytes, { checkCRC32: false });
  if (zip.file('META-INF/encryption.xml')) throw new Error('暂不支持带加密资源的 EPUB');
  const read = async (path: string) => {
    const file = zip.file(path);
    if (!file) throw new Error(`EPUB 缺少资源：${path}`);
    const content = await readBoundedText(file, 'string', 4 * 1024 * 1024);
    if (/<!DOCTYPE[^>]*\[|<!ENTITY/i.test(content)) throw new Error('EPUB 包含不支持的 XML 实体');
    validateMarkup(parseDocument(content, { xmlMode: true }).children);
    return content;
  };
  const container = xml.parse(await read('META-INF/container.xml'));
  const root = asArray<Record<string, string>>(container.container?.rootfiles?.rootfile)[0];
  if (!root?.['@full-path']) throw new Error('EPUB 没有内容目录');
  const opf = resolveArchivePath('', root['@full-path']);
  const pkg = xml.parse(await read(opf)).package;
  if (!pkg?.manifest || !pkg?.spine) throw new Error('EPUB 没有阅读顺序');
  if (asArray<Record<string, string>>(pkg.metadata?.meta).some(meta => meta['@property'] === 'rendition:layout' && meta['#text'] === 'pre-paginated')) throw new Error('当前版本仅支持可重排 EPUB，暂不支持固定版式');
  type Item = { '@id': string; '@href': string; '@media-type': string; '@properties'?: string };
  const manifest = asArray<Item>(pkg.manifest.item);
  const titles = new Map<string, string>();
  const nav = manifest.find(i => i['@properties']?.split(' ').includes('nav'));
  if (nav) {
    const navPath = resolveArchivePath(opf, nav['@href']);
    const dom = parseDocument(await read(navPath));
    for (const a of DomUtils.findAll(n => n.name === 'a' && !!n.attribs.href, dom.children)) {
      try { titles.set(resolveArchivePath(navPath, a.attribs.href), DomUtils.textContent(a).trim()); } catch { /* Ignore external navigation. */ }
    }
  } else {
    const ncx = manifest.find(i => i['@media-type'] === 'application/x-dtbncx+xml');
    if (ncx) {
      const path = resolveArchivePath(opf, ncx['@href']);
      const dom = parseDocument(await read(path), { xmlMode: true });
      for (const point of DomUtils.findAll(n => n.name === 'navPoint', dom.children)) {
        const content = DomUtils.findOne(n => n.name === 'content', point.children, true);
        const label = DomUtils.findOne(n => n.name === 'navLabel', point.children, true);
        if (content?.attribs.src) try { titles.set(resolveArchivePath(path, content.attribs.src), label ? DomUtils.textContent(label).trim() : ''); } catch { /* Ignore invalid navigation. */ }
      }
    }
  }
  const chapters: Chapter[] = asArray<Record<string, string>>(pkg.spine.itemref)
    .filter(ref => ref['@linear'] !== 'no')
    .map((ref, i) => {
      const item = manifest.find(m => m['@id'] === ref['@idref']);
      if (!item || !['application/xhtml+xml', 'text/html'].includes(item['@media-type'])) throw new Error('EPUB 包含不支持的章节格式');
      const href = resolveArchivePath(opf, item['@href']);
      return { id: item['@id'], href, title: titles.get(href) || `第 ${i + 1} 章` };
    });
  if (!chapters.length) throw new Error('EPUB 中没有可读章节');
  return {
    title: textValue(asArray(pkg.metadata?.title)[0]),
    author: textValue(asArray(pkg.metadata?.creator)[0]),
    chapters,
    async chapter(index: number) {
      const href = chapters[index].href;
      return sanitizeChapter(await read(href), href, async path => {
        const mime = imageTypes[path.split('.').pop()?.toLowerCase() || ''];
        const file = zip.file(path);
        if (!mime || !file) return null;
        const binary = await readBoundedText(file, 'binarystring', 6 * 1024 * 1024);
        return `data:${mime};base64,${fromByteArray(Uint8Array.from(binary, char => char.charCodeAt(0)))}`;
      });
    },
  };
}
