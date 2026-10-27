import type { Tier } from './types';

export const TIER_XP: Record<Tier, number> = { 1: 10, 2: 25, 3: 50, 4: 75 };
export const CHECKIN_XP = 20;
export const URGE_XP = 10;
export const CLEAR_BONUS_XP = 50;
export const CLEAR_BONUS_COINS = 10;
export const coinsFor = (xp: number) => Math.max(1, Math.round(xp / 5));

/** XP needed to go from `level` to `level + 1`. */
export const xpForNext = (level: number) => 100 + 50 * (level - 1);

export const levelFor = (totalXp: number) => {
  let level = 1;
  let rest = totalXp;
  while (rest >= xpForNext(level)) {
    rest -= xpForNext(level);
    level += 1;
  }
  return { level, into: rest, need: xpForNext(level) };
};

export const TITLES = ['Novice', 'Apprentice', 'Adventurer', 'Warrior', 'Champion', 'Hero', 'Legend', 'Mythic'];

export const titleFor = (level: number) => TITLES[Math.min(TITLES.length - 1, Math.floor((level - 1) / 5))];

/** +10% per 7 streak days, up to +50%. */
export const streakMultiplier = (streak: number) => 1 + Math.min(0.5, 0.1 * Math.floor(streak / 7));
