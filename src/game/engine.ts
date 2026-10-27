// The game rules. Every function takes the current state and returns a new
// state plus a list of events (level-ups, badges...) for the UI to celebrate.
// Nothing here touches the screen or storage, so it is easy to test.

import { AREA_BY_ID } from './content/areas';
import { BADGES } from './content/badges';
import { CHALLENGES, CHALLENGE_BY_ID, CHALLENGE_COINS, CHALLENGE_XP } from './content/challenges';
import { presetFor } from './content/habits';
import { QUEST_BY_ID } from './content/quests';
import { addDays, daysBetween, gameDay, weekStart } from './date';
import { checkinTitle, generateBoard, isRequired } from './generator';
import { hash } from './rng';
import type {
  AreaId, DayRecord, Difficulty, GameEvent, GameState, Habit, HabitMode, LimitPeriod, Profile, QuestInstance, StatId, Tier,
} from './types';
import { CLEAR_BONUS_COINS, CLEAR_BONUS_XP, URGE_XP, coinsFor, levelFor, streakMultiplier } from './xp';

export interface Result {
  state: GameState;
  events: GameEvent[];
}

export const CLEAR_THRESHOLD: Record<Difficulty, number> = { gentle: 0.4, balanced: 0.6, hardcore: 1 };
export const REST_DAY_COST = 150;
export const MAX_SHIELDS = 2;
export const SWAPS_PER_DAY = 2;

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

export const defaultProfile = (): Profile => ({
  name: '',
  avatar: 'knight',
  areas: [],
  weekday: 'office',
  activity: 1,
  sleep: 1,
  minutes: 20,
  energy: 'morning',
  difficulty: 'balanced',
  motivations: [],
  reminders: { morning: '08:00', evening: '20:30' },
  resetHour: 4,
  sound: true,
  language: 'en',
});

export const emptyState = (now = Date.now()): GameState => ({
  version: 1,
  createdAt: now,
  updatedAt: now,
  onboarded: false,
  profile: defaultProfile(),
  xp: 0,
  coins: 0,
  streak: { current: 0, best: 0, lastCleared: null, shields: 0 },
  stats: { strength: 0, vitality: 0, intellect: 0, focus: 0, spirit: 0, charisma: 0, discipline: 0 },
  tiers: {
    fitness: 1, sleep: 1, nutrition: 1, mind: 1, learning: 1, career: 1, relationships: 1, home: 1, mindfulness: 1, creativity: 1,
  },
  lastTierCheck: null,
  goals: [],
  habits: [],
  history: {},
  today: null,
  badges: {},
  rewards: [
    { id: 'rw-gaming', name: 'Guilt-free gaming hour', cost: 80 },
    { id: 'rw-dessert', name: 'Order my favourite dessert', cost: 100 },
    { id: 'rw-movie', name: 'Movie night', cost: 150 },
  ],
  purchases: [],
  restDays: [],
  challenge: null,
  challengesCompleted: 0,
  customQuests: [],
  health: {},
  totals: { quests: 0, mains: 0, daysCleared: 0, goals: 0, earlyBird: 0 },
});

export interface HabitChoice {
  presetId: string;
  name: string;
  mode: HabitMode;
  limit?: number;
  unit?: string;
  period?: LimitPeriod;
}

export const makeHabit = (c: HabitChoice, day: string): Habit => ({
  id: `${c.presetId}-${hash(c.name + day).toString(36)}`,
  presetId: c.presetId,
  name: c.name,
  mode: c.mode,
  limit: c.limit,
  unit: c.unit,
  period: c.period,
  cleanSince: day,
  best: 0,
  slips: [],
  urgesResisted: 0,
  amounts: {},
  checkins: {},
});

