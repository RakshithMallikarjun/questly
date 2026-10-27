import type { LimitPeriod } from '../game/types';

const PERIODS: { value: LimitPeriod; label: string }[] = [
  { value: 'day', label: 'Per day' },
  { value: 'week', label: 'Per week' },
  { value: 'month', label: 'Per month' },
];

/** "At most N <unit> per day / week / month" controls for cut-down habits. */
export function LimitFields({ limit, unit, period, onChange }: {
  limit: number;
  unit?: string;
  period?: LimitPeriod;
  onChange: (v: { limit: number; period: LimitPeriod }) => void;
}) {
  const p = period ?? 'day';
  return (
    <div className="stack" style={{ gap: 8 }}>
      <label className="field">At most ({unit ?? 'times'})
        <input type="number" min={1} inputMode="numeric" value={limit} onChange={(e) => onChange({ limit: Math.max(1, Number(e.target.value) || 1), period: p })} />
      </label>
      <div className="row" style={{ gap: 6 }}>
        {PERIODS.map((o) => (
          <button key={o.value} type="button" className={`btn btn-sm grow ${p === o.value ? 'btn-gold' : 'btn-ghost'}`} style={{ fontSize: 14, fontFamily: 'var(--body)', fontWeight: 800 }} onClick={() => onChange({ limit, period: o.value })}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export const periodWord = (p?: LimitPeriod) => (p === 'week' ? 'this week' : p === 'month' ? 'this month' : 'today');
export const perWord = (p?: LimitPeriod) => (p === 'week' ? 'a week' : p === 'month' ? 'a month' : 'a day');
