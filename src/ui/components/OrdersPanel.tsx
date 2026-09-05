import { memo, useState, type ReactNode } from 'react';
import { useGame, useSel } from '../store';
import { Sheet } from '../shell/Sheet';
import { orderSlots, availableConds, availableActs, condName, actName, condText, actText, BOOL_CONDS, STAT_NAMES, STAT_KEYS, type Order, type OrderCond, OrderCondKind, OrderActKind } from '@/engine';
import { getSpell } from '@/content';
import { haptic } from '../haptics';

/**
 * Standing Orders: the editor. Every part of a rule is a chip; a chip opens a sheet of choices;
 * nothing is typed. Rows carry a switch, move up and down, and are removed behind a confirmation.
 */
const PCT = [10, 20, 25, 35, 50, 65, 75, 80, 90];
const COUNTS = [0, 1, 2, 3, 5];
const MULT = [0.5, 1, 2, 5, 10];
const FLOORS = [2, 3, 4, 5, 8, 10, 15, 20];
const COND_HELP: Record<OrderCondKind, string> = {
  always: 'Every tick.', hp: 'Your HP as a share of the most you can have.', stamina: 'Your stamina, as a share.', fp: 'Your FP, as a share.', draughts: 'Tallowdraughts left.', marrow: 'Your marrow, in multiples of what the next level costs.', enemyHp: 'The enemy\'s HP, as a share.', composure: 'How close the enemy is to breaking.', reprisal: 'The enemy is broken and the Reprisal window is open.', telegraph: 'The enemy\'s attack is about to land.', boss: 'The thing in front of you is a lord.', streak: 'Kills without resting.', floor: 'The Stair floor you are on.', haul: 'The haul, in multiples of your purse.', boonOffer: 'The Stair is offering boons.',
};

function valuesFor(kind: OrderCondKind): number[] {
  if (kind === 'draughts' || kind === 'streak') return kind === 'streak' ? [5, 10, 25, 50, 100] : COUNTS;
  if (kind === 'marrow' || kind === 'haul') return MULT;
  if (kind === 'floor') return FLOORS;
  return PCT;
}
function valueText(kind: OrderCondKind, v: number): string {
  if (kind === 'marrow') return `${v}× a level`;
  if (kind === 'haul') return `${v}× the purse`;
  if (kind === 'draughts' || kind === 'streak' || kind === 'floor') return String(v);
  return `${v}%`;
}

