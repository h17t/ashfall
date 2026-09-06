import { create } from 'zustand';
import type { Pillar } from './BottomNav';

/**
 * Where the shell is: the open pillar, remembered across reloads. Kept in a store so anything
 * (the goal line, a strip, a sheet) can take the player to the place it names.
 */
const KEY = 'mournwake.pillar';
const PILLARS: Pillar[] = ['combat', 'cortege', 'arsenal', 'creeds', 'lantern'];
function initial(): Pillar {
  try { const p = localStorage.getItem(KEY) as Pillar | null; return p && PILLARS.includes(p) ? p : 'combat'; } catch { return 'combat'; }
}
export const useShell = create<{ pillar: Pillar; setPillar: (p: Pillar) => void }>((set) => ({
  pillar: initial(),
  setPillar: (pillar) => { set({ pillar }); try { localStorage.setItem(KEY, pillar); } catch { /* ignore */ } },
}));
