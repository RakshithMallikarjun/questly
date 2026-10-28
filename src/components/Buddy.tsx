import { useId } from 'react';
import type { Mood, Slot, Species } from '../game/content/buddy';

// The companion creature, drawn in SVG so it is crisp at any size and works
// offline. Moods change the face and the idle animation; the stage (baby,
// young, grown) changes size and details.

interface Palette { main: string; dark: string; light: string; accent: string; inner: string }

const CLASSIC: Record<Species, Palette> = {
  fox: { main: '#FF8A3D', dark: '#D9601A', light: '#FFF1E0', accent: '#5A2E1A', inner: '#5A2E1A' },
  owl: { main: '#9C7BFF', dark: '#6E52D6', light: '#EDE6FF', accent: '#FFC23D', inner: '#6E52D6' },
  dragon: { main: '#3DDC97', dark: '#1FA86E', light: '#E2FFEE', accent: '#FFE08A', inner: '#1FA86E' },
  cat: { main: '#A7B4D8', dark: '#7383AD', light: '#F2F4FF', accent: '#FF8FB1', inner: '#FF8FB1' },
};

const COLORS: Record<string, { main: string; dark: string }> = {
  mint: { main: '#5EE3C1', dark: '#2FAF8F' },
  sunset: { main: '#FF6F91', dark: '#D9416A' },
  galaxy: { main: '#5B4BD6', dark: '#3A2C9E' },
};

const INK = '#2A1B3D';

export interface BuddyProps {
  species: Species;
  stage?: 1 | 2 | 3;
  mood?: Mood;
  outfit?: Partial<Record<Slot, string>>;
  size?: number;
  /** Turn off the idle animation (small icons, lists). */
  still?: boolean;
  title?: string;
}

export function Buddy({ species, stage = 2, mood = 'happy', outfit = {}, size = 64, still, title }: BuddyProps) {
  const uid = useId().replace(/:/g, '');
  const base = CLASSIC[species];
  const tint = outfit.color ? COLORS[outfit.color] : undefined;
  const p: Palette = tint ? { ...base, ...tint } : base;
  const k = stage === 1 ? 0.84 : stage === 3 ? 1.04 : 0.95;
  const eyesOpen = mood === 'happy' || mood === 'worried';

  return (
    <svg
      className={`buddy mood-${mood} ${still ? 'still' : ''}`}
      width={size}
      height={size}
      viewBox="-6 -14 112 112"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <radialGradient id={`aura${uid}`}>
          <stop offset="0" stopColor="#FFE08A" stopOpacity="0.55" />
          <stop offset="1" stopColor="#FFE08A" stopOpacity="0" />
        </radialGradient>
      </defs>
      {stage === 3 && <circle cx="50" cy="58" r="52" fill={`url(#aura${uid})`} className="b-aura" />}
      <g className="b-body">
        <g transform={`translate(50 96) scale(${k}) translate(-50 -96)`}>
          <Back species={species} p={p} stage={stage} />
          <Ears species={species} p={p} stage={stage} />
          {/* Body */}
          <path d="M50 20 C76 20 86 40 86 62 C86 84 70 94 50 94 C30 94 14 84 14 62 C14 40 24 20 50 20Z" fill={p.main} />
          <path d="M50 20 C76 20 86 40 86 62 C86 70 84 76 80 81 C82 60 70 30 50 26 Z" fill={p.dark} opacity="0.35" />
          {outfit.color === 'galaxy' && (
            <g fill="#fff">
              {[[30, 40, 1.4], [66, 34, 1.1], [74, 58, 1.5], [24, 70, 1.1], [60, 86, 1.2], [42, 30, 0.9]].map(([x, y, r]) => <circle key={`${x}${y}`} cx={x} cy={y} r={r} opacity="0.8" />)}
            </g>
          )}
          <Belly species={species} p={p} />
          <ellipse cx="35" cy="93" rx="9" ry="5" fill={p.dark} />
          <ellipse cx="65" cy="93" rx="9" ry="5" fill={p.dark} />
          <Front species={species} p={p} stage={stage} />
          {/* Face */}
          <ellipse cx="28" cy="64" rx="5.5" ry="3.2" fill="#FF7FA8" opacity="0.55" />
          <ellipse cx="72" cy="64" rx="5.5" ry="3.2" fill="#FF7FA8" opacity="0.55" />
          {species === 'owl' && (
            <g fill={p.light}>
              <circle cx="37" cy="53" r="12" />
              <circle cx="63" cy="53" r="12" />
            </g>
          )}
          <Eyes mood={mood} open={eyesOpen} big={stage === 1} />
          <Mouth species={species} mood={mood} p={p} />
          {mood === 'worried' && <path className="b-sweat" d="M82 34 Q86 41 82 44 Q78 41 82 34Z" fill="#7FD3FF" />}
          {outfit.neck && <Neck id={outfit.neck} />}
          {outfit.face && <Face id={outfit.face} />}
          {outfit.head && <Head id={outfit.head} species={species} />}
        </g>
      </g>
      {mood === 'sleepy' && (
        <g className="b-zzz" fill="#fff" fontFamily="Fredoka, sans-serif" fontWeight="700">
          <text x="80" y="18" fontSize="13">z</text>
          <text x="89" y="6" fontSize="10">z</text>
        </g>
      )}
      {mood === 'cheer' && (
        <g className="b-sparks" fill="#FFC23D">
          <path d="M8 20 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" />
          <path d="M90 14 l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 4 -1.6z" />
        </g>
      )}
    </svg>
  );
}

