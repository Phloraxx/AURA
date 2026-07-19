import {
  rescueStatusSchema,
  rescueSuggestionSchema,
  type CapabilityProfile,
  type RescueStatus,
  type RescueSuggestion,
} from '@aura/shared';

import type { ElementRegistry } from '../page/element-registry';

interface RescueConfig {
  targetSizePx: number;
  cognitiveRelevant: boolean;
  attentionRelevant: boolean;
}

type SuggestionHandler = (suggestion: RescueSuggestion) => void;

const INTERACTIVE_SELECTOR = 'button, a[href], input:not([type="hidden"]), select, textarea, [role="button"], [role="link"]';
const ACCEPTED_SUGGESTION_COOLDOWN_MS = 30_000;

export class RescueEngine {
  readonly #document: Document;
  readonly #registry: ElementRegistry;
  readonly #onSuggestion: SuggestionHandler;
  #enabled = false;
  #config: RescueConfig = { targetSizePx: 44, cognitiveRelevant: false, attentionRelevant: false };
  #suggestion: RescueSuggestion | undefined;
  readonly #cooldowns = new Map<string, number>();
  readonly #nearMisses = new Map<string, number[]>();
  readonly #focusVisits = new Map<string, number[]>();
  #tabCount = 0;
  #lastScrollTop = 0;
  #lastScrollDirection: 'up' | 'down' | undefined;
  #scrollReversals: number[] = [];

  constructor(document: Document, registry: ElementRegistry, onSuggestion: SuggestionHandler) {
    this.#document = document;
    this.#registry = registry;
    this.#onSuggestion = onSuggestion;
    document.addEventListener('pointerup', this.#onPointerUp, true);
    document.addEventListener('focusin', this.#onFocusIn, true);
    document.addEventListener('keydown', this.#onKeyDown, true);
    document.addEventListener('scroll', this.#onScroll, true);
  }

  setProfile(profile: CapabilityProfile): void {
    const supportNeed = (dimension: keyof CapabilityProfile['dimensions']) =>
      (1 - profile.dimensions[dimension].capacity) * profile.dimensions[dimension].confidence;
    this.#config = {
      targetSizePx: profile.preferences.targetSizePx,
      cognitiveRelevant: supportNeed('cognitive') >= 0.25,
      attentionRelevant: supportNeed('attention') >= 0.25,
    };
  }

  clearSuggestion(): RescueStatus {
    if (this.#suggestion) {
      this.#cooldowns.set(this.#suggestion.id, Date.now() + ACCEPTED_SUGGESTION_COOLDOWN_MS);
    }
    this.#suggestion = undefined;
    this.#resetInteractionHistory();
    return this.status();
  }

  setEnabled(enabled: boolean): RescueStatus {
    this.#enabled = enabled;
    if (!enabled) {
      this.#suggestion = undefined;
      this.#resetInteractionHistory();
    }
    return this.status();
  }

  dismiss(suggestionId: string): RescueStatus {
    if (this.#suggestion?.id === suggestionId) {
      this.#cooldowns.set(suggestionId, Date.now() + 5_000);
      this.#suggestion = undefined;
      this.#resetInteractionHistory();
    }
    return this.status();
  }

  status(): RescueStatus {
    return rescueStatusSchema.parse({
      enabled: this.#enabled,
      ...(this.#suggestion ? { suggestion: this.#suggestion } : {}),
    });
  }

  destroy(): void {
    this.#document.removeEventListener('pointerup', this.#onPointerUp, true);
    this.#document.removeEventListener('focusin', this.#onFocusIn, true);
    this.#document.removeEventListener('keydown', this.#onKeyDown, true);
    this.#document.removeEventListener('scroll', this.#onScroll, true);
  }

  #resetInteractionHistory(): void {
    this.#nearMisses.clear();
    this.#focusVisits.clear();
    this.#tabCount = 0;
    this.#scrollReversals = [];
    this.#lastScrollDirection = undefined;
    this.#lastScrollTop = this.#document.defaultView?.scrollY ?? this.#document.documentElement.scrollTop;
  }

  #onPointerUp = (event: PointerEvent): void => {
    if (!this.#enabled || this.#suggestion) return;
    const x = event.clientX;
    const y = event.clientY;
    const candidates = Array.from(this.#document.querySelectorAll(INTERACTIVE_SELECTOR)).filter((element) => {
      if (!element.isConnected || element.closest('[data-aura-owned]')) return false;
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && Math.min(rect.width, rect.height) < this.#config.targetSizePx &&
        x >= rect.left - 28 && x <= rect.right + 28 && y >= rect.top - 28 && y <= rect.bottom + 28 &&
        !(x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom);
    });
    const target = candidates[0];
    if (!target) return;
    const id = this.#registry.getId(target) ?? this.#registry.register(target);
    const now = Date.now();
    const recent = (this.#nearMisses.get(id) ?? []).filter((time) => now - time < 2_500);
    recent.push(now);
    this.#nearMisses.set(id, recent);
    if (recent.length >= 2) {
      this.#suggest({
        id: `rescue:near-miss:${id}`,
        kind: 'near_miss',
        title: 'Having trouble selecting this control?',
        message: 'AURA noticed repeated near-miss pointer interactions with a small target.',
        recommendationKey: 'enlargeTargets',
        targetIds: [id],
      });
    }
  };

  #onFocusIn = (event: FocusEvent): void => {
    if (!this.#enabled || !this.#config.cognitiveRelevant && !this.#config.attentionRelevant) return;
    const target = event.target instanceof Element ? event.target : undefined;
    if (!target) return;
    const id = this.#registry.getId(target) ?? this.#registry.register(target);
    const now = Date.now();
    const recent = (this.#focusVisits.get(id) ?? []).filter((time) => now - time < 4_000);
    recent.push(now);
    this.#focusVisits.set(id, recent);
    if (recent.length >= 4) {
      this.#suggest({
        id: `rescue:focus-cycle:${id}`,
        kind: 'focus_cycle',
        title: 'Would a focused main task help?',
        message: 'AURA noticed repeated focus visits in the same area.',
        recommendationKey: 'focusMode',
        targetIds: [id],
      });
    }
  };

