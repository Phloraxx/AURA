const path = require('node:path');

module.exports = {
  packagerConfig: {
    asar: true,
    icon: path.resolve(__dirname, 'resources/aura'),
    download: {
      cacheRoot: path.resolve(__dirname, '../../.cache/electron'),
    },
    executableName: 'AURA',
    extendInfo: {
      NSMicrophoneUsageDescription:
        'AURA uses the microphone only when you choose voice input in Talk to AURA.',
    },
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
