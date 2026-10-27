import { describe, expect, it } from 'vitest';
import { completeQuest, emptyState, finishOnboarding, takeRestDay, updateProfile } from './engine';
import { DEFAULT_DUE, dueFor, dueKey, momentIn, planReminders } from './reminders';
import type { GameState, Profile } from './types';

const at = (key: string, hour = 6, min = 0) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, hour, min);
};
const DAY = '2026-11-02';

const start = (p: Partial<Profile> = {}): GameState =>
  finishOnboarding(
    emptyState(at(DAY).getTime()),
    { ...emptyState().profile, name: 'R', areas: ['fitness', 'sleep', 'learning'], minutes: 20, ...p },
    [{ presetId: 'scrolling', name: 'Doom-scrolling', mode: 'limit', limit: 30, unit: 'min' }],
    at(DAY),
  );

describe('reminders', () => {
  it('plans fixed morning and evening reminders for today and the next days', () => {
    const plan = planReminders(start(), at(DAY));
    const fixed = plan.filter((r) => !r.tag.includes('|q|'));
    expect(fixed.map((r) => r.tag)).toEqual([
      `${DAY}|morning`, `${DAY}|evening`, '2026-11-03|morning', '2026-11-03|evening', '2026-11-04|morning', '2026-11-04|evening',
    ]);
    expect(fixed[0].at).toBe(at(DAY, 8).getTime());
  });

  it('nudges before each required quest is due, never for the bonus quest', () => {
    const s = start();
    const plan = planReminders(s, at(DAY)).filter((r) => r.tag.includes('|q|'));
    const required = s.today!.queue.filter((q) => q.kind !== 'bonus');
    expect(plan).toHaveLength(required.length);
    const checkin = required.find((q) => q.kind === 'checkin')!;
    const r = plan.find((x) => x.tag.includes(checkin.key))!;
    expect(r.at).toBe(momentIn(DAY, DEFAULT_DUE.evening, 4) - 30 * 60000);
  });

  it('uses your own finish-by time and lead time', () => {
    let s = start();
    const q = s.today!.queue.find((x) => x.kind === 'daily')!;
    s = updateProfile(s, { dueTimes: { [dueKey(q)!]: '13:00' }, reminders: { ...s.profile.reminders, lead: 60 } }, at(DAY)).state;
    expect(dueFor(q, s.profile)).toBe('13:00');
    const r = planReminders(s, at(DAY)).find((x) => x.tag.includes(q.key))!;
    expect(r.at).toBe(at(DAY, 12).getTime());
  });

  it('drops reminders for finished quests, past times and quiet hours', () => {
    let s = start({ reminders: { morning: '06:30', evening: '23:00' } });
    const q = s.today!.queue.find((x) => x.kind === 'daily')!;
    s = completeQuest(s, q.key, at(DAY, 9)).state;
    const plan = planReminders(s, at(DAY, 9));
    expect(plan.some((r) => r.tag.includes(q.key))).toBe(false);
    expect(plan.some((r) => r.tag === `${DAY}|morning`)).toBe(false); // already past
    expect(plan.some((r) => r.tag.endsWith('|evening'))).toBe(false); // 23:00 is in quiet hours
  });

  it('can switch off per-quest nudges, and stays quiet on a rest day', () => {
    let s = start({ reminders: { morning: '08:00', evening: '20:30', perQuest: false } });
    expect(planReminders(s, at(DAY)).some((r) => r.tag.includes('|q|'))).toBe(false);
    s = { ...s, coins: 1000 };
    s = takeRestDay(s, at(DAY)).state;
    expect(planReminders(s, at(DAY)).some((r) => r.tag.startsWith(DAY))).toBe(false);
  });

  it('treats times after midnight as the end of the same game day', () => {
    expect(momentIn(DAY, '01:00', 4)).toBe(at('2026-11-03', 1).getTime());
  });
});
