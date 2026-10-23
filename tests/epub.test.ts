import { test } from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { openEpub, sanitizeChapter } from '../src/features/import/model/epub';
import { validateZip } from '../src/features/import/model/archive';

test('sanitizer retains reading semantics and strips active/network content', async () => {
  const html = await sanitizeChapter('<body><h1>章节</h1><p onclick="bad()">文字<strong>重点</strong></p><script>bad()</script><img src="https://tracker/a.png"><iframe src="evil"></iframe><style>@import "evil";</style><a href="next.xhtml#x">下一章</a></body>', 'OPS/one.xhtml', async () => null);
  assert.match(html, /<h1 data-location="block-0">章节<\/h1>/);
  assert.match(html, /<strong>重点<\/strong>/);
  assert.match(html, /data-link="OPS\/next.xhtml#x"/);
  assert.doesNotMatch(html, /onclick|<script|<iframe|<style|https:/);
});

test('ZIP central directory count cannot hide unvalidated entries', async () => {
  const zip = new JSZip(); zip.file('one.txt', 'one');
  const bytes = await zip.generateAsync({ type: 'uint8array' });
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  view.setUint16(bytes.length - 22 + 8, 0, true);
  view.setUint16(bytes.length - 22 + 10, 0, true);
  assert.throws(() => validateZip(bytes), /计数|目录/);
});

test('safe inline typography and inline images survive without network-capable CSS', async () => {
  const html = await sanitizeChapter('<p style="text-align:center;font-style:italic;position:fixed;background:url(https://evil);font-size:1px">Words<img style="display:inline;vertical-align:middle;width:2em" src="image.png"/></p>', 'a.xhtml', async () => 'data:image/png;base64,AQID');
  assert.match(html, /text-align:center/);
  assert.match(html, /font-style:italic/);
  assert.match(html, /display:inline/);
  assert.match(html, /width:2em/);
  assert.doesNotMatch(html, /position|url\(|https:|font-size/);
});

test('excessive nested chapter markup is rejected before recursive traversal', async () => {
  await assert.rejects(sanitizeChapter('<div>'.repeat(300) + 'text' + '</div>'.repeat(300), 'a.xhtml', async () => null), /层级|复杂/);
});

test('oversized chapter is rejected during streaming before DOM parsing', async () => {
  const zip = new JSZip();
  zip.file('META-INF/container.xml', '<container><rootfiles><rootfile full-path="p.opf"/></rootfiles></container>');
  zip.file('p.opf', '<package><manifest><item id="a" href="a.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="a"/></spine></package>');
  zip.file('a.xhtml', '<p>' + 'x'.repeat(4 * 1024 * 1024 + 1) + '</p>');
  const book = await openEpub(await zip.generateAsync({ type: 'uint8array', compression: 'STORE' }));
  await assert.rejects(book.chapter(0), /资源|章节/);
});

test('real EPUB archive parses spine order, metadata and local images', async () => {
  const zip = new JSZip();
  zip.file('META-INF/container.xml', '<container><rootfiles><rootfile full-path="OPS/package.opf"/></rootfiles></container>');
  zip.file('OPS/package.opf', '<package><metadata><dc:title>小书</dc:title><dc:creator>作者</dc:creator></metadata><manifest><item id="a" href="a.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="a"/></spine></package>');
  zip.file('OPS/a.xhtml', '<html><body><p>连续阅读</p><img src="image.png" alt="图"/></body></html>');
  zip.file('OPS/image.png', new Uint8Array([1, 2, 3]));
  const book = await openEpub(await zip.generateAsync({ type: 'uint8array' }));
  assert.equal(book.title, '小书');
  assert.equal(book.chapters[0].href, 'OPS/a.xhtml');
  assert.match(await book.chapter(0), /data:image\/png;base64,AQID/);
});
test('nested semantic containers keep leaf reading locations in source order', async () => {
  const html = await sanitizeChapter('<blockquote><p>第一处</p><p>第二处</p></blockquote><p>第三处</p>', 'a.xhtml', async () => null);
  assert.match(html, /<blockquote><p data-location="block-0">第一处/);
  assert.match(html, /<p data-location="block-1">第二处/);
  assert.match(html, /<p data-location="block-2">第三处/);
});
