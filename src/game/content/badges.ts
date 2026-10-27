import type { GameState } from '../types';
import { bestJourneyDays } from '../journey';
import { levelFor } from '../xp';

export interface BadgeDef {
  id: string;
  name: string;
  desc: string;
  color: string;
  test: (s: GameState) => boolean;
}

const maxClean = (s: GameState) => Math.max(0, ...s.habits.map((h) => h.best));
const urges = (s: GameState) => s.habits.reduce((n, h) => n + h.urgesResisted, 0);
const maxTier = (s: GameState) => Math.max(...Object.values(s.tiers));

export const BADGES: BadgeDef[] = [
  { id: 'first_quest', name: 'First quest', desc: 'Complete your first quest', color: '#3DDC97', test: (s) => s.totals.quests >= 1 },
  { id: 'first_clear', name: 'Day cleared', desc: 'Clear a full day of quests', color: '#FFC23D', test: (s) => s.totals.daysCleared >= 1 },
  { id: 'streak_3', name: '3-day streak', desc: 'Keep a 3-day streak', color: '#FF7A2F', test: (s) => s.streak.best >= 3 },
  { id: 'streak_7', name: '7-day streak', desc: 'Keep a 7-day streak', color: '#FF7A2F', test: (s) => s.streak.best >= 7 },
  { id: 'streak_14', name: '14-day streak', desc: 'Keep a 14-day streak', color: '#FF7A2F', test: (s) => s.streak.best >= 14 },
  { id: 'streak_30', name: '30-day streak', desc: 'Keep a 30-day streak', color: '#FF7A2F', test: (s) => s.streak.best >= 30 },
  { id: 'streak_100', name: '100-day streak', desc: 'Keep a 100-day streak', color: '#FF7A2F', test: (s) => s.streak.best >= 100 },
  { id: 'streak_365', name: 'Year of fire', desc: 'Keep a 365-day streak', color: '#FF7A2F', test: (s) => s.streak.best >= 365 },
  { id: 'level_5', name: 'Level 5', desc: 'Reach level 5', color: '#8C7BFF', test: (s) => levelFor(s.xp).level >= 5 },
  { id: 'level_10', name: 'Level 10', desc: 'Reach level 10', color: '#8C7BFF', test: (s) => levelFor(s.xp).level >= 10 },
  { id: 'level_25', name: 'Level 25', desc: 'Reach level 25', color: '#8C7BFF', test: (s) => levelFor(s.xp).level >= 25 },
  { id: 'level_50', name: 'Level 50', desc: 'Reach level 50', color: '#8C7BFF', test: (s) => levelFor(s.xp).level >= 50 },
  { id: 'quests_10', name: '10 quests', desc: 'Complete 10 quests', color: '#4FC3FF', test: (s) => s.totals.quests >= 10 },
  { id: 'quests_100', name: '100 quests', desc: 'Complete 100 quests', color: '#4FC3FF', test: (s) => s.totals.quests >= 100 },
  { id: 'quests_500', name: '500 quests', desc: 'Complete 500 quests', color: '#4FC3FF', test: (s) => s.totals.quests >= 500 },
  { id: 'quests_1000', name: '1,000 quests', desc: 'Complete 1,000 quests', color: '#4FC3FF', test: (s) => s.totals.quests >= 1000 },
  { id: 'mains_10', name: 'Hero', desc: 'Complete 10 main quests', color: '#FFC23D', test: (s) => s.totals.mains >= 10 },
  { id: 'clears_10', name: 'Unstoppable', desc: 'Clear 10 full days', color: '#FFC23D', test: (s) => s.totals.daysCleared >= 10 },
  { id: 'early_bird', name: 'Early bird', desc: 'Finish 5 quests before 8 am', color: '#5EE3C1', test: (s) => s.totals.earlyBird >= 5 },
  { id: 'goal_1', name: 'Goal getter', desc: 'Complete a 30-day goal', color: '#3DDC97', test: (s) => s.totals.goals >= 1 },
  { id: 'goal_5', name: 'Achiever', desc: 'Complete five 30-day goals', color: '#3DDC97', test: (s) => s.totals.goals >= 5 },
  { id: 'mastery', name: 'Mastery', desc: 'Reach the top tier in any area', color: '#B58CFF', test: (s) => maxTier(s) >= 4 },
  { id: 'clean_1', name: 'Day one', desc: 'One clean day from a bad habit', color: '#FF4FA3', test: (s) => maxClean(s) >= 1 },
  { id: 'clean_7', name: 'Clean week', desc: '7 clean days in a row', color: '#FF4FA3', test: (s) => maxClean(s) >= 7 },
  { id: 'clean_30', name: 'Clean month', desc: '30 clean days in a row', color: '#FF4FA3', test: (s) => maxClean(s) >= 30 },
  { id: 'clean_90', name: 'Breaking free', desc: '90 clean days in a row', color: '#FF4FA3', test: (s) => maxClean(s) >= 90 },
  { id: 'clean_365', name: 'Free for a year', desc: '365 clean days in a row', color: '#FF4FA3', test: (s) => maxClean(s) >= 365 },
  { id: 'urges_10', name: 'Iron will', desc: 'Resist 10 urges', color: '#C3E44F', test: (s) => urges(s) >= 10 },
  { id: 'reward_1', name: 'Treat yourself', desc: 'Redeem your first reward', color: '#FFC23D', test: (s) => s.purchases.length >= 1 },
  { id: 'challenge_1', name: 'Challenger', desc: 'Complete a weekly challenge', color: '#FF9F6B', test: (s) => s.challengesCompleted >= 1 },
  { id: 'challenge_5', name: 'Champion', desc: 'Complete 5 weekly challenges', color: '#FF9F6B', test: (s) => s.challengesCompleted >= 5 },
  { id: 'journey_7', name: 'Spark lit', desc: 'Reach Day 7 of a habit journey', color: '#3DDC97', test: (s) => bestJourneyDays(s) >= 7 },
  { id: 'journey_21', name: 'Builder', desc: 'Reach Day 21 of a habit journey', color: '#4FC3FF', test: (s) => bestJourneyDays(s) >= 21 },
  { id: 'journey_45', name: 'Unshakeable', desc: 'Reach Day 45 of a habit journey', color: '#8C7BFF', test: (s) => bestJourneyDays(s) >= 45 },
  { id: 'journey_done', name: 'Habit formed', desc: 'Finish a 66-day habit journey', color: '#FFC23D', test: (s) => (s.journeysDone ?? []).length >= 1 },
  { id: 'journey_90', name: 'Legend', desc: 'Finish a 90-day hard-mode journey', color: '#FF4FA3', test: (s) => (s.journeysDone ?? []).some((j) => j.length >= 90) },
  { id: 'health_link', name: 'Connected', desc: 'Sync health data for the first time', color: '#5EE3C1', test: (s) => Object.keys(s.health).length >= 1 },
];

export const BADGE_BY_ID = Object.fromEntries(BADGES.map((b) => [b.id, b]));
