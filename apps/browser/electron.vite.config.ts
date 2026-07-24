import { resolve } from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: '.vite/main',
      rollupOptions: {
        external: ['electron'],
        input: resolve('src/main/index.ts'),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: '.vite/preload',
      rollupOptions: {
        external: ['electron'],
        input: {
          shell: resolve('src/preload/shell.ts'),
          page: resolve('src/preload/page.ts'),
        },
        output: {
          entryFileNames: '[name].cjs',
          format: 'cjs',
        },
      },
    },
  },
  renderer: {
    plugins: [react()],
    build: {
      outDir: '.vite/renderer',
      rollupOptions: {
        input: resolve('src/renderer/index.html'),
      },
    },
  },
});
