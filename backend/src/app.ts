import { APIConnectionError, APIError, APITimeoutError, RateLimitError } from '@typesafe-ai/sdk';
import express, { type RequestHandler } from 'express';
import multer from 'multer';

import { InvalidImageError } from './image.js';
import { type ObjectCheckResult } from './objectCheck.js';
import { OBJECTS } from './objects.js';

const MAX_OBJECT_LENGTH = 100;
/** Full-resolution phone photos can be several MB; the backend shrinks them before calling Jev. */
const MAX_PHOTO_BYTES = 15 * 1024 * 1024;

export type AppDeps = {
  checkObject: (object: string, photo: Buffer) => Promise<ObjectCheckResult>;
};

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_PHOTO_BYTES, files: 1 } });

/** Reads the `photo` file from a multipart body, answering upload errors with 4xx. */
const uploadPhoto: RequestHandler = (req, res, next) => {
  upload.single('photo')(req, res, (err: unknown) => {
    if (!err) return next();
    const tooLarge = err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE';
    res.status(tooLarge ? 413 : 400).json({ error: err instanceof Error ? err.message : 'Invalid upload' });
  });
};

export function createApp({ checkObject }: AppDeps) {
  const app = express();

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/objects', (_req, res) => {
    res.json({ objects: OBJECTS });
  });

  // Multipart body: `object` (text) + `photo` (file).
  app.post('/api/object-check', uploadPhoto, async (req, res) => {
    const object = typeof req.body?.object === 'string' ? req.body.object.trim() : '';
    if (!object || object.length > MAX_OBJECT_LENGTH) {
      res.status(400).json({ error: `"object" must be a non-empty string of at most ${MAX_OBJECT_LENGTH} characters` });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: 'A "photo" file is required' });
      return;
    }

    try {
      res.json(await checkObject(object, req.file.buffer));
    } catch (err) {
      if (err instanceof InvalidImageError) {
        res.status(400).json({ error: err.message });
        return;
      }
      console.error('Object check failed:', err);
      // Jev's own error messages stay in the log; clients get a generic one.
      if (err instanceof RateLimitError) {
        res.status(503).json({ error: 'Jev is busy, try again in a moment' });
      } else if (err instanceof APITimeoutError) {
        res.status(504).json({ error: 'Jev took too long to respond' });
      } else if (err instanceof APIError || err instanceof APIConnectionError) {
        res.status(502).json({ error: 'Jev request failed' });
      } else {
        res.status(500).json({ error: 'Object check failed' });
      }
    }
  });

  return app;
}
