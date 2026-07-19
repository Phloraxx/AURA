import { z } from 'zod';

// Chrome Manifest V3 extension pages disallow dynamic string evaluation.
// Zod's object-schema JIT path probes Function/eval unless jitless mode is
// enabled before schemas are created. Keep this as the only Zod import used by
// shared browser-facing schemas.
z.config({ jitless: true });

export { z };