/** Build the starting character from the onboarding answers. */
export const finishOnboarding = (base: GameState, profile: Profile, habits: HabitChoice[], now: Date): GameState => {
  const s = clone(base);
  const day = gameDay(now, profile.resetHour);
  s.profile = profile;
  s.onboarded = true;
  const start: Tier = profile.difficulty === 'hardcore' ? 2 : 1;
  (Object.keys(s.tiers) as AreaId[]).forEach((a) => (s.tiers[a] = start));
  s.tiers.fitness = Math.max(start, [1, 1, 2, 3][profile.activity]) as Tier;
  s.tiers.sleep = Math.max(start, [3, 2, 1, 1][profile.sleep]) as Tier;
  s.goals = profile.areas.map((area) => base.goals.find((g) => g.area === area && !g.completedAt) ?? { area, level: 0, start: day, progress: 0 });
  // Keep the history of habits you were already tracking (e.g. when retaking the questionnaire).
  s.habits = habits.map((h) => base.habits.find((x) => x.presetId === h.presetId && x.name === h.name) ?? makeHabit(h, day))
    .map((h, i) => ({ ...h, mode: habits[i].mode, limit: habits[i].limit, unit: habits[i].unit, period: habits[i].period }));
  s.lastTierCheck = day;
  s.today = null;
  return ensureToday(s, now).state;
};

const statFor = (q: QuestInstance): StatId => (q.area ? AREA_BY_ID[q.area].stat : 'discipline');
const statPointsFor = (q: QuestInstance): number => {
  const def = q.questId ? QUEST_BY_ID[q.questId] : undefined;
  return def ? def.tier : 2;
};

const record = (s: GameState, day: string): DayRecord => {
  if (!s.history[day]) {
    s.history[day] = { offered: 0, done: 0, cleared: false, rest: false, xp: 0, areaOffered: {}, areaDone: {} };
  }
  return s.history[day];
};

export const cleanDays = (h: Habit, day: string): number =>
  Math.max(0, daysBetween(h.cleanSince, day)) + (h.checkins[day] === 'clean' ? 1 : 0);

const checkBadges = (s: GameState, events: GameEvent[], now: number) => {
  for (const b of BADGES) {
    if (!s.badges[b.id] && b.test(s)) {
      s.badges[b.id] = now;
      events.push({ type: 'badge', id: b.id, label: b.name });
    }
  }
};

const addXp = (s: GameState, xp: number, coins: number, events: GameEvent[]) => {
  const before = levelFor(s.xp).level;
  s.xp = Math.max(0, s.xp + xp);
  s.coins = Math.max(0, s.coins + coins);
  const after = levelFor(s.xp).level;
  if (after > before) events.push({ type: 'levelUp', value: after });
};

// ---------------------------------------------------------------- new day

