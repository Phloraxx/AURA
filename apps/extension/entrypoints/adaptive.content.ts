import {
  extensionMessageSchema,
  type CapabilityProfile,
  type PageStatus,
} from '@aura/shared';

import { createDeterministicPolicy } from '../lib/adaptation/policy-engine';
import { TransformEngine } from '../lib/adaptation/transform-engine';
import { ElementRegistry } from '../lib/page/element-registry';
import { extractLocalPageSignals } from '../lib/page/local-signals';
import { observeDynamicPage } from '../lib/page/mutation-observer';

export default defineContentScript({
  registration: 'runtime',
  main(context) {
    context.stopOldScripts();
    const registry = new ElementRegistry();
    const engine = new TransformEngine(document, registry);
    let activeProfile: CapabilityProfile | undefined;

    const observer = observeDynamicPage(document, () => {
      if (activeProfile) engine.refreshDynamicContent();
    });

    const onMessage = (value: unknown): PageStatus | undefined => {
      const parsed = extensionMessageSchema.safeParse(value);
      if (!parsed.success) return undefined;

      switch (parsed.data.type) {
        case 'PAGE_ADAPT': {
          activeProfile = parsed.data.profile;
          const signals = extractLocalPageSignals(document, registry);
          return engine.applyPlan(
            createDeterministicPolicy(parsed.data.profile, signals),
          );
        }
        case 'PAGE_REVERT':
          activeProfile = undefined;
          return engine.revertAll();
        case 'PAGE_STATUS_GET':
          return engine.getStatus();
      }
    };

    browser.runtime.onMessage.addListener(onMessage);
    context.onInvalidated(() => {
      browser.runtime.onMessage.removeListener(onMessage);
      observer.disconnect();
      engine.revertAll();
    });
  },
});
