import { describe, it, expect } from 'vitest';
import { validateContent, WEAPONS, ENEMIES, BOSSES, ZONES, SPELLS } from '@/content';

describe('content integrity', () => {
  it('every cross-reference resolves and no placeholder text ships', () => {
    expect(validateContent()).toEqual([]);
  });
  it('every weapon has scaling and lore', () => {
    for (const w of Object.values(WEAPONS)) {
      expect(Object.keys(w.scaling).length + (w.archetype === 'catalyst' ? 1 : 0)).toBeGreaterThan(0);
      expect(w.lore.length).toBeGreaterThan(40);
      expect(w.stamina).toBeGreaterThan(0);
      expect(w.riposteMult).toBeGreaterThan(1);
    }
  });
  it('every boss has multiple phases with a mechanic somewhere', () => {
    for (const b of Object.values(BOSSES)) {
      expect(b.phases.length).toBeGreaterThanOrEqual(2);
      expect(b.phases.some((p) => p.mechanic)).toBe(true);
      expect(b.lore.length).toBeGreaterThan(60);
    }
  });
  it('zones have 4-6 tiers', () => {
    for (const z of Object.values(ZONES)) {
      expect(z.tiers.length).toBeGreaterThanOrEqual(4);
      expect(z.tiers.length).toBeLessThanOrEqual(6);
    }
  });
  it('enemies and spells have lore', () => {
    for (const e of Object.values(ENEMIES)) expect(e.lore.length).toBeGreaterThan(40);
    for (const s of Object.values(SPELLS)) expect(s.lore.length).toBeGreaterThan(40);
  });
});
