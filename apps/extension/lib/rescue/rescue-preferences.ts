const STORAGE_KEY = 'aura.rescueEnabled.v1';

export async function getRescueEnabled(): Promise<boolean> {
  const stored = await browser.storage.local.get(STORAGE_KEY);
  return typeof stored[STORAGE_KEY] === 'boolean' ? stored[STORAGE_KEY] : true;
}

export async function setRescueEnabled(enabled: boolean): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEY]: enabled });
}
