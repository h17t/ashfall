/** UI-only preferences (not part of the game state). Persisted separately. */
import { create } from 'zustand';
import { setDefaultFormat, type NumberFormat } from '@/engine';

export interface Settings {
  numberFormat: NumberFormat;
  reduceFx: boolean;
  sound: boolean;
  volume: number;
  screenShake: boolean;
  haptics: boolean;
  /** VFX quality tier; auto picks from the device and steps down on frame drops */
  quality: 'auto' | 'cinematic' | 'high' | 'balanced' | 'battery';
  showTutorial: boolean;
  /** a plain humanist face with wider spacing, for dyslexic readers */
  plainType: boolean;
  /** a status palette that does not lean on red against green */
  colorblind: boolean;
  set: (patch: Partial<Omit<Settings, 'set'>>) => void;
}

const KEY = 'mournwake.settings';

function load(): Partial<Settings> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export const useSettings = create<Settings>((set, get) => ({
  numberFormat: 'short',
  reduceFx: typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  sound: false,
  volume: 0.5,
  screenShake: true,
  haptics: true,
  quality: 'auto',
  showTutorial: true,
  plainType: false,
  colorblind: false,
  ...load(),
  set: (patch) => {
    set(patch);
    if (patch.numberFormat) setDefaultFormat(patch.numberFormat);
    try {
      const { set: _s, ...rest } = get();
      localStorage.setItem(KEY, JSON.stringify(rest));
    } catch { /* storage unavailable */ }
  },
}));

setDefaultFormat(useSettings.getState().numberFormat);
