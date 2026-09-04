import { memo } from 'react';
import { useGame, useSel } from '../store';
import { computeMods, STAT_NAMES, STAT_KEYS } from '@/engine';
import { Tooltip } from './Tooltip';

const FEATURES: { key: 'autoAttack' | 'autoRiposte' | 'autoDodge' | 'autoEstus' | 'autoLevel' | 'autoAdvance' | 'autoKindle' | 'autoSpells' | 'autoSigil'; label: string; desc: string }[] = [
  { key: 'autoAttack', label: 'Attack', desc: 'Hollow Instinct: swings once a second (scaled by weapon speed) whenever stamina allows. Clicking adds on top.' },
  { key: 'autoRiposte', label: 'Riposte', desc: 'Strikes the Riposte window for you.' },
  { key: 'autoDodge', label: 'Dodge', desc: 'Perfect-dodges every telegraph the cooldown allows.' },
  { key: 'autoEstus', label: 'Estus', desc: 'Drinks below 35% HP.' },
  { key: 'autoLevel', label: 'Level', desc: 'Spends souls on levels as soon as you can afford one.' },
  { key: 'autoAdvance', label: 'Advance', desc: 'Pushes into the next tier the moment one is cleared.' },
  { key: 'autoSpells', label: 'Spells', desc: 'Casts attuned spells whenever they are ready.' },
  { key: 'autoKindle', label: 'Kindle', desc: 'Kindles automatically when this cycle would gather at least double what the last Kindle gathered (and at least 10), after 20 minutes.' },
  { key: 'autoSigil', label: 'Sigil', desc: 'Carves the Sigil automatically when it would gather at least 1.5× what the last Sigil gathered (and at least 5).' },
];

/** Automation toggles. Only unlocked features are shown; each one was earned. */
export const AutomationBar = memo(function AutomationBar() {
  const dispatch = useGame((g) => g.dispatch);
  const unlocked = useSel((s) => Array.from(computeMods(s).unlocks).join(','));
  const values = useSel((s) => JSON.stringify(FEATURES.map((f) => s.automation[f.key])));
  const levelStat = useSel((s) => s.automation.autoLevelStat);
  const set = new Set(unlocked.split(',').filter(Boolean));
  const vals = JSON.parse(values) as boolean[];
  const shown = FEATURES.filter((f) => set.has(f.key));
  if (shown.length === 0) return null;
  return (
    <div className="slab px-3 py-2 flex items-center gap-2 flex-wrap">
      <span className="text-[10px] uppercase tracking-widest text-bone-400 mr-1">Auto</span>
      {shown.map((f) => {
        const i = FEATURES.indexOf(f);
        return (
          <Tooltip key={f.key} tip={f.desc}>
            <button className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-sm border ${vals[i] ? 'border-ember-500 text-ember-400 bg-ember-700/30' : 'border-ash-600 text-bone-400'}`} onClick={() => dispatch({ type: 'setAutomation', key: f.key, value: !vals[i] })}>{f.label}</button>
          </Tooltip>
        );
      })}
      {set.has('autoLevel') && (
        <select className="bg-ash-800 border border-ash-600 text-bone-200 text-[10px] px-1 py-0.5 rounded-sm" value={levelStat} onChange={(e) => dispatch({ type: 'setAutomation', key: 'autoLevelStat', value: e.target.value })}>
          <option value="balanced">balanced</option>
          {STAT_KEYS.map((k) => <option key={k} value={k}>{STAT_NAMES[k]}</option>)}
        </select>
      )}
    </div>
  );
});
