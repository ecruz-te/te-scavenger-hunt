import assert from 'node:assert/strict';
import { test } from 'node:test';
import request from 'supertest';

import { createApp } from '../src/app.js';

test('GET /health returns ok', async () => {
  const res = await request(createApp()).get('/health');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { ok: true });
});
