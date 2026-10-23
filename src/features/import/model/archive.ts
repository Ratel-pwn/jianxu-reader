export const IMPORT_LIMITS = { compressed: 50 * 1024 * 1024, expanded: 150 * 1024 * 1024, entry: 20 * 1024 * 1024, entries: 5000 };

export function resolveArchivePath(base: string, target: string): string {
  const decoded = decodeURIComponent(target.split('#')[0].split('?')[0]);
  if (/^[a-z][a-z0-9+.-]*:|^[/\\]|\\|\0/i.test(decoded)) throw new Error('书籍包含不安全的资源路径');
  const segments = base.split('/').slice(0, -1);
  for (const part of decoded.split('/')) {
    if (part === '..') { if (!segments.length) throw new Error('书籍资源超出文件范围'); segments.pop(); }
    else if (part && part !== '.') segments.push(part);
  }
  return segments.join('/');
}

export function validateZip(bytes: Uint8Array): void {
  if (bytes.length > IMPORT_LIMITS.compressed) throw new Error('EPUB 超过 50 MB，请使用较小的文件');
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (v.getUint32(i, true) === 0x06054b50 && i + 22 + v.getUint16(i + 20, true) === bytes.length) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('EPUB 文件不完整');
  const count = v.getUint16(eocd + 10, true);
  let offset = v.getUint32(eocd + 16, true), total = 0;
  const directoryEnd = offset + v.getUint32(eocd + 12, true), names = new Set<string>();
  if (v.getUint16(eocd + 4, true) || v.getUint16(eocd + 6, true) || v.getUint16(eocd + 8, true) !== count || directoryEnd !== eocd) throw new Error('EPUB 分卷或目录边界无效');
  if (count > IMPORT_LIMITS.entries || count === 65535) throw new Error('EPUB 资源过多');
  for (let n = 0; n < count; n++) {
    if (offset + 46 > bytes.length || v.getUint32(offset, true) !== 0x02014b50) throw new Error('EPUB 目录损坏');
    const compressed = v.getUint32(offset + 20, true), size = v.getUint32(offset + 24, true);
    if (v.getUint16(offset + 8, true) & 1) throw new Error('暂不支持加密 EPUB');
    if (size > IMPORT_LIMITS.entry || size > Math.max(compressed * 300, 1024 * 1024)) throw new Error('EPUB 资源展开后过大');
    total += size;
    if (total > IMPORT_LIMITS.expanded) throw new Error('EPUB 展开后超过 150 MB');
    const length = v.getUint16(offset + 28, true);
    if (offset + 46 + length > bytes.length) throw new Error('EPUB 资源名称损坏');
    const name = String.fromCharCode(...bytes.subarray(offset + 46, offset + 46 + length));
    const normalized = resolveArchivePath('', name);
    if (names.has(normalized)) throw new Error('EPUB 包含重复资源路径');
    names.add(normalized);
    offset += 46 + length + v.getUint16(offset + 30, true) + v.getUint16(offset + 32, true);
    if (offset > directoryEnd) throw new Error('EPUB 目录边界无效');
  }
  if (offset !== directoryEnd) throw new Error('EPUB 资源计数与目录不一致');
}
