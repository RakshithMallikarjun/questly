// "Day keys" are YYYY-MM-DD strings for the user's game day. A game day starts
// at the reset hour (default 4 am), so finishing a quest at 1 am still counts
// for the previous day.

const pad = (n: number) => String(n).padStart(2, '0');

export const toKey = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const fromKey = (key: string): Date => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
};

export const gameDay = (now: Date, resetHour: number): string => {
  const d = new Date(now);
  if (d.getHours() < resetHour) d.setDate(d.getDate() - 1);
  return toKey(d);
};

export const addDays = (key: string, n: number): string => {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
};

export const daysBetween = (a: string, b: string): number =>
  Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86400000);

/** Monday of the week containing `key`. */
export const weekStart = (key: string): string => {
  const d = fromKey(key);
  const dow = (d.getDay() + 6) % 7; // Monday = 0
  return addDays(key, -dow);
};

export const dayOfWeek = (key: string): number => (fromKey(key).getDay() + 6) % 7;
