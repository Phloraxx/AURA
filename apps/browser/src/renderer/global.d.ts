import type { AuraShellApi } from '../shared/contracts';

declare global {
  interface Window {
    aura: AuraShellApi;
  }
}

export {};
