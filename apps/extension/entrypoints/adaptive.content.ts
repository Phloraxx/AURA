import {
  extensionMessageSchema,
  pageRescueStatusSchema,
  pageScanResponseSchema,
  type AdaptationPlan,
  type CapabilityProfile,
  type LensStatus,
  type PageRepresentation,
  type PageScanResult,
  type PageStatus,
  type PageRescueStatus,
  type TaskStatus,
} from '@aura/shared';

import { createDeterministicPolicy } from '../lib/adaptation/policy-engine';
import { TransformEngine } from '../lib/adaptation/transform-engine';
import { ElementRegistry } from '../lib/page/element-registry';
import { extractLocalPageSignals } from '../lib/page/local-signals';
import { observeDynamicPage } from '../lib/page/mutation-observer';
import { extractPageRepresentation } from '../lib/page/semantic-extractor';
import { resolveAdaptationPreferences } from '../lib/profile/preference-resolver';
import { calculateAuraFit } from '../lib/friction/aura-fit';
import { scanLocalFriction } from '../lib/friction/local-friction-scanner';
import { personalizeFriction } from '../lib/friction/personalized-friction';
import { LensController } from '../lib/lens/lens-controller';
import { TaskNavigator } from '../lib/task/task-navigator';
import { RescueEngine } from '../lib/rescue/rescue-engine';

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
    const lens = new LensController(document, registry);
    const tasks = new TaskNavigator(document, registry);
    const rescue = new RescueEngine(document, registry, (suggestion) => {
      void browser.runtime.sendMessage({ type: 'RESCUE_SUGGESTION', suggestion }).catch((error: unknown) => {
        console.debug('[AURA content] Rescue notification delivery ended.', error);
      });
    });
    const originalRuntimeMarker = document.documentElement.getAttribute('data-aura-runtime');
    document.documentElement.setAttribute('data-aura-runtime', 'ready');
    let activeProfile: CapabilityProfile | undefined;
    let deterministicPlan: AdaptationPlan | undefined;
    let activePlan: AdaptationPlan | undefined;
    let rescueEnabled = true;
    let lastLocalSignals: ReturnType<typeof scanLocalFriction> = [];

    console.info('[AURA content] Runtime initialized.', {
      pageProtocol: location.protocol,
      pageOrigin: location.origin,
    });

    const observer = observeDynamicPage(document, () => {
      if (activeProfile) engine.refreshDynamicContent();
    });

    const handleMessage = (
      value: unknown,
    ): PageRepresentation | PageStatus | PageScanResult | LensStatus | TaskStatus | PageRescueStatus | undefined => {
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
            rescue.setProfile(parsed.data.profile);
            rescue.setEnabled(rescueEnabled);
            const signals = extractLocalPageSignals(document, registry);
            const resolution = resolveAdaptationPreferences(parsed.data.profile);
            deterministicPlan = createDeterministicPolicy(resolution, signals);
            activePlan = deterministicPlan;
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
            activePlan = undefined;
            lastLocalSignals = [];
            lens.setEnabled(false);
            tasks.revert();
            rescue.setEnabled(false);
            const status = engine.revertAll();
            console.info('[AURA content] All adaptations reverted.', {
              errorCount: status.errors.length,
            });
            return status;
          }
          case 'PAGE_STATUS_GET':
            return engine.getStatus();
          case 'PAGE_SCAN': {
            activeProfile = parsed.data.profile;
            rescue.setProfile(parsed.data.profile);
            rescue.setEnabled(rescueEnabled);
            const resolution = resolveAdaptationPreferences(parsed.data.profile);
            lastLocalSignals = scanLocalFriction(document, registry);
            const personalized = personalizeFriction(lastLocalSignals, {
              ...parsed.data.profile,
              preferences: resolution.preferences,
            });
            lens.setSignals(lastLocalSignals);
            return pageScanResponseSchema.parse({
              pageId: `${location.origin}${location.pathname}`,
              localSignals: lastLocalSignals,
              semanticSignals: [],
              fit: calculateAuraFit(personalized),
              scannedAt: new Date().toISOString(),
            });
          }
          case 'PAGE_LENS_SET':
            lens.setSignals(
              parsed.data.signals.filter(({ targetIds }) =>
                targetIds.every((id) => registry.has(id)),
              ),
            );
            return lens.setEnabled(parsed.data.enabled);
          case 'PAGE_LENS_SELECT':
            return lens.select(parsed.data.frictionId);
          case 'PAGE_COMPARE_SET': {
            if (parsed.data.mode === 'original') return engine.revertAll();
            if (!activePlan) return engine.getStatus();
            return engine.reconcilePlan(activePlan);
          }
          case 'PAGE_TASK_APPLY':
            return tasks.apply(parsed.data.plan);
          case 'PAGE_TASK_STEP_SET':
            return tasks.setStep(parsed.data.stepId);
          case 'PAGE_TASK_REVERT':
            tasks.revert();
            return tasks.status();
          case 'PAGE_RESCUE_SET':
            rescueEnabled = parsed.data.enabled;
            return rescue.setEnabled(rescueEnabled);
          case 'PAGE_RESCUE_STATUS_GET':
            return pageRescueStatusSchema.parse(rescue.status());
          case 'PAGE_RESCUE_DISMISS':
            return rescue.dismiss(parsed.data.suggestionId);
          case 'PAGE_SNAPSHOT_GET': {
            const snapshot = extractPageRepresentation(document, registry);
            console.info('[AURA content] Semantic page snapshot created.', {
              elementCount: snapshot.elements.length,
              truncated: snapshot.truncated,
            });
            return snapshot;
          }
          case 'PAGE_SEMANTIC_APPLY': {
            activePlan = {
              version: 1,
              instructions: [
                ...(deterministicPlan?.instructions ?? []),
                ...parsed.data.plan.instructions,
              ],
            };
            const status = engine.reconcilePlan(activePlan);
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
      lens.destroy();
      tasks.revert();
      rescue.destroy();
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
