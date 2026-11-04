import assert from 'node:assert/strict';
import { test } from 'node:test';
import sharp from 'sharp';

import { annotateImage, InvalidImageError, prepareImage } from '../src/image.js';

const WIDTH = 200;
const HEIGHT = 100;

const solidImage = (background: string) =>
  sharp({ create: { width: WIDTH, height: HEIGHT, channels: 3, background } }).png().toBuffer();
const whiteImage = () => solidImage('#ffffff');
// The box and tag are white, so draw them on black to see them.
const blackImage = () => solidImage('#000000');

async function pixel(jpeg: Buffer, x: number, y: number) {
  const { data, info } = await sharp(jpeg).raw().toBuffer({ resolveWithObject: true });
  const i = (y * info.width + x) * info.channels;
  return { r: data[i], g: data[i + 1], b: data[i + 2] };
}

type Rgb = { r: number; g: number; b: number };
const isWhite = (p: Rgb) => p.r > 200 && p.g > 200 && p.b > 200;
const isBlack = (p: Rgb) => p.r < 40 && p.g < 40 && p.b < 40;

test('draws the box outline at the given fractions of the image', async () => {
  const out = await annotateImage(await blackImage(), { top: 0.2, bottom: 0.8, left: 0.25, right: 0.75 }, 'mug');

  const meta = await sharp(out).metadata();
  assert.equal(meta.format, 'jpeg');
  assert.equal(meta.width, WIDTH);
  assert.equal(meta.height, HEIGHT);

  // Left edge of the box (x = 50) is white; the box interior and outside stay black.
  const edge = await pixel(out, 50, 50);
  assert.ok(isWhite(edge), `edge should be white, got ${JSON.stringify(edge)}`);
  for (const [x, y] of [[100, 50], [10, 50]]) {
    const p = await pixel(out, x, y);
    assert.ok(isBlack(p), `(${x},${y}) should be black, got ${JSON.stringify(p)}`);
  }
});

test('returns a plain JPEG when there is no box', async () => {
  const out = await annotateImage(await blackImage(), null, 'mug');

  assert.equal((await sharp(out).metadata()).format, 'jpeg');
  for (const [x, y] of [[50, 50], [60, 5]]) {
    const p = await pixel(out, x, y);
    assert.ok(isBlack(p), `(${x},${y}) should be black, got ${JSON.stringify(p)}`);
  }
});

// On the 200×100 test image the tag is 22 px tall and starts at the box's left edge (x = 50).
test('draws the label tag above the box when there is room', async () => {
  const out = await annotateImage(await blackImage(), { top: 0.5, bottom: 0.9, left: 0.25, right: 0.75 }, 'mug');

  // Box top is y = 50, so the tag spans y = 28–50. y = 29 is its top padding, clear of the text.
  const tag = await pixel(out, 60, 29);
  assert.ok(isWhite(tag), `tag should be white, got ${JSON.stringify(tag)}`);
});

test('draws the label tag inside the box when it touches the top edge', async () => {
  const out = await annotateImage(await blackImage(), { top: 0, bottom: 0.9, left: 0.25, right: 0.75 }, 'mm');

  // Tag spans y = 0–22; y = 20 is its bottom padding, which would otherwise be black box interior.
  const tag = await pixel(out, 60, 20);
  assert.ok(isWhite(tag), `tag should be white, got ${JSON.stringify(tag)}`);
});

test('escapes labels with XML special characters', async () => {
  const out = await annotateImage(
    await blackImage(),
    { top: 0.5, bottom: 0.9, left: 0.25, right: 0.75 },
    'Salt & <pepper> "shaker"',
  );

  assert.equal((await sharp(out).metadata()).format, 'jpeg');
});

test('prepareImage shrinks large photos to fit and re-encodes them as JPEG', async () => {
  const big = await sharp({ create: { width: 4000, height: 3000, channels: 3, background: '#336699' } })
    .png()
    .toBuffer();

  const meta = await sharp(await prepareImage(big)).metadata();

  assert.equal(meta.format, 'jpeg');
  assert.equal(meta.width, 1280);
  assert.equal(meta.height, 960);
});

test('prepareImage leaves small photos at their size', async () => {
  const meta = await sharp(await prepareImage(await whiteImage())).metadata();

  assert.equal(meta.width, WIDTH);
  assert.equal(meta.height, HEIGHT);
});

test('prepareImage rejects files that are not images', async () => {
  await assert.rejects(prepareImage(Buffer.from('not an image')), InvalidImageError);
});