/** Make sure today's board exists; handles everything that happens overnight. */
export const ensureToday = (input: GameState, now: Date): Result => {
  const day = gameDay(now, input.profile.resetHour);
  if (input.today?.day === day || !input.onboarded) return { state: input, events: [] };
  const s = clone(input);
  const events: GameEvent[] = [];

  // Streak: protect missed days with rest days or shields, otherwise reset.
  const last = s.streak.lastCleared;
  if (last && s.streak.current > 0) {
    let d = addDays(last, 1);
    while (d < day) {
      if (s.history[d]?.cleared) {
        s.streak.lastCleared = d;
      } else if (s.restDays.includes(d)) {
        s.streak.lastCleared = d;
      } else if (s.streak.shields > 0) {
        s.streak.shields -= 1;
        s.streak.lastCleared = d;
        events.push({ type: 'shieldUsed' });
      } else {
        s.streak.current = 0;
        break;
      }
      d = addDays(d, 1);
    }
  }

  // Adapt difficulty once a week.
  if (!s.lastTierCheck || daysBetween(s.lastTierCheck, day) >= 7) {
    for (const area of s.profile.areas) {
      let offered = 0;
      let done = 0;
      for (let i = 1; i <= 7; i++) {
        const h = s.history[addDays(day, -i)];
        offered += h?.areaOffered[area] ?? 0;
        done += h?.areaDone[area] ?? 0;
      }
      if (offered >= 3) {
        const rate = done / offered;
        if (rate >= 0.8 && s.tiers[area] < 4) {
          s.tiers[area] = (s.tiers[area] + 1) as Tier;
          events.push({ type: 'tierUp', label: AREA_BY_ID[area].label, value: s.tiers[area] });
        } else if (rate < 0.4 && s.tiers[area] > 1) {
          s.tiers[area] = (s.tiers[area] - 1) as Tier;
        }
      }
    }
    s.lastTierCheck = day;
  }

  // Goals: restart any that ran out of time.
  s.goals = s.goals.map((g) =>
    !g.completedAt && daysBetween(g.start, day) >= 30 ? { ...g, start: day, progress: 0 } : g,
  );

  // Weekly challenge, picked fresh every Monday.
  const week = weekStart(day);
  if (!s.challenge || s.challenge.week !== week) {
    const fitting = CHALLENGES.filter((c) => !c.area || s.profile.areas.includes(c.area));
    const pool = fitting.length ? fitting : CHALLENGES;
    const c = pool[hash(week + s.createdAt) % pool.length];
    s.challenge = { week, id: c.id, daysDone: [], completed: false };
  }

  // Build today's board.
  const queue = generateBoard(s, day);
  s.today = { day, queue, done: [], doneQuests: [], skipped: [], cleared: false, rest: s.restDays.includes(day) };
  const rec = record(s, day);
  rec.offered = queue.filter(isRequired).length;
  rec.areaOffered = {};
  queue.filter(isRequired).forEach((q) => {
    if (q.area) rec.areaOffered[q.area] = (rec.areaOffered[q.area] ?? 0) + 1;
  });
  s.updatedAt = now.getTime();
  checkBadges(s, events, now.getTime());
  return { state: s, events };
};

// ---------------------------------------------------------------- quests

const markCleared = (s: GameState, events: GameEvent[]) => {
  const t = s.today!;
  const rec = record(s, t.day);
  const threshold = CLEAR_THRESHOLD[s.profile.difficulty];
  if (t.cleared || rec.offered === 0 || rec.done / rec.offered < threshold - 1e-9) return;
  t.clearUndo = {
    prevLast: s.streak.lastCleared, prevCurrent: s.streak.current, prevBest: s.streak.best, prevShields: s.streak.shields,
    xp: CLEAR_BONUS_XP, coins: CLEAR_BONUS_COINS,
  };
  t.cleared = true;
  rec.cleared = true;
  s.totals.daysCleared += 1;
  s.streak.current = s.streak.lastCleared === addDays(t.day, -1) ? s.streak.current + 1 : 1;
  s.streak.lastCleared = t.day;
  s.streak.best = Math.max(s.streak.best, s.streak.current);
  if (s.streak.current % 7 === 0 && s.streak.shields < MAX_SHIELDS) s.streak.shields += 1;
  addXp(s, CLEAR_BONUS_XP, CLEAR_BONUS_COINS, events);
  events.push({ type: 'dayCleared', value: s.streak.current });
};

const unmarkCleared = (s: GameState) => {
  const t = s.today!;
  const rec = record(s, t.day);
  const threshold = CLEAR_THRESHOLD[s.profile.difficulty];
  if (!t.cleared || !t.clearUndo || rec.done / Math.max(1, rec.offered) >= threshold - 1e-9) return;
  const u = t.clearUndo;
  s.streak.lastCleared = u.prevLast;
  s.streak.current = u.prevCurrent;
  s.streak.best = u.prevBest;
  s.streak.shields = u.prevShields;
  s.xp = Math.max(0, s.xp - u.xp);
  s.coins = Math.max(0, s.coins - u.coins);
  s.totals.daysCleared = Math.max(0, s.totals.daysCleared - 1);
  t.cleared = false;
  rec.cleared = false;
  delete t.clearUndo;
};

