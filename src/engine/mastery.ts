/**
 * Weapon Mastery: kills made with a weapon in hand rank it up. Each rank adds damage with that
 * weapon; the first unlocks its archetype's Art, an active ability on a cooldown, and each rank
 * after sharpens the Art.
 */
import { ARTS, MASTERY_RANKS, MASTERY_DMG_PER_RANK, MASTERY_ART_PER_RANK, getWeapon } from '@/content';
import type { GameState, GameEvent, WeaponInstance } from './types';
import { registerActionHandler, registerTickHook } from './registry';

export function masteryKills(inst: WeaponInstance | undefined | null): number { return inst?.mastery ?? 0; }
export function masteryRank(inst: WeaponInstance | undefined | null): number {
  const k = masteryKills(inst);
  let r = 0; while (r < MASTERY_RANKS.length && k >= MASTERY_RANKS[r]) r++;
  return r;
}
export function masteryNext(inst: WeaponInstance | undefined | null): number | null { const r = masteryRank(inst); return r >= MASTERY_RANKS.length ? null : MASTERY_RANKS[r]; }
export function masteryDmgMult(inst: WeaponInstance | undefined | null): number { return 1 + MASTERY_DMG_PER_RANK * masteryRank(inst); }
/** the Art's power multiplier from ranks past the first */
export function artPower(inst: WeaponInstance | undefined | null): number { return 1 + MASTERY_ART_PER_RANK * Math.max(0, masteryRank(inst) - 1); }

export function recordMasteryKill(state: GameState, events: GameEvent[]) {
  const inst = state.player.weapons[state.player.weapon];
  if (!inst) return;
  const before = masteryRank(inst);
  inst.mastery = (inst.mastery ?? 0) + 1;
  const after = masteryRank(inst);
  if (after > before) events.push({ type: 'masteryRank', weapon: inst.id, rank: after });
}

export function artFor(state: GameState) { return ARTS[getWeapon(state.player.weapon).archetype]; }
export function canArt(state: GameState): string | null {
  const inst = state.player.weapons[state.player.weapon];
  if (masteryRank(inst) < 1) return `${artFor(state).name} opens at ${MASTERY_RANKS[0]} kills with this weapon.`;
  if ((state.player.artCd ?? 0) > 0) return `${artFor(state).name} in ${Math.ceil(state.player.artCd ?? 0)}s.`;
  if (state.deathScreen > 0) return 'Not now.';
  const a = artFor(state);
  if ((a.id === 'flurry' || a.id === 'crush') && !state.encounter.enemy) return 'Nothing to strike.';
  return null;
}

registerActionHandler((state, action, events) => {
  if (action.type !== 'art') return false;
  const why = canArt(state);
  if (why) { events.push({ type: 'error', text: why }); return true; }
  const a = artFor(state);
  const inst = state.player.weapons[state.player.weapon];
  const power = artPower(inst);
  state.player.artCd = a.cooldown;
  if (a.id === 'flurry') state.player.artBuff = { kind: 'flurry', t: 0.5, uses: 3 };
  else if (a.id === 'crush') state.player.artBuff = { kind: 'crush', t: 0.5, uses: 1 };
  else if (a.id === 'stance') state.player.artBuff = { kind: 'stance', t: 6, uses: 99 };
  else state.player.artBuff = { kind: 'stoke', t: 30, uses: 3 };
  (state.player.artBuff as any).power = power;
  events.push({ type: 'art', art: a.id });
  return true;
});
registerTickHook((state, _mods, _events, dt) => {
  const p = state.player;
  if ((p.artCd ?? 0) > 0) p.artCd = Math.max(0, (p.artCd ?? 0) - dt);
  if (p.artBuff) { p.artBuff.t -= dt; if (p.artBuff.t <= 0 || p.artBuff.uses <= 0) p.artBuff = null; }
});
