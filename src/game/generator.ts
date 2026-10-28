import { AREAS, AREA_BY_ID } from './content/areas';
import { presetFor } from './content/habits';
import { QUESTS, questsFor } from './content/quests';
import { addDays } from './date';
import { journeyDayNumber, journeyQuests } from './journey';
import { pick, rng, shuffle } from './rng';
import type { AreaId, GameState, Habit, QuestDef, QuestInstance, Tier, TimeOfDay } from './types';
import { CHECKIN_XP, TIER_XP, coinsFor } from './xp';

/** Daily quests (not counting main, bonus and check-ins) for each time budget. */
export const DAILY_COUNT: Record<number, number> = { 10: 2, 20: 3, 40: 4, 60: 6 };

const WHEN_ORDER: Record<TimeOfDay, number> = { morning: 0, day: 1, any: 1, evening: 2 };

const doneThisWeek = (s: GameState, day: string, area: AreaId) => {
  let n = 0;
  for (let i = 1; i <= 7; i++) n += s.history[addDays(day, -i)]?.areaDone[area] ?? 0;
  return n;
};

const yesterdayIds = (s: GameState, day: string): Set<string> => {
  const prev = s.today && s.today.day === addDays(day, -1) ? s.today : null;
  const ids = new Set<string>();
  prev?.queue.forEach((q) => q.questId && ids.add(q.questId));
  prev?.doneQuests.forEach((q) => q.questId && ids.add(q.questId));
  return ids;
};

/** Pick a quest for an area near the wanted tier, avoiding used ids where possible. */
const chooseQuest = (
  r: () => number,
  s: GameState,
  area: AreaId,
  tier: Tier,
  used: Set<string>,
  avoid: Set<string>,
): QuestDef | null => {
  const custom: QuestDef[] = s.customQuests
    .filter((c) => c.area === area && !c.everyDay)
    .map((c) => ({ id: c.id, area: c.area, tier: c.tier, minutes: 15, when: 'any', title: c.title, why: 'Your own quest.' }));
  const pool = [...questsFor(area), ...custom].filter((q) => !used.has(q.id));
  for (const t of [tier, tier - 1, tier + 1, tier - 2] as number[]) {
    const atTier = pool.filter((q) => q.tier === t);
    const fresh = atTier.filter((q) => !avoid.has(q.id));
    if (fresh.length) return pick(r, fresh);
    if (atTier.length) return pick(r, atTier);
  }
  return pool.length ? pick(r, pool) : null;
};

const instance = (q: QuestDef, kind: QuestInstance['kind'], tier: Tier, n: number): QuestInstance => {
  const xp = TIER_XP[tier] * (kind === 'main' ? 2 : 1);
  return { key: `${kind}-${q.id}-${n}`, kind, questId: q.id, area: q.area, title: q.title, why: q.why, xp, coins: coinsFor(xp) };
};