function Back({ species, p, stage }: { species: Species; p: Palette; stage: number }) {
  if (species === 'fox') {
    const tail = (
      <>
        <path d="M78 84 C100 80 104 52 92 38 C90 56 82 66 70 72 Z" fill={p.main} />
        <path d="M92 38 C97 44 99 52 97 60 C93 54 90 50 86 48 Z" fill={p.light} />
      </>
    );
    return (
      <g>
        {stage === 3 && <g transform="rotate(-32 76 82)" opacity="0.9">{tail}</g>}
        {stage === 3 && <g transform="rotate(-62 76 82)" opacity="0.8">{tail}</g>}
        <g transform={stage === 1 ? 'translate(76 82) scale(0.75) translate(-76 -82)' : undefined}>{tail}</g>
      </g>
    );
  }
  if (species === 'dragon') {
    const s = stage === 1 ? 0.6 : stage === 3 ? 1.25 : 0.95;
    return (
      <g>
        <g transform={`translate(26 48) scale(${s}) translate(-26 -48)`}>
          <path d="M26 48 C10 40 0 22 6 10 C10 20 14 24 20 24 C18 30 22 34 26 34 C24 40 26 44 30 46 Z" fill={p.dark} />
        </g>
        <g transform={`translate(74 48) scale(${s}) translate(-74 -48)`}>
          <path d="M74 48 C90 40 100 22 94 10 C90 20 86 24 80 24 C82 30 78 34 74 34 C76 40 74 44 70 46 Z" fill={p.dark} />
        </g>
        <path d="M76 84 C92 88 98 78 96 68 L104 64 L94 58 L92 66 C92 74 86 78 74 76 Z" fill={p.main} />
      </g>
    );
  }
  if (species === 'cat') {
    return (
      <g>
        <path d={stage === 1 ? 'M80 86 C94 86 96 70 88 66' : 'M80 86 C100 86 100 58 88 52'} stroke={p.main} strokeWidth="8" fill="none" strokeLinecap="round" />
        {stage === 3 && <circle cx="88" cy="52" r="5" fill={p.light} />}
      </g>
    );
  }
  // Owl wings
  return (
    <g fill={p.dark}>
      <ellipse cx="15" cy="66" rx="8" ry={stage === 3 ? 22 : 17} transform="rotate(14 15 66)" />
      <ellipse cx="85" cy="66" rx="8" ry={stage === 3 ? 22 : 17} transform="rotate(-14 85 66)" />
    </g>
  );
}

function Ears({ species, p, stage }: { species: Species; p: Palette; stage: number }) {
  if (species === 'fox') {
    return (
      <g>
        <path d="M22 44 L18 6 L46 26 Z" fill={p.main} />
        <path d="M24 36 L22 14 L38 27 Z" fill={p.inner} />
        <path d="M78 44 L82 6 L54 26 Z" fill={p.main} />
        <path d="M76 36 L78 14 L62 27 Z" fill={p.inner} />
      </g>
    );
  }
  if (species === 'cat') {
    return (
      <g>
        <path d="M20 46 L22 10 Q30 12 46 26 Z" fill={p.main} />
        <path d="M25 38 L26 18 L38 28 Z" fill={p.inner} />
        <path d="M80 46 L78 10 Q70 12 54 26 Z" fill={p.main} />
        <path d="M75 38 L74 18 L62 28 Z" fill={p.inner} />
      </g>
    );
  }
  if (species === 'owl') {
    const up = stage === 3 ? -6 : stage === 1 ? 6 : 0;
    return (
      <g fill={p.dark}>
        <path d={`M26 32 L18 ${8 + up} L42 22 Z`} />
        <path d={`M74 32 L82 ${8 + up} L58 22 Z`} />
      </g>
    );
  }
  // Dragon horns and crest
  return (
    <g fill={p.accent}>
      <path d={stage === 1 ? 'M36 26 Q32 18 30 16 Q36 18 42 22 Z' : 'M36 26 Q30 10 24 6 Q34 12 44 22 Z'} />
      <path d={stage === 1 ? 'M64 26 Q68 18 70 16 Q64 18 58 22 Z' : 'M64 26 Q70 10 76 6 Q66 12 56 22 Z'} />
      <path d="M45 22 L50 12 L55 22 Z" />
    </g>
  );
}

