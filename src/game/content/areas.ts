import type { AreaId, StatId } from '../types';

export interface AreaDef {
  id: AreaId;
  label: string;
  short: string;
  color: string;
  stat: StatId;
  /** 30-day goal ladder. `target` = quests in this area to finish within 30 days. */
  goals: { title: string; target: number }[];
}

export const AREAS: AreaDef[] = [
  {
    id: 'fitness', label: 'Fitness', short: 'Fi', color: 'var(--orange)', stat: 'strength',
    goals: [
      { title: 'Move your body 3 times a week', target: 12 },
      { title: 'Work out 4 times a week', target: 16 },
      { title: 'Train 5 times a week', target: 20 },
      { title: 'Train almost every day', target: 26 },
    ],
  },
  {
    id: 'sleep', label: 'Sleep', short: 'Sl', color: 'var(--purple)', stat: 'vitality',
    goals: [
      { title: 'Build a calm bedtime routine', target: 12 },
      { title: 'In bed on time 5 nights a week', target: 20 },
      { title: 'Sleep 7+ hours most nights', target: 24 },
      { title: 'Master your sleep', target: 28 },
    ],
  },
  {
    id: 'nutrition', label: 'Nutrition', short: 'Nu', color: 'var(--green)', stat: 'vitality',
    goals: [
      { title: 'Add more water and fruit', target: 12 },
      { title: 'Eat clean 4 days a week', target: 16 },
      { title: 'Cook and eat well most days', target: 22 },
      { title: 'Fuel like an athlete', target: 26 },
    ],
  },
  {
    id: 'mind', label: 'Mind & focus', short: 'Mi', color: 'var(--blue)', stat: 'focus',
    goals: [
      { title: 'Start each day with a plan', target: 12 },
      { title: 'Focus deeply 4 days a week', target: 16 },
      { title: 'Deep work most days', target: 22 },
      { title: 'Become distraction-proof', target: 26 },
    ],
  },
  {
    id: 'learning', label: 'Learning', short: 'Le', color: 'var(--gold)', stat: 'intellect',
    goals: [
      { title: 'Read a little, often', target: 12 },
      { title: 'Learn something 4 days a week', target: 16 },
      { title: 'Study most days', target: 22 },
      { title: 'Become a lifelong learner', target: 26 },
    ],
  },
  {
    id: 'career', label: 'Career & money', short: 'Ca', color: 'var(--teal)', stat: 'focus',
    goals: [
      { title: 'Get a grip on your money', target: 10 },
      { title: 'Grow your career every week', target: 14 },
      { title: 'Build momentum on your goals', target: 18 },
      { title: 'Level up your career', target: 22 },
    ],
  },
  {
    id: 'relationships', label: 'Relationships', short: 'Re', color: 'var(--pink)', stat: 'charisma',
    goals: [
      { title: 'Reach out to people you care about', target: 10 },
      { title: 'Connect with someone most days', target: 16 },
      { title: 'Deepen your relationships', target: 20 },
      { title: 'Be the friend everyone wants', target: 24 },
    ],
  },
  {
    id: 'home', label: 'Home & order', short: 'Ho', color: 'var(--lime)', stat: 'discipline',
    goals: [
      { title: 'Keep your space tidy', target: 12 },
      { title: 'A calm, ordered home', target: 16 },
      { title: 'Declutter your life', target: 20 },
      { title: 'Home on autopilot', target: 24 },
    ],
  },
  {
    id: 'mindfulness', label: 'Mindfulness', short: 'Mf', color: 'var(--violet)', stat: 'spirit',
    goals: [
      { title: 'Pause and breathe daily', target: 12 },
      { title: 'Meditate 4 days a week', target: 16 },
      { title: 'A calm mind most days', target: 22 },
      { title: 'Inner peace master', target: 26 },
    ],
  },
  {
    id: 'creativity', label: 'Creativity', short: 'Cr', color: 'var(--coral)', stat: 'spirit',
    goals: [
      { title: 'Make something every week', target: 8 },
      { title: 'Create 3 times a week', target: 12 },
      { title: 'A creative habit', target: 18 },
      { title: 'Creator mode', target: 22 },
    ],
  },
];

export const AREA_BY_ID = Object.fromEntries(AREAS.map((a) => [a.id, a])) as Record<AreaId, AreaDef>;

export const STATS: { id: StatId; label: string; color: string }[] = [
  { id: 'strength', label: 'Strength', color: 'var(--orange)' },
  { id: 'vitality', label: 'Vitality', color: 'var(--purple)' },
  { id: 'intellect', label: 'Intellect', color: 'var(--gold)' },
  { id: 'focus', label: 'Focus', color: 'var(--blue)' },
  { id: 'spirit', label: 'Spirit', color: 'var(--violet)' },
  { id: 'charisma', label: 'Charisma', color: 'var(--pink)' },
  { id: 'discipline', label: 'Discipline', color: 'var(--lime)' },
];
