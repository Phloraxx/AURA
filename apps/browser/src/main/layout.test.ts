import { describe, expect, it } from 'vitest';

import {
  CHROME_HEIGHT,
  PANEL_WIDTH,
  getPageViewBounds,
} from './layout';

describe('getPageViewBounds', () => {
  it('reserves room for the panel', () => {
    expect(getPageViewBounds(1440, 900, true)).toEqual({
      x: 0,
      y: CHROME_HEIGHT,
      width: 1440 - PANEL_WIDTH,
      height: 900 - CHROME_HEIGHT,
    });
  });

  it('uses the full width when the panel is closed', () => {
    expect(getPageViewBounds(1440, 900, false).width).toBe(1440);
  });

  it('keeps a usable page width in a narrow window', () => {
    expect(getPageViewBounds(600, 800, true).width).toBe(600);
  });
});
