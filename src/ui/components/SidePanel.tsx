import { useState } from 'react';
import { useSel } from '../store';
import { BonfirePanel } from './BonfirePanel';
import { WeaponsPanel } from './WeaponsPanel';
import { MapPanel } from './MapPanel';
import { SoulsPanel } from './SoulsPanel';
import { SettingsPanel } from './SettingsPanel';

type Tab = 'bonfire' | 'weapons' | 'map' | 'souls' | 'settings';

export function SidePanel() {
  const [tab, setTab] = useState<Tab>('bonfire');
  const soulsHeld = useSel((s) => Object.values(s.bossSouls).some((n) => n > 0));
  const tabs: { id: Tab; label: string; badge?: boolean }[] = [
    { id: 'bonfire', label: 'Bonfire' },
    { id: 'weapons', label: 'Weapons' },
    { id: 'map', label: 'Road' },
    { id: 'souls', label: 'Souls', badge: soulsHeld },
    { id: 'settings', label: '⚙' },
  ];
  return (
    <div className="slab p-3 flex flex-col gap-3 min-h-[520px]">
      <div className="flex gap-1 border-b border-ash-700 pb-2">
        {tabs.map((t) => (
          <button key={t.id} className={`text-[11px] uppercase tracking-widest px-2 py-1 rounded-sm ${tab === t.id ? 'text-ember-400 bg-ash-800' : 'text-bone-400 hover:text-bone-200'}`} onClick={() => setTab(t.id)}>
            {t.label}{t.badge && <span className="ml-1 text-ember-400">●</span>}
          </button>
        ))}
      </div>
      <div className="overflow-y-auto max-h-[70vh] pr-1">
        {tab === 'bonfire' && <BonfirePanel />}
        {tab === 'weapons' && <WeaponsPanel />}
        {tab === 'map' && <MapPanel />}
        {tab === 'souls' && <SoulsPanel />}
        {tab === 'settings' && <SettingsPanel />}
      </div>
    </div>
  );
}
