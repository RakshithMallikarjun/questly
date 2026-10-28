// Ready-made habit journeys. Each bundle has 3 habits that join one at a time
// (Day 1, Day 8 and Day 22), and each habit's daily task gets a little harder
// at every stage. Research (Lally et al., 2009, UCL) found it takes 66 days on
// average for a daily habit to become automatic, so that is the default length.

import type { AreaId } from '../types';

export interface JourneyHabitDef {
  id: string;
  title: string;
  area: AreaId;
  /** Daily task for each stage, easiest first. */
  steps: string[];
}

export interface JourneyBundle {
  id: string;
  name: string;
  tagline: string;
  area: AreaId;
  habits: JourneyHabitDef[];
}

export const JOURNEY_LENGTHS = [66, 90] as const;
export const DEFAULT_LENGTH = 66;
export const MAX_LIVES = 3;

/** Habits join the journey one at a time, so change is gradual. */
export const JOIN_DAYS = [1, 8, 22];

export interface Stage {
  name: string;
  from: number;
  to: number;
  color: string;
  /** Reward for finishing the stage. */
  xp: number;
  coins: number;
}

/** The map's zones. The last stage ends on the journey's final day. */
export const stagesFor = (length: number): Stage[] => {
  const base: Stage[] = [
    { name: 'Spark Meadow', from: 1, to: 7, color: 'var(--green)', xp: 150, coins: 30 },
    { name: "Builder's Forest", from: 8, to: 21, color: 'var(--blue)', xp: 300, coins: 60 },
    { name: 'Grit Mountains', from: 22, to: 45, color: 'var(--purple)', xp: 500, coins: 100 },
    { name: 'Summit of Mastery', from: 46, to: 66, color: 'var(--gold)', xp: 1000, coins: 250 },
  ];
  if (length > 66) base.push({ name: "Legend's Peak", from: 67, to: length, color: 'var(--pink)', xp: 1500, coins: 350 });
  else base[base.length - 1].to = length;
  return base;
};

/** Extra tasks that win back a life after running out. */
export const COMEBACK_QUESTS = [
  'Write down why this journey matters to you, and what tripped you up',
  'Do every habit today, plus 5 extra minutes on the hardest one',
  'Plan tomorrow: when and where you will do each habit',
  'Tell a friend about your journey and ask them to check on you',
  'Remove one thing that got in your way (notification, snack, app)',
];

