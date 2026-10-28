// Core data shapes for Questly. Everything the app remembers lives in one
// `GameState` object, which is saved on the device and synced to the cloud.

export type AreaId =
  | 'fitness'
  | 'sleep'
  | 'nutrition'
  | 'mind'
  | 'learning'
  | 'career'
  | 'relationships'
  | 'home'
  | 'mindfulness'
  | 'creativity';

export type StatId =
  | 'strength'
  | 'vitality'
  | 'intellect'
  | 'focus'
  | 'spirit'
  | 'charisma'
  | 'discipline';

export type Tier = 1 | 2 | 3 | 4;
export type TimeOfDay = 'morning' | 'day' | 'evening' | 'any';
export type Energy = 'morning' | 'afternoon' | 'evening' | 'varies';
export type Difficulty = 'gentle' | 'balanced' | 'hardcore';
export type Weekday = 'student' | 'office' | 'shift' | 'flexible';
export type HealthMetric = 'steps' | 'sleepHours' | 'workoutMinutes' | 'mindfulMinutes';

export interface QuestDef {
  id: string;
  area: AreaId;
  tier: Tier;
  minutes: number;
  when: TimeOfDay;
  title: string;
  why: string;
  /** Completed automatically when synced health data reaches this value. */
  auto?: { metric: HealthMetric; value: number };
}

export type QuestKind = 'main' | 'daily' | 'bonus' | 'checkin' | 'journey';

/** One quest on today's board. */
export interface QuestInstance {
  key: string; // unique within the day
  kind: QuestKind;
  questId?: string; // library or custom quest id
  habitId?: string; // for check-ins
  area?: AreaId;
  title: string;
  why: string;
  xp: number;
  coins: number;
}

export interface DoneEntry {
  key: string;
  at: number; // timestamp
  xp: number;
  coins: number;
  stat?: StatId;
  statPoints?: number;
  slip?: boolean;
  auto?: boolean;
}

export type HabitMode = 'quit' | 'limit';
export type LimitPeriod = 'day' | 'week' | 'month';

export interface Habit {
  id: string;
  presetId: string; // 'custom' for typed habits
  name: string;
  mode: HabitMode;
  limit?: number; // for limit mode
  period?: LimitPeriod; // the limit is per day (default), week or month
  unit?: string; // 'min', 'cups', ...
  cleanSince: string; // day key the current clean run started
  best: number; // best clean run in days
  slips: { day: string; trigger?: string }[];
  urgesResisted: number;
  amounts: Record<string, number>; // day key -> logged amount (limit mode)
  checkins: Record<string, 'clean' | 'slip'>; // day key -> result
}

export interface Profile {
  name: string;
  avatar: string; // avatar id
  areas: AreaId[];
  weekday: Weekday;
  activity: 0 | 1 | 2 | 3;
  sleep: 0 | 1 | 2 | 3; // 0 = great, 3 = poor
  minutes: 10 | 20 | 40 | 60;
  energy: Energy;
  difficulty: Difficulty;
  motivations: string[];
  reminders: Reminders;
  /** Secret key the Apple Health shortcut uses to send data (see Profile). */
  healthKey?: string;
  /** Your own "finish by" times, keyed by quest id (or `checkin:<habitId>`). */
  dueTimes?: Record<string, string>;
  resetHour: number;
  sound: boolean;
  /** Phone vibration on quest wins. Missing means on. */
  vibrate?: boolean;
  /** Calm mode: less motion and no confetti. */
  calm?: boolean;
  /** What your companion wears, by slot (head, face, neck, color). */
  buddy?: { head?: string; face?: string; neck?: string; color?: string };
  /** Dress-up items already announced, so each unlock is celebrated once. */
  buddySeen?: string[];
  /** Guided tours already seen (the first-run tour and each "What's new"). */
  toursSeen?: string[];
  language: string;
}

export interface Reminders {
  /** Fixed daily reminder times ("HH:MM"), or null when off. */
  morning: string | null;
  evening: string | null;
  /** Nudge before each quest's "finish by" time. Missing means on. */
  perQuest?: boolean;
  /** Minutes before the finish-by time. Missing means 30. */
  lead?: number;
  /** No notifications between these times. Missing means 22:30 to 07:00. */
  quiet?: { from: string; to: string } | null;
}

