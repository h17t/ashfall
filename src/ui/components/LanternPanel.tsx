import { memo } from 'react';
import { useGame, useSel } from '../store';
import { fmt, levelCost, statCurve, statMarginal, softCapBand, STAT_NAMES, STAT_DESC, D, computeMods, weaponDamage, playerHpMax, playerStaminaMax, STAT_KEYS, type StatKey } from '@/engine';
import { BALANCE, MATERIALS, getWeapon } from '@/content';
import { Tooltip } from './Tooltip';
import { Plate } from '@/render/Plate';

const GRADE_ORDER = ['-', 'E', 'D', 'C', 'B', 'A', 'S'];

export const LanternPanel = memo(function LanternPanel() {
  const dispatch = useGame((g) => g.dispatch);
  const level = useSel((s) => s.player.level);
  const marrow = useSel((s) => s.marrow.toString());
  const cost = levelCost(level);
  const canAfford = D(marrow).gte(cost);
  const draughts = useSel((s) => s.player.draughtsMax);
  const potency = useSel((s) => s.player.draughtPotency);
  const shards = useSel((s) => s.materials.wickStub ?? 0);
  const bones = useSel((s) => s.materials.renderFat ?? 0);
  const vessels = useSel((s) => s.materials.reliquaryBone ?? 0);
  const lanternName = useSel((s) => s.lantern);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <span className="t-display text-[20px] text-ember-hot">Lantern</span>
        <span className="t-label">Level {level} → {level + 1}: <span className={`font-num ${canAfford ? 'text-parchment' : 'text-blood-bright'}`}>{fmt(cost)}</span> marrow</span>
      </div>
      <div className="grid grid-cols-1 gap-1">
        {STAT_KEYS.map((k) => <StatRow key={k} stat={k} canAfford={canAfford} onLevel={() => dispatch({ type: 'levelUp', stat: k })} />)}
      </div>
      <div className="border-t border-ash/50 pt-2 flex flex-col gap-1">
        <div className="flex items-center justify-between text-[14px]">
          <Tooltip tip={<span>Each Tallowdraught Shard adds one flask. Shards drop from bosses and hidden places. Current: {draughts} flasks healing {Math.round(potency * 100)}% each.</span>}>
            <span className="text-parchment flex items-center gap-2"><span className="w-7 h-7"><Plate kind="item" id="wickStub" className="w-full h-full object-contain" /></span>Tallowdraught flasks: <span className="font-num">{draughts}</span></span>
          </Tooltip>
          <button className="btn text-[13px]" disabled={shards <= 0} onClick={() => dispatch({ type: 'upgradeDraught', kind: 'count' })}>Fit shard ({shards})</button>
        </div>
        <div className="flex items-center justify-between text-[14px]">
          <Tooltip tip={<span>An Revenant Bone Shard cast into the flame makes each flask heal 8% more of your max HP (max 90%).</span>}>
            <span className="text-parchment flex items-center gap-2"><span className="w-7 h-7"><Plate kind="item" id="renderFat" className="w-full h-full object-contain" /></span>Flask potency: <span className="font-num">{Math.round(potency * 100)}%</span></span>
          </Tooltip>
          <button className="btn text-[13px]" disabled={bones <= 0} onClick={() => dispatch({ type: 'upgradeDraught', kind: 'potency' })}>Burn bone ({bones})</button>
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
          <span className="text-parchment text-[15px]">{STAT_NAMES[stat]}</span>
          <span className="font-num text-parchment">{pts}<span className="text-[12px] text-bone/70 ml-1">{nextCap ? `→${nextCap}` : 'capped'}</span></span>
        </div>
        <div className="h-[2px] mt-0.5" style={{ background: 'color-mix(in srgb, var(--ash) 40%, transparent)' }}><div className="h-full" style={{ width: `${Math.min(100, (statCurve(pts) / 1.2) * 100)}%`, background: 'linear-gradient(90deg, var(--ember), var(--ember-hot))' }} /></div>
      </Tooltip>
      <button className={`btn text-[13px] px-2 ${canAfford ? 'btn-ember' : ''}`} disabled={!canAfford} onClick={onLevel}>+</button>
    </div>
  );
}

