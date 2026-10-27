// Turns what the Apple Health shortcut sends into health data for each day.
// The shortcut writes one field per day, named d<yyyyMMdd>, holding text
// values (text keeps the shortcut simple when a value is missing).

import type { HealthDay } from './types';

export type HealthInbox = Record<string, unknown>;

const num = (v: unknown): number | undefined => {
  if (v === undefined || v === null) return undefined;
  const n = Number(String(v).replace(/[^\d.-]/g, ''));
  return String(v).trim() === '' || !Number.isFinite(n) ? undefined : n;
};

export const parseHealthInbox = (doc: HealthInbox): { day: string; data: HealthDay }[] => {
  const out: { day: string; data: HealthDay }[] = [];
  for (const [field, value] of Object.entries(doc)) {
    const m = /^d(\d{4})(\d{2})(\d{2})$/.exec(field);
    if (!m || !value || typeof value !== 'object') continue;
    const v = value as Record<string, unknown>;
    const data: HealthDay = {};
    const steps = num(v.steps);
    const workout = num(v.workoutMinutes);
    const mindful = num(v.mindfulMinutes);
    const sleepMin = num(v.sleepMinutes);
    if (steps !== undefined) data.steps = Math.round(steps);
    if (workout !== undefined) data.workoutMinutes = Math.round(workout);
    if (mindful !== undefined) data.mindfulMinutes = Math.round(mindful);
    // Ignore impossible sleep spans (no data, or samples from two nights).
    if (sleepMin !== undefined && sleepMin > 0 && sleepMin <= 16 * 60) data.sleepHours = Math.round((sleepMin / 60) * 10) / 10;
    if (Object.keys(data).length) out.push({ day: `${m[1]}-${m[2]}-${m[3]}`, data });
  }
  return out.sort((a, b) => a.day.localeCompare(b.day));
};

/** True when the new data would change anything already stored. */
export const healthChanged = (old: HealthDay | undefined, next: HealthDay) =>
  (Object.keys(next) as (keyof HealthDay)[]).some((k) => old?.[k] !== next[k]);

/** A long random key for the shortcut. */
export const newHealthKey = () => {
  const bytes = new Uint8Array(26);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join('') + 'qh';
};
