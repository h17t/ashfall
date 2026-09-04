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
      <OfflineModal />
      <Fx />
      <Bonfire />
      <Hints />
      {loadError && (
        <div className="relative z-20 max-w-[1400px] mx-auto mt-3 px-4">
          <div className="border border-blood-600 bg-blood-600/10 text-bone-200 text-[12px] px-3 py-2 rounded-sm flex justify-between gap-3">
            <span>{loadError} {loadError.includes('backup') ? 'A fresh game was started; the damaged saves are kept in storage under ashfall.corrupt.' : 'The backup save was loaded instead.'}</span>
            <button className="text-ash-400 hover:text-bone-100" onClick={() => setLoadError(null)}>✕</button>
          </div>
        </div>
      )}
      <EmberField />
      <div className="relative z-10 max-w-[1400px] mx-auto p-4 grid gap-4 grid-cols-1 lg:grid-cols-[270px_1fr_380px]">
        <header className="lg:col-span-3 flex items-baseline justify-between">
          <h1 className="font-display text-3xl tracking-[0.35em] uppercase text-bone-100">Ashfall</h1>
          <span className="text-[10px] uppercase tracking-widest text-bone-400">an ember-tender's idle</span>
        </header>
        <div className="order-2 lg:order-1"><PlayerPanel /></div>
        <div className="flex flex-col gap-3 order-1 lg:order-2"><div className="min-h-[520px] flex-1"><Encounter /></div><SpellBar /><AutomationBar /><Log /></div>
        <div className="order-3"><SidePanel /></div>
      </div>
    </div>
  );
}
