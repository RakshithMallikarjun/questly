import { describe, expect, it } from 'vitest';
import { completeQuest, emptyState, endJourney, ensureToday, finishOnboarding, logSlip, startJourney, takeRestDay, undoQuest } from './engine';
import { BUNDLE_BY_ID } from './content/journeys';
import { addDays } from './date';
import { COMEBACK_KEY, journeyDayNumber } from './journey';
import type { GameState } from './types';

const at = (key: string, hour = 10) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, hour);
};
const DAY0 = '2026-11-02';

const base = () =>
  finishOnboarding(
    emptyState(at(DAY0).getTime()),
    { ...emptyState().profile, name: 'R', areas: ['fitness', 'sleep', 'mind'] },
    [{ presetId: 'junk', name: 'Junk food & sugar', mode: 'quit' }],
    at(DAY0),
  );

const fit = BUNDLE_BY_ID.fit;
const withJourney = (length = 66) =>
  startJourney(base(), { bundleId: 'fit', name: 'Fit Body', length, picks: fit.habits.map((h) => ({ title: h.title, steps: h.steps, area: h.area })) }, at(DAY0)).state;

/** Finish only the journey quests of a day. */
const doJourney = (s: GameState, day: string): GameState => {
  let st = ensureToday(s, at(day)).state;
  for (const q of st.today!.queue.filter((x) => x.kind === 'journey')) st = completeQuest(st, q.key, at(day)).state;
  return st;
};

describe('habit journey', () => {
  it('puts journey quests first on the board, and adds habits gradually', () => {
    let s = withJourney();
    expect(s.today!.queue[0].kind).toBe('journey');
    expect(s.today!.queue.filter((q) => q.kind === 'journey').map((q) => q.title)).toEqual(['Walk for 10 minutes']);
    for (let i = 0; i < 7; i++) s = doJourney(s, addDays(DAY0, i));
    s = ensureToday(s, at(addDays(DAY0, 7))).state;
    expect(journeyDayNumber(s.journey!, s.today!.day)).toBe(8);
    // Day 8: Builder's Forest. Walk gets harder and push-ups join.
    expect(s.today!.queue.filter((q) => q.kind === 'journey').map((q) => q.title)).toEqual(['Walk for 20 minutes', 'Do 5 push-ups (knees are fine)']);
  });

  it('moves one step when all journey quests are done, and undo moves it back', () => {
    let s = doJourney(withJourney(), DAY0);
    expect(s.journey!.doneDays).toEqual([DAY0]);
    const key = s.today!.doneQuests.find((q) => q.kind === 'journey')!.key;
    s = undoQuest(s, key, at(DAY0)).state;
    expect(s.journey!.doneDays).toEqual([]);
  });

  it('opens a chest at day 7 with XP, coins and a heart back', () => {
    let s = withJourney();
    s = ensureToday(s, at(addDays(DAY0, 2))).state; // missed days 1 and 2 (index 0 and 1)
    expect(s.journey!.lives).toBe(1);
    for (let i = 2; i < 9; i++) s = doJourney(s, addDays(DAY0, i));
    expect(s.journey!.doneDays).toHaveLength(7);
    expect(s.journey!.milestones).toEqual([7]);
    expect(s.journey!.lives).toBe(2);
    expect(s.badges.journey_7).toBeDefined();
  });

  it('never restarts: at 0 hearts a comeback quest wins one back', () => {
    let s = withJourney();
    s = doJourney(s, DAY0);
    const r = ensureToday(s, at(addDays(DAY0, 4))); // 3 missed days
    s = r.state;
    expect(r.events.some((e) => e.type === 'lifeLost')).toBe(true);
    expect(s.journey!.lives).toBe(0);
    expect(s.journey!.comeback).toBe(true);
    expect(s.journey!.doneDays).toHaveLength(1);
    expect(s.today!.queue.some((q) => q.key === COMEBACK_KEY)).toBe(true);
    s = doJourney(s, addDays(DAY0, 4));
    expect(s.journey!.comeback).toBe(false);
    expect(s.journey!.lives).toBe(1);
    expect(s.journey!.doneDays).toHaveLength(2);
    // Undoing the comeback quest puts you back in comeback mode.
    s = undoQuest(s, COMEBACK_KEY, at(addDays(DAY0, 4))).state;
    expect(s.journey!.comeback).toBe(true);
    expect(s.journey!.lives).toBe(0);
    expect(s.journey!.doneDays).toHaveLength(1);
  });

  it('a rest day does not cost a heart', () => {
    let s = withJourney();
    s.coins = 500;
    s = takeRestDay(s, at(DAY0)).state;
    s = ensureToday(s, at(addDays(DAY0, 1))).state;
    expect(s.journey!.lives).toBe(3);
  });

  it('links a break-a-habit tracker: its clean check-in counts, a slip does not', () => {
    const s0 = base();
    const tracker = s0.habits[0];
    let s = startJourney(s0, {
      bundleId: 'custom', name: 'Mine', length: 66,
      picks: [{ title: 'Break free: junk', steps: ['x'], habitId: tracker.id }, { title: 'Read', steps: ['Read 5 pages'] }],
    }, at(DAY0)).state;
    expect(s.today!.queue.filter((q) => q.kind === 'journey')).toHaveLength(0); // read joins on day 8
    s = logSlip(s, tracker.id, undefined, at(DAY0)).state;
    expect(s.journey!.doneDays).toHaveLength(0);
    s = ensureToday(s, at(addDays(DAY0, 1))).state;
    expect(s.journey!.lives).toBe(2);
    s = completeQuest(s, `checkin-${tracker.id}`, at(addDays(DAY0, 1))).state;
    expect(s.journey!.doneDays).toEqual([addDays(DAY0, 1)]);
  });

  it('creates a new tracker when a break-a-habit preset is picked', () => {
    const s = startJourney(base(), {
      bundleId: 'custom', name: 'Mine', length: 66,
      picks: [{ title: 'Break free: Alcohol', steps: ['x'], newHabit: { presetId: 'alcohol', name: 'Alcohol', mode: 'quit' } }, { title: 'Walk', steps: ['Walk'] }],
    }, at(DAY0)).state;
    const h = s.habits.find((x) => x.presetId === 'alcohol')!;
    expect(s.journey!.habits[0].habitId).toBe(h.id);
    expect(s.today!.queue.some((q) => q.key === `checkin-${h.id}`)).toBe(true);
  });

  it('finishes with a trophy on the last day', () => {
    let s = withJourney();
    for (let i = 0; i < 66; i++) s = doJourney(s, addDays(DAY0, i));
    expect(s.journey!.finishedOn).toBe(addDays(DAY0, 65));
    expect(s.journeysDone).toHaveLength(1);
    expect(s.badges.journey_done).toBeDefined();
    expect(s.journey!.milestones).toEqual([7, 21, 45, 66]);
    // No more journey quests after finishing.
    s = ensureToday(s, at(addDays(DAY0, 66))).state;
    expect(s.today!.queue.some((q) => q.kind === 'journey')).toBe(false);
  });

  it('giving up removes the journey and its quests', () => {
    const s = endJourney(withJourney(), at(DAY0)).state;
    expect(s.journey).toBeNull();
    expect(s.today!.queue.some((q) => q.kind === 'journey')).toBe(false);
  });
});
