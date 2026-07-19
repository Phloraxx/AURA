import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(process.cwd(), 'entrypoints/sidepanel/style.css'), 'utf8');

function hexToLuminance(hex: string): number {
  const value = hex.replace('#', '');
  const channels = [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16) / 255);
  const [red = 0, green = 0, blue = 0] = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(foreground: string, background: string): number {
  const first = hexToLuminance(foreground);
  const second = hexToLuminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

function expectPalettePair(foreground: string, background: string): void {
  expect(css).toContain(foreground);
  expect(css).toContain(background);
  expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
}

describe('side panel color contrast', () => {
  it('keeps core text and status palette pairs at WCAG AA normal-text contrast', () => {
    const pairs = [
      ['#18221c', '#eef3ec'],
      ['#476151', '#ffffff'],
      ['#245039', '#e1f0e5'],
      ['#526057', '#f8fbf7'],
      ['#ffffff', '#1f6540'],
      ['#195b38', '#dff2e5'],
      ['#78540b', '#fff3cf'],
      ['#8b2e26', '#ffe3df'],
      ['#ffffff', '#0f766e'],
      ['#ffffff', '#7c3aed'],
    ] as const;

    for (const [foreground, background] of pairs) {
      expectPalettePair(foreground, background);
    }
  });
});