export const generateBoard = (s: GameState, day: string): QuestInstance[] => {
  const r = rng(`${day}|${s.createdAt}`);
  const areas = s.profile.areas.length ? s.profile.areas : (['fitness', 'mind', 'mindfulness'] as AreaId[]);
  const used = new Set<string>();
  const avoid = yesterdayIds(s, day);

  // Areas you've done least this week come first, so every goal gets attention.
  const ranked = shuffle(r, areas).sort((a, b) => doneThisWeek(s, day, a) - doneThisWeek(s, day, b));

  // Main quest: one tier harder, double XP.
  let main: QuestInstance | null = null;
  const mainArea = ranked[0];
  const mainTier = Math.min(4, s.tiers[mainArea] + 1) as Tier;
  const mq = chooseQuest(r, s, mainArea, mainTier, used, avoid);
  if (mq) {
    used.add(mq.id);
    main = instance(mq, 'main', mq.tier, 0);
  }

  // Daily quests, cycling through the ranked areas (main area goes last).
  const order = [...ranked.slice(1), ranked[0]];
  const dailies: { inst: QuestInstance; when: TimeOfDay }[] = [];
  const want = DAILY_COUNT[s.profile.minutes] ?? 3;
  let i = 0;
  while (dailies.length < want && i < want * 4) {
    const area = order[i % order.length];
    i += 1;
    const q = chooseQuest(r, s, area, s.tiers[area], used, avoid);
    if (!q) continue;
    used.add(q.id);
    dailies.push({ inst: instance(q, 'daily', q.tier, dailies.length + 1), when: q.when });
  }

  // Custom quests you want every day.
  s.customQuests
    .filter((c) => c.everyDay)
    .forEach((c, n) => {
      const xp = TIER_XP[c.tier];
      dailies.push({
        inst: { key: `daily-${c.id}-c${n}`, kind: 'daily', questId: c.id, area: c.area, title: c.title, why: 'Your own daily quest.', xp, coins: coinsFor(xp) },
        when: 'any',
      });
    });

  // One replacement quest for a habit you're breaking.
  if (s.habits.length) {
    const h = pick(r, s.habits);
    const preset = presetFor(h.presetId, h.name);
    const taken = new Set(dailies.map((d) => d.inst.title).concat(main ? [main.title] : []));
    const fresh = preset.replacements.filter((x) => !taken.has(x));
    const title = pick(r, fresh.length ? fresh : preset.replacements);
    const xp = TIER_XP[2];
    dailies.push({
      inst: { key: `daily-hr-${h.id}`, kind: 'daily', questId: `hr:${h.id}`, title, why: `Helps you break free from ${h.name.toLowerCase()}.`, xp, coins: coinsFor(xp) },
      when: 'any',
    });
  }

  dailies.sort((a, b) => WHEN_ORDER[a.when] - WHEN_ORDER[b.when]);
  const list = dailies.map((d) => d.inst);

  // Place the main quest when you have the most energy.
  if (main) {
    const firstEvening = dailies.findIndex((d) => d.when === 'evening');
    const pos =
      s.profile.energy === 'afternoon' ? Math.floor(list.length / 2)
      : s.profile.energy === 'evening' ? (firstEvening === -1 ? list.length : firstEvening)
      : 0;
    list.splice(pos, 0, main);
  }

  // Check-ins for each habit you're breaking.
  s.habits.forEach((h) => list.push(checkinQuest(s, h, day)));

  // Bonus quest: optional, something fun or new from any area.
  const bonusPool = QUESTS.filter((q) => q.tier <= 2 && !used.has(q.id) && !areas.includes(q.area));
  const bq = pick(r, bonusPool.length ? bonusPool : QUESTS.filter((q) => q.tier <= 2 && !used.has(q.id)));
  if (bq) {
    const xp = TIER_XP[2];
    list.push({ ...instance(bq, 'bonus', 2, 99), xp, coins: coinsFor(xp), why: `Optional. ${bq.why} (${AREA_BY_ID[bq.area].label})` });
  }

  // Your habit journey always comes first.
  return [...journeyQuests(s, day), ...list];
};

/** The daily check-in quest for a habit you're breaking. */
export const checkinQuest = (s: GameState, h: Habit, day: string): QuestInstance => {
  const j = s.journey && !s.journey.finishedOn ? s.journey : null;
  const inJourney = j?.habits.some((x) => x.habitId === h.id && x.joinsOn <= journeyDayNumber(j, day));
  return {
    key: `checkin-${h.id}`, kind: 'checkin', habitId: h.id, title: checkinTitle(h),
    why: inJourney ? `Part of your journey: Day ${journeyDayNumber(j!, day)} of ${j!.length}. Be honest.` : 'Be honest. Every clean day counts.',
    xp: CHECKIN_XP, coins: coinsFor(CHECKIN_XP),
  };
};

/** The daily check-in question for a habit. */
export const checkinTitle = (h: Habit): string => {
  const name = h.name.toLowerCase();
  if (h.mode !== 'limit') return `Stayed clear of ${name} today?`;
  const unit = h.limit === 1 && h.unit && h.unit !== 'min' ? h.unit.replace(/s$/, '') : h.unit;
  const amount = `${h.limit} ${unit}`;
  if (h.period === 'week') return `Still within ${amount} of ${name} this week?`;
  if (h.period === 'month') return `Still within ${amount} of ${name} this month?`;
  return `Stayed under ${amount} of ${name} today?`;
};

export const isRequired = (q: QuestInstance) => q.kind !== 'bonus';

/**
 * The quest Today shows. Required quests come first; bonus quests only show
 * when asked for (or when they're the one picked from the icons).
 */
export const currentQuest = (queue: QuestInstance[], showBonus: boolean): QuestInstance | undefined => {
  const head = queue[0];
  if (!queue.some(isRequired)) return showBonus ? head : undefined;
  return head && (isRequired(head) || showBonus) ? head : queue.find(isRequired);
};

export const allAreas = AREAS.map((a) => a.id);
