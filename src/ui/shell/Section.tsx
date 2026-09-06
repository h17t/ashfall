import { useEffect, useState, type ReactNode } from 'react';

/**
 * A section of the game: a title, an optional row of sub-tabs, and a scrolling body.
 * Sub-tab choice and scroll position are remembered per section, so leaving and returning
 * never loses the player's place.
 */
export interface SubTab { id: string; label: string; badge?: boolean; node: ReactNode }

const tabMemory = new Map<string, string>();
const scrollMemory = new Map<string, number>();
const tabListeners = new Map<string, Set<(tab: string) => void>>();
/** Open a section's sub-tab from anywhere: the goal line, a strip, a hint. Works whether or not the section is mounted. */
export function openSection(id: string, tab: string) {
  tabMemory.set(id, tab);
  tabListeners.get(id)?.forEach((l) => l(tab));
}

export function Section({ id, title, tabs, children }: { id: string; title?: string; tabs?: SubTab[]; children?: ReactNode }) {
  const [tab, setTab] = useState(() => tabMemory.get(id) ?? tabs?.[0]?.id ?? '');
  useEffect(() => { tabMemory.set(id, tab); }, [id, tab]);
  useEffect(() => { const set = tabListeners.get(id) ?? new Set(); tabListeners.set(id, set); set.add(setTab); return () => { set.delete(setTab); }; }, [id]);
  const active = tabs?.find((t) => t.id === tab) ?? tabs?.[0];
  const key = `${id}:${active?.id ?? ''}`;
  return (
    <div className="section flex flex-col min-h-0 flex-1">
      {(title || tabs) && (
        <div className="section-head">
          {title && <h2 className="t-display text-[22px] leading-none mb-2">{title}</h2>}
          {tabs && tabs.length > 1 && (
            <div className="subtabs" role="tablist" aria-label={`${title ?? id} sections`}>
              {tabs.map((t) => (
                <button key={t.id} role="tab" aria-selected={active?.id === t.id} className={`subtab ${active?.id === t.id ? 'is-active' : ''}`} onClick={() => setTab(t.id)}>
                  {t.label}{t.badge && <span className="nav-badge" style={{ position: 'static', display: 'inline-block', marginLeft: 6 }} aria-hidden />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <div
        key={key}
        className="section-scroll"
        ref={(el) => { if (el) { const y = scrollMemory.get(key); if (y) el.scrollTop = y; } }}
        onScroll={(e) => scrollMemory.set(key, (e.target as HTMLDivElement).scrollTop)}
      >
        {active ? active.node : children}
      </div>
    </div>
  );
}
