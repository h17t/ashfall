import { memo } from 'react';

/** Procedural SVG silhouettes keyed by enemy shape. No external art. */
export const EnemySprite = memo(function EnemySprite({ shape, phase, broken, hurt }: { shape: string; phase: number; broken: boolean; hurt: boolean }) {
  const fill = broken ? '#F0902E' : hurt ? '#A81C1C' : '#4A423C';
  const glow = broken ? 'drop-shadow(0 0 18px color-mix(in srgb, #F0902E 80%, transparent))' : 'drop-shadow(0 0 12px color-mix(in srgb, #0A0908 90%, transparent))';
  const common = { fill, stroke: '#0A0908', strokeWidth: 1.5 } as const;
  return (
    <svg viewBox="0 0 120 140" className="w-full h-full" style={{ filter: glow, transition: 'filter 0.2s' }}>
      {shape === 'beast' && (
        <g {...common}><ellipse cx="60" cy="95" rx="38" ry="20" /><circle cx="95" cy="80" r="14" /><rect x="30" y="105" width="8" height="25" /><rect x="75" y="105" width="8" height="25" /><path d="M22 90 Q5 70 15 60" strokeWidth="5" stroke={fill} fill="none" /><circle cx="100" cy="77" r="2" fill="#F0902E" /></g>
      )}
      {shape === 'shield' && (
        <g {...common}><circle cx="60" cy="30" r="12" /><rect x="45" y="45" width="30" height="55" rx="6" /><rect x="15" y="50" width="26" height="50" rx="8" fill="#4A423C" /><rect x="48" y="100" width="10" height="35" /><rect x="64" y="100" width="10" height="35" /></g>
      )}
      {shape === 'archer' && (
        <g {...common}><circle cx="60" cy="28" r="11" /><rect x="48" y="42" width="24" height="50" rx="5" /><path d="M80 45 Q105 70 80 95" stroke="#4A423C" strokeWidth="4" fill="none" /><line x1="80" y1="45" x2="80" y2="95" stroke="#C8BBA6" strokeWidth="1" /><rect x="50" y="92" width="9" height="40" /><rect x="63" y="92" width="9" height="40" /></g>
      )}
      {shape === 'robed' && (
        <g {...common}><path d="M60 15 L40 40 L35 135 L85 135 L80 40 Z" /><circle cx="60" cy="22" r="10" fill="#0A0908" /><circle cx="56" cy="22" r="2" fill="#F0902E" /><circle cx="64" cy="22" r="2" fill="#F0902E" /></g>
      )}
      {shape === 'knight' && (
        <g {...common}><rect x="48" y="12" width="24" height="26" rx="4" /><rect x="40" y="40" width="40" height="55" rx="6" /><rect x="20" y="42" width="14" height="45" rx="5" /><rect x="86" y="42" width="14" height="45" rx="5" /><rect x="94" y="0" width="6" height="90" fill="#5C7A99" /><rect x="45" y="95" width="13" height="42" /><rect x="63" y="95" width="13" height="42" /></g>
      )}
      {shape === 'wraith' && (
        <g {...common} fill={broken ? '#F0902E' : hurt ? '#A81C1C' : '#4A423C'}><path d="M60 10 Q90 40 80 80 Q95 110 60 135 Q25 110 40 80 Q30 40 60 10 Z" opacity="0.85" /><circle cx="52" cy="40" r="3" fill="#E8DCC4" /><circle cx="68" cy="40" r="3" fill="#E8DCC4" /></g>
      )}
      {shape === 'warden' && (
        <g {...common}><rect x="44" y="8" width="32" height="30" rx="5" /><rect x="34" y="40" width="52" height="62" rx="8" /><rect x="10" y="44" width="20" height="55" rx="6" /><rect x="90" y="44" width="20" height="55" rx="6" /><path d="M100 20 L118 20 L118 110 L108 110 Z" fill={phase >= 1 ? '#F0902E' : '#5C7A99'} /><rect x="40" y="102" width="16" height="38" /><rect x="64" y="102" width="16" height="38" /><circle cx="54" cy="24" r="3" fill="#F0902E" /><circle cx="66" cy="24" r="3" fill="#F0902E" /></g>
      )}
      {shape === 'hanged' && (
        <g {...common}><line x1="60" y1="0" x2="60" y2="20" stroke="#5C7A99" strokeWidth="3" /><circle cx="60" cy="30" r="11" /><path d="M48 44 L40 100 L80 100 L72 44 Z" /><rect x="44" y="100" width="10" height="38" /><rect x="66" y="100" width="10" height="38" /><rect x="22" y="48" width="18" height="10" rx="4" /><rect x="80" y="48" width="18" height="10" rx="4" /></g>
      )}
      {(shape === 'humanoid' || !['beast','shield','archer','robed','knight','wraith','warden','hanged'].includes(shape)) && (
        <g {...common}><circle cx="60" cy="25" r="12" /><rect x="46" y="40" width="28" height="55" rx="6" /><rect x="30" y="44" width="12" height="42" rx="5" /><rect x="78" y="44" width="12" height="42" rx="5" /><rect x="48" y="95" width="10" height="42" /><rect x="62" y="95" width="10" height="42" /></g>
      )}
    </svg>
  );
});
