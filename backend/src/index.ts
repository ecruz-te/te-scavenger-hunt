import { existsSync } from 'node:fs';

import { createApp } from './app.js';

if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

const port = Number(process.env.PORT ?? 3000);

createApp().listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