export const OrdersPanel = memo(function OrdersPanel() {
  const dispatch = useGame((g) => g.dispatch);
  const rulesJson = useSel((s) => JSON.stringify(s.orders.rules));
  const slots = useSel((s) => orderSlots(s));
  const conds = useSel((s) => availableConds(s).join(','));
  const acts = useSel((s) => availableActs(s).join(','));
  const recited = useSel((s) => s.player.recited.map((id) => (id ? getSpell(id).name : '')).join('|'));
  const [pick, setPick] = useState<{ title: string; options: { label: string; help?: string; value: any }[]; onPick: (v: any) => void } | null>(null);
  const [removing, setRemoving] = useState<number | null>(null);
  const rules = JSON.parse(rulesJson) as Order[];
  const condKinds = conds.split(',') as OrderCondKind[];
  const actKinds = acts.split(',') as OrderActKind[];
  const commit = (next: Order[]) => dispatch({ type: 'setOrders', rules: next });
  const update = (i: number, fn: (r: Order) => Order) => commit(rules.map((r, k) => (k === i ? fn(r) : r)));
  const chip = (label: ReactNode, onClick: () => void, tone: 'when' | 'then' | 'plain' = 'plain', ariaLabel?: string) => (
    <button className={`order-chip ${tone}`} onClick={() => { haptic('tap'); onClick(); }} aria-label={ariaLabel}>{label}</button>
  );
  const pickCond = (i: number, ci: number) => setPick({ title: 'When…', options: condKinds.map((k) => ({ label: condName(k), help: COND_HELP[k], value: k })), onPick: (k: OrderCondKind) => update(i, (r) => ({ ...r, when: r.when.map((c, x) => (x === ci ? { kind: k, op: k === 'hp' || k === 'stamina' || k === 'fp' || k === 'enemyHp' ? '<' : '>', value: BOOL_CONDS.has(k) ? 1 : valuesFor(k)[Math.floor(valuesFor(k).length / 2)] } : c)) })) });
  const pickOp = (i: number, ci: number) => setPick({ title: 'Is…', options: [{ label: 'below', value: '<' }, { label: 'above', value: '>' }], onPick: (op) => update(i, (r) => ({ ...r, when: r.when.map((c, x) => (x === ci ? { ...c, op } : c)) })) });
  const pickValue = (i: number, ci: number, c: OrderCond) => setPick({ title: condName(c.kind), options: BOOL_CONDS.has(c.kind) ? [{ label: 'is', value: 1 }, { label: 'is not', value: 0 }] : valuesFor(c.kind).map((v) => ({ label: valueText(c.kind, v), value: v })), onPick: (v) => update(i, (r) => ({ ...r, when: r.when.map((x, k) => (k === ci ? { ...x, value: v } : x)) })) });
  const pickAct = (i: number) => setPick({ title: 'Then…', options: actKinds.map((k) => ({ label: actName(k), value: k })), onPick: (k: OrderActKind) => update(i, (r) => ({ ...r, then: { kind: k, arg: k === 'cast' ? 0 : k === 'levelUp' ? 'balanced' : k === 'takeBoon' ? 'epic' : undefined } })) });
  const pickArg = (i: number, r: Order) => {
    if (r.then.kind === 'levelUp') setPick({ title: 'Level which stat?', options: [{ label: 'The lowest', value: 'balanced' }, ...STAT_KEYS.map((k) => ({ label: STAT_NAMES[k], value: k }))], onPick: (v) => update(i, (x) => ({ ...x, then: { ...x.then, arg: v } })) });
    else if (r.then.kind === 'cast') setPick({ title: 'Cast which slot?', options: recited.split('|').map((n, k) => ({ label: `Slot ${k + 1}${n ? `: ${n}` : ' (empty)'}`, value: k })), onPick: (v) => update(i, (x) => ({ ...x, then: { ...x.then, arg: v } })) });
    else if (r.then.kind === 'takeBoon') setPick({ title: 'Which boon?', options: [{ label: 'The rarest', value: 'epic' }, { label: 'The rarest, rare before epic', value: 'rare' }, { label: 'The first offered', value: 'first' }], onPick: (v) => update(i, (x) => ({ ...x, then: { ...x.then, arg: v } })) });
  };
  const addRule = () => commit([...rules, { id: 0, when: [{ kind: 'hp', op: '<', value: 35 }], then: { kind: 'drink' }, on: true, fired: 0, cd: 0 }]);
  const move = (i: number, d: number) => { const j = i + d; if (j < 0 || j >= rules.length) return; const next = rules.slice(); [next[i], next[j]] = [next[j], next[i]]; commit(next); };
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <span className="t-display text-[20px] text-ember-hot">Standing Orders</span>
        <span className="t-label"><span className="t-num" style={{ color: 'var(--parchment)' }}>{rules.length}</span> of <span className="t-num">{slots}</span></span>
      </div>
      <p className="text-[14px] leading-snug" style={{ color: 'var(--bone)' }}>Read top to bottom, every tenth of a second. An order fires when its conditions hold and the thing can be done, then rests a moment. Each lord felled grants another slot.</p>
      {rules.length === 0 && <div className="text-[15px] italic" style={{ color: 'color-mix(in srgb, var(--bone) 70%, transparent)' }}>No orders yet. Your hands do only what the reflexes tell them.</div>}
      <ol className="flex flex-col gap-2">
        {rules.map((r, i) => (
          <li key={r.id} className={`order-row ${r.on ? '' : 'is-off'}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="t-label">Order <span className="t-num">{i + 1}</span>{r.fired > 0 && <span> · fired <span className="t-num">{r.fired}</span></span>}</span>
              <div className="flex items-center gap-1">
                <button className="order-btn" aria-label={`Move order ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
                <button className="order-btn" aria-label={`Move order ${i + 1} down`} disabled={i === rules.length - 1} onClick={() => move(i, 1)}>↓</button>
                <button role="switch" aria-checked={r.on} aria-label={`Order ${i + 1} on`} className={`switch ${r.on ? 'is-on' : ''}`} onClick={() => update(i, (x) => ({ ...x, on: !x.on }))}><span className="switch-knob" aria-hidden /></button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="order-kw">When</span>
              {r.when.map((c, ci) => (
                <span key={ci} className="contents">
                  {ci > 0 && <span className="order-kw">and</span>}
                  {chip(condName(c.kind), () => pickCond(i, ci), 'when', `Condition ${ci + 1}: ${condText(c)}`)}
                  {!BOOL_CONDS.has(c.kind) && chip(c.op === '<' ? 'below' : 'above', () => pickOp(i, ci), 'when')}
                  {c.kind !== 'always' && chip(BOOL_CONDS.has(c.kind) ? (c.value >= 1 ? 'is' : 'is not') : valueText(c.kind, c.value), () => pickValue(i, ci, c), 'when')}
                  {r.when.length > 1 && chip('×', () => update(i, (x) => ({ ...x, when: x.when.filter((_, k) => k !== ci) })), 'plain', `Remove condition ${ci + 1}`)}
                </span>
              ))}
              {r.when.length < 2 && chip('+ and', () => update(i, (x) => ({ ...x, when: [...x.when, { kind: 'draughts', op: '>', value: 0 }] })), 'plain', 'Add a condition')}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="order-kw">Then</span>
              {chip(actName(r.then.kind), () => pickAct(i), 'then', `Action: ${actText(r.then)}`)}
              {(r.then.kind === 'levelUp' || r.then.kind === 'cast' || r.then.kind === 'takeBoon') && chip(actText(r.then).replace(/^(Level |Cast |Take )/, ''), () => pickArg(i, r), 'then')}
              <span className="flex-1" />
              <button className="order-btn" aria-label={`Remove order ${i + 1}`} onClick={() => setRemoving(i)} style={{ color: 'var(--blood-bright)' }}>×</button>
            </div>
          </li>
        ))}
      </ol>
      {rules.length < slots && <button className="btn btn-ember min-h-[56px]" onClick={addRule}>New order</button>}
      {pick && (
        <Sheet open onClose={() => setPick(null)} material="stone" title={pick.title}>
          <div className="flex flex-col gap-1">
            {pick.options.map((o, k) => (
              <button key={k} className="order-option" onClick={() => { haptic('tap'); pick.onPick(o.value); setPick(null); }}>
                <span className="text-[16px]" style={{ color: 'var(--parchment)' }}>{o.label}</span>
                {o.help && <span className="block text-[13px]" style={{ color: 'var(--bone)' }}>{o.help}</span>}
              </button>
            ))}
          </div>
        </Sheet>
      )}
      {removing !== null && rules[removing] && (
        <Sheet open onClose={() => setRemoving(null)} material="stone" title="Remove this order?">
          <div className="flex flex-col gap-3">
            <div className="text-[15px]" style={{ color: 'var(--bone)' }}>When {rules[removing].when.map(condText).join(' and ')}, then {actText(rules[removing].then).toLowerCase()}.</div>
            <div className="flex gap-2">
              <button className="btn flex-1 min-h-[56px]" onClick={() => setRemoving(null)}>Keep it</button>
              <button className="btn flex-1 min-h-[56px] border-blood text-blood-bright" onClick={() => { commit(rules.filter((_, k) => k !== removing)); setRemoving(null); }}>Remove</button>
            </div>
          </div>
        </Sheet>
      )}
    </div>
  );
});
