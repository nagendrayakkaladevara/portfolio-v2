/** Fixed-position bounds in layout-viewport coordinates, contained in the visible viewport. */
export function getChatBounds({ width, height, offsetLeft = 0, offsetTop = 0, mobile }: {
  width: number; height: number; offsetLeft?: number; offsetTop?: number; mobile: boolean;
}) {
  // Never impose a minimum height larger than the keyboard-reduced viewport.
  const gap = Math.min(mobile ? 12 : 24, width / 4, height / 4);
  const panelWidth = Math.max(0, Math.min(400, width - gap * 2));
  const availableHeight = Math.max(0, height - gap * 2);
  // Mobile uses the full visible height, retaining a small top and bottom gutter.
  const panelHeight = mobile ? availableHeight : Math.min(596, availableHeight);
  return {
    left: offsetLeft + width - gap - panelWidth,
    top: offsetTop + height - gap - panelHeight,
    width: panelWidth,
    height: panelHeight,
  };
}