  #onKeyDown = (event: KeyboardEvent): void => {
    if (!this.#enabled || event.key !== 'Tab') return;
    this.#tabCount += 1;
    if (this.#tabCount < 8) return;
    const main = this.#document.querySelector('main, [role="main"], article');
    if (!main) return;
    const id = this.#registry.getId(main) ?? this.#registry.register(main);
    this.#suggest({
      id: 'rescue:keyboard-path',
      kind: 'keyboard_path',
      title: 'Skip directly to the main content?',
      message: 'AURA noticed a long keyboard path before the main page region.',
      recommendationKey: 'focusMode',
      targetIds: [id],
    });
    this.#tabCount = 0;
  };

  #onScroll = (): void => {
    if (!this.#enabled || !this.#config.attentionRelevant) return;
    const top = this.#document.defaultView?.scrollY ?? this.#document.documentElement.scrollTop;
    const direction = top > this.#lastScrollTop ? 'down' : top < this.#lastScrollTop ? 'up' : undefined;
    if (direction && this.#lastScrollDirection && direction !== this.#lastScrollDirection) {
      const now = Date.now();
      this.#scrollReversals = this.#scrollReversals.filter((time) => now - time < 3_000);
      this.#scrollReversals.push(now);
      if (this.#scrollReversals.length >= 4) {
        this.#suggest({
          id: 'rescue:scroll-oscillation',
          kind: 'scroll_oscillation',
          title: 'Would a focused reading view help?',
          message: 'AURA noticed repeated movement between page regions.',
          recommendationKey: 'focusMode',
          targetIds: [],
        });
        this.#scrollReversals = [];
      }
    }
    if (direction) this.#lastScrollDirection = direction;
    this.#lastScrollTop = top;
  };

  #suggest(suggestion: RescueSuggestion): void {
    if (this.#document.visibilityState !== 'visible' || !this.#document.hasFocus()) return;
    const cooldownUntil = this.#cooldowns.get(suggestion.id) ?? 0;
    if (Date.now() < cooldownUntil) return;
    this.#suggestion = rescueSuggestionSchema.parse(suggestion);
    this.#onSuggestion(this.#suggestion);
  }
}
