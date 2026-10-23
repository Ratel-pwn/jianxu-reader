import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AI_RUNTIME_ENABLED, validateAIConfiguration } from '../src/features/settings/model/ai';
import { validCommunityEndpoint } from '../src/features/community/model/types';

test('AI runtime remains disabled even with a valid saved connection', () => {
  assert.equal(AI_RUNTIME_ENABLED, false);
  assert.equal(validateAIConfiguration({ provider: '自选服务', model: 'model', endpoint: 'https://example.com/v1' }), null);
  for (const endpoint of ['http://example.com', 'https://key:secret@example.com', 'https://example.com?key=secret']) assert.ok(validateAIConfiguration({ provider: 'x', model: 'm', endpoint }));
});
test('community only permits local insecure endpoints in development', () => {
  assert.equal(validCommunityEndpoint('http://10.0.2.2:4318', true), true);
  assert.equal(validCommunityEndpoint('http://10.0.2.2:4318'), false);
  assert.equal(validCommunityEndpoint('http://remote.test', true), false);
  assert.equal(validCommunityEndpoint('https://key:secret@example.com'), false);
});
