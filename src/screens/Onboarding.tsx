import { useEffect, useMemo, useRef, useState } from 'react';
import { create } from 'zustand';
import { LimitFields } from '../components/LimitFields';
import { SwitchRow } from '../components/Switch';
import { AREAS, AREA_BY_ID } from '../game/content/areas';
import { SPECIES, speciesFor } from '../game/content/buddy';
import { Buddy } from '../components/Buddy';
import { HABIT_PRESETS } from '../game/content/habits';
import { defaultProfile, goalTarget, type HabitChoice } from '../game/engine';
import type { AreaId, Difficulty, Energy, LimitPeriod, Profile, Weekday } from '../game/types';
import { Icon } from '../components/Icon';
import { useStore } from '../store';
import { burst } from '../fx';
import { signIn, syncConfigured, useSync } from '../sync';
import { HealthConnectSteps, HealthNotice, isIPhone } from '../components/HealthSetup';
import { strings } from '../i18n';

type Opt<T> = { value: T; label: string; hint?: string };

function Choice<T extends string | number>({ options, value, onPick }: { options: Opt<T>[]; value: T | null; onPick: (v: T) => void }) {
  return (
    <div className="options one">
      {options.map((o) => (
        <button key={String(o.value)} className={`option ${value === o.value ? 'on' : ''}`} style={{ borderColor: value === o.value ? 'var(--gold)' : undefined }} onClick={() => onPick(o.value)}>
          <span className="grow">
            {o.label}
            {o.hint && <span className="muted small" style={{ display: 'block', fontWeight: 700 }}>{o.hint}</span>}
          </span>
          {value === o.value && <Icon name="check" color="var(--green)" stroke={3} size={20} />}
        </button>
      ))}
    </div>
  );
}

const TOTAL = 12;
/** Optional Apple Health screen, shown on iPhone after the profile is saved. */
const HEALTH_STEP = TOTAL + 1;

/**
 * True while the optional Apple Health screen is showing. Setup is already
 * saved by then; App keeps this screen up until it is closed. Not stored: if
 * iOS reloads the app while you are in Shortcuts, you land on Today instead.
 */
export const useSetupFlow = create<{ healthOffer: boolean }>(() => ({ healthOffer: false }));

