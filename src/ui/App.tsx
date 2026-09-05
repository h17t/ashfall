import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { startLoop } from './loop';
import { loadFromStorage, startAutosave, saveToStorage } from './persist';
import { useSettings } from './settings';
import { AwayReport } from './components/AwayReport';
import { startHaptics } from './haptics';
import { startPwa } from './pwa';
import { InstallSheet } from './components/InstallSheet';
import { DescentStrip } from './components/DescentStrip';
import { RaidStrip } from './components/RaidStrip';
import { BoonSheet } from './components/BoonSheet';
import { HaulSheet } from './components/HaulSheet';
import { tollPhase } from '@/engine';
import { useSwipe } from './shell/useSwipe';
import { applyOffline, canRecruit, canSnuff, vestigePreview, canSever } from '@/engine';
import { SHADES, BALANCE } from '@/content';
import { useGame, useSel } from './store';
import { Encounter } from './components/Encounter';
import { MoteField } from './components/MoteField';
import { Log } from './components/Log';
import { AutomationBar } from './components/AutomationBar';
import { Fx } from './components/Fx';
import { Hints } from './components/Hints';
import { Lantern } from './components/Lantern';
import { startAudio } from './audio';
import { useHotkeys } from './hooks/useHotkeys';
import { Grain } from '@/render/Grain';
import { FireLight } from '@/render/FireLight';
// the cinematics carry gsap; they are not needed before the first lord or the first death, so the
// chunk loads after the shell. Loaded by hand rather than React.lazy: a Suspense boundary that
// suspends during a tap left a sibling's hook list half-built in production (React 19.2).
function CinemaLoader() {
  const [C, setC] = useState<ComponentType | null>(null);
  useEffect(() => { let on = true; import('@/render/cinematics/Cinema').then((m) => { if (on) setC(() => m.Cinema); }); return () => { on = false; }; }, []);
  return C ? <C /> : null;
}
import { BottomNav, type Pillar } from './shell/BottomNav';
import { ActionBar } from './shell/ActionBar';
import { StatusStrip } from './shell/StatusStrip';
import { Section } from './shell/Section';
import { useLayout } from './shell/useViewport';
import { loadable } from './shell/loadable';
// the section panels load after the combat shell; each is one chunk, cached for the page's life
const LanternPanel = loadable(() => import('./components/LanternPanel').then((m) => m.LanternPanel));
const WeaponsPanel = loadable(() => import('./components/WeaponsPanel').then((m) => m.WeaponsPanel));
const MapPanel = loadable(() => import('./components/MapPanel').then((m) => m.MapPanel));
const KeepsakePanel = loadable(() => import('./components/KeepsakePanel').then((m) => m.KeepsakePanel));
const SettingsPanel = loadable(() => import('./components/SettingsPanel').then((m) => m.SettingsPanel));
const CortegePanel = loadable(() => import('./components/CortegePanel').then((m) => m.CortegePanel));
const MagicPanel = loadable(() => import('./components/MagicPanel').then((m) => m.MagicPanel));
const CreedPanel = loadable(() => import('./components/CreedPanel').then((m) => m.CreedPanel));
const SnuffPanel = loadable(() => import('./components/SnuffPanel').then((m) => m.SnuffPanel));
const SeveringPanel = loadable(() => import('./components/SeveringPanel').then((m) => m.SeveringPanel));
const BestiaryPanel = loadable(() => import('./components/BestiaryPanel').then((m) => m.BestiaryPanel));
const StairPanel = loadable(() => import('./components/StairPanel').then((m) => m.StairPanel));
const TollPanel = loadable(() => import('./components/TollPanel').then((m) => m.TollPanel));
const OrdersPanel = loadable(() => import('./components/OrdersPanel').then((m) => m.OrdersPanel));


const PILLAR_KEY = 'mournwake.pillar';