function statPreview(s: any, stat: StatKey): string {
  const mods = computeMods(s);
  const p = s.player;
  if (stat === 'vit') {
    const now = playerHpMax(p.stats.vit, p.level, mods.hpMult);
    const next = playerHpMax(p.stats.vit + 1, p.level + 1, mods.hpMult);
    return `HP ${now} → ${next}`;
  }
  if (stat === 'bre') {
    return `Stamina ${playerStaminaMax(p.stats.bre)} → ${playerStaminaMax(p.stats.bre + 1)}`;
  }
  const before = weaponDamage(s, mods).total;
  const saved = p.stats[stat];
  p.stats[stat] += 1;
  const after = weaponDamage(s, mods).total;
  p.stats[stat] = saved;
  const def = getWeapon(p.weapon);
  const inst = p.weapons[p.weapon];
  let grade = def.scaling[stat] ?? '-';
  if (inst?.infusion === 'heavy' && stat === 'mig') grade = 'A';
  if (inst?.infusion === 'keen' && stat === 'fin') grade = 'A';
  if (inst?.infusion === 'magic' && stat === 'ins') grade = 'A';
  if (inst?.infusion === 'blessed' && stat === 'dev') grade = 'A';
  const d = after.sub(before);
  return `${def.name} scales ${grade} · damage ${fmt(before)} → ${fmt(after)}${d.gt(0) ? '' : ' (this weapon does not scale with it)'}`;
}

function StatTip({ stat, pts, nextCap, marginal, preview }: { stat: StatKey; pts: number; nextCap: number | null; marginal: number; preview: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="font-display text-[16px] text-parchment">{STAT_NAMES[stat]} {pts}</div>
      <div className="text-bone">{STAT_DESC[stat]}</div>
      <div className="text-parchment">Next point: {preview}</div>
      <div className="text-bone/70">Scaling value +{marginal.toFixed(4)} per point in this band. {nextCap ? `Soft cap at ${nextCap}: returns drop after it.` : 'Past every soft cap: small returns.'} Caps at {BALANCE.level.softCaps.join(' / ')}.</div>
    </div>
  );
}

function RespecRow() {
  const dispatch = useGame((g) => g.dispatch);
  const stats = useSel((s) => JSON.stringify(s.player.stats));
  const vessels = useSel((s) => s.materials.reliquaryBone ?? 0);
  const onRespec = () => {
    const cur = JSON.parse(stats) as Record<StatKey, number>;
    const total = STAT_KEYS.reduce((a, k) => a + cur[k], 0);
    const min = BALANCE.level.startingStats;
    const spare = total - STAT_KEYS.reduce((a, k) => a + min[k], 0);
    const answer = window.prompt(`Pour ${spare} free points into stats as "vit,end,str,fin,int,dev" (added on top of the starting ${Object.values(min).join('/')}):`, STAT_KEYS.map((k) => cur[k] - min[k]).join(','));
    if (!answer) return;
    const parts = answer.split(',').map((x) => Math.max(0, Math.floor(Number(x) || 0)));
    if (parts.length !== 6) return;
    const next = {} as Record<StatKey, number>;
    STAT_KEYS.forEach((k, i) => { next[k] = min[k] + parts[i]; });
    dispatch({ type: 'respec', stats: next });
  };
  return (
    <div className="flex items-center justify-between text-[14px]">
      <Tooltip tip={<span>{MATERIALS.reliquaryBone.lore}</span>}><span className="text-parchment flex items-center gap-2"><span className="w-7 h-7"><Plate kind="item" id="reliquaryBone" className="w-full h-full object-contain" /></span>Reliquary Bones: <span className="font-num">{vessels}</span></span></Tooltip>
      <button className="btn text-[13px]" onClick={onRespec}>Reallocate stats</button>
    </div>
  );
}
