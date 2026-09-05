import { useEffect } from 'react';
import { useGame } from '../store';

export function useHotkeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const d = useGame.getState().dispatch;
      if (e.code === 'Space') { e.preventDefault(); d({ type: 'dodge' }); }
      else if (e.key === 'e' || e.key === 'E') d({ type: 'draughts' });
      else if (e.key === 'f' || e.key === 'F') d({ type: 'click' });
      else if (e.key >= '1' && e.key <= '6') d({ type: 'cast', slot: Number(e.key) - 1 });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
