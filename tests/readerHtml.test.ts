import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readerHtml } from '../src/features/reader/model/readerHtml';
import { defaultTypography } from '../src/features/reader/model/types';

test('reader view rejects network and book script execution by policy', () => {
  const html = readerHtml('<p data-location="block-0">正文</p>', 'a.xhtml', 0, { href: 'a.xhtml', chapter: 0, progression: .2, quote: '</script><script>alert(1)</script>' }, defaultTypography);
  assert.match(html, /connect-src 'none'/);
  assert.match(html, /script-src 'nonce-jianxu'/);
  assert.match(html, /\\u003c\/script>/);
  assert.doesNotMatch(html, /quote":"<\/script>/);
});