function Belly({ species, p }: { species: Species; p: Palette }) {
  if (species === 'owl') {
    return (
      <g>
        <ellipse cx="50" cy="76" rx="20" ry="15" fill={p.light} />
        <g stroke={p.dark} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6">
          <path d="M42 72 l3 3 3 -3" /><path d="M52 72 l3 3 3 -3" /><path d="M47 80 l3 3 3 -3" />
        </g>
      </g>
    );
  }
  if (species === 'dragon') {
    return (
      <g>
        <ellipse cx="50" cy="76" rx="19" ry="15" fill={p.accent} />
        <g stroke={p.dark} strokeWidth="1.6" opacity="0.4">
          <path d="M36 70 H64" /><path d="M33 77 H67" /><path d="M36 84 H64" />
        </g>
      </g>
    );
  }
  return (
    <g fill={p.light}>
      <ellipse cx="50" cy="78" rx="19" ry="14" />
      {species === 'fox' && <ellipse cx="50" cy="64" rx="16" ry="10" />}
    </g>
  );
}

function Front({ species, p, stage }: { species: Species; p: Palette; stage: number }) {
  if (species === 'cat') {
    return (
      <g stroke={p.dark} strokeWidth="2.6" strokeLinecap="round">
        <path d="M50 23 V31" /><path d="M43 24 L44 30" /><path d="M57 24 L56 30" />
        {stage === 3 && <path d="M40 86 l4 -5 4 5 4 -5 4 5 4 -5" stroke={p.light} fill="none" />}
      </g>
    );
  }
  return null;
}

function Eyes({ mood, open, big }: { mood: Mood; open: boolean; big: boolean }) {
  if (!open) {
    const d = mood === 'sleepy'
      ? ['M32 54 Q37 58 42 54', 'M58 54 Q63 58 68 54']
      : ['M32 56 Q37 49 42 56', 'M58 56 Q63 49 68 56'];
    return (
      <g stroke={INK} strokeWidth="3.2" fill="none" strokeLinecap="round">
        {d.map((x) => <path key={x} d={x} />)}
      </g>
    );
  }
  const r = big ? 1.18 : 1;
  return (
    <g>
      {mood === 'worried' && (
        <g stroke={INK} strokeWidth="2.6" strokeLinecap="round">
          <path d="M31 45 L42 42" /><path d="M58 42 L69 45" />
        </g>
      )}
      <g className="b-eyes">
        {[37, 63].map((x) => (
          <g key={x}>
            <ellipse cx={x} cy="54" rx={5.2 * r} ry={6.2 * r} fill={INK} />
            <circle cx={x + 1.8} cy={51.5} r={1.9 * r} fill="#fff" />
            <circle cx={x - 1.6} cy={57} r={0.9 * r} fill="#fff" opacity="0.8" />
          </g>
        ))}
      </g>
    </g>
  );
}

function Mouth({ species, mood, p }: { species: Species; mood: Mood; p: Palette }) {
  if (species === 'owl') {
    return mood === 'cheer'
      ? <g fill={p.accent}><path d="M45 60 L55 60 L50 66 Z" /><path d="M46 68 L54 68 L50 72 Z" /></g>
      : <path d="M45 61 L55 61 L50 68 Z" fill={p.accent} />;
  }
  const nose = species === 'cat'
    ? <path d="M47.5 60 L52.5 60 L50 63 Z" fill={p.accent} />
    : species === 'dragon'
      ? <g fill={INK} opacity="0.6"><circle cx="46" cy="61" r="1.2" /><circle cx="54" cy="61" r="1.2" /></g>
      : <ellipse cx="50" cy="60.5" rx="3" ry="2.2" fill={INK} />;
  const mouth =
    mood === 'cheer' ? <path d="M43 65 Q50 77 57 65 Z" fill="#B3244C" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
    : mood === 'worried' ? <path d="M45 69 Q50 65 55 69" stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round" />
    : mood === 'sleepy' ? <ellipse cx="50" cy="67" rx="2.2" ry="2.6" fill={INK} />
    : <path d={mood === 'proud' ? 'M43 65 Q50 72 57 65' : 'M45 65 Q50 70 55 65'} stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round" />;
  return (
    <g>
      {nose}
      {mouth}
      {species === 'cat' && (
        <g stroke={INK} strokeWidth="1.2" opacity="0.5" strokeLinecap="round">
          <path d="M30 61 L14 57" /><path d="M30 65 L14 66" /><path d="M70 61 L86 57" /><path d="M70 65 L86 66" />
        </g>
      )}
    </g>
  );
}

