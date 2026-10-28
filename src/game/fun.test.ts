import { describe, expect, it } from 'vitest';
import { announceUnlocks, completeQuest, emptyState, ensureToday, finishOnboarding, focusQuest, openChest, undoQuest } from './engine';
import { buddyLine, moodFor, newUnlocks, outfitFor, speciesFor, stageForLevel } from './content/buddy';
import { pendingTour } from '../components/Tour';
import type { GameState, QuestInstance } from './types';
import { currentQuest } from './generator';

const at = (key: string, hour = 10) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, hour);
};
const DAY = '2026-11-02';
const start = () => finishOnboarding(emptyState(at(DAY).getTime()), { ...emptyState().profile, name: 'R', areas: ['fitness', 'sleep', 'mind'] }, [], at(DAY));
const clear = (s: GameState) => {
  let st = ensureToday(s, at(DAY)).state;
  while (st.today!.queue.some((q) => q.kind !== 'bonus')) {
    st = completeQuest(st, st.today!.queue.find((x) => x.kind !== 'bonus')!.key, at(DAY)).state;
  }
  return st;
};

describe('quest icons', () => {
  it('jumps to a quest without skipping it', () => {
    const s = start();
    const last = s.today!.queue.at(-1)!;
    const next = focusQuest(s, last.key, at(DAY)).state;
    expect(next.today!.queue[0].key).toBe(last.key);
    expect(next.today!.queue).toHaveLength(s.today!.queue.length);
    expect(next.today!.skipped).toEqual([]);
  });
});

describe('mystery chest', () => {
  it('opens once, only after the day is cleared', () => {
    const s = start();
    expect(openChest(s, at(DAY)).state).toBe(s);
    const cleared = clear(s);
    const opened = openChest(cleared, at(DAY)).state;
    const c = opened.today!.chest!;
    expect(c).toBeDefined();
    if (c.reward === 'coins') expect(opened.coins).toBe(cleared.coins + c.amount);
    if (c.reward === 'xp') expect(opened.xp).toBe(cleared.xp + c.amount);
    if (c.reward === 'shield') expect(opened.streak.shields).toBe(cleared.streak.shields + 1);
    expect(openChest(opened, at(DAY)).state).toBe(opened);
  });

  it('does not give a second chest after undo and re-clear', () => {
    const opened = openChest(clear(start()), at(DAY)).state;
    const key = opened.today!.done.at(-1)!.key;
    const undone = undoQuest(opened, key, at(DAY)).state;
    const again = completeQuest(undone, key, at(DAY)).state;
    expect(again.today!.cleared).toBe(true);
    expect(openChest(again, at(DAY)).state).toBe(again);
  });
});

describe('companion', () => {
  it('maps old hero avatars to creatures', () => {
    expect(speciesFor('knight')).toBe('dragon');
    expect(speciesFor('owl')).toBe('owl');
    expect(speciesFor(undefined)).toBe('fox');
  });

  it('grows at levels 5 and 15', () => {
    expect([1, 4, 5, 14, 15].map(stageForLevel)).toEqual([1, 1, 2, 2, 3]);
  });

  it('announces each unlocked item once and only wears unlocked items', () => {
    const s = { ...start(), xp: 300 }; // level 3: party hat
    expect(newUnlocks(s)).toEqual(['party']);
    const r = announceUnlocks(s, at(DAY));
    expect(r.events[0]).toMatchObject({ type: 'unlock', label: 'Party hat' });
    expect(newUnlocks(r.state)).toEqual([]);
    const dressed = { ...r.state, profile: { ...r.state.profile, buddy: { head: 'party', face: 'shades' } } };
    expect(outfitFor(dressed)).toEqual({ head: 'party' });
  });

  it('stays kind in the evening, with no streak guilt', () => {
    const s = { ...start(), streak: { current: 4, best: 4, lastCleared: null, shields: 0 } };
    expect(moodFor(s, at(DAY, 19))).toBe('happy');
    expect(moodFor(s, at(DAY, 23))).toBe('sleepy');
    for (let n = 0; n < 6; n++) expect(buddyLine(s, 'happy', n, at(DAY, 19))).not.toMatch(/streak|lose/i);
  });
});

