import { test } from 'node:test';
import assert from 'node:assert/strict';
import { beforeOrAt, isLocator } from '../src/features/reader/model/types';
import { resolveArchivePath, validateZip } from '../src/features/import/model/archive';

test('companion cutoff rejects locations after the selected boundary', () => {
  const cutoff = { href: 'a', chapter: 2, progression: .4 };
  assert.equal(beforeOrAt({ href: 'a', chapter: 2, progression: .5 }, cutoff), false);
  assert.equal(beforeOrAt({ href: 'a', chapter: 1, progression: .9 }, cutoff), true);
  assert.equal(beforeOrAt({ href: 'a', chapter: 3, progression: 0 }, cutoff), false);
});
test('locators validate device messages before persistence', () => {
  assert.equal(isLocator({ href: 'a', chapter: 1, progression: .5, quote: '正文' }), true);
  assert.equal(isLocator({ href: 'a', chapter: -1, progression: .5 }), false);
  assert.equal(isLocator({ href: 'a', chapter: 1, progression: Infinity }), false);
  assert.equal(isLocator({ href: 'a', chapter: 1, progression: .5, page: 0 }), false);
});
test('archive resolver rejects traversal and remote resources', () => {
  assert.equal(resolveArchivePath('OPS/text/one.xhtml', '../images/p.png'), 'OPS/images/p.png');
  for (const path of ['../../secret', '/secret', 'https://host/a', '%2e%2e/secret', 'C:\\secret']) {
    assert.throws(() => resolveArchivePath('', path));
  }
});
test('incomplete zip rejects with a user-facing error', () => assert.throws(() => validateZip(new Uint8Array(20)), /不完整/));
test('font-driven scroll changes do not move logical annotation boundaries', () => {
  assert.equal(beforeOrAt({ href: 'a', chapter: 0, block: 5, progression: .8 }, { href: 'a', chapter: 0, block: 6, progression: .3 }), true);
  assert.equal(beforeOrAt({ href: 'a', chapter: 0, block: 7, progression: .2 }, { href: 'a', chapter: 0, block: 6, progression: .8 }), false);
});
