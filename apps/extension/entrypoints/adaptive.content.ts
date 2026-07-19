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
import { resolveAdaptationPreferences } from '../lib/profile/preference-resolver';

function messageType(value: unknown): string {
  if (!value || typeof value !== 'object') return 'unknown';
  const type = (value as Record<string, unknown>).type;
  return typeof type === 'string' ? type : 'unknown';
}

export default defineContentScript({
  registration: 'runtime',
  main(context) {
    const registry = new ElementRegistry();
    const engine = new TransformEngine(document, registry);
    const originalRuntimeMarker = document.documentElement.getAttribute('data-aura-runtime');
    document.documentElement.setAttribute('data-aura-runtime', 'ready');
    let activeProfile: CapabilityProfile | undefined;
    let deterministicPlan: AdaptationPlan | undefined;

    console.info('[AURA content] Runtime initialized.', {
      pageProtocol: location.protocol,
      pageOrigin: location.origin,
    });

    const observer = observeDynamicPage(document, () => {
      if (activeProfile) engine.refreshDynamicContent();
    });

    const handleMessage = (value: unknown): PageRepresentation | PageStatus | undefined => {
      const parsed = extensionMessageSchema.safeParse(value);
      if (!parsed.success) {
        console.error('[AURA content] Rejected an invalid extension message.', {
          type: messageType(value),
          issues: parsed.error.issues.map(({ code, path, message }) => ({ code, path, message })),
        });
        throw new Error(`AURA rejected an invalid ${messageType(value)} message.`);
      }

      try {
        switch (parsed.data.type) {
          case 'PAGE_ADAPT': {
            activeProfile = parsed.data.profile;
            const signals = extractLocalPageSignals(document, registry);
            const resolution = resolveAdaptationPreferences(parsed.data.profile);
            deterministicPlan = createDeterministicPolicy(resolution, signals);
            const status = engine.applyPlan(deterministicPlan);
            console.info('[AURA content] Deterministic adaptation applied.', {
              appliedKinds: status.appliedKinds,
              errorCount: status.errors.length,
            });
            return status;
          }
          case 'PAGE_REVERT': {
            activeProfile = undefined;
            deterministicPlan = undefined;
            const status = engine.revertAll();
            console.info('[AURA content] All adaptations reverted.', {
              errorCount: status.errors.length,
            });
            return status;
          }
          case 'PAGE_STATUS_GET':
            return engine.getStatus();
          case 'PAGE_SNAPSHOT_GET': {
            const snapshot = extractPageRepresentation(document, registry);
            console.info('[AURA content] Semantic page snapshot created.', {
              elementCount: snapshot.elements.length,
              truncated: snapshot.truncated,
            });
            return snapshot;
          }
          case 'PAGE_SEMANTIC_APPLY': {
            const status = engine.reconcilePlan({
              version: 1,
              instructions: [
                ...(deterministicPlan?.instructions ?? []),
                ...parsed.data.plan.instructions,
              ],
            });
            console.info('[AURA content] Semantic adaptation plan reconciled.', {
              appliedKinds: status.appliedKinds,
              errorCount: status.errors.length,
            });
            return status;
          }
        }
      } catch (error) {
        console.error(`[AURA content] Failed to handle ${parsed.data.type}.`, error);
        throw error;
      }
    };

    const onMessage: Parameters<typeof browser.runtime.onMessage.addListener>[0] = (
      value,
      _sender,
      sendResponse,
    ) => {
      const response = handleMessage(value);
      if (response === undefined) return false;
      sendResponse(response);
      return false;
    };

    browser.runtime.onMessage.addListener(onMessage);
    context.onInvalidated(() => {
      browser.runtime.onMessage.removeListener(onMessage);
      observer.disconnect();
      engine.revertAll();
      if (originalRuntimeMarker === null) {
        document.documentElement.removeAttribute('data-aura-runtime');
      } else {
        document.documentElement.setAttribute('data-aura-runtime', originalRuntimeMarker);
      }
      console.info('[AURA content] Runtime invalidated and cleaned up.');
    });
  },
});
