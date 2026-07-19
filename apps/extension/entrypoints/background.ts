import { withPreferenceLayer } from '../lib/profile/preference-resolver';
import { createProfileStore } from '../lib/profile/profile-store';
import { hasSitePermission } from '../lib/site/permission-manager';
import { getRescueEnabled } from '../lib/rescue/rescue-preferences';
import { createSitePreferenceStore, normalizeSiteOrigin } from '../lib/site/site-preference-store';

const profileStore = createProfileStore();
const sitePreferenceStore = createSitePreferenceStore();
const adaptingTabs = new Set<number>();

async function ensureContentScript(tabId: number): Promise<void> {
  try {
    await browser.tabs.sendMessage(tabId, { type: 'PAGE_STATUS_GET' });
  } catch {
    await browser.scripting.executeScript({
      target: { tabId },
      files: ['content-scripts/adaptive.js'],
    });
  }
}

async function autoAdaptTab(tabId: number, url: string): Promise<void> {
  if (adaptingTabs.has(tabId)) return;
  let origin: string;
  try {
    origin = normalizeSiteOrigin(url);
  } catch {
    return;
  }

  const site = await sitePreferenceStore.get(origin);
  if (!site?.enabled || !site.autoAdapt || !(await hasSitePermission(origin))) return;

  adaptingTabs.add(tabId);
  try {
    const state = await profileStore.getState();
    const profile = state.profiles.find(({ id }) => id === state.activeProfileId);
    if (!profile) return;
    const profileForSite = withPreferenceLayer(profile, 'explicit', site.preferencePatch);
    await ensureContentScript(tabId);
    await browser.tabs.sendMessage(tabId, { type: 'PAGE_ADAPT', profile: profileForSite });
    await browser.tabs.sendMessage(tabId, {
      type: 'PAGE_RESCUE_SET',
      enabled: await getRescueEnabled(),
    });
    console.info('[AURA background] Site adaptation applied.', { origin, tabId });
  } catch (error) {
    console.debug('[AURA background] Site auto-adapt was unavailable.', { origin, tabId, error });
  } finally {
    adaptingTabs.delete(tabId);
  }
}

export default defineBackground(() => {
  void browser.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error: unknown) => {
      console.error('Unable to configure AURA side panel behavior', error);
    });

  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status !== 'complete' || typeof tab.url !== 'string') return;
    void autoAdaptTab(tabId, tab.url);
  });
});
