import { describe, expect, it } from 'vitest';
import {
  completeQuest, emptyState, ensureToday, finishOnboarding, logSlip, skipQuest, takeRestDay, undoQuest, applyHealth,
  cleanDays, swapQuest, REST_DAY_COST,
} from './engine';
import { addDays, gameDay } from './date';
import type { GameState, Profile } from './types';
import { levelFor, xpForNext } from './xp';

const at = (key: string, hour = 10) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, hour);
};

const profile = (p: Partial<Profile> = {}): Profile => ({
  ...emptyState().profile,
  name: 'Rakshith',
  areas: ['fitness', 'sleep', 'learning', 'mind'],
  minutes: 20,
  ...p,
});

const start = (day = '2026-11-02', p: Partial<Profile> = {}) =>
  finishOnboarding(emptyState(at(day).getTime()), profile(p), [{ presetId: 'scrolling', name: 'Doom-scrolling', mode: 'limit', limit: 30, unit: 'min' }], at(day));

const clearDay = (s: GameState, day: string): GameState => {
  let st = ensureToday(s, at(day)).state;
  while (st.today!.queue.some((q) => q.kind !== 'bonus')) {
    const q = st.today!.queue.find((x) => x.kind !== 'bonus')!;
    st = completeQuest(st, q.key, at(day)).state;
  }
  return st;
};

describe('levels', () => {
  it('needs 100 XP for level 2 and 50 more each level', () => {
    expect(xpForNext(1)).toBe(100);
    expect(xpForNext(2)).toBe(150);
    expect(levelFor(0).level).toBe(1);
    expect(levelFor(100).level).toBe(2);
    expect(levelFor(249).level).toBe(2);
    expect(levelFor(250).level).toBe(3);
  });
});

describe('daily board', () => {
  it('builds main, daily, replacement, check-in and bonus quests', () => {
    const s = start();
    const q = s.today!.queue;
    expect(q.filter((x) => x.kind === 'main')).toHaveLength(1);
    expect(q.filter((x) => x.kind === 'daily').length).toBe(3 + 1); // 20 min = 3, plus habit replacement
    expect(q.filter((x) => x.kind === 'checkin')).toHaveLength(1);
    expect(q.filter((x) => x.kind === 'bonus')).toHaveLength(1);
    expect(new Set(q.map((x) => x.key)).size).toBe(q.length);
  });

  it('is the same board for the same day', () => {
    const a = start();
    const b = start();
    expect(a.today!.queue.map((q) => q.title)).toEqual(b.today!.queue.map((q) => q.title));
  });

  it('only uses chosen areas for main and library dailies', () => {
    const s = start();
    s.today!.queue.filter((q) => q.kind === 'main' || (q.kind === 'daily' && q.area)).forEach((q) => {
      expect(['fitness', 'sleep', 'learning', 'mind']).toContain(q.area);
    });
  });
});

describe('completing quests', () => {
  it('gives XP and coins, and undo takes them back', () => {
    const s = start();
    const q = s.today!.queue[0];
    const done = completeQuest(s, q.key, at('2026-11-02')).state;
    expect(done.xp).toBe(q.xp);
    expect(done.coins).toBe(q.coins);
    expect(done.today!.queue[0].key).not.toBe(q.key);
    const undone = undoQuest(done, q.key, at('2026-11-02')).state;
    expect(undone.xp).toBe(0);
    expect(undone.today!.queue[0].key).toBe(q.key);
  });

  it('skip moves the quest to the back', () => {
    const s = start();
    const first = s.today!.queue[0];
    const skipped = skipQuest(s, first.key, at('2026-11-02')).state;
    expect(skipped.today!.queue.at(-1)!.key).toBe(first.key);
  });

  it('swap replaces a quest in the same area', () => {
    const s = start();
    const q = s.today!.queue.find((x) => x.kind === 'daily' && x.area)!;
    const swapped = swapQuest(s, q.key, at('2026-11-02')).state;
    const nq = swapped.today!.queue.find((x) => x.key.includes('swap'))!;
    expect(nq.area).toBe(q.area);
    expect(nq.questId).not.toBe(q.questId);
  });
});

describe('streaks', () => {
  it('clears the day and grows the streak on consecutive days', () => {
    let s = clearDay(start('2026-11-02'), '2026-11-02');
    expect(s.today!.cleared).toBe(true);
    expect(s.streak.current).toBe(1);
    s = clearDay(s, '2026-11-03');
    expect(s.streak.current).toBe(2);
    expect(s.badges.first_clear).toBeDefined();
  });

  it('resets after a missed day without a shield', () => {
    let s = clearDay(start('2026-11-02'), '2026-11-02');
    s = ensureToday(s, at('2026-11-04')).state;
    expect(s.streak.current).toBe(0);
  });

  it('uses a shield to save the streak', () => {
    let s = clearDay(start('2026-11-02'), '2026-11-02');
    s = { ...s, streak: { ...s.streak, shields: 1 } };
    s = ensureToday(s, at('2026-11-04')).state;
    expect(s.streak.current).toBe(1);
    expect(s.streak.shields).toBe(0);
    s = clearDay(s, '2026-11-04');
    expect(s.streak.current).toBe(2);
  });

  it('a rest day pass keeps the streak', () => {
    let s = clearDay(start('2026-11-02'), '2026-11-02');
    s = ensureToday(s, at('2026-11-03')).state;
    s = { ...s, coins: REST_DAY_COST };
    s = takeRestDay(s, at('2026-11-03')).state;
    expect(s.coins).toBe(0);
    s = clearDay(s, '2026-11-04');
    expect(s.streak.current).toBe(2);
  });

  it('undoing below the threshold un-clears the day', () => {
    const s = clearDay(start('2026-11-02'), '2026-11-02');
    let u = s;
    for (const d of s.today!.done.slice().reverse()) u = undoQuest(u, d.key, at('2026-11-02')).state;
    expect(u.today!.cleared).toBe(false);
    expect(u.streak.current).toBe(0);
    expect(u.xp).toBe(0);
  });
});

describe('habits', () => {
  it('counts clean days and resets on a slip', () => {
    let s = start('2026-11-02');
    const h = s.habits[0];
    const checkin = s.today!.queue.find((q) => q.kind === 'checkin')!;
    s = completeQuest(s, checkin.key, at('2026-11-02')).state;
    expect(cleanDays(s.habits[0], '2026-11-02')).toBe(1);
    s = ensureToday(s, at('2026-11-05')).state;
    s = logSlip(s, h.id, 'Bored', at('2026-11-05')).state;
    expect(s.habits[0].best).toBe(3);
    expect(cleanDays(s.habits[0], addDays('2026-11-05', 1))).toBe(0);
    expect(s.today!.queue.some((q) => q.kind === 'checkin')).toBe(false);
  });
});

describe('health data', () => {
  it('auto-completes quests that health data satisfies', () => {
    let s = start('2026-11-02');
    const day = gameDay(at('2026-11-02'), 4);
    s = {
      ...s,
      today: {
        ...s.today!,
        queue: [{ key: 'daily-f9-1', kind: 'daily', questId: 'f9', area: 'fitness', title: 'Walk 10,000 steps', why: '', xp: 50, coins: 10 }, ...s.today!.queue],
      },
    };
    s = applyHealth(s, day, { steps: 11000 }, at('2026-11-02', 22)).state;
    expect(s.today!.done.some((d) => d.key === 'daily-f9-1' && d.auto)).toBe(true);
  });
});
