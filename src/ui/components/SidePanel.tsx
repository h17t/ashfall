import { useState } from 'react';
import { useSel } from '../store';
import { canRecruit, canKindle, humanityPreview } from '@/engine';
import { PHANTOMS } from '@/content';
import { BonfirePanel } from './BonfirePanel';
import { WeaponsPanel } from './WeaponsPanel';
import { MapPanel } from './MapPanel';
import { SoulsPanel } from './SoulsPanel';
import { SettingsPanel } from './SettingsPanel';
import { SquadPanel } from './SquadPanel';
import { MagicPanel } from './MagicPanel';
import { CovenantPanel } from './CovenantPanel';
import { KindlePanel } from './KindlePanel';

type Tab = 'bonfire' | 'weapons' | 'magic' | 'map' | 'squad' | 'covenant' | 'souls' | 'kindle' | 'settings';

export function SidePanel() {
  const [tab, setTab] = useState<Tab>('bonfire');
  const soulsHeld = useSel((s) => Object.values(s.bossSouls).some((n) => n > 0));
  const kindleReady = useSel((s) => canKindle(s) === null && humanityPreview(s).gte(s.prestige.humanityTotal.mul(0.5).add(1)));
  const recruitable = useSel((s) => Object.keys(PHANTOMS).some((id) => canRecruit(s, id) === null));
  const tabs: { id: Tab; label: string; badge?: boolean }[] = [
    { id: 'bonfire', label: 'Bonfire' },
    { id: 'weapons', label: 'Weapons' },
    { id: 'magic', label: 'Magic' },
    { id: 'map', label: 'Road' },
    { id: 'squad', label: 'Squad', badge: recruitable },
    { id: 'covenant', label: 'Oaths' },
    { id: 'souls', label: 'Souls', badge: soulsHeld },
    { id: 'kindle', label: 'Kindle', badge: kindleReady },
    { id: 'settings', label: '⚙' },
  ];
  return (
    <div className="slab p-3 flex flex-col gap-3 min-h-[520px]">
      <div className="flex flex-wrap gap-1 border-b border-ash-700 pb-2">
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
        {tab === 'magic' && <MagicPanel />}
        {tab === 'squad' && <SquadPanel />}
        {tab === 'covenant' && <CovenantPanel />}
        {tab === 'souls' && <SoulsPanel />}
        {tab === 'kindle' && <KindlePanel />}
        {tab === 'settings' && <SettingsPanel />}
      </div>
    </div>
  );
}
