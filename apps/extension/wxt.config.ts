import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'AURA',
    description: 'Adaptive User-Responsive Accessibility',
    version: '0.1.0',
    minimum_chrome_version: '114',
    permissions: ['storage', 'activeTab', 'scripting'],
    host_permissions: [
      'http://localhost:8787/*',
      ...(process.env.AURA_E2E === '1' ? ['http://localhost:4173/*'] : []),
    ],
    action: {
      default_title: 'Open AURA',
    },
  },
});