export const completeQuest = (input: GameState, key: string, now: Date, opts: { auto?: boolean } = {}): Result => {
  const idx = input.today?.queue.findIndex((q) => q.key === key) ?? -1;
  if (!input.today || idx < 0) return { state: input, events: [] };
  const s = clone(input);
  const t = s.today!;
  const events: GameEvent[] = [];
  const [q] = t.queue.splice(idx, 1);
  const mult = streakMultiplier(s.streak.current);
  const xp = Math.round(q.xp * mult);
  const coins = Math.round(q.coins * mult);
  const stat = statFor(q);
  const points = statPointsFor(q);
  t.done.push({ key: q.key, at: now.getTime(), xp, coins, stat, statPoints: points, auto: opts.auto });
  t.doneQuests.push(q);
  s.stats[stat] += points;
  s.totals.quests += 1;
  if (q.kind === 'main') s.totals.mains += 1;
  if (now.getHours() < 8 && now.getHours() >= 4) s.totals.earlyBird += 1;

  const rec = record(s, t.day);
  rec.xp += xp;
  if (isRequired(q)) {
    rec.done += 1;
    if (q.area) rec.areaDone[q.area] = (rec.areaDone[q.area] ?? 0) + 1;
  }

  if (q.kind === 'checkin' && q.habitId) {
    const h = s.habits.find((x) => x.id === q.habitId);
    if (h) {
      h.checkins[t.day] = 'clean';
      h.best = Math.max(h.best, cleanDays(h, t.day));
    }
  }

  // Goals in this area move forward.
  if (q.area) {
    const g = s.goals.find((x) => x.area === q.area && !x.completedAt);
    if (g) {
      g.progress += 1;
      const ladder = AREA_BY_ID[g.area].goals;
      const target = ladder[Math.min(g.level, ladder.length - 1)].target;
      if (g.progress >= target) {
        g.completedAt = t.day;
        s.totals.goals += 1;
        events.push({ type: 'goal', label: ladder[Math.min(g.level, ladder.length - 1)].title });
        s.goals.push({ area: g.area, level: Math.min(g.level + 1, ladder.length - 1), start: t.day, progress: 0 });
      }
    }
  }

  addXp(s, xp, coins, events);
  markCleared(s, events);
  s.updatedAt = now.getTime();
  checkBadges(s, events, now.getTime());
  return { state: s, events };
};

export const undoQuest = (input: GameState, key: string, now: Date): Result => {
  const t0 = input.today;
  const di = t0?.done.findIndex((d) => d.key === key) ?? -1;
  if (!t0 || di < 0) return { state: input, events: [] };
  const s = clone(input);
  const t = s.today!;
  const [entry] = t.done.splice(di, 1);
  const qi = t.doneQuests.findIndex((q) => q.key === key);
  const [q] = t.doneQuests.splice(qi, 1);
  t.queue.unshift(q);
  const rec = record(s, t.day);
  rec.xp = Math.max(0, rec.xp - entry.xp);
  if (isRequired(q)) {
    rec.done = Math.max(0, rec.done - 1);
    if (q.area) rec.areaDone[q.area] = Math.max(0, (rec.areaDone[q.area] ?? 0) - 1);
  }
  // Undoing a slip is not offered in the UI, so only real completions are reversed here.
  if (!entry.slip) {
    s.xp = Math.max(0, s.xp - entry.xp);
    s.coins = Math.max(0, s.coins - entry.coins);
    if (entry.stat) s.stats[entry.stat] = Math.max(0, s.stats[entry.stat] - (entry.statPoints ?? 0));
    s.totals.quests = Math.max(0, s.totals.quests - 1);
    if (q.kind === 'main') s.totals.mains = Math.max(0, s.totals.mains - 1);
  }
  if (q.kind === 'checkin' && q.habitId) {
    const h = s.habits.find((x) => x.id === q.habitId);
    if (h) delete h.checkins[t.day];
  }
  if (q.area) {
    const g = s.goals.find((x) => x.area === q.area && !x.completedAt);
    if (g && g.progress > 0) g.progress -= 1;
  }
  unmarkCleared(s);
  s.updatedAt = now.getTime();
  return { state: s, events: [] };
};

