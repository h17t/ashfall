import { memo } from 'react';
import { useGame, useSel } from '../store';
import { fmt, levelCost, statCurve, statMarginal, softCapBand, STAT_NAMES, STAT_DESC, D, computeMods, weaponDamage, playerHpMax, playerStaminaMax, STAT_KEYS, type StatKey } from '@/engine';
import { BALANCE, MATERIALS, getWeapon } from '@/content';
import { Tooltip } from './Tooltip';

const GRADE_ORDER = ['-', 'E', 'D', 'C', 'B', 'A', 'S'];

export const BonfirePanel = memo(function BonfirePanel() {
  const dispatch = useGame((g) => g.dispatch);
  const level = useSel((s) => s.player.level);
  const souls = useSel((s) => s.souls.toString());
  const cost = levelCost(level);
  const canAfford = D(souls).gte(cost);
  const estus = useSel((s) => s.player.estusMax);
  const potency = useSel((s) => s.player.estusPotency);
  const shards = useSel((s) => s.materials.estusShard ?? 0);
  const bones = useSel((s) => s.materials.boneShard ?? 0);
  const vessels = useSel((s) => s.materials.soulVessel ?? 0);
  const bonfireName = useSel((s) => s.bonfire);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <span className="font-display text-lg text-ember-400">Bonfire</span>
        <span className="text-[10px] uppercase tracking-widest text-bone-400">Level {level} → {level + 1}: <span className={`font-num ${canAfford ? 'text-bone-100' : 'text-blood-500'}`}>{fmt(cost)}</span> souls</span>
      </div>
      <div className="grid grid-cols-1 gap-1">
        {STAT_KEYS.map((k) => <StatRow key={k} stat={k} canAfford={canAfford} onLevel={() => dispatch({ type: 'levelUp', stat: k })} />)}
      </div>
      <div className="border-t border-ash-700 pt-2 flex flex-col gap-1">
        <div className="flex items-center justify-between text-[12px]">
          <Tooltip tip={<span>Each Estus Shard adds one flask. Shards drop from bosses and hidden places. Current: {estus} flasks healing {Math.round(potency * 100)}% each.</span>}>
            <span className="text-bone-200">Estus flasks: <span className="font-num">{estus}</span></span>
          </Tooltip>
          <button className="btn text-xs" disabled={shards <= 0} onClick={() => dispatch({ type: 'upgradeEstus', kind: 'count' })}>Fit shard ({shards})</button>
        </div>
        <div className="flex items-center justify-between text-[12px]">
          <Tooltip tip={<span>An Undead Bone Shard cast into the flame makes each flask heal 8% more of your max HP (max 90%).</span>}>
            <span className="text-bone-200">Flask potency: <span className="font-num">{Math.round(potency * 100)}%</span></span>
          </Tooltip>
          <button className="btn text-xs" disabled={bones <= 0} onClick={() => dispatch({ type: 'upgradeEstus', kind: 'potency' })}>Burn bone ({bones})</button>
        </div>
        {vessels > 0 && <RespecRow />}
      </div>
    </div>
  );
});

function StatRow({ stat, canAfford, onLevel }: { stat: StatKey; canAfford: boolean; onLevel: () => void }) {
  const pts = useSel((s) => s.player.stats[stat]);
  const band = softCapBand(pts);
  const caps = BALANCE.level.softCaps;
  const nextCap = band < caps.length ? caps[band] : null;
  const marginal = statMarginal(pts);
  const preview = useSel((s) => statPreview(s, stat));
  return (
    <div className="flex items-center gap-2">
      <Tooltip className="flex-1" tip={<StatTip stat={stat} pts={pts} nextCap={nextCap} marginal={marginal} preview={preview} />}>
        <div className="flex items-baseline justify-between cursor-help">
          <span className="text-bone-200 text-sm">{STAT_NAMES[stat]}</span>
          <span className="font-num text-bone-100">{pts}<span className="text-[10px] text-bone-400 ml-1">{nextCap ? `→${nextCap}` : 'capped'}</span></span>
        </div>
        <div className="h-0.5 mt-0.5 bg-ash-800"><div className="h-full bg-ember-700" style={{ width: `${Math.min(100, (statCurve(pts) / 1.2) * 100)}%` }} /></div>
      </Tooltip>
      <button className={`btn text-xs px-2 ${canAfford ? 'btn-ember' : ''}`} disabled={!canAfford} onClick={onLevel}>+</button>
    </div>
  );
}

