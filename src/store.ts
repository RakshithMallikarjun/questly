import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as E from './game/engine';
import type { Result } from './game/engine';
import type { AreaId, GameEvent, GameState, HealthDay, Profile, Tier } from './game/types';

interface Store {
  game: GameState;
  events: GameEvent[];
  /** Run any engine action against the current state. */
  run: (fn: (s: GameState, now: Date) => Result) => void;
  replace: (game: GameState) => void;
  popEvent: (n?: number) => void;

  tick: () => void;
  complete: (key: string) => void;
  undo: (key: string) => void;
  skip: (key: string) => void;
  swap: (key: string) => void;
  slip: (habitId: string, trigger?: string) => void;
  logAmount: (habitId: string, n: number) => void;
  resist: (habitId: string) => void;
  addHabit: (c: E.HabitChoice) => void;
  removeHabit: (id: string) => void;
  updateHabit: (id: string, patch: Parameters<typeof E.updateHabit>[2]) => void;
  buy: (id: string) => void;
  rest: () => void;
  addReward: (name: string, cost: number) => void;
  removeReward: (id: string) => void;
  challengeDay: () => void;
  health: (day: string, data: HealthDay) => void;
  updateProfile: (p: Partial<Profile>) => void;
  rebuild: () => void;
  addCustomQuest: (area: AreaId, title: string, tier: Tier, everyDay: boolean) => void;
  removeCustomQuest: (id: string) => void;
  startJourney: (plan: E.JourneyPlan) => void;
  endJourney: () => void;
  focus: (key: string) => void;
  openChest: () => void;
  announceUnlocks: () => void;
  tourSeen: (id: string) => void;
  onboard: (p: Profile, habits: E.HabitChoice[]) => void;
  reset: () => void;
}

export const useStore = create<Store>()(
  persist(
    (set, get) => {
      const run = (fn: (s: GameState, now: Date) => Result) => {
        const { state, events } = fn(get().game, new Date());
        if (state === get().game && !events.length) return;
        set((st) => ({ game: state, events: [...st.events, ...events] }));
      };
      return {
        game: E.emptyState(),
        events: [],
        run,
        replace: (game) => set({ game }),
        popEvent: (n = 1) => set((st) => ({ events: st.events.slice(n) })),

        tick: () => run((s, now) => E.ensureToday(s, now)),
        complete: (key) => run((s, now) => E.completeQuest(s, key, now)),
        undo: (key) => run((s, now) => E.undoQuest(s, key, now)),
        skip: (key) => run((s, now) => E.skipQuest(s, key, now)),
        swap: (key) => run((s, now) => E.swapQuest(s, key, now)),
        slip: (id, trigger) => run((s, now) => E.logSlip(s, id, trigger, now)),
        logAmount: (id, n) => run((s, now) => E.logAmount(s, id, n, now)),
        resist: (id) => run((s, now) => E.resistUrge(s, id, now)),
        addHabit: (c) => run((s, now) => E.addHabit(s, c, now)),
        removeHabit: (id) => run((s, now) => E.removeHabit(s, id, now)),
        updateHabit: (id, patch) => run((s, now) => E.updateHabit(s, id, patch, now)),
        buy: (id) => run((s, now) => E.buyReward(s, id, now)),
        rest: () => run((s, now) => E.takeRestDay(s, now)),
        addReward: (name, cost) => run((s, now) => E.addReward(s, name, cost, now)),
        removeReward: (id) => run((s, now) => E.removeReward(s, id, now)),
        challengeDay: () => run((s, now) => E.markChallengeDay(s, now)),
        health: (day, data) => run((s, now) => E.applyHealth(s, day, data, now)),
        updateProfile: (p) => run((s, now) => E.updateProfile(s, p, now)),
        rebuild: () => run((s, now) => E.rebuildToday(s, now)),
        addCustomQuest: (area, title, tier, everyDay) => run((s, now) => E.addCustomQuest(s, area, title, tier, everyDay, now)),
        removeCustomQuest: (id) => run((s, now) => E.removeCustomQuest(s, id, now)),
        startJourney: (plan) => run((s, now) => E.startJourney(s, plan, now)),
        endJourney: () => run((s, now) => E.endJourney(s, now)),
        focus: (key) => run((s, now) => E.focusQuest(s, key, now)),
        openChest: () => run((s, now) => E.openChest(s, now)),
        announceUnlocks: () => run((s, now) => E.announceUnlocks(s, now)),
        tourSeen: (id) => run((s, now) => E.markTourSeen(s, id, now)),
        onboard: (p, habits) => set({ game: E.finishOnboarding(get().game, p, habits, new Date()), events: [] }),
        reset: () => set({ game: E.emptyState(), events: [] }),
      };
    },
    {
      name: 'questly-state',
      version: 1,
      partialize: (st) => ({ game: st.game }),
    },
  ),
);
