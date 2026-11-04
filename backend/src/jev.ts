import { TypeSafeClient } from '@typesafe-ai/sdk';

import { createJsonAssetsFetch } from './jsonAssetsFetch.js';

export function createJevClient() {
  const apiKey = process.env.JEV_API_KEY;
  if (!apiKey) {
    throw new Error('JEV_API_KEY is not set. Add it to backend/.env.');
  }

  return new TypeSafeClient({
    // The SDK defaults to TypeSafe's API; jev-ai.pro is TypeSafe-compatible.
    baseURL: 'https://jev-ai.pro/api',
    apiKey,
    // Don't replay requests whose outcome is uncertain (jev-ai.pro recommendation).
    retry: { maxRetries: 0 },
    // jev-ai.pro doesn't document zstd support.
    compression: false,
    // Image requests take longer than the SDK's 10s default.
    timeout: 60_000,
    defaultHeaders: { 'TypeSafe-Danger-Zone-Images': 'true' },
    // jev API rejects the SDK's multipart image uploads; send JSON with base64 assets instead.
    fetch: createJsonAssetsFetch(),
  });
}
