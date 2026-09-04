import { useEffect, useState } from 'react';
import { startLoop } from './loop';
import { loadFromStorage, startAutosave, saveToStorage } from './persist';
import { useSettings } from './settings';
import { OfflineModal } from './components/OfflineModal';
import { applyOffline } from '@/engine';
import { useGame } from './store';
import { Encounter } from './components/Encounter';
import { PlayerPanel } from './components/PlayerPanel';
import { EmberField } from './components/EmberField';
import { SidePanel } from './components/SidePanel';
import { Log } from './components/Log';
import { SpellBar } from './components/SpellBar';
import { AutomationBar } from './components/AutomationBar';
import { Fx } from './components/Fx';
import { Hints } from './components/Hints';
import { Bonfire } from './components/Bonfire';
import { startAudio } from './audio';
import { useHotkeys } from './hooks/useHotkeys';
import { Grain } from '@/render/Grain';
import { FireLight } from '@/render/FireLight';

export default function App() {
  const [loadError, setLoadError] = useState<string | null>(null);
  const reduceFx = useSettings((s) => s.reduceFx);
  useEffect(() => {
    const report = loadFromStorage();
    if (report.error) setLoadError(report.error);
    const stopLoop = startLoop((gapSeconds) => {
      // Tab was suspended for longer than the catch-up cap: treat it as offline time.
      const g = useGame.getState();
      applyOffline(g.state, gapSeconds);
      g.replace(g.state);
      saveToStorage();
    });
    const stopSave = startAutosave();
    const stopAudio = startAudio();
    return () => { stopLoop(); stopSave(); stopAudio(); };
  }, []);
  useHotkeys();
  return (
    <div className={`min-h-full relative ${reduceFx ? 'reduce-fx' : ''}`}>
      <FireLight />
      <Grain />
      <OfflineModal />
      <Fx />
      <Bonfire />
      <Hints />
      <EmberField />
      {loadError && (
        <div className="relative z-20 max-w-[1440px] mx-auto mt-3 px-5">
          <div className="text-[13px] px-3 py-2 flex justify-between gap-3" style={{ border: '1px solid var(--blood)', background: 'color-mix(in srgb, var(--blood) 18%, transparent)', color: 'var(--parchment)' }}>
            <span>{loadError} {loadError.includes('backup') ? 'A fresh game was started; the damaged saves are kept in storage under ashfall.corrupt.' : 'The backup save was loaded instead.'}</span>
            <button className="hover:text-parchment" style={{ color: 'var(--bone)' }} onClick={() => setLoadError(null)}>×</button>
          </div>
        </div>
      )}
      <div className="relative z-10 max-w-[1440px] mx-auto px-5 pt-4 pb-10">
        <header className="flex items-baseline gap-5 mb-3 pl-1">
          <h1 className="t-display text-[26px] leading-none" style={{ letterSpacing: '0.34em' }}>Ashfall</h1>
          <span className="t-label">an ember-tender's idle</span>
        </header>
        <div className="grid gap-x-0 gap-y-4 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
          <div className="flex flex-col gap-4 min-w-0">
            <div className="min-h-[560px] lg:min-h-[620px] flex-1 flex"><Encounter /></div>
            <div className="flex flex-col gap-3 lg:pr-12"><SpellBar /><AutomationBar /><Log /></div>
          </div>
          <div className="flex flex-col gap-5 lg:-ml-12 lg:mt-10 relative z-20">
            <PlayerPanel />
            <SidePanel />
          </div>
        </div>
      </div>
    </div>
  );
}
