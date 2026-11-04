import assert from 'node:assert/strict';
import { test } from 'node:test';

import { image, noul, TypeSafeClient } from '@typesafe-ai/sdk';

import { createJsonAssetsFetch } from '../src/jsonAssetsFetch.js';

const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);

type Request = Parameters<TypeSafeClient['systemOne']>[0];

/** Runs a real SDK image request and returns what the adapter would send to jev-ai.pro. */
async function sendThroughAdapter(request: Request) {
  let sent: { input: string; init?: RequestInit } | undefined;
  const adapter = createJsonAssetsFetch(async (input, init) => {
    sent = { input, init };
    throw new Error('stop after capturing');
  });

  const client = new TypeSafeClient({
    apiKey: 'test-key',
    baseURL: 'https://jev.test/api',
    retry: { maxRetries: 0 },
    compression: false,
    logLevel: 'off',
    fetch: adapter,
  });
  await client.systemOne(request).catch(() => {});

  assert.ok(sent, 'adapter did not forward a request');
  return { input: sent.input, headers: new Headers(sent.init?.headers), body: JSON.parse(String(sent.init?.body)) };
}

const jpegAsset = { type: 'image', format: 'jpg', data_base64: Buffer.from(JPEG_BYTES).toString('base64') };

test('rewrites the SDK multipart image request as JSON with base64 assets', async () => {
  const { input, headers, body } = await sendThroughAdapter({
    state: image(JPEG_BYTES),
    questions: { present: noul('Is there a mug?') },
  });

  assert.equal(input, 'https://jev.test/api/v1/systemone');
  assert.equal(headers.get('content-type'), 'application/json');
  assert.equal(headers.get('authorization'), 'Bearer test-key');
  // The SDK's `<image:hex>` reference is renamed to a key jev-ai.pro accepts.
  assert.equal(body.state, '`image_1`');
  assert.deepEqual(body.assets, { image_1: jpegAsset });
});

test('keeps asset keys that are already valid', async () => {
  const { body } = await sendThroughAdapter({
    state: 'The photo is `photo`.',
    questions: { present: noul('Is there a mug in `photo`?') },
    assets: { photo: image(JPEG_BYTES) },
  });

  assert.equal(body.state, 'The photo is `photo`.');
  assert.deepEqual(body.assets, { photo: jpegAsset });
});

test('passes non-multipart requests through unchanged', async () => {
  let forwarded: RequestInit | undefined;
  const adapter = createJsonAssetsFetch(async (_input, init) => {
    forwarded = init;
    return new Response('{}');
  });

  const init = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"state":"hi"}' };
  await adapter('https://jev.test/api/v1/systemone', init);

  assert.equal(forwarded, init);
});
