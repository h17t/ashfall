import { useEffect } from 'react';
import { useGame } from './store';
import { startLoop } from './loop';
import { Encounter } from './components/Encounter';
import { PlayerPanel } from './components/PlayerPanel';
import { EmberField } from './components/EmberField';
import { SidePanel } from './components/SidePanel';
import { Log } from './components/Log';
import { useHotkeys } from './hooks/useHotkeys';

export default function App() {
  useEffect(() => startLoop(), []);
  useHotkeys();
  return (
    <div className="min-h-full relative">
      <EmberField />
      <div className="relative z-10 max-w-[1400px] mx-auto p-4 grid gap-4 grid-cols-1 lg:grid-cols-[270px_1fr_380px]">
        <header className="lg:col-span-3 flex items-baseline justify-between">
          <h1 className="font-display text-3xl tracking-[0.35em] uppercase text-bone-100">Ashfall</h1>
          <span className="text-[10px] uppercase tracking-widest text-bone-400">an ember-tender's idle</span>
        </header>
        <PlayerPanel />
        <div className="flex flex-col gap-3"><div className="min-h-[520px] flex-1"><Encounter /></div><Log /></div>
        <SidePanel />
      </div>
    </div>
  );
}
