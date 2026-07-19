import { sitePermissionPattern } from './site-preference-store';

export async function requestSitePermission(origin: string): Promise<boolean> {
  return browser.permissions.request({ origins: [sitePermissionPattern(origin)] });
}

export async function hasSitePermission(origin: string): Promise<boolean> {
  return browser.permissions.contains({ origins: [sitePermissionPattern(origin)] });
}

export async function removeSitePermission(origin: string): Promise<boolean> {
  return browser.permissions.remove({ origins: [sitePermissionPattern(origin)] });
}