export const JOURNEY_BUNDLES: JourneyBundle[] = [
  {
    id: 'fit', name: 'Fit Body', tagline: 'Move a little more every week.', area: 'fitness',
    habits: [
      { id: 'walk', title: 'Walk', area: 'fitness', steps: ['Walk for 10 minutes', 'Walk for 20 minutes', 'Walk for 30 minutes', 'Walk for 45 minutes', 'Walk or run for 60 minutes'] },
      { id: 'pushups', title: 'Push-ups', area: 'fitness', steps: ['Do 5 push-ups (knees are fine)', 'Do 10 push-ups', 'Do 20 push-ups', 'Do 30 push-ups'] },
      { id: 'stretch', title: 'Stretch', area: 'fitness', steps: ['Stretch for 5 minutes', 'Stretch for 10 minutes', 'Do 15 minutes of stretching or yoga'] },
    ],
  },
  {
    id: 'sleep', name: 'Deep Sleep', tagline: 'Wake up rested, every day.', area: 'sleep',
    habits: [
      { id: 'screensoff', title: 'Screens off', area: 'sleep', steps: ['Screens off 30 minutes before bed', 'Screens off 45 minutes before bed', 'Screens off 1 hour before bed', 'Screens off 1 hour before bed, phone outside the bedroom'] },
      { id: 'bedtime', title: 'Same bedtime', area: 'sleep', steps: ['In bed within 1 hour of your target time', 'In bed within 30 minutes of your target time', 'In bed within 15 minutes of your target time', 'In bed on time, lights out within 15 minutes'] },
      { id: 'winddown', title: 'Wind down', area: 'sleep', steps: ['Read 5 pages of a paper book in bed', 'Read 10 pages in bed', 'Read 15 pages and dim the lights'] },
    ],
  },
  {
    id: 'calm', name: 'Calm Mind', tagline: 'Less stress, more presence.', area: 'mindfulness',
    habits: [
      { id: 'meditate', title: 'Meditate', area: 'mindfulness', steps: ['Meditate for 2 minutes', 'Meditate for 5 minutes', 'Meditate for 10 minutes', 'Meditate for 15 minutes', 'Meditate for 20 minutes'] },
      { id: 'gratitude', title: 'Gratitude', area: 'mindfulness', steps: ['Write 1 thing you are grateful for', 'Write 3 things you are grateful for', 'Write 3 gratitudes and why each matters'] },
      { id: 'breathe', title: 'Breathing break', area: 'mindfulness', steps: ['Take 5 slow breaths at lunch', 'Take a 2-minute breathing break at lunch'] },
    ],
  },
  {
    id: 'morning', name: 'Morning Reset', tagline: 'Own the first hour of your day.', area: 'mind',
    habits: [
      { id: 'nophone', title: 'Phone-free start', area: 'mind', steps: ['No phone for the first 10 minutes after waking', 'No phone for the first 20 minutes', 'No phone for the first 30 minutes', 'No phone for the first hour'] },
      { id: 'water', title: 'Morning water', area: 'nutrition', steps: ['Drink a glass of water right after waking', 'Drink a big glass of water and open a window'] },
      { id: 'plan', title: 'Plan the day', area: 'career', steps: ['Write the one thing that would make today a win', 'Write your top 3 tasks for today', 'Plan your day in time blocks'] },
    ],
  },
  {
    id: 'learn', name: 'Lifelong Learner', tagline: 'Grow your mind a little every day.', area: 'learning',
    habits: [
      { id: 'read', title: 'Read', area: 'learning', steps: ['Read for 5 minutes', 'Read for 10 minutes', 'Read for 20 minutes', 'Read for 30 minutes'] },
      { id: 'skill', title: 'Practise a skill', area: 'learning', steps: ['Practise a new skill for 5 minutes', 'Practise for 10 minutes', 'Practise for 20 minutes'] },
      { id: 'note', title: 'Learning note', area: 'learning', steps: ['Write down one thing you learned today', 'Explain one thing you learned to someone (or out loud)'] },
    ],
  },
  {
    id: 'eat', name: 'Clean Eating', tagline: 'Fuel your body better.', area: 'nutrition',
    habits: [
      { id: 'hydrate', title: 'Hydrate', area: 'nutrition', steps: ['Drink 5 glasses of water', 'Drink 6 glasses of water', 'Drink 8 glasses of water'] },
      { id: 'veg', title: 'Veggies', area: 'nutrition', steps: ['Eat 1 portion of vegetables', 'Eat 2 portions of vegetables', 'Eat 3 portions of vegetables'] },
      { id: 'nosugar', title: 'No sugary drinks', area: 'nutrition', steps: ['No sugary drinks today', 'No sugary drinks or desserts today'] },
    ],
  },
  {
    id: 'detox', name: 'Digital Detox', tagline: 'Take your time back from your phone.', area: 'mind',
    habits: [
      { id: 'socialcap', title: 'Social media cap', area: 'mind', steps: ['Under 90 minutes of social media', 'Under 60 minutes of social media', 'Under 45 minutes of social media', 'Under 30 minutes of social media'] },
      { id: 'meals', title: 'Phone-free meals', area: 'relationships', steps: ['Eat one meal without your phone', 'Eat two meals without your phone', 'Every meal without your phone'] },
      { id: 'offline', title: 'Offline hour', area: 'mind', steps: ['Spend 30 minutes fully offline', 'Spend 1 hour fully offline'] },
    ],
  },
  {
    id: 'focus', name: 'Deep Focus', tagline: 'Do your best work, without the chaos.', area: 'career',
    habits: [
      { id: 'deepwork', title: 'Deep work', area: 'career', steps: ['One 15-minute focus block, no distractions', 'One 25-minute focus block', 'One 45-minute focus block', 'Two 45-minute focus blocks'] },
      { id: 'tomorrow', title: 'Plan tomorrow', area: 'career', steps: ["Write tomorrow's top task before you stop work", "Write tomorrow's top 3 tasks before you stop work"] },
      { id: 'tidydesk', title: 'Clear desk', area: 'home', steps: ['Clear your desk before you stop work', 'Clear your desk and your inbox to zero'] },
    ],
  },
  {
    id: 'connect', name: 'Real Connection', tagline: 'Show up for the people you love.', area: 'relationships',
    habits: [
      { id: 'reachout', title: 'Reach out', area: 'relationships', steps: ['Send a kind message to someone', 'Call or voice-note someone you care about', 'Have a real 10-minute conversation with someone'] },
      { id: 'present', title: 'Be present', area: 'relationships', steps: ['Put your phone away during one conversation', 'Phone away during every conversation'] },
      { id: 'kindness', title: 'Kindness', area: 'relationships', steps: ['Give someone a genuine compliment', 'Do one small kind thing for someone'] },
    ],
  },
  {
    id: 'home', name: 'Calm Home', tagline: 'A tidy space for a clear head.', area: 'home',
    habits: [
      { id: 'tidy', title: 'Tidy up', area: 'home', steps: ['5-minute tidy-up', '10-minute tidy-up', '15-minute tidy-up'] },
      { id: 'bed', title: 'Make the bed', area: 'home', steps: ['Make your bed after waking', 'Make your bed and open the curtains'] },
      { id: 'dishes', title: 'Clean kitchen', area: 'home', steps: ['No dishes left in the sink at bedtime', 'Kitchen clean and counters wiped at bedtime'] },
    ],
  },
  {
    id: 'create', name: 'Creative Spark', tagline: 'Make something, every single day.', area: 'creativity',
    habits: [
      { id: 'make', title: 'Create', area: 'creativity', steps: ['Create something for 5 minutes', 'Create for 15 minutes', 'Create for 30 minutes'] },
      { id: 'ideas', title: 'Idea journal', area: 'creativity', steps: ['Write down one idea', 'Write down three ideas'] },
      { id: 'inspire', title: 'Get inspired', area: 'creativity', steps: ['Spend 10 minutes enjoying art, music or design you love', 'Study one piece of work you admire and note what makes it great'] },
    ],
  },
];

export const BUNDLE_BY_ID = Object.fromEntries(JOURNEY_BUNDLES.map((b) => [b.id, b]));
export const ALL_JOURNEY_HABITS: JourneyHabitDef[] = JOURNEY_BUNDLES.flatMap((b) => b.habits);
