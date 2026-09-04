import { memo, useState } from 'react';
import { useGame, useSel } from '../store';
import { useSettings } from '../settings';
import { exportSave, importSave, SaveError, fmt, computeMods } from '@/engine';
import { saveToStorage, hardDelete, replaceState } from '../persist';

export const SettingsPanel = memo(function SettingsPanel() {
  const st = useSettings();
  const [msg, setMsg] = useState<string>('');
  const [importText, setImportText] = useState('');
  const [confirm, setConfirm] = useState('');
  const state = useGame((g) => g.state);
  const modsList = useSel((s) => JSON.stringify(computeMods(s).sources));
  const sources = JSON.parse(modsList) as { name: string; effect: string }[];

  const doExport = async () => {
    const text = exportSave(state, Date.now());
    try { await navigator.clipboard.writeText(text); setMsg('Export copied to clipboard.'); }
    catch { setImportText(text); setMsg('Clipboard unavailable; the export is in the box below. Copy it from there.'); }
  };
  const doImport = () => {
    try {
      const s = importSave(importText);
      replaceState(s);
      setMsg('Save imported.');
      setImportText('');
    } catch (e) {
      setMsg(e instanceof SaveError ? `Import failed: ${e.message}` : `Import failed: ${String(e)}`);
    }
  };
  return (
    <div className="flex flex-col gap-3 text-[15px]">
      <div className="t-display text-[20px] text-ember-hot">Settings</div>
      <label className="flex items-center justify-between"><span className="text-bone">Number format</span>
        <select className="bg-ink border border-ash text-parchment text-[13px] px-2 py-1" value={st.numberFormat} onChange={(e) => st.set({ numberFormat: e.target.value as any })}>
          <option value="short">1.23M</option><option value="scientific">1.23e6</option><option value="engineering">1.23e6 (eng)</option>
        </select>
      </label>
      <Toggle label="Reduce effects (particles, shake, flashes)" value={st.reduceFx} onChange={(v) => st.set({ reduceFx: v })} />
      <Toggle label="Screen shake" value={st.screenShake} onChange={(v) => st.set({ screenShake: v })} />
      <Toggle label="Sound (synthesized, off by default)" value={st.sound} onChange={(v) => st.set({ sound: v })} />
      {st.sound && <label className="flex items-center justify-between"><span className="text-bone">Volume</span><input type="range" min={0} max={1} step={0.05} value={st.volume} onChange={(e) => st.set({ volume: Number(e.target.value) })} /></label>}
      <Toggle label="Show hints" value={st.showTutorial} onChange={(v) => st.set({ showTutorial: v })} />

      <div className="border-t border-ash/50 pt-2 font-display text-[16px] text-parchment">Save</div>
      <div className="flex gap-2 flex-wrap">
        <button className="btn text-[13px]" onClick={() => { setMsg(saveToStorage() ? 'Saved.' : 'Save failed: storage unavailable.'); }}>Save now</button>
        <button className="btn text-[13px]" onClick={doExport}>Export to clipboard</button>
      </div>
      <textarea className="bg-ink border border-ash/50 text-parchment text-[13px] font-num p-2 h-16" placeholder="Paste an ASHFALL1. export here to import" value={importText} onChange={(e) => setImportText(e.target.value)} />
      <button className="btn text-[13px] self-start" disabled={!importText.trim()} onClick={doImport}>Import (replaces current game)</button>
      {msg && <div className="text-[14px] text-ember-hot">{msg}</div>}
      <div className="text-[13px] text-bone/70">Autosaves every 10 seconds, when the tab is hidden, and on close. A rolling backup is kept; if the main save is ever unreadable the backup loads instead and the damaged copy is preserved.</div>

      <div className="border-t border-ash/50 pt-2 font-display text-[16px] text-blood-bright">Hard delete</div>
      <div className="text-[13px] text-bone/70">Erases the save, the backup and every trace. Type <span className="font-num text-parchment">HOLLOW</span> to confirm.</div>
      <div className="flex gap-2">
        <input className="bg-ink border border-ash/50 text-parchment text-[13px] px-2 py-1 w-28 font-num" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <button className="btn text-[13px] border-blood text-blood-bright" disabled={confirm !== 'HOLLOW'} onClick={() => { hardDelete(); setConfirm(''); setMsg('Everything is ash. A new ember stirs.'); }}>Delete everything</button>
      </div>

      <div className="border-t border-ash/50 pt-2 font-display text-[16px] text-parchment">Active modifiers</div>
      {sources.length === 0 ? <div className="text-[13px] text-bone/70 italic">No permanent modifiers yet. Every bonus you earn will be listed here, with its exact number.</div> : (
        <div className="text-[13px] grid grid-cols-[1fr_auto] gap-x-3">{sources.map((s, i) => <span key={i} className="contents"><span className="text-bone">{s.name}</span><span className="font-num text-ember-hot text-right">{s.effect}</span></span>)}</div>
      )}
      <Stats />
    </div>
  );
});

function Stats() {
  const kills = useSel((s) => s.stats.kills.toString());
  const deaths = useSel((s) => s.stats.deaths);
  const earned = useSel((s) => s.stats.soulsEarned.toString());
  const lost = useSel((s) => s.stats.soulsLost.toString());
  const clicks = useSel((s) => s.stats.clicks);
  const ripostes = useSel((s) => s.stats.ripostes);
  const perfect = useSel((s) => s.stats.perfectDodges);
  const play = useSel((s) => Math.floor(s.stats.playTime));
  return (
    <div className="border-t border-ash/50 pt-2 text-[13px] grid grid-cols-2 gap-x-3 gap-y-0.5 text-bone/70">
      <span>Kills</span><span className="font-num text-parchment text-right">{fmt(Number(kills))}</span>
      <span>Deaths</span><span className="font-num text-parchment text-right">{deaths}</span>
      <span>Souls earned</span><span className="font-num text-parchment text-right">{fmt(Number(earned))}</span>
      <span>Souls lost to the ash</span><span className="font-num text-parchment text-right">{fmt(Number(lost))}</span>
      <span>Clicks</span><span className="font-num text-parchment text-right">{fmt(clicks)}</span>
      <span>Ripostes</span><span className="font-num text-parchment text-right">{fmt(ripostes)}</span>
      <span>Perfect dodges</span><span className="font-num text-parchment text-right">{fmt(perfect)}</span>
      <span>Time at the fire</span><span className="font-num text-parchment text-right">{Math.floor(play / 3600)}h {Math.floor((play % 3600) / 60)}m</span>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-bone">{label}</span>
      <button className={`w-9 h-5  border transition-colors ${value ? 'bg-ember border-ember' : 'bg-ink border-ash'}`} onClick={() => onChange(!value)}>
        <span className={`block w-4 h-4  bg-bone transition-transform ${value ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </button>
    </label>
  );
}
