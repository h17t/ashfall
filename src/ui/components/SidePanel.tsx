import { useState } from 'react';
import { useSel } from '../store';
import { canRecruit, canSnuff, vestigePreview, canSever } from '@/engine';
import { SHADES, BALANCE } from '@/content';
import { Slab } from '@/render/materials/Slab';
import { LanternPanel } from './LanternPanel';
import { WeaponsPanel } from './WeaponsPanel';
import { MapPanel } from './MapPanel';
import { KeepsakePanel } from './KeepsakePanel';
import { SettingsPanel } from './SettingsPanel';
import { CortegePanel } from './CortegePanel';
import { MagicPanel } from './MagicPanel';
import { CreedPanel } from './CreedPanel';
import { SnuffPanel } from './SnuffPanel';
import { SeveringPanel } from './SeveringPanel';
import { BestiaryPanel } from './BestiaryPanel';

type Tab = 'lantern' | 'weapons' | 'magic' | 'map' | 'cortege' | 'creed' | 'marrow' | 'snuff' | 'severing' | 'bestiary' | 'settings';

export function SidePanel() {
  const [tab, setTab] = useState<Tab>('lantern');
  const soulsHeld = useSel((s) => Object.values(s.keepsakes).some((n) => n > 0));
  const kindleReady = useSel((s) => canSnuff(s) === null && vestigePreview(s).gte(s.prestige.vestigeTotal.mul(0.5).add(1)));
  const severingVisible = useSel((s) => s.prestige.wakings >= BALANCE.prestige.severingAt || s.prestige.severings > 0);
  const severingReady = useSel((s) => canSever(s) === null);
  const recruitable = useSel((s) => Object.keys(SHADES).some((id) => canRecruit(s, id) === null));
  const tabs: { id: Tab; label: string; badge?: boolean }[] = [
    { id: 'lantern', label: 'Lantern' },
    { id: 'weapons', label: 'Weapons' },
    { id: 'magic', label: 'Magic' },
    { id: 'map', label: 'Road' },
    { id: 'cortege', label: 'Cortege', badge: recruitable },
    { id: 'creed', label: 'Oaths' },
    { id: 'marrow', label: 'Marrow', badge: soulsHeld },
    { id: 'snuff', label: 'Snuff', badge: kindleReady },
    ...(severingVisible ? [{ id: 'severing' as Tab, label: 'Severing', badge: severingReady }] : []),
    { id: 'bestiary', label: 'Lore' },
    { id: 'settings', label: 'Settings' },
  ];
  return (
    <Slab material="leather" seed="side" rough={5} ornament="none" className="px-5 pt-3 pb-5 flex flex-col gap-3 min-h-[520px]">
      <div className="flex flex-wrap gap-x-1 -mx-1" role="tablist" style={{ borderBottom: '1px solid color-mix(in srgb, var(--ash) 55%, transparent)' }}>
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className="tab" onClick={() => setTab(t.id)}>
            {t.label}{t.badge && <span className="ml-1" style={{ color: 'var(--ember-hot)' }}>•</span>}
          </button>
        ))}
      </div>
      <div className="overflow-y-auto max-h-[70vh] pr-1">
        {tab === 'lantern' && <LanternPanel />}
        {tab === 'weapons' && <WeaponsPanel />}
        {tab === 'map' && <MapPanel />}
        {tab === 'magic' && <MagicPanel />}
        {tab === 'cortege' && <CortegePanel />}
        {tab === 'creed' && <CreedPanel />}
        {tab === 'marrow' && <KeepsakePanel />}
        {tab === 'snuff' && <SnuffPanel />}
        {tab === 'severing' && <SeveringPanel />}
        {tab === 'bestiary' && <BestiaryPanel />}
        {tab === 'settings' && <SettingsPanel />}
      </div>
    </Slab>
  );
}
