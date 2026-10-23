import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateCommunityResponse } from '../src/features/community/model/validate';

test('malformed community responses fail before reaching native list rendering', () => {
  assert.throws(() => validateCommunityResponse('/posts', 'GET', { posts: [] }), /无法识别/);
  assert.throws(() => validateCommunityResponse('/auth/login', 'POST', { user: { id: 1, name: '甲' }, token: 'short' }));
  assert.doesNotThrow(() => validateCommunityResponse('/posts', 'GET', []));
  assert.doesNotThrow(() => validateCommunityResponse('/account', 'DELETE', { ok: true }));
});
