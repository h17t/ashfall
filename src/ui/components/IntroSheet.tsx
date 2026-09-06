import { useEffect, useState } from 'react';
import { useGame, useSel } from '../store';
import { Sheet } from '../shell/Sheet';
import { Plate } from '@/render/Plate';

/**
 * The opening: five lines, once, before the first strike. What you are, what marrow is, what the
 * two buttons do, where the Lantern is, and that the fight waits while you read.
 */
export function IntroSheet() {
  const dispatch = useGame((g) => g.dispatch);
  const show = useSel((s) => !s.flags['seen:intro'] && s.stats.kills.lt(1) && s.prestige.wakings === 0);
  // the arena paints first; the page comes up a moment later so a slow phone is not made slower by it
  const [ready, setReady] = useState(false);
  useEffect(() => { const id = window.setTimeout(() => setReady(true), 900); return () => window.clearTimeout(id); }, []);
  if (!show || !ready) return null;
  const begin = () => dispatch({ type: 'markSeen', what: 'intro' });
  return (
    <Sheet open onClose={begin} material="parchment" title="Mournwake">
      <div className="flex flex-col gap-3 intro">
        <div className="flex items-start gap-4">
          <div className="w-[72px] h-[90px] shrink-0"><Plate kind="ui" id="revenant" className="w-full h-full object-contain" /></div>
          <p>You are a revenant on the Tollroad, and the dead walk it toward you.</p>
        </div>
        <ol className="intro-steps">
          <li><b>Strike</b> what comes. What it drops is <b>marrow</b>, the only coin there is.</li>
          <li>The red bar over a foe is a wind-up. <b>Dodge</b> as it nears full and the blow misses you.</li>
          <li>Marrow buys <b>levels at the Lantern</b>, in the bar below. Levels are how you get stronger.</li>
          <li>Fell six foes and the road opens deeper. At its end waits a lord; after the lord, the flame can be snuffed for permanent might.</li>
        </ol>
        <p className="intro-note">The fight waits while you are in a menu. Take your time. Leave, and your shades keep hunting for you.</p>
        <button className="btn btn-ember min-h-[56px]" onClick={begin}>Begin</button>
      </div>
    </Sheet>
  );
}
