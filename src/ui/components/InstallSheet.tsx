import { useEffect, useState } from 'react';
import { Sheet } from '../shell/Sheet';
import { onInstallOffer, type InstallOffer } from '../pwa';
import { Plate } from '@/render/Plate';

/** Offered once, after the first lord: keep the Lantern on your home screen. */
export function InstallSheet() {
  const [offer, setOffer] = useState<InstallOffer | null>(null);
  useEffect(() => onInstallOffer(setOffer), []);
  if (!offer) return null;
  return (
    <Sheet open onClose={offer.dismiss} material="stone" title="Keep the Lantern">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="w-[88px] h-[70px] shrink-0"><Plate kind="ui" id="lantern" className="w-full h-full object-contain" /></div>
          <p className="text-[16px] leading-snug" style={{ color: 'var(--bone)' }}>A lord has fallen. The road is yours now, and it will wait for you. Put Mournwake on your home screen and it opens like any other app, with or without a signal.</p>
        </div>
        {offer.kind === 'ios' ? (
          <ol className="list-decimal pl-5 text-[15px] leading-relaxed" style={{ color: 'var(--parchment)' }}>
            <li>Tap the Share button in Safari.</li>
            <li>Choose <span className="t-num">Add to Home Screen</span>.</li>
            <li>Tap <span className="t-num">Add</span>.</li>
          </ol>
        ) : null}
        <div className="flex gap-2">
          <button className="btn btn-ember flex-1 min-h-[56px]" onClick={() => void offer.accept()}>{offer.kind === 'ios' ? 'Understood' : 'Install'}</button>
          <button className="btn flex-1 min-h-[56px]" onClick={offer.dismiss}>Not now</button>
        </div>
      </div>
    </Sheet>
  );
}
