import { describe, expect, it } from 'vitest';
import { applyHealth, emptyState, finishOnboarding } from './engine';
import { healthChanged, newHealthKey, parseHealthInbox } from './health';

describe('apple health inbox', () => {
  it('reads day fields and converts units', () => {
    const r = parseHealthInbox({
      d20261027: { steps: '10,412', workoutMinutes: '31.6', sleepMinutes: '452', mindfulMinutes: '' },
      d20261026: { steps: '0', sleepMinutes: '' },
      other: 'ignored',
    });
    expect(r).toEqual([
      { day: '2026-10-26', data: { steps: 0 } },
      { day: '2026-10-27', data: { steps: 10412, workoutMinutes: 32, sleepHours: 7.5 } },
    ]);
  });

  it('drops impossible sleep spans', () => {
    expect(parseHealthInbox({ d20261027: { sleepMinutes: '2000' } })).toEqual([]);
  });

  it('only reports a change when a value is new', () => {
    expect(healthChanged({ steps: 5 }, { steps: 5 })).toBe(false);
    expect(healthChanged({ steps: 5 }, { steps: 6 })).toBe(true);
    expect(healthChanged(undefined, { steps: 0 })).toBe(true);
  });

  it('makes long unguessable keys', () => {
    const k = newHealthKey();
    expect(k.length).toBeGreaterThanOrEqual(24);
    expect(k).not.toBe(newHealthKey());
  });

  it('completes a steps quest when synced steps reach its target', () => {
    const now = new Date(2026, 10, 2, 10);
    let s = finishOnboarding(emptyState(now.getTime()), { ...emptyState().profile, name: 'R', areas: ['fitness', 'sleep', 'mind'] }, [], now);
    s = { ...s, today: { ...s.today!, queue: [{ key: 'daily-f9-1', kind: 'daily', questId: 'f9', area: 'fitness', title: 'Walk 10,000 steps', why: '', xp: 25, coins: 5 }, ...s.today!.queue] } };
    const [{ day, data }] = parseHealthInbox({ d20261102: { steps: '10500' } });
    const r = applyHealth(s, day, data, now);
    expect(r.state.today!.done.some((d) => d.key === 'daily-f9-1' && d.auto)).toBe(true);
  });
});