function statPreview(s: any, stat: StatKey): string {
  const mods = computeMods(s);
  const p = s.player;
  if (stat === 'vig') {
    const now = playerHpMax(p.stats.vig, p.level, mods.hpMult);
    const next = playerHpMax(p.stats.vig + 1, p.level + 1, mods.hpMult);
    return `HP ${now} → ${next}`;
  }
  if (stat === 'end') {
    return `Stamina ${playerStaminaMax(p.stats.end)} → ${playerStaminaMax(p.stats.end + 1)}`;
  }
  const before = weaponDamage(s, mods).total;
  const saved = p.stats[stat];
  p.stats[stat] += 1;
  const after = weaponDamage(s, mods).total;
  p.stats[stat] = saved;
  const def = getWeapon(p.weapon);
  const inst = p.weapons[p.weapon];
  let grade = def.scaling[stat] ?? '-';
  if (inst?.infusion === 'heavy' && stat === 'str') grade = 'A';
  if (inst?.infusion === 'keen' && stat === 'dex') grade = 'A';
  if (inst?.infusion === 'magic' && stat === 'int') grade = 'A';
  if (inst?.infusion === 'blessed' && stat === 'fth') grade = 'A';
  const d = after.sub(before);
  return `${def.name} scales ${grade} · damage ${fmt(before)} → ${fmt(after)}${d.gt(0) ? '' : ' (this weapon does not scale with it)'}`;
}

function StatTip({ stat, pts, nextCap, marginal, preview }: { stat: StatKey; pts: number; nextCap: number | null; marginal: number; preview: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="font-display text-base text-bone-100">{STAT_NAMES[stat]} {pts}</div>
      <div className="text-bone-300">{STAT_DESC[stat]}</div>
      <div className="text-bone-200">Next point: {preview}</div>
      <div className="text-bone-400">Scaling value +{marginal.toFixed(4)} per point in this band. {nextCap ? `Soft cap at ${nextCap}: returns drop after it.` : 'Past every soft cap: small returns.'} Caps at {BALANCE.level.softCaps.join(' / ')}.</div>
    </div>
  );
}

function RespecRow() {
  const dispatch = useGame((g) => g.dispatch);
  const stats = useSel((s) => JSON.stringify(s.player.stats));
  const vessels = useSel((s) => s.materials.soulVessel ?? 0);
  const onRespec = () => {
    const cur = JSON.parse(stats) as Record<StatKey, number>;
    const total = STAT_KEYS.reduce((a, k) => a + cur[k], 0);
    const min = BALANCE.level.startingStats;
    const spare = total - STAT_KEYS.reduce((a, k) => a + min[k], 0);
    const answer = window.prompt(`Pour ${spare} free points into stats as "vig,end,str,dex,int,fth" (added on top of the starting ${Object.values(min).join('/')}):`, STAT_KEYS.map((k) => cur[k] - min[k]).join(','));
    if (!answer) return;
    const parts = answer.split(',').map((x) => Math.max(0, Math.floor(Number(x) || 0)));
    if (parts.length !== 6) return;
    const next = {} as Record<StatKey, number>;
    STAT_KEYS.forEach((k, i) => { next[k] = min[k] + parts[i]; });
    dispatch({ type: 'respec', stats: next });
  };
  return (
    <div className="flex items-center justify-between text-[12px]">
      <Tooltip tip={<span>{MATERIALS.soulVessel.lore}</span>}><span className="text-bone-200">Soul Vessels: <span className="font-num">{vessels}</span></span></Tooltip>
      <button className="btn text-xs" onClick={onRespec}>Reallocate stats</button>
    </div>
  );
}
