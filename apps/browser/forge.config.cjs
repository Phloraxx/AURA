const path = require('node:path');

module.exports = {
  packagerConfig: {
    asar: true,
    download: {
      cacheRoot: path.resolve(__dirname, '../../.cache/electron'),
    },
    executableName: 'AURA',
    ignore: [
      /^\/node_modules/,
      /^\/out/,
      /^\/src/,
      /^\/electron\.vite\.config\.ts$/,
      /^\/forge\.config\.cjs$/,
      /^\/tsconfig(?:\.[^.]+)?\.json$/,
    ],
    name: 'AURA',
    prune: false,
  },
  makers: [
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
  ],
};
