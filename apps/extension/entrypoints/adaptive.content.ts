import {
  extensionMessageSchema,
  type AdaptationPlan,
  type CapabilityProfile,
  type PageRepresentation,
  type PageStatus,
} from '@aura/shared';

import { createDeterministicPolicy } from '../lib/adaptation/policy-engine';
import { TransformEngine } from '../lib/adaptation/transform-engine';
import { ElementRegistry } from '../lib/page/element-registry';
import { extractLocalPageSignals } from '../lib/page/local-signals';
import { observeDynamicPage } from '../lib/page/mutation-observer';
import { extractPageRepresentation } from '../lib/page/semantic-extractor';

export default defineContentScript({
  registration: 'runtime',
  main(context) {
    context.stopOldScripts();
    const registry = new ElementRegistry();
    const engine = new TransformEngine(document, registry);
    let activeProfile: CapabilityProfile | undefined;
    let deterministicPlan: AdaptationPlan | undefined;

    const observer = observeDynamicPage(document, () => {
      if (activeProfile) engine.refreshDynamicContent();
    });

    const onMessage = (value: unknown): PageRepresentation | PageStatus | undefined => {
      const parsed = extensionMessageSchema.safeParse(value);
      if (!parsed.success) return undefined;

      switch (parsed.data.type) {
        case 'PAGE_ADAPT': {
          activeProfile = parsed.data.profile;
          const signals = extractLocalPageSignals(document, registry);
          deterministicPlan = createDeterministicPolicy(parsed.data.profile, signals);
          return engine.applyPlan(deterministicPlan);
        }
        case 'PAGE_REVERT':
          activeProfile = undefined;
          deterministicPlan = undefined;
          return engine.revertAll();
        case 'PAGE_STATUS_GET':
          return engine.getStatus();
        case 'PAGE_SNAPSHOT_GET':
          return extractPageRepresentation(document, registry);
        case 'PAGE_SEMANTIC_APPLY':
          return engine.reconcilePlan({
            version: 1,
            instructions: [
              ...(deterministicPlan?.instructions ?? []),
              ...parsed.data.plan.instructions,
            ],
          });
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
