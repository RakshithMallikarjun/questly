// Read-only helpers for the habit journey: which day you're on, which stage,
// which habits are active and what today's journey quests are. The rules that
// change the journey (start, complete a day, lose a life) live in engine.ts.

import { COMEBACK_QUESTS, stagesFor } from './content/journeys';
import { checkinTitle } from './generator';
import { hash } from './rng';
import type { GameState, Journey, JourneyHabit, QuestInstance } from './types';
import { coinsFor } from './xp';

export const COMEBACK_KEY = 'journey-comeback';
export const questKeyFor = (h: JourneyHabit) => `journey-${h.id}`;

/** The journey day you are working on today (1-based). */
export const journeyDayNumber = (j: Journey, day: string): number =>
  j.doneDays.includes(day) ? j.doneDays.length : Math.min(j.length, j.doneDays.length + 1);

export const stageIndex = (j: Journey, n: number): number => {
  const stages = stagesFor(j.length);
  const i = stages.findIndex((s) => n >= s.from && n <= s.to);
  return i === -1 ? stages.length - 1 : i;
};

export const stageOf = (j: Journey, n: number) => stagesFor(j.length)[stageIndex(j, n)];

export const activeHabits = (j: Journey, n: number) => j.habits.filter((h) => h.joinsOn <= n);

/** How far a habit has grown: 0 in the stage it joins, +1 for each stage after. */
export const stepIndex = (j: Journey, h: JourneyHabit, n: number) =>
  Math.min(h.steps.length - 1, Math.max(0, stageIndex(j, n) - stageIndex(j, h.joinsOn)));

/** Linked "break a habit" tracker, if it still exists. */
export const linkedTracker = (s: GameState, h: JourneyHabit) => (h.habitId ? s.habits.find((x) => x.id === h.habitId) : undefined);

/** Today's task text for a journey habit. */
export const taskFor = (s: GameState, j: Journey, h: JourneyHabit, n: number) => {
  const tracker = linkedTracker(s, h);
  return tracker ? checkinTitle(tracker) : h.steps[stepIndex(j, h, n)];
};

/** Journey quests to add to today's board (linked trackers use their usual check-in). */
export const journeyQuests = (s: GameState, day: string): QuestInstance[] => {
  const j = s.journey;
  if (!j || j.finishedOn) return [];
  const n = journeyDayNumber(j, day);
  const stage = stageOf(j, n);
  const out: QuestInstance[] = [];
  for (const h of activeHabits(j, n)) {
    if (linkedTracker(s, h)) continue;
    const xp = 30 + 10 * stepIndex(j, h, n);
    out.push({
      key: questKeyFor(h), kind: 'journey', questId: `journey:${h.id}`, area: h.area,
      title: taskFor(s, j, h, n), why: `Day ${n} of ${j.length} · ${stage.name}`, xp, coins: coinsFor(xp),
    });
  }
  if (j.comeback) {
    out.push({
      key: COMEBACK_KEY, kind: 'journey', questId: 'journey:comeback',
      title: COMEBACK_QUESTS[hash(day + j.id) % COMEBACK_QUESTS.length],
      why: 'Comeback quest. Finish today’s journey habits and this to win back a life.', xp: 40, coins: coinsFor(40),
    });
  }
  return out;
};

/** True when every part of today's journey is done. */
export const journeyDayComplete = (s: GameState, day: string): boolean => {
  const j = s.journey;
  const t = s.today;
  if (!j || !t || t.day !== day) return false;
  const done = new Set(t.done.filter((d) => !d.slip).map((d) => d.key));
  const n = journeyDayNumber(j, day);
  const parts = activeHabits(j, n).every((h) => {
    const tracker = linkedTracker(s, h);
    return tracker ? tracker.checkins[day] === 'clean' : done.has(questKeyFor(h));
  });
  const needsComeback = j.comeback || (j.undo?.day === day && j.undo.comeback);
  return parts && (!needsComeback || done.has(COMEBACK_KEY));
};

/** Best number of journey days reached, for badges. */
export const bestJourneyDays = (s: GameState) =>
  Math.max(s.journey?.doneDays.length ?? 0, ...(s.journeysDone ?? []).map((x) => x.length));

/** Habits that join on a later day. */
export const upcomingHabits = (j: Journey, n: number) => j.habits.filter((h) => h.joinsOn > n);
