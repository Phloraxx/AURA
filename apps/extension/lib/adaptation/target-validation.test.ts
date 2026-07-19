// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';

import { ElementRegistry } from '../page/element-registry';
import { validatePlanTargets } from './target-validation';

function register(registry: ElementRegistry, element: Element): string {
  document.body.append(element);
  return registry.register(element);
}

describe('live adaptation target validation', () => {
  it('accepts only IDs that are currently registered', () => {
    document.body.innerHTML = '';
    const registry = new ElementRegistry();
    const element = document.createElement('main');
    const id = register(registry, element);
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

  it('removes distraction targets that overlap primary content while preserving safe targets', () => {
    document.body.innerHTML = '';
    const registry = new ElementRegistry();
    const main = document.createElement('main');
    const article = document.createElement('article');
    main.append(article);
    const aside = document.createElement('aside');
    document.body.append(main, aside);
    const mainId = registry.register(main);
    const articleId = registry.register(article);
    const asideId = registry.register(aside);

    const plan = validatePlanTargets({
      version: 1,
      instructions: [{
        id: 'semantic:collapse-distractions',
        kind: 'collapseDistractions',
        source: 'semantic_ai',
        targetIds: [mainId, articleId, asideId],
        reason: 'Collapse secondary content only.',
      }],
    }, registry);

    expect(plan.instructions).toHaveLength(1);
    expect(plan.instructions[0]?.targetIds).toEqual([asideId]);
  });
});
