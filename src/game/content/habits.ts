import type { HabitMode } from '../types';

export interface HabitPreset {
  id: string;
  name: string;
  defaultMode: HabitMode;
  canLimit: boolean;
  limit?: number;
  unit?: string;
  /** Daily quests that replace the habit with something better. */
  replacements: string[];
  /** Quick swaps offered by the "I'm tempted" urge breaker. */
  swaps: string[];
}

export const HABIT_PRESETS: HabitPreset[] = [
  {
    id: 'scrolling', name: 'Doom-scrolling', defaultMode: 'limit', canLimit: true, limit: 30, unit: 'min',
    replacements: [
      'Put your phone in another room for 1 hour',
      'Log out of one distracting app for the day',
      'Swap 15 minutes of scrolling for reading',
    ],
    swaps: ['Put the phone face down and take 10 deep breaths', 'Read 2 pages of a book instead', 'Go for a 5-minute walk'],
  },
  {
    id: 'junk', name: 'Junk food & sugar', defaultMode: 'quit', canLimit: false,
    replacements: ['Swap one snack for fruit or nuts', 'Drink a glass of water when a craving hits', 'Plan healthy snacks for tomorrow'],
    swaps: ['Drink a glass of water and wait 10 minutes', 'Eat a piece of fruit', 'Brush your teeth'],
  },
  {
    id: 'procrastination', name: 'Procrastination', defaultMode: 'quit', canLimit: false,
    replacements: ["Work on the task you're avoiding for just 5 minutes", 'Break one big task into 3 small steps'],
    swaps: ['Set a 5-minute timer and just start', 'Write the very first tiny step on paper'],
  },
  {
    id: 'latenights', name: 'Late nights', defaultMode: 'quit', canLimit: false,
    replacements: ['Screens off by 10:30 pm', 'Be in bed by 11 pm'],
    swaps: ['Put your phone on charge outside the bedroom', 'Dim the lights and read 5 pages'],
  },
  {
    id: 'smoking', name: 'Smoking or vaping', defaultMode: 'quit', canLimit: true, limit: 5, unit: 'times',
    replacements: ['Delay your first one by an hour', 'Take a 5-minute walk when a craving hits'],
    swaps: ['Chew gum or sip cold water', 'Take a 5-minute walk', 'Take 10 slow, deep breaths'],
  },
  {
    id: 'alcohol', name: 'Alcohol', defaultMode: 'quit', canLimit: true, limit: 2, unit: 'drinks',
    replacements: ['Have an alcohol-free day', 'Pick a fun alcohol-free drink for tonight'],
    swaps: ['Have sparkling water with lime', 'Text a friend instead', 'Go for a short walk'],
  },
  {
    id: 'gaming', name: 'Too much gaming', defaultMode: 'limit', canLimit: true, limit: 60, unit: 'min',
    replacements: ['Game only after your quests are done', 'Set a timer before you start playing'],
    swaps: ['Finish one quest first, then decide', 'Stand up and stretch for 2 minutes'],
  },
  {
    id: 'caffeine', name: 'Too much caffeine', defaultMode: 'limit', canLimit: true, limit: 2, unit: 'cups',
    replacements: ['Swap one coffee for water or herbal tea', 'No caffeine after 2 pm'],
    swaps: ['Drink a big glass of water first', 'Take a 5-minute walk for energy'],
  },
  {
    id: 'spending', name: 'Impulse spending', defaultMode: 'quit', canLimit: false,
    replacements: ['No online shopping today', 'Wait 48 hours before any non-essential purchase'],
    swaps: ['Add it to a wishlist and wait 48 hours', 'Check your savings goal instead'],
  },
  {
    id: 'selftalk', name: 'Negative self-talk', defaultMode: 'quit', canLimit: false,
    replacements: ['Write one thing you did well today', "Talk to yourself like you'd talk to a friend"],
    swaps: ["Say what you'd tell a friend in this moment", 'Write down one thing you are proud of'],
  },
];

export const PRESET_BY_ID: Record<string, HabitPreset> = Object.fromEntries(HABIT_PRESETS.map((h) => [h.id, h]));

export const CUSTOM_PRESET = (name: string): HabitPreset => ({
  id: 'custom', name, defaultMode: 'quit', canLimit: true,
  replacements: [`Plan one way to avoid ${name.toLowerCase()} today`],
  swaps: ['Take 10 slow, deep breaths', 'Go for a 5-minute walk', 'Drink a glass of water'],
});

export const presetFor = (presetId: string, name: string): HabitPreset =>
  PRESET_BY_ID[presetId] ?? CUSTOM_PRESET(name);

export const SLIP_TRIGGERS = ['Bored', 'Stressed', 'Tired', 'Social', 'Other'];
