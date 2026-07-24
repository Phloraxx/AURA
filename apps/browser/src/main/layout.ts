export const CHROME_HEIGHT = 72;
export const PANEL_WIDTH = 360;
export const MIN_PAGE_WIDTH = 320;

export interface ViewBounds {
  height: number;
  width: number;
  x: number;
  y: number;
}

export function getPageViewBounds(
  contentWidth: number,
  contentHeight: number,
  panelOpen: boolean,
): ViewBounds {
  const reservedPanelWidth =
    panelOpen && contentWidth - PANEL_WIDTH >= MIN_PAGE_WIDTH ? PANEL_WIDTH : 0;

  return {
    x: 0,
    y: CHROME_HEIGHT,
    width: Math.max(MIN_PAGE_WIDTH, contentWidth - reservedPanelWidth),
    height: Math.max(0, contentHeight - CHROME_HEIGHT),
  };
}
