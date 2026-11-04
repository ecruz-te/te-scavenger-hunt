import assert from 'node:assert/strict';
import { test } from 'node:test';
import request from 'supertest';

import { createApp } from '../src/app.js';
import { OBJECTS } from '../src/objects.js';

test('GET /api/objects returns the object list', async () => {
  const app = createApp({
    checkObject: async () => {
      throw new Error('unused');
    },
  });

  const res = await request(app).get('/api/objects');

  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { objects: OBJECTS });
  assert.ok(OBJECTS.length > 1);
  assert.equal(new Set(OBJECTS).size, OBJECTS.length, 'objects should be unique');
});
