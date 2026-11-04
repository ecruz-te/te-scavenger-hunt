import { existsSync } from 'node:fs';

import { createApp } from './app.js';
import { createJevClient } from './jev.js';
import { checkObject } from './objectCheck.js';

if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

const port = Number(process.env.PORT ?? 3000);
const jev = createJevClient();

createApp({ checkObject: (object, photo) => checkObject(jev, photo, object) }).listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
