import { memo } from 'react';

/** The five pillars. Always present on a phone; a rail on a wide screen. 48px targets with room between them. */
export type Pillar = 'combat' | 'cortege' | 'arsenal' | 'creeds' | 'lantern';

export const PILLARS: { id: Pillar; label: string; glyph: string }[] = [
  { id: 'combat', label: 'Combat', glyph: 'M12 3l2 6h6l-5 4 2 7-5-4-5 4 2-7-5-4h6z' },
  { id: 'cortege', label: 'Cortege', glyph: 'M4 20v-7a4 4 0 0 1 4-4h0a4 4 0 0 1 4 4v7M12 20v-9a3 3 0 0 1 3-3h0a3 3 0 0 1 3 3v9M6 7a2 2 0 1 0 4 0 2 2 0 0 0-4 0M13 5.5a1.7 1.7 0 1 0 3.4 0 1.7 1.7 0 0 0-3.4 0' },
  { id: 'arsenal', label: 'Arsenal', glyph: 'M4 20l4-4M6 18l10-10 3-1-1 3-10 10zM14 6l4 4' },
  { id: 'creeds', label: 'Creeds', glyph: 'M12 3v18M6 8h12M8 8l-3 6h6zM16 8l-3 6h6z' },
  { id: 'lantern', label: 'Lantern', glyph: 'M9 3h6M8 6h8l1 3v8a3 3 0 0 1-3 3h-4a3 3 0 0 1-3-3V9zM12 10c-1.5 2-1.5 4 0 5 1.5-1 1.5-3 0-5z' },
];

export const BottomNav = memo(function BottomNav({ active, onSelect, badges = {}, vertical = false, hideCombat = false }: { active: Pillar; onSelect: (p: Pillar) => void; badges?: Partial<Record<Pillar, boolean>>; vertical?: boolean; hideCombat?: boolean }) {
  const items = hideCombat ? PILLARS.filter((p) => p.id !== 'combat') : PILLARS;
  return (
    <nav className={`bottom-nav ${vertical ? 'bottom-nav-vertical' : ''} ${hideCombat ? 'bottom-nav-four' : ''}`} aria-label="Sections">
      {items.map((p) => (
        <button key={p.id} className={`nav-btn ${active === p.id ? 'is-active' : ''}`} aria-current={active === p.id ? 'page' : undefined} onClick={() => onSelect(p.id)}>
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden><path d={p.glyph} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span className="nav-label">{p.label}</span>
          {badges[p.id] && <span className="nav-badge" aria-hidden />}
        </button>
      ))}
    </nav>
  );
});
