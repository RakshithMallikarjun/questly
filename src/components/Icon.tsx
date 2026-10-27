import type { CSSProperties } from 'react';

const PATHS: Record<string, string[]> = {
  today: ['M9 11l3 3 8-8', 'M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9'],
  quit: ['M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18', 'M5.6 5.6l12.8 12.8'],
  progress: ['M4 20V10', 'M10 20V4', 'M16 20v-7', 'M22 20H2'],
  rewards: ['M20 12v9H4v-9', 'M2 7h20v5H2z', 'M12 21V7', 'M12 7c-2-4-6-4-6-1.5S9 7 12 7c3 0 6-.5 6-2.5S14 3 12 7z'],
  profile: ['M12 4a4 4 0 1 0 0 8a4 4 0 1 0 0-8', 'M4 21c0-4 4-6 8-6s8 2 8 6'],
  check: ['M5 12l5 5L20 7'],
  back: ['M15 18l-6-6 6-6'],
  plus: ['M12 5v14', 'M5 12h14'],
  close: ['M6 6l12 12', 'M18 6L6 18'],
  swap: ['M7 7h11l-3-3', 'M17 17H6l3 3'],
  bulb: ['M9 18h6', 'M10 22h4', 'M12 2a7 7 0 0 0-4 12.7V16h8v-1.3A7 7 0 0 0 12 2z'],
  trash: ['M4 7h16', 'M10 11v6', 'M14 11v6', 'M6 7l1 13h10l1-13', 'M9 7V4h6v3'],
  download: ['M12 4v12', 'M7 11l5 5 5-5', 'M5 20h14'],
  upload: ['M12 20V8', 'M7 13l5-5 5 5', 'M5 4h14'],
  heart: ['M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z'],
  clock: ['M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18', 'M12 7v5l3 2'],
  moon: ['M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z'],
  google: [],
};

export function Icon({ name, size = 24, color = 'currentColor', stroke = 2.2, style }: { name: string; size?: number; color?: string; stroke?: number; style?: CSSProperties }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={style}>
      {(PATHS[name] ?? []).map((d) => <path key={d} d={d} />)}
    </svg>
  );
}

export const Flame = ({ size = 24 }: { size?: number }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="#FF7A2F"><path d="M12 2c1 3.5 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-6 1-9.5z" /></svg>
);

export const Coin = ({ size = 24 }: { size?: number }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#FFC23D" /><circle cx="12" cy="12" r="5.5" fill="none" stroke="#C98A0B" strokeWidth="2" /></svg>
);

export const Shield = ({ size = 24 }: { size?: number }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="#4FC3FF"><path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" /></svg>
);

export const Star = ({ size = 28, color = '#17112B' }: { size?: number; color?: string }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17l-6.1 3.4 1.5-6.8L2.2 9l6.9-.7z" /></svg>
);