/** "Not now": move the current quest to the back of the line. */
export const skipQuest = (input: GameState, key: string, now: Date): Result => {
  const idx = input.today?.queue.findIndex((q) => q.key === key) ?? -1;
  if (!input.today || idx < 0 || input.today.queue.length < 2) return { state: input, events: [] };
  const s = clone(input);
  const [q] = s.today!.queue.splice(idx, 1);
  s.today!.queue.push(q);
  if (!s.today!.skipped.includes(q.key)) s.today!.skipped.push(q.key);
  s.updatedAt = now.getTime();
  return { state: s, events: [] };
};

/** Swap a quest for a different one in the same area (2 per day). */
export const swapsLeft = (s: GameState) =>
  SWAPS_PER_DAY - (s.today?.queue.concat(s.today.doneQuests).filter((q) => q.key.includes('-swap')).length ?? 0);

export const swapQuest = (input: GameState, key: string, now: Date): Result => {
  const t0 = input.today;
  const idx = t0?.queue.findIndex((q) => q.key === key) ?? -1;
  if (!t0 || idx < 0 || swapsLeft(input) <= 0) return { state: input, events: [] };
  const q = t0.queue[idx];
  if (!q.area || q.kind === 'checkin') return { state: input, events: [] };
  const used = new Set(t0.queue.concat(t0.doneQuests).map((x) => x.questId));
  const current = q.questId ? QUEST_BY_ID[q.questId] : undefined;
  const tier = current?.tier ?? input.tiers[q.area];
  const options = Object.values(QUEST_BY_ID).filter((d) => d.area === q.area && !used.has(d.id) && Math.abs(d.tier - tier) <= 1);
  if (!options.length) return { state: input, events: [] };
  const next = options[hash(key + now.getTime()) % options.length];
  const s = clone(input);
  const xp = q.kind === 'main' ? q.xp : Math.round(q.xp * (next.tier >= tier ? 1 : 0.8));
  s.today!.queue[idx] = { ...q, key: `${q.kind}-${next.id}-swap${swapsLeft(input)}`, questId: next.id, title: next.title, why: next.why, xp, coins: coinsFor(xp) };
  s.updatedAt = now.getTime();
  return { state: s, events: [] };
};

// ---------------------------------------------------------------- habits

export const logSlip = (input: GameState, habitId: string, trigger: string | undefined, now: Date): Result => {
  const s = clone(input);
  const t = s.today;
  const h = s.habits.find((x) => x.id === habitId);
  if (!h || !t) return { state: input, events: [] };
  h.best = Math.max(h.best, cleanDays(h, t.day));
  h.slips.push({ day: t.day, trigger });
  h.checkins[t.day] = 'slip';
  h.cleanSince = addDays(t.day, 1);
  // The check-in has been answered, so it leaves the queue (with no XP).
  const idx = t.queue.findIndex((q) => q.kind === 'checkin' && q.habitId === habitId);
  if (idx >= 0) {
    const [q] = t.queue.splice(idx, 1);
    t.done.push({ key: q.key, at: now.getTime(), xp: 0, coins: 0, slip: true });
    t.doneQuests.push(q);
    record(s, t.day).done += 1;
  }
  const events: GameEvent[] = [];
  markCleared(s, events);
  s.updatedAt = now.getTime();
  return { state: s, events };
};

export const logAmount = (input: GameState, habitId: string, amount: number, now: Date): Result => {
  const s = clone(input);
  const h = s.habits.find((x) => x.id === habitId);
  const day = s.today?.day ?? gameDay(now, s.profile.resetHour);
  if (!h) return { state: input, events: [] };
  h.amounts[day] = Math.max(0, (h.amounts[day] ?? 0) + amount);
  s.updatedAt = now.getTime();
  return { state: s, events: [] };
};

/** First day of the limit period (day, Monday-start week, or month) containing `day`. */
export const periodStart = (day: string, period: LimitPeriod = 'day'): string =>
  period === 'week' ? weekStart(day) : period === 'month' ? `${day.slice(0, 8)}01` : day;

/** Amount logged so far in the current limit period. */
export const periodTotal = (h: Habit, day: string): number => {
  const from = periodStart(day, h.period);
  return Object.entries(h.amounts).reduce((n, [d, v]) => (d >= from && d <= day ? n + v : n), 0);
};

