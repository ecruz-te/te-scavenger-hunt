import assert from 'node:assert/strict';
import { test } from 'node:test';
import { APIConnectionError, APIError, APITimeoutError } from '@typesafe-ai/sdk';
import request from 'supertest';

import { type AppDeps, createApp } from '../src/app.js';
import { InvalidImageError } from '../src/image.js';
import { type ObjectCheckResult } from '../src/objectCheck.js';

const result: ObjectCheckResult = {
  isPresent: true,
  presentConfidence: 0.97,
  box: { top: 0.2, bottom: 0.8, left: 0.3, right: 0.7 },
  boxConfidence: 0.9,
  model: 'jev-1.14.0',
  annotatedImage: 'data:image/jpeg;base64,AAAA',
};

const PHOTO = Buffer.from('fake photo bytes');

/** Posts a multipart object check, attaching `photo` unless it's null. */
function postCheck(checkObject: AppDeps['checkObject'], object: string | null, photo: Buffer | null = PHOTO) {
  let req = request(createApp({ checkObject })).post('/api/object-check');
  if (object !== null) req = req.field('object', object);
  if (photo !== null) req = req.attach('photo', photo, { filename: 'photo.jpg', contentType: 'image/jpeg' });
  return req;
}

test('POST /api/object-check passes the object and photo through and returns the Jev result', async () => {
  const received: { object: string; photo: Buffer }[] = [];

  const res = await postCheck(async (object, photo) => {
    received.push({ object, photo });
    return result;
  }, ' lamp ');

  assert.equal(res.status, 200);
  assert.deepEqual(res.body, result);
  assert.deepEqual(received, [{ object: 'lamp', photo: PHOTO }]);
});

test('POST /api/object-check requires a photo', async () => {
  let called = false;

  const res = await postCheck(
    async () => {
      called = true;
      return result;
    },
    'mug',
    null,
  );

  assert.equal(res.status, 400);
  assert.deepEqual(res.body, { error: 'A "photo" file is required' });
  assert.equal(called, false);
});

test('POST /api/object-check rejects a missing or invalid object', async () => {
  for (const object of [null, '', '   ', 'x'.repeat(101)]) {
    const res = await postCheck(async () => result, object);
    assert.equal(res.status, 400, JSON.stringify(object));
  }
});

test('POST /api/object-check rejects photos over the size limit with 413', async () => {
  const res = await postCheck(async () => result, 'mug', Buffer.alloc(15 * 1024 * 1024 + 1));

  assert.equal(res.status, 413);
});

test('POST /api/object-check returns 400 for a photo that is not an image', async () => {
  const res = await postCheck(async () => {
    throw new InvalidImageError("Couldn't read the photo");
  }, 'mug');

  assert.equal(res.status, 400);
  assert.deepEqual(res.body, { error: "Couldn't read the photo" });
});

test('POST /api/object-check maps Jev failures to gateway errors without leaking details', async (t) => {
  t.mock.method(console, 'error', () => { });

  const cases: [Error, number][] = [
    [APIError.fromResponse(429, { error: 'slow down' }, new Headers()), 503],
    [new APITimeoutError(30_000), 504],
    [new APIConnectionError('ECONNREFUSED'), 502],
    [APIError.fromResponse(401, { error: 'bad key' }, new Headers()), 502],
    [APIError.fromResponse(500, { error: 'boom' }, new Headers()), 502],
  ];

  for (const [err, status] of cases) {
    const res = await postCheck(async () => {
      throw err;
    }, 'lamp');

    assert.equal(res.status, status, err.constructor.name);
    assert.doesNotMatch(res.body.error, /slow down|bad key|boom|ECONNREFUSED/);
  }
});

test('POST /api/object-check returns 500 for unexpected errors', async (t) => {
  t.mock.method(console, 'error', () => { });

  const res = await postCheck(async () => {
    throw new Error('something broke');
  }, 'lamp');

  assert.equal(res.status, 500);
  assert.deepEqual(res.body, { error: 'Object check failed' });
});
