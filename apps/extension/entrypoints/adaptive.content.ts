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
import { validatePlanTargets } from '../lib/adaptation/target-validation';
import { calculateAuraFit } from '../lib/friction/aura-fit';
import { scanLocalFriction } from '../lib/friction/local-friction-scanner';
import {
  personalizeFriction,
  relevantPersonalizedFriction,
} from '../lib/friction/personalized-friction';
import { LensController } from '../lib/lens/lens-controller';
import { ElementRegistry } from '../lib/page/element-registry';
import { extractLocalPageSignals } from '../lib/page/local-signals';
import { observeDynamicPage } from '../lib/page/mutation-observer';
import { extractPageRepresentation } from '../lib/page/semantic-extractor';
import { resolveAdaptationPreferences, withPreferenceLayer } from '../lib/profile/preference-resolver';
import { RescueEngine } from '../lib/rescue/rescue-engine';
import { createSitePreferenceStore } from '../lib/site/site-preference-store';
import { TaskNavigator } from '../lib/task/task-navigator';

interface AuraRuntimeLease {
  id: number;
  dispose(): void;
}

interface AuraRuntimeGlobal {
  __auraRuntimeGenerationV1__?: number;
  __auraRuntimeLeaseV1__?: AuraRuntimeLease;
}

function messageType(value: unknown): string {
  if (!value || typeof value !== 'object') return 'unknown';
  const type = (value as Record<string, unknown>).type;
  return typeof type === 'string' ? type : 'unknown';
}

function errorResponse(type: string, error: unknown): Record<string, string> {
  return {
    auraError: error instanceof Error ? error.message : 'AURA could not complete this page operation.',
    type,
  };
}

