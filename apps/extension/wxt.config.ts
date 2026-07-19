import { defineConfig } from 'wxt';

function configuredApiHostPermission(): string {
  const configured = process.env.WXT_PUBLIC_AURA_API_BASE_URL ?? 'http://localhost:8787';
  const url = new URL(configured);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('WXT_PUBLIC_AURA_API_BASE_URL must use HTTP or HTTPS.');
  }
  return `${url.protocol}//${url.host}/*`;
}

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: () => ({
    name: 'AURA',
    description: 'Adaptive User-Responsive Accessibility',
    version: '0.1.0',
    minimum_chrome_version: '114',
    permissions: ['storage', 'activeTab', 'scripting'],
    host_permissions: [
      ...new Set([
        configuredApiHostPermission(),
        ...(process.env.AURA_E2E === '1' ? ['http://localhost:4173/*'] : []),
      ]),
    ],
    optional_host_permissions: ['http://*/*', 'https://*/*'],
    action: {
      default_title: 'Open AURA',
    },
  }),
});