export interface Goal {
  area: AreaId;
  level: number; // index into the area's goal ladder
  start: string; // day key
  progress: number; // area quests completed since start
  completedAt?: string;
}

export interface DayRecord {
  offered: number; // required quests offered
  done: number; // required quests done
  cleared: boolean;
  rest: boolean;
  xp: number;
  areaOffered: Partial<Record<AreaId, number>>;
  areaDone: Partial<Record<AreaId, number>>;
}

export interface TodayState {
  day: string;
  queue: QuestInstance[]; // first item is the current quest
  done: DoneEntry[];
  doneQuests: QuestInstance[]; // the quest data for each done entry
  skipped: string[];
  cleared: boolean;
  rest: boolean;
  /** What clearing the day changed, so an undo can put it back. */
  /** Today's mystery chest, once opened. */
  chest?: { reward: 'coins' | 'xp' | 'shield'; amount: number };
  clearUndo?: { prevLast: string | null; prevCurrent: number; prevBest: number; prevShields: number; xp: number; coins: number };
}

export interface Reward {
  id: string;
  name: string;
  cost: number;
}

export interface Purchase {
  rewardId: string;
  name: string;
  cost: number;
  at: number;
}

export interface WeeklyChallenge {
  week: string; // day key of the Monday
  id: string;
  daysDone: string[];
  completed: boolean;
}

/** One habit inside a 66-day journey. */
export interface JourneyHabit {
  id: string;
  title: string; // short name, e.g. "Walk"
  /** The daily task for each stage of this habit, easiest first. */
  steps: string[];
  area?: AreaId;
  /** Linked "break a habit" tracker: its daily check-in counts as this habit. */
  habitId?: string;
  /** Journey day on which this habit joins (habits are added gradually). */
  joinsOn: number;
}

/** A 66-day (or 90-day) habit journey. Only one runs at a time. */
export interface Journey {
  id: string;
  bundleId: string; // ready-made bundle id, or 'custom'
  name: string;
  length: number; // 66 or 90
  habits: JourneyHabit[];
  startDay: string;
  /** Days fully completed. The journey moves one step for each. */
  doneDays: string[];
  missedDays: string[];
  lives: number;
  /** Out of lives: a comeback quest appears until you complete a day. */
  comeback: boolean;
  /** Last day already checked for a miss. */
  checkedThrough: string;
  /** Milestone days already rewarded. */
  milestones: number[];
  /** What completing today changed, so an undo can put it back. */
  undo?: { day: string; xp: number; coins: number; life: boolean; comeback: boolean; milestone?: number; finished: boolean };
  finishedOn?: string;
}

export interface FinishedJourney {
  name: string;
  length: number;
  startDay: string;
  finishedOn: string;
}

export interface HealthDay {
  steps?: number;
  sleepHours?: number;
  workoutMinutes?: number;
  mindfulMinutes?: number;
}

export interface CustomQuest {
  id: string;
  area: AreaId;
  title: string;
  tier: Tier;
  everyDay: boolean;
}

export interface GameState {
  version: 1;
  createdAt: number;
  updatedAt: number;
  onboarded: boolean;
  profile: Profile;
  xp: number;
  coins: number;
  streak: { current: number; best: number; lastCleared: string | null; shields: number };
  stats: Record<StatId, number>;
  tiers: Record<AreaId, Tier>;
  lastTierCheck: string | null;
  goals: Goal[];
  habits: Habit[];
  history: Record<string, DayRecord>;
  today: TodayState | null;
  badges: Record<string, number>; // badge id -> unlocked timestamp
  rewards: Reward[];
  purchases: Purchase[];
  restDays: string[];
  challenge: WeeklyChallenge | null;
  challengesCompleted: number;
  /** The habit journey in progress (missing on older saves). */
  journey?: Journey | null;
  journeysDone?: FinishedJourney[];
  customQuests: CustomQuest[];
  health: Record<string, HealthDay>;
  totals: { quests: number; mains: number; daysCleared: number; goals: number; earlyBird: number };
}

/** Things that happened as a result of an action, for celebrations. */
export interface GameEvent {
  type:
    | 'levelUp' | 'badge' | 'dayCleared' | 'streak' | 'goal' | 'shieldUsed' | 'tierUp'
    | 'journeyDay' | 'journeyMilestone' | 'journeyDone' | 'lifeLost' | 'lifeRestored' | 'unlock';
  value?: number;
  id?: string;
  label?: string;
}
