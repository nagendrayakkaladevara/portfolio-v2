import { describe, expect, it } from 'vitest';
import { getChatBounds } from '../src/features/chat/viewport';

describe('chat stays inside the visible viewport', () => {
  it.each([
    { width: 320, height: 568, mobile: true },
    { width: 393, height: 760, mobile: true },
    { width: 412, height: 320, mobile: true }, // open keyboard
    { width: 360, height: 120, mobile: true }, // small keyboard remainder
    { width: 780, height: 320, mobile: false }, // landscape
    { width: 240, height: 360, offsetLeft: 70, offsetTop: 140, mobile: true }, // zoom/pan
    { width: 1440, height: 900, mobile: false },
  ])('contains the entire panel at $width × $height', input => {
    const rect = getChatBounds(input);
    const x = input.offsetLeft ?? 0, y = input.offsetTop ?? 0;
    expect(rect.left).toBeGreaterThan(x);
    expect(rect.top).toBeGreaterThan(y);
    expect(rect.left + rect.width).toBeLessThan(x + input.width);
    expect(rect.top + rect.height).toBeLessThan(y + input.height);
    expect(rect.width).toBeLessThanOrEqual(400);
    expect(rect.height).toBeGreaterThan(0);
  });
  it('fills a phone’s visible height with equal gutters, without negative translation', () => {
    expect(getChatBounds({ width: 393, height: 760, mobile: true })).toEqual({ left: 12, top: 12, width: 369, height: 736 });
  });
});
