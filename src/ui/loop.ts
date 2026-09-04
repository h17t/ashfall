/**
 * Fixed-timestep logic loop (10Hz) decoupled from rendering. Uses an accumulator and
 * catches up after throttling. If the gap is very large (tab suspended for minutes),
 * the catch-up is capped and the remainder is handled by the offline calculator.
 */
import { BALANCE } from '@/content/balance';
import { useGame } from './store';

const TICK_MS = BALANCE.tick * 1000;
const MAX_CATCHUP_TICKS = 600; // 60 seconds of simulation per frame at most

let last = 0;
let acc = 0;
let timer: number | null = null;
let onLargeGap: ((seconds: number) => void) | null = null;

export function startLoop(largeGapHandler?: (seconds: number) => void) {
  onLargeGap = largeGapHandler ?? null;
  last = performance.now();
  acc = 0;
  const run = () => {
    const now = performance.now();
    let delta = now - last;
    last = now;
    if (delta > MAX_CATCHUP_TICKS * TICK_MS) {
      const gap = delta / 1000;
      delta = MAX_CATCHUP_TICKS * TICK_MS;
      onLargeGap?.(gap);
    }
    acc += delta;
    const store = useGame.getState();
    let n = 0;
    while (acc >= TICK_MS && n < MAX_CATCHUP_TICKS) {
      store.stepBy(BALANCE.tick);
      acc -= TICK_MS;
      n++;
    }
  };
  // setInterval keeps ticking (throttled) in background tabs; rAF would stop entirely.
  timer = window.setInterval(run, TICK_MS / 2);
  return () => {
    if (timer !== null) window.clearInterval(timer);
    timer = null;
  };
}
