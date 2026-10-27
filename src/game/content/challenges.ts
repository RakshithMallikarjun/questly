import type { AreaId } from '../types';

export interface ChallengeDef {
  id: string;
  title: string;
  days: number; // days needed within the week
  area?: AreaId;
}

export const CHALLENGES: ChallengeDef[] = [
  { id: 'nophonebed', title: 'No phone in bed for 5 nights', days: 5, area: 'sleep' },
  { id: 'workout4', title: 'Work out on 4 days this week', days: 4, area: 'fitness' },
  { id: 'bed11', title: 'In bed by 11 pm on 5 nights', days: 5, area: 'sleep' },
  { id: 'read7', title: 'Read every day this week', days: 7, area: 'learning' },
  { id: 'cook4', title: 'Cook at home 4 times', days: 4, area: 'nutrition' },
  { id: 'nosocialam', title: 'No social media before noon on 5 days', days: 5, area: 'mind' },
  { id: 'meditate5', title: 'Meditate on 5 days', days: 5, area: 'mindfulness' },
  { id: 'call3', title: 'Call 3 people you care about', days: 3, area: 'relationships' },
  { id: 'nojunk5', title: 'No junk food for 5 days', days: 5, area: 'nutrition' },
  { id: 'steps4', title: 'Walk 10,000 steps on 4 days', days: 4, area: 'fitness' },
  { id: 'tidy5', title: '10-minute tidy-up on 5 days', days: 5, area: 'home' },
  { id: 'create3', title: 'Make something creative 3 times', days: 3, area: 'creativity' },
  { id: 'nospend5', title: 'No impulse spending for 5 days', days: 5, area: 'career' },
  { id: 'gratitude7', title: 'Write 3 gratitudes every night', days: 7, area: 'mindfulness' },
];

export const CHALLENGE_BY_ID = Object.fromEntries(CHALLENGES.map((c) => [c.id, c]));
export const CHALLENGE_XP = 200;
export const CHALLENGE_COINS = 40;