function Head({ id, species }: { id: string; species: Species }) {
  const lift = species === 'fox' || species === 'cat' ? -2 : 0;
  const g = (el: React.ReactNode) => <g transform={`translate(0 ${lift})`}>{el}</g>;
  switch (id) {
    case 'party':
      return g(
        <g transform="rotate(10 50 20)">
          <path d="M38 23 L52 -10 L64 23 Z" fill="#FF4FA3" />
          <path d="M43 12 L59 12 L61 17 L41 17 Z" fill="#FFC23D" />
          <path d="M47 1 L56 1 L57 5 L46 5 Z" fill="#4FC3FF" />
          <circle cx="52" cy="-11" r="4" fill="#FFC23D" />
        </g>,
      );
    case 'wizard':
      return g(
        <g>
          <path d="M34 22 L50 -8 Q60 -14 66 -8 Q58 -8 56 -2 L66 22 Z" fill="#6E52D6" />
          <ellipse cx="50" cy="22" rx="24" ry="5" fill="#5B43C2" />
          <path d="M47 8 l1.2 3 3 1.2 -3 1.2 -1.2 3 -1.2 -3 -3 -1.2 3 -1.2z" fill="#FFC23D" />
          <circle cx="57" cy="15" r="1.6" fill="#FFC23D" />
        </g>,
      );
    case 'headphones':
      return (
        <g>
          <path d="M16 54 Q14 12 50 12 Q86 12 84 54" stroke="#2F2552" strokeWidth="5" fill="none" />
          <rect x="8" y="44" width="12" height="20" rx="5" fill="#FF4FA3" />
          <rect x="80" y="44" width="12" height="20" rx="5" fill="#FF4FA3" />
        </g>
      );
    case 'flowers':
      return g(
        <g>
          {[[28, 31, '#FF8FB1'], [38, 24, '#FFE08A'], [50, 21, '#FFFFFF'], [62, 24, '#FFE08A'], [72, 31, '#FF8FB1']].map(([x, y, c]) => (
            <g key={`${x}`}>
              {[0, 72, 144, 216, 288].map((a) => <circle key={a} cx={Number(x) + 3.4 * Math.cos((a * Math.PI) / 180)} cy={Number(y) + 3.4 * Math.sin((a * Math.PI) / 180)} r="2.8" fill={String(c)} />)}
              <circle cx={x} cy={y} r="2" fill="#FF7A2F" />
            </g>
          ))}
        </g>,
      );
    case 'crown':
      return g(
        <g>
          <path d="M33 25 L32 6 L42 15 L50 1 L58 15 L68 6 L67 25 Z" fill="#FFC23D" stroke="#C98A0B" strokeWidth="1.5" strokeLinejoin="round" />
          <circle cx="50" cy="18" r="3" fill="#FF4FA3" />
          <circle cx="40" cy="20" r="2" fill="#4FC3FF" />
          <circle cx="60" cy="20" r="2" fill="#3DDC97" />
        </g>,
      );
    default:
      return null;
  }
}

function Face({ id }: { id: string }) {
  if (id === 'shades') {
    return (
      <g>
        <rect x="27" y="47" width="20" height="13" rx="5" fill="#1B1430" />
        <rect x="53" y="47" width="20" height="13" rx="5" fill="#1B1430" />
        <path d="M47 51 H53" stroke="#1B1430" strokeWidth="3" />
        <path d="M31 50 L36 50" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        <path d="M57 50 L62 50" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      </g>
    );
  }
  if (id === 'glasses') {
    return (
      <g stroke="#FFC23D" strokeWidth="2.6" fill="#fff" fillOpacity="0.12">
        <circle cx="37" cy="54" r="9" />
        <circle cx="63" cy="54" r="9" />
        <path d="M46 53 Q50 50 54 53" fill="none" />
      </g>
    );
  }
  return null;
}

function Neck({ id }: { id: string }) {
  if (id === 'bow') {
    return (
      <g>
        <path d="M50 84 L37 77 L37 91 Z" fill="#FF4FA3" />
        <path d="M50 84 L63 77 L63 91 Z" fill="#FF4FA3" />
        <circle cx="50" cy="84" r="3.6" fill="#D9346F" />
      </g>
    );
  }
  if (id === 'scarf') {
    return (
      <g>
        <path d="M22 76 Q50 90 78 76 L79 85 Q50 99 21 85 Z" fill="#FF5A5A" />
        <path d="M58 86 L68 86 L70 104 L60 104 Z" fill="#FF5A5A" />
        <path d="M59 92 H69 M60 98 H70" stroke="#FFE08A" strokeWidth="2.4" />
        <path d="M30 82 Q50 92 70 82" stroke="#FFE08A" strokeWidth="2.4" fill="none" />
      </g>
    );
  }
  return null;
}
