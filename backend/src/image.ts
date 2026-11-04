import sharp from 'sharp';

/** Edges as fractions of the image's height (top, bottom) and width (left, right). */
export type Box = { top: number; bottom: number; left: number; right: number };

/**
 * Longest side sent to Jev. Jev allows up to 1568 px, but jev-ai.pro also caps the JSON body
 * (images go in base64), so stay comfortably below.
 */
const MAX_SIDE = 1280;
const BOX_COLOR = '#ffffff';
const LABEL_TEXT_COLOR = '#000000';

/** The upload isn't an image sharp can read. */
export class InvalidImageError extends Error {}

/**
 * Normalizes a photo for Jev: applies EXIF orientation, shrinks it to fit `MAX_SIDE`, and
 * re-encodes it as JPEG. Phone photos are far larger than Jev accepts.
 */
export async function prepareImage(imageBytes: Buffer): Promise<Buffer> {
  try {
    return await sharp(imageBytes)
      .rotate()
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
  } catch (err) {
    throw new InvalidImageError(`Couldn't read the photo: ${err instanceof Error ? err.message : err}`);
  }
}

const escapeXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Returns the image as a JPEG, with `box` and a `label` tag drawn over it if a box is given. */
export async function annotateImage(imageBytes: Buffer, box: Box | null, label: string): Promise<Buffer> {
  // Bake in EXIF orientation so the box lines up with the picture as it's displayed.
  const { data, info } = await sharp(imageBytes).rotate().toBuffer({ resolveWithObject: true });
  if (!box) {
    return sharp(data).jpeg({ quality: 85 }).toBuffer();
  }

  const { width, height } = info;

  const strokeWidth = Math.max(4, Math.round(Math.min(width, height) / 150));
  const x = box.left * width;
  const y = box.top * height;
  const w = (box.right - box.left) * width;
  const h = (box.bottom - box.top) * height;

  // Label tag sits on the box's top-left corner: above it, or inside if there's no room above.
  // Text width is estimated rather than measured; 0.72 em/char fits bold DejaVu Sans.
  const fontSize = Math.max(14, Math.round(Math.min(width, height) / 25));
  const pad = Math.round(fontSize * 0.3);
  const tagW = label.length * fontSize * 0.72 + 2 * pad;
  const tagH = fontSize + 2 * pad;
  const tagX = Math.max(0, Math.min(x, width - tagW));
  const tagY = y - tagH >= 0 ? y - tagH : y;

  const overlay = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${BOX_COLOR}" stroke-width="${strokeWidth}" />
    <rect x="${tagX}" y="${tagY}" width="${tagW}" height="${tagH}" fill="${BOX_COLOR}" />
    <text x="${tagX + pad}" y="${tagY + tagH / 2}" fill="${LABEL_TEXT_COLOR}" font-family="DejaVu Sans, sans-serif" font-weight="bold" font-size="${fontSize}" dominant-baseline="middle">${escapeXml(label)}</text>
  </svg>`;

  return sharp(data)
    .composite([{ input: Buffer.from(overlay) }])
    .jpeg({ quality: 85 })
    .toBuffer();
}
