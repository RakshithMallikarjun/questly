import { STATS } from '../game/content/areas';
import type { StatId } from '../game/types';

/** Seven-sided "character stats" chart. */
export function Radar({ stats }: { stats: Record<StatId, number> }) {
  const cx = 120;
  const cy = 120;
  const R = 88;
  const n = STATS.length;
  const max = Math.max(10, ...Object.values(stats));
  const pt = (r: number, i: number) => {
    const a = ((-90 + (i * 360) / n) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const poly = (f: (i: number) => number) => STATS.map((_, i) => pt(f(i), i).map((v) => v.toFixed(1)).join(',')).join(' ');
  // Keep a small minimum so a new hero still sees a shape.
  const data = poly((i) => R * Math.max(0.08, stats[STATS[i].id] / max));
  const best = STATS.slice().sort((a, b) => stats[b.id] - stats[a.id]);
  return (
    <svg role="img" aria-label={`Character stats. Strongest: ${best[0].label}. Weakest: ${best[n - 1].label}.`} width="100%" viewBox="-44 -6 328 244" style={{ maxWidth: 340 }}>
      {[1, 0.66, 0.33].map((f) => (
        <polygon key={f} points={poly(() => R * f)} fill="none" stroke="#3A2F63" strokeWidth="1.5" />
      ))}
      <polygon points={data} fill="#3DDC97" fillOpacity="0.35" stroke="#3DDC97" strokeWidth="2.5" strokeLinejoin="round" />
      {STATS.map((s, i) => {
        const [x, y] = pt(R + 22, i);
        return (
          <text key={s.id} x={x} y={y + 4} fill={s.color} fontSize="12" fontWeight="800" textAnchor="middle" fontFamily="Nunito, sans-serif">
            {s.label} {stats[s.id]}
          </text>
        );
      })}
    </svg>
  );
}
