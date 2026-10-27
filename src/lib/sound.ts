import { createUISFX } from 'uisfx';

type Cue = 'select' | 'open' | 'close' | 'toggle-on' | 'copy';
let sound: ReturnType<typeof createUISFX> | undefined;

// Created only after a user interaction. Sound never carries essential feedback.
export function playSound(cue: Cue, enabled: boolean) {
  if (!enabled) return;
  try {
    sound ??= createUISFX({ pack: 'minimal', volume: 0.2 });
    sound.play(cue);
  } catch { /* Audio support must never prevent a UI interaction. */ }
}
