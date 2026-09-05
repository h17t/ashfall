import { useEffect, useState, type ComponentType } from 'react';

/**
 * A component whose module loads on first render and is cached for the page's life. Loaded by
 * hand rather than React.lazy: a Suspense boundary suspending during a tap left a sibling's hook
 * list inconsistent in production (ART.md round 13). The section panels use it so the combat
 * shell arrives first on a slow link.
 */
export function loadable<P extends object>(load: () => Promise<ComponentType<P>>): ComponentType<P> {
  let cached: ComponentType<P> | null = null;
  let pending: Promise<ComponentType<P>> | null = null;
  const get = () => (pending ??= load().then((c) => (cached = c)));
  return function Loadable(props: P) {
    const [C, setC] = useState<ComponentType<P> | null>(cached);
    useEffect(() => { if (cached) return; let on = true; void get().then((c) => { if (on) setC(() => c); }); return () => { on = false; }; }, []);
    return C ? <C {...props} /> : null;
  };
}
