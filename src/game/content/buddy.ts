// Your companion creature: species, growth stages and the dress-up items
// that unlock at milestones. Pure data and rules, no drawing.

import type { GameState } from '../types';
import { levelFor } from '../xp';

export type Species = 'fox' | 'owl' | 'dragon' | 'cat';
export type Slot = 'head' | 'face' | 'neck' | 'color';
export type Mood = 'happy' | 'cheer' | 'sleepy' | 'worried' | 'proud';

export const SPECIES: { id: Species; label: string; blurb: string }[] = [
  { id: 'fox', label: 'Fox', blurb: 'Quick and playful' },
  { id: 'owl', label: 'Owl', blurb: 'Calm and wise' },
  { id: 'dragon', label: 'Dragon', blurb: 'Brave and fiery' },
  { id: 'cat', label: 'Cat', blurb: 'Cosy and curious' },
];

/** Older saves used hero classes; each maps to a creature. */
const LEGACY: Record<string, Species> = { knight: 'dragon', ranger: 'fox', mage: 'owl', monk: 'cat', rogue: 'fox', bard: 'cat' };

export const speciesFor = (avatar: string | undefined): Species => {
  if (SPECIES.some((s) => s.id === avatar)) return avatar as Species;
  return LEGACY[avatar ?? ''] ?? 'fox';
};

/** 1 = baby (levels 1-4), 2 = young (5-14), 3 = grown (15+). */
export const stageForLevel = (level: number): 1 | 2 | 3 => (level >= 15 ? 3 : level >= 5 ? 2 : 1);
export const STAGE_NAMES = ['', 'Baby', 'Young', 'Grown'];
export const EVOLVE_LEVELS = [5, 15];

export interface BuddyItem {
  id: string;
  slot: Slot;
  name: string;
  /** How to unlock it, shown while it is locked. */
  how: string;
  unlocked: (s: GameState) => boolean;
}

const level = (s: GameState) => levelFor(s.xp).level;

export const ITEMS: BuddyItem[] = [
  { id: 'party', slot: 'head', name: 'Party hat', how: 'Reach level 3', unlocked: (s) => level(s) >= 3 },
  { id: 'wizard', slot: 'head', name: 'Wizard hat', how: 'Reach level 10', unlocked: (s) => level(s) >= 10 },
  { id: 'headphones', slot: 'head', name: 'Headphones', how: 'Finish 100 quests', unlocked: (s) => s.totals.quests >= 100 },
  { id: 'flowers', slot: 'head', name: 'Flower crown', how: 'Reach a 30-day streak', unlocked: (s) => s.streak.best >= 30 },
  { id: 'crown', slot: 'head', name: 'Royal crown', how: 'Finish a 66-day journey', unlocked: (s) => (s.journeysDone?.length ?? 0) > 0 },
  { id: 'shades', slot: 'face', name: 'Cool shades', how: 'Reach a 7-day streak', unlocked: (s) => s.streak.best >= 7 },
  { id: 'glasses', slot: 'face', name: 'Smart glasses', how: 'Complete 3 goals', unlocked: (s) => s.totals.goals >= 3 },
  { id: 'bow', slot: 'neck', name: 'Bow tie', how: 'Finish 25 quests', unlocked: (s) => s.totals.quests >= 25 },
  { id: 'scarf', slot: 'neck', name: 'Cosy scarf', how: 'Clear 10 days', unlocked: (s) => s.totals.daysCleared >= 10 },
  { id: 'mint', slot: 'color', name: 'Mint', how: 'Reach level 5', unlocked: (s) => level(s) >= 5 },
  { id: 'sunset', slot: 'color', name: 'Sunset', how: 'Reach a 14-day streak', unlocked: (s) => s.streak.best >= 14 },
  { id: 'galaxy', slot: 'color', name: 'Galaxy', how: 'Reach level 20', unlocked: (s) => level(s) >= 20 },
];

export const ITEM_BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i])) as Record<string, BuddyItem>;

export const unlockedItems = (s: GameState): string[] => ITEMS.filter((i) => i.unlocked(s)).map((i) => i.id);

/** Items unlocked but not yet announced. */
export const newUnlocks = (s: GameState): string[] => {
  const seen = new Set(s.profile.buddySeen ?? []);
  return unlockedItems(s).filter((id) => !seen.has(id));
};

/** What your buddy is wearing (only unlocked items count). */
export const outfitFor = (s: GameState): Partial<Record<Slot, string>> => {
  const out: Partial<Record<Slot, string>> = {};
  const worn = s.profile.buddy ?? {};
  (Object.keys(worn) as Slot[]).forEach((slot) => {
    const id = worn[slot];
    if (id && ITEM_BY_ID[id]?.unlocked(s)) out[slot] = id;
  });
  return out;
};

/** How your buddy feels right now. Never guilt: evenings are calm, not worried. */
export const moodFor = (s: GameState, now: Date): Mood => {
  const h = now.getHours();
  if (s.today?.cleared) return h >= 22 || h < 5 ? 'sleepy' : 'proud';
  if (h >= 22 || h < 5) return 'sleepy';
  return 'happy';
};

const CHEERS = ['Nice one!', 'That counts!', 'Look at you go!', 'Another one done!', 'Proud of you.', 'Smooth!', 'Yes! Small steps add up.', 'High five!'];

/** A different cheer after each finished quest. */
export const cheerLine = (n: number) => CHEERS[n % CHEERS.length];

/** A short line your buddy says when you tap it. */
export const buddyLine = (s: GameState, mood: Mood, n: number, now = new Date()): string => {
  const name = s.profile.name || 'friend';
  const left = s.today ? s.today.queue.filter((q) => q.kind !== 'bonus').length : 0;
  const evening = now.getHours() >= 18;
  const lines: Record<Mood, string[]> = {
    happy: evening
      ? ['Still time for one small quest, if you feel like it.', 'Rest counts too. Be kind to yourself tonight.', "Whatever today looked like, I'm glad you're here."]
      : [`Let's go, ${name}!`, left ? `${left} quest${left === 1 ? '' : 's'} to go today.` : 'What a day!', 'One small step at a time.', 'I believe in you!'],
    cheer: CHEERS,
    sleepy: ['Yawn... time to rest.', 'Sleep well, see you tomorrow.', 'Zzz...'],
    worried: ["It's okay. Tomorrow is a fresh start."],
    proud: ['Day cleared! I am so proud.', `${s.streak.current} days in a row!`, 'Legend behaviour.'],
  };
  const list = lines[mood];
  return list[n % list.length];
};
