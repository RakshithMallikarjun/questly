// Picks one habit tip for a moment (day cleared, level-up, after a slip).
// The pick depends only on the day and the moment, so it never changes on
// re-render, and the same moment shows a different tip every day until the
// whole list has been used.

export type TipMoment = 'cleared' | 'levelUp' | 'slip';

// Different moments on the same day start at different points in the list.
const OFFSET: Record<TipMoment, number> = { cleared: 0, levelUp: 13, slip: 0 };

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

/** Whole days since 1970-01-01 for a 'YYYY-MM-DD' day key. */
export const dayNumber = (day: string): number => {
  const [y, m, d] = day.split('-').map(Number);
  return Math.floor(Date.UTC(y, (m || 1) - 1, d || 1) / 86_400_000);
};

/**
 * One tip from `pool` for `day` and `moment`. Steps through the list with a
 * stride that shares no factor with its length, so any run of `pool.length`
 * days visits every tip once (no repeats) without going in plain order.
 */
export const pickTip = (pool: readonly string[], day: string, moment: TipMoment): string => {
  const n = pool.length;
  if (!n) return '';
  let stride = 7;
  while (gcd(stride, n) !== 1) stride += 1;
  const i = (((dayNumber(day) * stride + OFFSET[moment]) % n) + n) % n;
  return pool[i];
};