describe('guided tour', () => {
  it('shows the welcome tour to new users and "What\'s new" to existing ones', () => {
    const fresh = start();
    expect(pendingTour(fresh)).toBe('welcome');
    const veteran = { ...fresh, totals: { ...fresh.totals, quests: 40 } };
    expect(pendingTour(veteran)).toBe('new-companion');
    const seen = { ...veteran, profile: { ...veteran.profile, toursSeen: ['new-companion'] } };
    expect(pendingTour(seen)).toBeNull();
  });
});

describe('undo safety', () => {
  it('knows when an undo would take back the cleared day', async () => {
    const { undoCostsStreak } = await import('./engine');
    let cleared = start();
    while (!cleared.today!.cleared) cleared = completeQuest(cleared, cleared.today!.queue.find((x) => x.kind !== 'bonus')!.key, at(DAY)).state;
    const last = cleared.today!.done.at(-1)!.key;
    expect(undoCostsStreak(cleared, last, at(DAY))).toBe(true);
    const s = start();
    const first = s.today!.queue.find((q) => q.kind !== 'bonus')!.key;
    const one = completeQuest(s, first, at(DAY)).state;
    expect(undoCostsStreak(one, first, at(DAY))).toBe(false);
  });
});

describe('quit check-ins', () => {
  const withHabit = () =>
    finishOnboarding(emptyState(at(DAY).getTime()), { ...emptyState().profile, name: 'R', areas: ['fitness', 'sleep', 'mind'] },
      [{ presetId: 'scrolling', name: 'Doom-scrolling', mode: 'quit' }], at(DAY));
  const checkin = (s: GameState) => s.today!.queue.find((q) => q.kind === 'checkin')!;

  it('celebrates a clean day', () => {
    const s = withHabit();
    const r = completeQuest(s, checkin(s).key, at(DAY, 20));
    const e = r.events.find((x) => x.type === 'cleanDay');
    expect(e).toMatchObject({ label: 'Doom-scrolling', value: 1 });
    expect(r.state.habits[0].checkins[DAY]).toBe('clean');
  });

  it('undo takes the clean day back, and redoing it counts it once', () => {
    const s = withHabit();
    const key = checkin(s).key;
    const done = completeQuest(s, key, at(DAY, 20)).state;
    const undone = undoQuest(done, key, at(DAY, 20)).state;
    expect(undone.habits[0].checkins[DAY]).toBeUndefined();
    expect(undone.today!.queue.some((q) => q.key === key)).toBe(true);
    const redo = completeQuest(undone, key, at(DAY, 20));
    expect(redo.events.find((x) => x.type === 'cleanDay')?.value).toBe(1);
  });
});

describe('which quest Today shows', () => {
  const q = (key: string, kind: QuestInstance['kind']) => ({ key, kind, title: key }) as QuestInstance;
  const daily = q('a', 'daily');
  const main = q('b', 'main');
  const bonus = q('x', 'bonus');

  it('shows the first required quest, even if a bonus quest is first in line', () => {
    expect(currentQuest([bonus, daily, main], false)).toBe(daily);
    expect(currentQuest([daily, bonus], false)).toBe(daily);
  });
  it('shows a bonus quest picked from the icons', () => {
    expect(currentQuest([bonus, daily], true)).toBe(bonus);
  });
  it('shows nothing once only bonus quests are left, unless asked for', () => {
    expect(currentQuest([bonus], false)).toBeUndefined();
    expect(currentQuest([bonus], true)).toBe(bonus);
    expect(currentQuest([], true)).toBeUndefined();
  });
});