/** Change a habit's mode, limit or period. */
export const updateHabit = (input: GameState, habitId: string, patch: Partial<Pick<Habit, 'mode' | 'limit' | 'unit' | 'period'>>, now: Date): Result => {
  const s = clone(input);
  const h = s.habits.find((x) => x.id === habitId);
  if (!h) return { state: input, events: [] };
  Object.assign(h, patch);
  if (h.mode === 'limit') {
    h.limit = Math.max(1, h.limit ?? 1);
    h.unit = h.unit ?? 'times';
  }
  // Refresh today's check-in wording.
  if (s.today) {
    const title = checkinTitle(h);
    s.today.queue = s.today.queue.map((q) => (q.kind === 'checkin' && q.habitId === h.id ? { ...q, title } : q));
  }
  s.updatedAt = now.getTime();
  return { state: s, events: [] };
};

export const resistUrge = (input: GameState, habitId: string, now: Date): Result => {
  const s = clone(input);
  const h = s.habits.find((x) => x.id === habitId);
  if (!h) return { state: input, events: [] };
  const events: GameEvent[] = [];
  h.urgesResisted += 1;
  s.stats.discipline += 1;
  addXp(s, URGE_XP, coinsFor(URGE_XP), events);
  s.updatedAt = now.getTime();
  checkBadges(s, events, now.getTime());
  return { state: s, events };
};

export const addHabit = (input: GameState, c: HabitChoice, now: Date): Result => {
  const s = clone(input);
  s.habits.push(makeHabit(c, gameDay(now, s.profile.resetHour)));
  s.updatedAt = now.getTime();
  return { state: s, events: [] };
};

export const removeHabit = (input: GameState, habitId: string, now: Date): Result => {
  const s = clone(input);
  s.habits = s.habits.filter((h) => h.id !== habitId);
  if (s.today) s.today.queue = s.today.queue.filter((q) => q.habitId !== habitId && q.questId !== `hr:${habitId}`);
  s.updatedAt = now.getTime();
  return { state: s, events: [] };
};

export const swapsFor = (h: Habit) => presetFor(h.presetId, h.name).swaps;

// ---------------------------------------------------------------- rewards

export const buyReward = (input: GameState, rewardId: string, now: Date): Result => {
  const r = input.rewards.find((x) => x.id === rewardId);
  if (!r || input.coins < r.cost) return { state: input, events: [] };
  const s = clone(input);
  s.coins -= r.cost;
  s.purchases.push({ rewardId: r.id, name: r.name, cost: r.cost, at: now.getTime() });
  const events: GameEvent[] = [];
  s.updatedAt = now.getTime();
  checkBadges(s, events, now.getTime());
  return { state: s, events };
};

export const restDayUsedThisWeek = (s: GameState, day: string) =>
  s.restDays.some((d) => weekStart(d) === weekStart(day));

export const canRestToday = (s: GameState) =>
  !!s.today && !s.today.rest && !s.today.cleared && s.coins >= REST_DAY_COST && !restDayUsedThisWeek(s, s.today.day);

/** Rest day pass: take today off without breaking your streak. */
export const takeRestDay = (input: GameState, now: Date): Result => {
  if (!canRestToday(input)) return { state: input, events: [] };
  const s = clone(input);
  const t = s.today!;
  s.coins -= REST_DAY_COST;
  s.restDays.push(t.day);
  t.rest = true;
  record(s, t.day).rest = true;
  s.purchases.push({ rewardId: 'rest-day', name: 'Rest day pass', cost: REST_DAY_COST, at: now.getTime() });
  s.updatedAt = now.getTime();
  return { state: s, events: [] };
};

export const addReward = (input: GameState, name: string, cost: number, now: Date): Result => {
  const s = clone(input);
  s.rewards.push({ id: `rw-${now.getTime().toString(36)}`, name, cost: Math.max(1, Math.round(cost)) });
  s.updatedAt = now.getTime();
  return { state: s, events: [] };
};

