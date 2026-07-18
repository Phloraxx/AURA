import { serve } from '@hono/node-server';

import { app } from './app.js';

const configuredPort = Number.parseInt(process.env.PORT ?? '8787', 10);
const port = Number.isSafeInteger(configuredPort) ? configuredPort : 8787;

serve({
  fetch: app.fetch,
  port,
});

console.log(`AURA API listening on http://localhost:${port}`);
