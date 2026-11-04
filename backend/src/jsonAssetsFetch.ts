type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

type MultipartAsset = { type: string; part: string };

/** jev-ai.pro asset keys: start with a letter; lowercase letters, digits, underscores; ≤32 chars. */
const VALID_ASSET_KEY = /^[a-z][a-z0-9_]{0,31}$/;

const imageFormat = (bytes: Uint8Array) => {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'png';
  throw new Error('Image must be PNG or JPEG');
};

/**
 * The SDK sends image requests as multipart/form-data, but jev-ai.pro only accepts JSON with
 * base64 images in `assets`. This fetch rewrites the SDK's multipart body into that JSON form;
 * other requests pass through unchanged.
 */
export function createJsonAssetsFetch(baseFetch: Fetch = fetch): Fetch {
  return async (input, init) => {
    const headers = new Headers(init?.headers);
    const contentType = headers.get('content-type') ?? '';
    if (!contentType.startsWith('multipart/form-data')) {
      return baseFetch(input, init);
    }

    const form = await new Response(init?.body, { headers: { 'content-type': contentType } }).formData();
    const { assets: multipartAssets, ...payload } = JSON.parse(String(form.get('request')));
    let body = JSON.stringify(payload);

    const assets: Record<string, unknown> = {};
    for (const [alias, asset] of Object.entries(multipartAssets as Record<string, MultipartAsset>)) {
      const file = form.get(asset.part);
      if (!(file instanceof Blob)) {
        throw new Error(`Multipart body is missing part "${asset.part}"`);
      }
      const bytes = new Uint8Array(await file.arrayBuffer());

      // SDK references look like `<image:hex>`, which jev-ai.pro rejects as an asset key.
      // Rename them and point their references in the text at the new key.
      let key = alias;
      if (!VALID_ASSET_KEY.test(alias)) {
        key = `image_${Object.keys(assets).length + 1}`;
        body = body.replaceAll(alias, `\`${key}\``);
      }
      assets[key] = {
        type: asset.type,
        format: imageFormat(bytes),
        data_base64: Buffer.from(bytes).toString('base64'),
      };
    }

    headers.set('content-type', 'application/json');
    headers.delete('content-length');
    return baseFetch(input, { ...init, headers, body: JSON.stringify({ ...JSON.parse(body), assets }) });
  };
}