export default defineContentScript({
  registration: 'runtime',
  main(context) {
    const root = document.documentElement;
    const runtimeGlobal = globalThis as typeof globalThis & AuraRuntimeGlobal;
    const previousRuntime = runtimeGlobal.__auraRuntimeLeaseV1__;
    if (previousRuntime) {
      previousRuntime.dispose();
      delete runtimeGlobal.__auraRuntimeLeaseV1__;
      console.debug('[AURA content] Replaced an existing runtime during reinjection.');
    }

    const runtimeId = (runtimeGlobal.__auraRuntimeGenerationV1__ ?? 0) + 1;
    runtimeGlobal.__auraRuntimeGenerationV1__ = runtimeId;
    const existingRuntimeMarker = root.getAttribute('data-aura-runtime');
    const originalRuntimeMarker =
      existingRuntimeMarker === 'ready' || existingRuntimeMarker === 'initializing'
        ? null
        : existingRuntimeMarker;
    root.setAttribute('data-aura-runtime', 'initializing');

    const registry = new ElementRegistry();
    const engine = new TransformEngine(document, registry);
    const lens = new LensController(document, registry);
    const tasks = new TaskNavigator(document, registry);
    const siteStore = createSitePreferenceStore();
    const rescue = new RescueEngine(document, registry, (suggestion) => {
      if (document.visibilityState !== 'visible') return;
      void browser.runtime.sendMessage({ type: 'RESCUE_SUGGESTION', suggestion }).catch((error: unknown) => {
        console.debug('[AURA content] Rescue notification delivery ended.', error);
      });
    });
    root.setAttribute('data-aura-runtime', 'ready');

    let activeProfile: CapabilityProfile | undefined;
    let deterministicPlan: AdaptationPlan | undefined;
    let activePlan: AdaptationPlan | undefined;
    let rescueEnabled = true;
    let lastLocalSignals: ReturnType<typeof scanLocalFriction> = [];
    let baselineScanReady = false;
    let expectPostAdaptScan = false;

    console.info('[AURA content] Runtime initialized.', {
      pageProtocol: location.protocol,
      pageOrigin: location.origin,
      runtimeId,
    });

    const observer = observeDynamicPage(document, () => {
      if (activeProfile) engine.refreshDynamicContent();
    });

    async function profileForCurrentSite(profile: CapabilityProfile): Promise<CapabilityProfile> {
      try {
        const site = await siteStore.get(location.origin);
        return site?.enabled
          ? withPreferenceLayer(profile, 'explicit', site.preferencePatch)
          : profile;
      } catch (error) {
        console.debug('[AURA content] Site preference lookup unavailable; using the active profile.', error);
        return profile;
      }
    }

    const handleMessage = async (
      value: unknown,
    ): Promise<PageRepresentation | PageStatus | PageScanResult | LensStatus | TaskStatus | PageRescueStatus | undefined> => {
      const parsed = extensionMessageSchema.safeParse(value);
      if (!parsed.success) {
        console.error('[AURA content] Rejected an invalid extension message.', {
          type: messageType(value),
          issues: parsed.error.issues.map(({ code, path, message }) => ({ code, path, message })),
        });
        throw new Error(`AURA rejected an invalid ${messageType(value)} message.`);
      }

      switch (parsed.data.type) {
        case 'PAGE_ADAPT': {
          const profile = await profileForCurrentSite(parsed.data.profile);
          activeProfile = profile;
          expectPostAdaptScan = baselineScanReady;
          baselineScanReady = false;
          rescue.clearSuggestion();
          rescue.setProfile(profile);
          rescue.setEnabled(rescueEnabled);
          const signals = extractLocalPageSignals(document, registry);
          const resolution = resolveAdaptationPreferences(profile);
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
          baselineScanReady = false;
          expectPostAdaptScan = false;
          lens.setEnabled(false);
          tasks.revert();
          rescue.clearSuggestion();
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
          const profile = await profileForCurrentSite(parsed.data.profile);
          const postAdaptScan = expectPostAdaptScan;
          expectPostAdaptScan = false;
          if (engine.getStatus().adapted && !postAdaptScan) {
            engine.revertAll();
            deterministicPlan = undefined;
            activePlan = undefined;
            lens.setEnabled(false);
            tasks.revert();
            rescue.clearSuggestion();
            console.info('[AURA content] Restored the original page before a fresh baseline scan.');
          }
          activeProfile = profile;
          rescue.setProfile(profile);
          rescue.setEnabled(rescueEnabled);
          const resolution = resolveAdaptationPreferences(profile);
          lastLocalSignals = scanLocalFriction(document, registry);
          const personalized = relevantPersonalizedFriction(
            personalizeFriction(lastLocalSignals, {
              ...profile,
              preferences: resolution.preferences,
            }),
          );
          const relevantSignals = personalized.map(({ signal }) => signal);
          lens.setSignals(relevantSignals);
          baselineScanReady = !postAdaptScan;
          return pageScanResponseSchema.parse({
            pageId: `${location.origin}${location.pathname}`,
            localSignals: relevantSignals,
            semanticSignals: [],
            fit: calculateAuraFit(personalized),
            scannedAt: new Date().toISOString(),
          });
        }
        case 'PAGE_LENS_SET': {
          const available = parsed.data.signals.filter(({ targetIds }) =>
            targetIds.every((id) => registry.has(id)),
          );
          const signals = activeProfile
            ? relevantPersonalizedFriction(
                personalizeFriction(available, {
                  ...activeProfile,
                  preferences: resolveAdaptationPreferences(activeProfile).preferences,
                }),
              ).map(({ signal }) => signal)
            : available;
          lens.setSignals(signals);
          return lens.setEnabled(parsed.data.enabled);
        }
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
          const semanticPlan = validatePlanTargets(parsed.data.plan, registry);
          activePlan = {
            version: 1,
            instructions: [
              ...(deterministicPlan?.instructions ?? []),
              ...semanticPlan.instructions,
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
    };

    const onMessage: Parameters<typeof browser.runtime.onMessage.addListener>[0] = (
      value,
      _sender,
      sendResponse,
    ) => {
      void handleMessage(value)
        .then((response) => sendResponse(response))
        .catch((error: unknown) => {
          console.error(`[AURA content] Failed to handle ${messageType(value)}.`, error);
          sendResponse(errorResponse(messageType(value), error));
        });
      return true;
    };

    let disposed = false;
    const dispose = () => {
      if (disposed) return;
      disposed = true;
      browser.runtime.onMessage.removeListener(onMessage);
      observer.disconnect();
      lens.destroy();
      tasks.revert();
      rescue.destroy();
      engine.revertAll();
    };

    browser.runtime.onMessage.addListener(onMessage);
    runtimeGlobal.__auraRuntimeLeaseV1__ = { id: runtimeId, dispose };
    context.onInvalidated(() => {
      if (runtimeGlobal.__auraRuntimeLeaseV1__?.id !== runtimeId) return;
      dispose();
      delete runtimeGlobal.__auraRuntimeLeaseV1__;
      if (originalRuntimeMarker === null) {
        root.removeAttribute('data-aura-runtime');
      } else {
        root.setAttribute('data-aura-runtime', originalRuntimeMarker);
      }
      console.info('[AURA content] Runtime invalidated and cleaned up.', { runtimeId });
    });
  },
});
