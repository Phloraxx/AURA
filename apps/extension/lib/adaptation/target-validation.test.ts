// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';

import { ElementRegistry } from '../page/element-registry';
import { validatePlanTargets } from './target-validation';

describe('live adaptation target validation', () => {
  it('accepts only IDs that are currently registered', () => {
    const registry = new ElementRegistry();
    const element = document.createElement('main');
    document.body.append(element);
    const id = registry.register(element);
    expect(validatePlanTargets({
      version: 1,
      instructions: [{
        id: 'semantic:focus',
        kind: 'focusMainContent',
        source: 'deterministic',
        targetIds: [id],
        reason: 'Focus the main region.',
      }],
    }, registry).instructions[0]?.targetIds).toEqual([id]);
  });

  it('drops stale or invented target IDs without failing adaptation', () => {
    const registry = new ElementRegistry();
    expect(validatePlanTargets({
      version: 1,
      instructions: [{
        id: 'semantic:focus',
        kind: 'focusMainContent',
        source: 'deterministic',
        targetIds: ['aura:n99'],
        reason: 'Focus the main region.',
      }],
    }, registry).instructions).toEqual([]);
  });
});
