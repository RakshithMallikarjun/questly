// Works out when to send reminders. Two kinds, which you can mix:
// - fixed daily times (morning nudge, evening check-in)
// - per-quest nudges a little before each quest's "finish by" time
// The result is a list of exact moments, used both by the open app and by the
// server job that sends phone notifications while the app is closed.

import { QUEST_BY_ID } from './content/quests';
import { addDays, fromKey, gameDay } from './date';
import type { GameState, Profile, QuestInstance, Reminders, TimeOfDay } from './types';
import { strings, fmt } from '../i18n';

export interface PlannedReminder {
  at: number; // timestamp
  tag: string; // unique id, so the same reminder is never sent twice
  title: string;
  body: string;
}

/** Default "finish by" time for each part of the day. */
export const DEFAULT_DUE: Record<TimeOfDay, string> = { morning: '11:00', day: '17:00', any: '21:00', evening: '22:00' };
export const DEFAULT_LEAD = 30;
export const DEFAULT_QUIET = { from: '22:30', to: '07:00' };

/** How many days ahead fixed reminders are planned (in case the app stays closed). */
const DAYS_AHEAD = 3;

export const perQuestOn = (r: Reminders) => r.perQuest !== false;
export const leadOf = (r: Reminders) => r.lead ?? DEFAULT_LEAD;
export const quietOf = (r: Reminders) => (r.quiet === undefined ? DEFAULT_QUIET : r.quiet);

/** The key used to remember your own finish-by time for a quest. */
export const dueKey = (q: QuestInstance): string | null =>
  q.kind === 'checkin' ? (q.habitId ? `checkin:${q.habitId}` : null) : q.questId ?? null;

/** Which part of the day a quest belongs to. */
const slotOf = (q: QuestInstance): TimeOfDay => {
  if (q.kind === 'checkin') return 'evening';
  const def = q.questId ? QUEST_BY_ID[q.questId] : undefined;
  return def?.when ?? 'any';
};

/** The "finish by" time ("HH:MM") for a quest, or null for optional bonus quests. */
export const dueFor = (q: QuestInstance, p: Profile): string | null => {
  if (q.kind === 'bonus') return null;
  const k = dueKey(q);
  return (k && p.dueTimes?.[k]) || DEFAULT_DUE[slotOf(q)];
};

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** The exact moment a clock time happens within a game day (times before the reset hour belong to the next morning). */
export const momentIn = (day: string, hhmm: string, resetHour: number): number => {
  const [h, m] = hhmm.split(':').map(Number);
  const d = fromKey(day);
  if (h < resetHour) d.setDate(d.getDate() + 1);
  d.setHours(h, m, 0, 0);
  return d.getTime();
};

const inQuiet = (at: number, quiet: { from: string; to: string } | null) => {
  if (!quiet) return false;
  const d = new Date(at);
  const t = d.getHours() * 60 + d.getMinutes();
  const a = toMinutes(quiet.from);
  const b = toMinutes(quiet.to);
  return a <= b ? t >= a && t < b : t >= a || t < b;
};

export const timeLabel = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

export const planReminders = (s: GameState, now: Date): PlannedReminder[] => {
  if (!s.onboarded) return [];
  const t = strings().remind;
  const p = s.profile;
  const r = p.reminders;
  const day = gameDay(now, p.resetHour);
  const today = s.today && s.today.day === day ? s.today : null;
  const out: PlannedReminder[] = [];

  const required = today ? today.queue.filter((q) => q.kind !== 'bonus') : [];

  for (let i = 0; i < DAYS_AHEAD; i++) {
    const d = addDays(day, i);
    const known = i === 0 && today;
    if (known && today.rest) continue;
    if (r.morning) {
      const next = known ? today.queue[0] : null;
      if (!known || next) {
        out.push({
          at: momentIn(d, r.morning, p.resetHour),
          tag: `${d}|morning`,
          title: t.morningTitle,
          body: next ? fmt(t.morningBody, { q: next.title }) : t.morningNew,
        });
      }
    }
    if (r.evening && (!known || required.length > 0)) {
      const journeyOpen = known && s.journey && !s.journey.doneDays.includes(d) && required.some((q) => q.kind === 'journey' || (q.kind === 'checkin' && s.journey!.habits.some((h) => h.habitId === q.habitId)));
      out.push({
        at: momentIn(d, r.evening, p.resetHour),
        tag: `${d}|evening`,
        title: journeyOpen ? t.journeyTitle : t.eveningTitle,
        body: journeyOpen
          ? fmt(t.journeyBody, { n: s.journey!.doneDays.length + 1, total: s.journey!.length })
          : known ? fmt(required.length === 1 ? t.eveningOne : t.eveningMany, { n: required.length }) : t.eveningGeneric,
      });
    }
  }

  if (today && !today.rest && perQuestOn(r)) {
    const lead = leadOf(r);
    for (const q of required) {
      const due = dueFor(q, p);
      if (!due) continue;
      out.push({
        at: momentIn(day, due, p.resetHour) - lead * 60000,
        tag: `${day}|q|${q.key}|${due}|${lead}`,
        title: fmt(t.questTitle, { n: lead }),
        body: fmt(t.questBody, { q: q.title, time: timeLabel(due) }),
      });
    }
  }

  const quiet = quietOf(r);
  return out.filter((x) => x.at > now.getTime() && !inQuiet(x.at, quiet)).sort((a, b) => a.at - b.at);
};