export const removeReward = (input: GameState, id: string, now: Date): Result => {
  const s = clone(input);
  s.rewards = s.rewards.filter((r) => r.id !== id);
  s.updatedAt = now.getTime();
  return { state: s, events: [] };
};

// ---------------------------------------------------------------- weekly challenge

export const markChallengeDay = (input: GameState, now: Date): Result => {
  const c = input.challenge;
  const day = input.today?.day;
  if (!c || !day || c.completed || c.daysDone.includes(day)) return { state: input, events: [] };
  const s = clone(input);
  const ch = s.challenge!;
  ch.daysDone.push(day);
  const events: GameEvent[] = [];
  const def = CHALLENGE_BY_ID[ch.id];
  if (def && ch.daysDone.length >= def.days) {
    ch.completed = true;
    s.challengesCompleted += 1;
    addXp(s, CHALLENGE_XP, CHALLENGE_COINS, events);
    events.push({ type: 'goal', label: def.title });
  }
  s.updatedAt = now.getTime();
  checkBadges(s, events, now.getTime());
  return { state: s, events };
};

// ---------------------------------------------------------------- health data

/** Save synced health numbers and finish any quests they satisfy. */
export const applyHealth = (input: GameState, day: string, data: GameState['health'][string], now: Date): Result => {
  let s = clone(input);
  s.health[day] = { ...s.health[day], ...data };
  const events: GameEvent[] = [];
  if (s.today?.day === day) {
    const due = s.today.queue.filter((q) => {
      const def = q.questId ? QUEST_BY_ID[q.questId] : undefined;
      const v = def?.auto ? s.health[day][def.auto.metric] : undefined;
      return def?.auto && v !== undefined && v >= def.auto.value;
    });
    for (const q of due) {
      const r = completeQuest(s, q.key, now, { auto: true });
      s = r.state;
      events.push(...r.events);
    }
  }
  s.updatedAt = now.getTime();
  checkBadges(s, events, now.getTime());
  return { state: s, events };
};

// ---------------------------------------------------------------- settings

export const updateProfile = (input: GameState, patch: Partial<Profile>, now: Date): Result => {
  const s = clone(input);
  const addedAreas = (patch.areas ?? []).filter((a) => !s.profile.areas.includes(a));
  s.profile = { ...s.profile, ...patch };
  const day = gameDay(now, s.profile.resetHour);
  addedAreas.forEach((area) => {
    if (!s.goals.some((g) => g.area === area && !g.completedAt)) s.goals.push({ area, level: 0, start: day, progress: 0 });
  });
  s.updatedAt = now.getTime();
  return { state: s, events: [] };
};

/** Throw away today's board and build a fresh one (after changing areas, etc). */
export const rebuildToday = (input: GameState, now: Date): Result => {
  const s = clone(input);
  if (s.today && s.today.done.length === 0) s.today = null;
  else if (s.today) {
    const day = s.today.day;
    const fresh = generateBoard(s, day).filter((q) => !s.today!.doneQuests.some((d) => d.questId === q.questId));
    s.today.queue = fresh;
    record(s, day).offered = s.today.done.length + fresh.filter(isRequired).length;
    return { state: s, events: [] };
  }
  return ensureToday(s, now);
};

export const addCustomQuest = (input: GameState, area: AreaId, title: string, tier: Tier, everyDay: boolean, now: Date): Result => {
  const s = clone(input);
  s.customQuests.push({ id: `cq-${now.getTime().toString(36)}`, area, title, tier, everyDay });
  s.updatedAt = now.getTime();
  return { state: s, events: [] };
};

export const removeCustomQuest = (input: GameState, id: string, now: Date): Result => {
  const s = clone(input);
  s.customQuests = s.customQuests.filter((c) => c.id !== id);
  s.updatedAt = now.getTime();
  return { state: s, events: [] };
};

export const goalTarget = (area: AreaId, level: number) => {
  const ladder = AREA_BY_ID[area].goals;
  return ladder[Math.min(level, ladder.length - 1)];
};