export default function App() {
  const [loadError, setLoadError] = useState<string | null>(null);
  const reduceFx = useSettings((s) => s.reduceFx);
  const plainType = useSettings((s) => s.plainType);
  const colorblind = useSettings((s) => s.colorblind);
  useEffect(() => { const cls = document.documentElement.classList; cls.toggle('plain-type', plainType); cls.toggle('cb-safe', colorblind); }, [plainType, colorblind]);
  const layout = useLayout();
  const [pillar, setPillarState] = useState<Pillar>(() => { try { return (localStorage.getItem(PILLAR_KEY) as Pillar) || 'combat'; } catch { return 'combat'; } });
  const setPillar = (p: Pillar) => { setPillarState(p); try { localStorage.setItem(PILLAR_KEY, p); } catch { /* ignore */ } };
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
    const stopHaptics = startHaptics();
    const stopPwa = startPwa();
    return () => { stopLoop(); stopSave(); stopAudio(); stopHaptics(); stopPwa(); };
  }, []);
  useHotkeys();
  const mainRef = useRef<HTMLDivElement>(null);
  useSwipe(mainRef, (dir) => { const order: Pillar[] = ['combat', 'cortege', 'arsenal', 'creeds', 'lantern']; const i = order.indexOf(pillar); const n = dir === 'left' ? Math.min(order.length - 1, i + 1) : Math.max(0, i - 1); if (n !== i) setPillar(order[n]); });

  // badges: something waits in a pillar
  const recruitable = useSel((s) => Object.keys(SHADES).some((id) => canRecruit(s, id) === null));
  const keepsakeHeld = useSel((s) => Object.values(s.keepsakes).some((n) => n > 0));
  const snuffReady = useSel((s) => canSnuff(s) === null && vestigePreview(s).gte(s.prestige.vestigeTotal.mul(0.5).add(1)));
  const severingVisible = useSel((s) => s.prestige.wakings >= BALANCE.prestige.severingAt || s.prestige.severings > 0);
  const severingReady = useSel((s) => canSever(s) === null);
  const stairVisible = useSel((s) => !!s.flags.descentUnlocked);
  const ordersVisible = useSel((s) => !!s.flags.ordersUnlocked);
  const tollId = useSel((s) => tollPhase(s).id);
  const blackNow = tollId === 'black';
  useEffect(() => { const cls = document.documentElement.classList; for (const p of ['dawn', 'day', 'dusk', 'black']) cls.toggle('toll-' + p, p === tollId); }, [tollId]);
  const ordersNew = useSel((s) => !!s.flags.ordersUnlocked && s.orders.rules.length === 0);
  const stairNew = useSel((s) => !!s.flags.descentUnlocked && s.descent.runs === 0 && !s.descent.run);
  const badges = { combat: ordersNew, cortege: recruitable, arsenal: keepsakeHeld, lantern: snuffReady || (severingVisible && severingReady) || stairNew };
  const extras = <Section id="combat-extra" tabs={[...(ordersVisible ? [{ id: 'orders', label: 'Orders', badge: ordersNew, node: <OrdersPanel /> }] : []), { id: 'log', label: 'Log', node: <Log /> }]} />;

  const combat = (
    <>
      <Encounter />
      <DescentStrip />
      <RaidStrip />
      {layout === 'portrait' ? <ActionBar /> : <div className="flex flex-col gap-3"><ActionBar /><AutomationBar />{extras}</div>}
    </>
  );
  const sections: Record<Pillar, ReactNode> = {
    combat: layout === 'portrait' ? extras : combat,
    cortege: <Section id="cortege"><CortegePanel /></Section>,
    arsenal: <Section id="arsenal" tabs={[{ id: 'weapons', label: 'Weapons', node: <WeaponsPanel /> }, { id: 'magic', label: 'Magic', node: <MagicPanel /> }, { id: 'keepsakes', label: 'Keepsakes', badge: keepsakeHeld, node: <KeepsakePanel /> }]} />,
    creeds: <Section id="creeds"><CreedPanel /></Section>,
    lantern: <Section id="lantern" tabs={[
      { id: 'rest', label: 'Rest', node: <LanternPanel /> },
      { id: 'road', label: 'Road', node: <MapPanel /> },
      ...(stairVisible ? [{ id: 'stair', label: 'Stair', badge: stairNew, node: <StairPanel /> }] : []),
      { id: 'toll', label: 'Toll', badge: blackNow, node: <TollPanel /> },
      { id: 'snuff', label: 'Snuff', badge: snuffReady, node: <SnuffPanel /> },
      ...(severingVisible ? [{ id: 'severing', label: 'Severing', badge: severingReady, node: <SeveringPanel /> }] : []),
      { id: 'lore', label: 'Lore', node: <BestiaryPanel /> },
      { id: 'settings', label: 'Settings', node: <SettingsPanel /> },
    ]} />,
  };

  const errorBar = loadError && (
    <div className="relative z-20 px-3 pt-2">
      <div className="text-[14px] px-3 py-2 flex justify-between gap-3" style={{ border: '1px solid var(--blood)', background: 'color-mix(in srgb, var(--blood) 18%, transparent)', color: 'var(--parchment)' }}>
        <span>{loadError} {loadError.includes('backup') ? 'A fresh game was started; the damaged saves are kept in storage under mournwake.corrupt.' : 'The backup save was loaded instead.'}</span>
        <button className="min-w-[48px] min-h-[48px] -my-2" style={{ color: 'var(--bone)' }} onClick={() => setLoadError(null)} aria-label="Dismiss">×</button>
      </div>
    </div>
  );

  return (
    <div className={`shell shell-${layout} relative ${reduceFx ? 'reduce-fx' : ''}`}>
      <FireLight />
      <Grain />
      <CinemaLoader />
      <AwayReport />
      <InstallSheet />
      <BoonSheet />
      <HaulSheet />
      <Fx />
      <Lantern />
      {layout !== 'portrait' && <Hints />}
      <MoteField />
      {errorBar}
      {layout === 'portrait' ? (
        <>
          <StatusStrip />
          <Hints />
          <div className={`shell-main ${pillar === 'combat' ? 'is-combat' : ''}`} ref={mainRef}>
            {pillar === 'combat' ? (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="px-2 flex flex-col"><Encounter /><DescentStrip /><RaidStrip /></div>
                <ActionBar />
                <div className="px-2 pt-2"><AutomationBar /></div>
                {extras}
              </div>
            ) : sections[pillar]}
          </div>
          <BottomNav active={pillar} onSelect={setPillar} badges={badges} />
        </>
      ) : (
        <div className="shell-main">
          {layout === 'wide' && (
            <div className="flex flex-col gap-2">
              <h1 className="t-display text-[22px] leading-none px-2 pt-2" style={{ letterSpacing: '0.3em' }}>Mournwake</h1>
              <BottomNav active={pillar === 'combat' ? 'lantern' : pillar} onSelect={setPillar} badges={badges} vertical hideCombat />
            </div>
          )}
          <div className="wide-combat">
            <StatusStrip />
            {combat}
          </div>
          <div className="wide-section">
            {layout === 'landscape' && <BottomNav active={pillar === 'combat' ? 'lantern' : pillar} onSelect={setPillar} badges={badges} hideCombat />}
            {sections[pillar === 'combat' ? 'lantern' : pillar]}
          </div>
        </div>
      )}
    </div>
  );
}
