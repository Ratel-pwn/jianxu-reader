import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
test('router query decoder preserves valid values and bounds malformed percent decoding', () => {
  const query = require('query-string');
  assert.equal(query.parse('title=%E9%98%85%E8%AF%BB&value=a%2Bb').title, '\u9605\u8bfb');
  assert.equal(query.parse('title=%E9%98%85%E8%AF%BB&value=a%2Bb').value, 'a+b');
  const probe = spawnSync(process.execPath, ['-e', "const q=require('query-string'); const value='%C0%AF'.repeat(20000); const result=q.parse('q='+value); if(result.q!==value)process.exit(2);"], { cwd: process.cwd(), timeout: 3000, encoding: 'utf8' });
  assert.equal(probe.error, undefined, 'malformed decoding must finish within 3 seconds');
  assert.equal(probe.status, 0, probe.stderr);
});

test('CommonJS adapter is the unmodified upstream fixed algorithm and preserves URI semantics', async () => {
  const root = resolve('vendor/decode-uri-component');
  const upstreamSource = readFileSync(resolve(root, 'upstream.mjs'), 'utf8');
  const adapterSource = readFileSync(resolve(root, 'index.js'), 'utf8');
  assert.equal(adapterSource, upstreamSource.replace('export default function decodeUriComponent(encodedURI) {', 'module.exports = function decodeUriComponent(encodedURI) {'));
  const upstream = (await import(pathToFileURL(resolve(root, 'upstream.mjs')).href)).default;
  const adapter = require('decode-uri-component');
  for (const value of ['', 'A+B', '%', '%G0', '%00', '%C0%AF', '%ED%A0%80', '%FE%FF', '\ud800', '%E9%98%85%E8%AF%BB', '%F0%9F%93%96', '%E2%82%AC', 'abc%41%FFdef']) {
    assert.equal(adapter(value), upstream(value));
  }
  assert.equal(adapter('%F0%9F%93%96'), '\u{1f4d6}');
  assert.throws(() => adapter(null), TypeError);
});