export function Onboarding() {
  const onboard = useStore((s) => s.onboard);
  const [step, setStep] = useState(0);
  const existing = useStore((s) => s.game);
  const [p, setP] = useState<Profile>(() => (existing.profile.name ? { ...existing.profile } : { ...defaultProfile(), areas: [] }));
  const [habitIds, setHabitIds] = useState<string[]>(() => existing.habits.filter((h) => h.presetId !== 'custom').map((h) => h.presetId));
  const [customHabit, setCustomHabit] = useState(() => existing.habits.find((h) => h.presetId === 'custom')?.name ?? '');
  const [habitModes, setHabitModes] = useState<Record<string, { mode: 'quit' | 'limit'; limit?: number; period?: LimitPeriod }>>({});
  const [reminderMode, setReminderMode] = useState<'both' | 'morning' | 'evening' | 'none'>('both');
  const [perQuest, setPerQuest] = useState(true);

  const sync = useSync();
  const healthKey = useStore((s) => s.game.profile.healthKey);
  const th = strings().health;
  const set = (patch: Partial<Profile>) => setP((x) => ({ ...x, ...patch }));

  // Screen readers: move focus to the new step's heading on every step change.
  const heading = useRef<HTMLHeadingElement>(null);
  const firstStep = useRef(true);
  useEffect(() => {
    if (firstStep.current) {
      firstStep.current = false;
      return;
    }
    heading.current?.focus();
    document.querySelector('.screen')?.scrollTo(0, 0);
  }, [step]);

  const habits: HabitChoice[] = useMemo(() => {
    const list: HabitChoice[] = habitIds.map((id) => {
      const pre = HABIT_PRESETS.find((h) => h.id === id)!;
      const m = habitModes[id] ?? { mode: pre.defaultMode, limit: pre.limit };
      return { presetId: id, name: pre.name, mode: m.mode, limit: m.mode === 'limit' ? m.limit ?? pre.limit ?? 1 : undefined, unit: pre.unit, period: m.mode === 'limit' ? m.period : undefined };
    });
    if (customHabit.trim()) {
      const m = habitModes.custom ?? { mode: 'quit' as const };
      list.push({ presetId: 'custom', name: customHabit.trim(), mode: m.mode, limit: m.mode === 'limit' ? m.limit ?? 1 : undefined, unit: m.mode === 'limit' ? 'times' : undefined, period: m.mode === 'limit' ? m.period : undefined });
    }
    return list;
  }, [habitIds, habitModes, customHabit]);

  const canNext = [
    p.name.trim().length > 0,
    p.areas.length >= 3,
    true, true, true, true, true, true, true, true, true, true,
  ][step] ?? true;

  // The "quit or cut down" step only makes sense when there are habits.
  const next = () => setStep((s) => (s === 5 && habits.length === 0 ? 7 : s + 1));
  const prev = () => setStep((s) => (s === 7 && habits.length === 0 ? 5 : Math.max(0, s - 1)));

  const finish = () => {
    const profile: Profile = {
      ...p,
      reminders: {
        morning: reminderMode === 'both' || reminderMode === 'morning' ? p.reminders.morning ?? '08:00' : null,
        evening: reminderMode === 'both' || reminderMode === 'evening' ? p.reminders.evening ?? '20:30' : null,
        perQuest,
      },
    };
    onboard(profile, habits);
    burst(true);
    // Setup is saved now, so a trip to the Shortcuts app can't lose any answers.
    if (isIPhone() && !useStore.getState().game.profile.healthKey) {
      useSetupFlow.setState({ healthOffer: true });
      setStep(HEALTH_STEP);
    }
  };
  const closeHealth = () => useSetupFlow.setState({ healthOffer: false });

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  let body: React.ReactNode = null;
  let title = '';
  let sub = '';

  switch (step) {
    case 0:
      title = 'Create your hero';
      sub = 'Questly turns your goals into daily quests. First, who are you?';
      body = (
        <>
          {syncConfigured && (
            <div className="card stack" style={{ border: '2px solid var(--blue)', gap: 8 }}>
              {sync.user ? (
                <span className="small">
                  {sync.status === 'syncing' ? 'Looking for your progress…' : `Signed in as ${sync.user.email ?? sync.user.name}. No saved progress yet, so let's create your hero. It will sync from now on.`}
                </span>
              ) : (
                <>
                  <span className="small">Already use Questly on another phone?</span>
                  <button className="btn btn-gold" onClick={() => void signIn()}>Sign in with Google</button>
                </>
              )}
              {sync.status === 'error' && <span className="tiny" style={{ color: 'var(--pink)' }}>{sync.error}</span>}
            </div>
          )}
          <label className="field">What should we call you?
            <input type="text" value={p.name} maxLength={24} placeholder="Your name" onChange={(e) => set({ name: e.target.value })} />
          </label>
          <span className="muted small">Pick your companion. It cheers you on and grows as you level up.</span>
          <div className="buddy-grid">
            {SPECIES.map((a) => {
              const on = speciesFor(p.avatar) === a.id;
              return (
                <button key={a.id} className={`option ${on ? 'on' : ''}`} style={{ flexDirection: 'column', padding: 6, gap: 0, borderColor: on ? 'var(--gold)' : undefined }} onClick={() => set({ avatar: a.id })} aria-pressed={on}>
                  <Buddy species={a.id} stage={1} mood={on ? 'cheer' : 'happy'} size={64} still={!on} />
                  <span className="small">{a.label}</span>
                </button>
              );
            })}
          </div>
        </>
      );
      break;
    case 1:
      title = 'Which areas of life do you want to level up?';
      sub = 'Pick at least 3, as many as you like. Each one becomes a goal.';
      body = (
        <div className="options">
          {AREAS.map((a) => {
            const on = p.areas.includes(a.id);
            return (
              <button key={a.id} className={`option ${on ? 'on' : ''}`} style={{ borderColor: on ? a.color : undefined }} onClick={() => set({ areas: toggle(p.areas, a.id) })} aria-pressed={on}>
                <span className="swatch" style={{ background: a.color }}>{a.short}</span>
                <span className="grow">{a.label}</span>
                {on && <Icon name="check" color="var(--green)" stroke={3} size={18} />}
              </button>
            );
          })}
        </div>
      );
      break;
    case 2:
      title = 'What does a typical weekday look like?';
      sub = 'So quests fit around your day.';
      body = <Choice<Weekday> value={p.weekday} onPick={(v) => set({ weekday: v })} options={[
        { value: 'student', label: 'Student' }, { value: 'office', label: '9-to-5 job' },
        { value: 'shift', label: 'Shift work' }, { value: 'flexible', label: 'Flexible or self-employed' },
      ]} />;
      break;
    case 3:
      title = 'How active are you today?';
      sub = 'Be honest. Quests start where you are.';
      body = <Choice<number> value={p.activity} onPick={(v) => set({ activity: v as Profile['activity'] })} options={[
        { value: 0, label: 'Rarely' }, { value: 1, label: '1 to 2 days a week' }, { value: 2, label: '3 to 4 days a week' }, { value: 3, label: '5 or more days a week' },
      ]} />;
      break;
    case 4:
      title = 'How is your sleep?';
      sub = 'Sleep powers everything else.';
      body = <Choice<number> value={p.sleep} onPick={(v) => set({ sleep: v as Profile['sleep'] })} options={[
        { value: 0, label: 'Great' }, { value: 1, label: 'Okay' }, { value: 2, label: 'Often tired' }, { value: 3, label: 'Poor and irregular' },
      ]} />;
      break;
    case 5:
      title = 'Which habits do you want to break or cut down?';
      sub = 'Optional. Pick any, or add your own.';
      body = (
        <>
          <div className="options">
            {HABIT_PRESETS.map((h) => {
              const on = habitIds.includes(h.id);
              return (
                <button key={h.id} className={`option ${on ? 'on' : ''}`} style={{ borderColor: on ? 'var(--pink)' : undefined }} onClick={() => setHabitIds((x) => toggle(x, h.id))} aria-pressed={on}>
                  <span className="grow">{h.name}</span>
                  {on && <Icon name="check" color="var(--green)" stroke={3} size={18} />}
                </button>
              );
            })}
          </div>
          <label className="field">Something else?
            <input type="text" value={customHabit} maxLength={40} placeholder="Type a habit" onChange={(e) => setCustomHabit(e.target.value)} />
          </label>
        </>
      );
      break;
    case 6:
      title = 'Quit completely, or cut down?';
      sub = 'You can change this anytime.';
      body = (
        <div className="stack">
          {habits.map((h) => {
            const key = h.presetId;
            const pre = HABIT_PRESETS.find((x) => x.id === key);
            const m = habitModes[key] ?? { mode: h.mode, limit: h.limit, period: h.period };
            const canLimit = pre ? pre.canLimit : true;
            return (
              <div key={key} className="card stack">
                <span>{h.name}</span>
                <div className="row">
                  <button className={`btn btn-sm grow ${m.mode === 'quit' ? 'btn-gold' : 'btn-ghost'}`} style={{ fontSize: 15 }} onClick={() => setHabitModes((x) => ({ ...x, [key]: { ...m, mode: 'quit' } }))}>Quit</button>
                  {canLimit && <button className={`btn btn-sm grow ${m.mode === 'limit' ? 'btn-gold' : 'btn-ghost'}`} style={{ fontSize: 15 }} onClick={() => setHabitModes((x) => ({ ...x, [key]: { ...m, mode: 'limit', limit: m.limit ?? pre?.limit ?? 1 } }))}>Cut down</button>}
                </div>
                {m.mode === 'limit' && (
                  <LimitFields limit={m.limit ?? pre?.limit ?? 1} unit={pre?.unit} period={m.period} onChange={(v) => setHabitModes((x) => ({ ...x, [key]: { ...m, ...v } }))} />
                )}
              </div>
            );
          })}
        </div>
      );
      break;
    case 7:
      title = 'How much time can you give your quests each day?';
      sub = 'This sets how many quests you get.';
      body = <Choice<number> value={p.minutes} onPick={(v) => set({ minutes: v as Profile['minutes'] })} options={[
        { value: 10, label: '10 minutes', hint: '2 daily quests plus your main quest' },
        { value: 20, label: '20 minutes', hint: '3 daily quests plus your main quest' },
        { value: 40, label: '40 minutes', hint: '4 daily quests plus your main quest' },
        { value: 60, label: '60 minutes or more', hint: '6 daily quests plus your main quest' },
      ]} />;
      break;
    case 8:
      title = 'When do you have the most energy?';
      sub = 'Your main quest shows up then.';
      body = <Choice<Energy> value={p.energy} onPick={(v) => set({ energy: v })} options={[
        { value: 'morning', label: 'Morning' }, { value: 'afternoon', label: 'Afternoon' }, { value: 'evening', label: 'Evening' }, { value: 'varies', label: 'It varies' },
      ]} />;
      break;
    case 9:
      title = 'Pick your difficulty';
      sub = 'How much of your board you need to clear to keep your streak.';
      body = <Choice<Difficulty> value={p.difficulty} onPick={(v) => set({ difficulty: v })} options={[
        { value: 'gentle', label: 'Gentle start', hint: 'Clear 40% of your quests to keep the streak' },
        { value: 'balanced', label: 'Balanced', hint: 'Clear 60% of your quests' },
        { value: 'hardcore', label: 'Hardcore', hint: 'Clear every quest, and start one tier harder' },
      ]} />;
      break;
    case 10:
      title = 'What keeps you going?';
      sub = 'Pick any. We will put it front and centre.';
      body = (
        <div className="options one">
          {['Leveling up', 'Streaks', 'Badges', 'Rewards I earn', 'Beating my past self'].map((m) => {
            const on = p.motivations.includes(m);
            return (
              <button key={m} className={`option ${on ? 'on' : ''}`} style={{ borderColor: on ? 'var(--gold)' : undefined }} onClick={() => set({ motivations: toggle(p.motivations, m) })} aria-pressed={on}>
                <span className="grow">{m}</span>
                {on && <Icon name="check" color="var(--green)" stroke={3} size={18} />}
              </button>
            );
          })}
        </div>
      );
      break;
    case 11:
      title = 'When should we remind you?';
      sub = 'You will switch notifications on after setup.';
      body = (
        <>
          <Choice<'both' | 'morning' | 'evening' | 'none'> value={reminderMode} onPick={setReminderMode} options={[
            { value: 'both', label: 'Morning nudge and evening check-in' }, { value: 'morning', label: 'Morning nudge only' },
            { value: 'evening', label: 'Evening check-in only' }, { value: 'none', label: 'No set-time reminders' },
          ]} />
          <div className="row">
            {(reminderMode === 'both' || reminderMode === 'morning') && (
              <label className="field grow">Morning
                <input type="time" value={p.reminders.morning ?? '08:00'} onChange={(e) => set({ reminders: { ...p.reminders, morning: e.target.value } })} />
              </label>
            )}
            {(reminderMode === 'both' || reminderMode === 'evening') && (
              <label className="field grow">Evening
                <input type="time" value={p.reminders.evening ?? '20:30'} onChange={(e) => set({ reminders: { ...p.reminders, evening: e.target.value } })} />
              </label>
            )}
          </div>
          <div className="card">
            <SwitchRow label="Also nudge me before each quest is due" hint="Every quest gets a finish-by time you can change." on={perQuest} onChange={setPerQuest} />
          </div>
        </>
      );
      break;
    case HEALTH_STEP:
      title = th.setupTitle;
      sub = th.setupSub;
      body = (
        <div className="card stack" style={{ gap: 18 }}>
          <HealthNotice />
          <HealthConnectSteps />
          <span className="muted small">{th.setupLater}</span>
        </div>
      );
      break;
    default:
      title = `Your adventure begins, ${p.name}!`;
      sub = 'Here are your goals for the next 30 days.';
      body = (
        <div className="stack">
          {p.areas.map((a: AreaId) => (
            <div key={a} className="list-item" style={{ borderLeft: `6px solid ${AREA_BY_ID[a].color}` }}>
              <div className="grow">
                <div>{goalTarget(a, 0).title}</div>
                <div className="muted tiny">{AREA_BY_ID[a].label}</div>
              </div>
            </div>
          ))}
          {habits.length > 0 && <p className="muted small">Plus {habits.length} habit{habits.length > 1 ? 's' : ''} to break, tracked on the Quit tab.</p>}
        </div>
      );
  }

  const isReveal = step >= TOTAL;
  const isHealth = step === HEALTH_STEP;
  return (
    <div className="screen">
      <div className="row">
        {step > 0 && !isHealth && <button className="icon-btn" aria-label="Back" onClick={prev}><Icon name="back" /></button>}
        <div className="bar grow" style={{ background: 'var(--card)' }}>
          <span style={{ width: `${Math.min(100, Math.round(((step + 1) / (TOTAL + 1)) * 100))}%`, background: 'linear-gradient(90deg, var(--gold), var(--orange))' }} />
        </div>
        {!isReveal && <span className="muted small">{step + 1} / {TOTAL}</span>}
      </div>
      <div className="stack" style={{ gap: 8 }}>
        <span className="label-caps" style={{ color: 'var(--green)' }}>{isReveal ? 'Ready' : 'Create your hero'}</span>
        <h1 ref={heading} tabIndex={-1} className="step-heading">{title}</h1>
        <p className="muted">{sub}</p>
      </div>
      {body}
      <div className="grow" />
      {isHealth ? (
        // Stays in view while you read, so skipping is as easy as connecting.
        <div className="setup-footer">
          {healthKey
            ? <button className="btn btn-gold btn-block" onClick={closeHealth}>{th.startQuest}</button>
            : <button className="btn btn-ghost btn-block" onClick={closeHealth}>{th.maybeLater}</button>}
        </div>
      ) : isReveal ? (
        <button className="btn btn-gold btn-block" onClick={finish}>Start my first quest</button>
      ) : (
        <button className="btn btn-gold btn-block" disabled={!canNext} onClick={next}>
          {step === 1 && p.areas.length < 3 ? `Pick ${3 - p.areas.length} more to continue` : step === 1 ? `Continue (${p.areas.length} picked)` : 'Continue'}
        </button>
      )}
    </div>
  );
}
