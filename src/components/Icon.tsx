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
  lock: ['M6 11h12v10H6z', 'M8 11V7a4 4 0 0 1 8 0v4'],
  google: [],
};

export function Icon({ name, size = 24, color = 'currentColor', stroke = 2.2, style }: { name: string; size?: number; color?: string; stroke?: number; style?: CSSProperties }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={style}>
      {(PATHS[name] ?? AREA_PATHS[name] ?? []).map((d) => <path key={d} d={d} />)}
    </svg>
  );
}

export const Flame = ({ size = 24 }: { size?: number }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="var(--orange)"><path d="M12 2c1 3.5 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-6 1-9.5z" /></svg>
);

export const Coin = ({ size = 24 }: { size?: number }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#FFC23D" /><circle cx="12" cy="12" r="5.5" fill="none" stroke="#C98A0B" strokeWidth="2" /></svg>
);

export const Shield = ({ size = 24 }: { size?: number }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="var(--blue)"><path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" /></svg>
);

export const Star = ({ size = 28, color = 'var(--on-accent)' }: { size?: number; color?: string }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17l-6.1 3.4 1.5-6.8L2.2 9l6.9-.7z" /></svg>
);

/** Simple line icons for each life area and quest type. */
const AREA_PATHS: Record<string, string[]> = {
  fitness: ['M6 8v8', 'M3 10v4', 'M18 8v8', 'M21 10v4', 'M6 12h12'],
  sleep: ['M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z'],
  nutrition: ['M12 7c-1-3 1-4 3-4', 'M12 7c-4-2-8 0-8 5 0 5 3 9 5 9 1.2 0 1.8-.6 3-.6s1.8.6 3 .6c2 0 5-4 5-9 0-5-4-7-8-5z'],
  mind: ['M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18', 'M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8', 'M12 11.5v1'],
  learning: ['M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z', 'M4 21V5', 'M8 7h7'],
  career: ['M4 8h16v11H4z', 'M9 8V5h6v3', 'M4 13h16'],
  relationships: ['M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z'],
  home: ['M4 11l8-7 8 7', 'M6 10v10h12V10', 'M10 20v-5h4v5'],
  mindfulness: ['M12 20c-4 0-8-3-8-7 3 0 6 2 8 5 2-3 5-5 8-5 0 4-4 7-8 7z', 'M12 18c-2-3-2-7 0-11 2 4 2 8 0 11z'],
  creativity: ['M12 3a9 9 0 0 0 0 18c1.5 0 2-1 2-2s-1-1.5-1-2.5 1-1.5 2-1.5h2a4 4 0 0 0 4-4c0-4.5-4-8-9-8z', 'M7.5 11h.01', 'M10 7h.01', 'M15 7h.01'],
  journey: ['M4 20V4', 'M4 4h12l-2 4 2 4H4'],
  checkin: ['M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z', 'M8.5 12l2.5 2.5 4.5-5'],
  bonus: ['M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17l-6.1 3.4 1.5-6.8L2.2 9l6.9-.7z'],
  paw: ['M12 13c-3 0-5 3-5 5 0 1.5 1.5 2 2.5 2s1.5-.5 2.5-.5 1.5.5 2.5.5 2.5-.5 2.5-2c0-2-2-5-5-5z', 'M5.5 9a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0', 'M15.5 9a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0', 'M8.5 5.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0', 'M12.5 5.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0'],
  tour: ['M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18', 'M15.5 8.5l-2 5-5 2 2-5z'],
};

export function AreaIcon({ name, size = 24, color = 'currentColor', stroke = 2.2 }: { name: string; size?: number; color?: string; stroke?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      {(AREA_PATHS[name] ?? AREA_PATHS.bonus).map((d) => <path key={d} d={d} />)}
    </svg>
  );
}
