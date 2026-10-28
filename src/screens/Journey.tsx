import { Modal } from '../components/Modal';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { AREA_BY_ID } from '../game/content/areas';
import { HABIT_PRESETS } from '../game/content/habits';
import {
  ALL_JOURNEY_HABITS, DEFAULT_LENGTH, JOIN_DAYS, JOURNEY_BUNDLES, MAX_LIVES, type JourneyBundle, stagesFor,
} from '../game/content/journeys';
import { daysBetween } from '../game/date';
import type { JourneyPick } from '../game/engine';
import { checkinTitle } from '../game/generator';
import {
  COMEBACK_KEY, activeHabits, journeyDayNumber, linkedTracker, questKeyFor, stageIndex, stageOf, taskFor, upcomingHabits,
} from '../game/journey';
import type { GameState, Journey as J } from '../game/types';
import { Avatar } from '../components/HeroHeader';
import { Icon } from '../components/Icon';
import { useStore } from '../store';

export const goJourney = () => { window.location.hash = '/journey'; };
const goToday = () => { window.location.hash = '/today'; };

const SCENERY = [['🌱', '🌼', '🦋'], ['🌲', '🍄', '🌳'], ['⛰️', '🪨', '🦅'], ['☁️', '⭐', '🏔️'], ['🔥', '🐉', '✨']];

export function Hearts({ lives, size = 20 }: { lives: number; size?: number }) {
  return (
    <span className="row" style={{ gap: 2 }} aria-label={`${lives} of ${MAX_LIVES} lives`}>
      {Array.from({ length: MAX_LIVES }).map((_, i) => (
        <svg key={i} aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill={i < lives ? 'var(--pink)' : 'none'} stroke={i < lives ? 'var(--pink)' : 'var(--line-2)'} strokeWidth="2.2">
          <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />
        </svg>
      ))}
    </span>
  );
}

/** Next milestone after the days already done. */
const nextMilestone = (j: J) => stagesFor(j.length).find((s) => s.to > j.doneDays.length);

// ---------------------------------------------------------------- Today card

/** Compact journey card for the Today screen. */
export function JourneyCard() {
  const g = useStore((s) => s.game);
  const j = g.journey;
  const day = g.today?.day;
  if (!day) return null;

  if (!j) {
    return (
      <button className="card journey-teaser" onClick={goJourney}>
        <span className="journey-big">66</span>
        <span className="stack grow" style={{ gap: 2, textAlign: 'left' }}>
          <b style={{ fontSize: 16 }}>Start a 66-day journey</b>
          <span className="muted small">Turn 2 or 3 habits into who you are, one step a day.</span>
        </span>
        <Icon name="back" style={{ transform: 'rotate(180deg)' }} />
      </button>
    );
  }

  if (j.finishedOn) {
    return (
      <button className="card journey-teaser" onClick={goJourney} style={{ borderColor: 'var(--gold)' }}>
        <span style={{ fontSize: 40 }}>🏆</span>
        <span className="stack grow" style={{ gap: 2, textAlign: 'left' }}>
          <b style={{ fontSize: 16 }}>Habit formed: {j.name}</b>
          <span className="muted small">Ready for your next journey?</span>
        </span>
      </button>
    );
  }

  const n = journeyDayNumber(j, day);
  const stage = stageOf(j, n);
  const doneToday = j.doneDays.includes(day);
  const next = nextMilestone(j);
  const pct = Math.round((j.doneDays.length / j.length) * 100);
  return (
    <button className="card stack journey-mini" onClick={goJourney} style={{ borderColor: stage.color }} aria-label={`Open your journey, day ${n} of ${j.length}`}>
      <div className="between" style={{ width: '100%' }}>
        <span className="label-caps" style={{ color: stage.color }}>{stage.name}</span>
        <Hearts lives={j.lives} size={18} />
      </div>
      <div className="between" style={{ width: '100%', alignItems: 'baseline' }}>
        <b style={{ fontFamily: 'var(--display)', fontSize: 22 }}>Day {n} <span className="muted" style={{ fontSize: 15 }}>of {j.length}</span></b>
        <span className="small" style={{ color: doneToday ? 'var(--green)' : 'var(--muted)' }}>{doneToday ? 'Today done ✓' : j.name}</span>
      </div>
      <div className="journey-track" aria-hidden="true">
        <span style={{ width: `${pct}%`, background: `linear-gradient(90deg, var(--green), ${stage.color})` }} />
        {stagesFor(j.length).map((s) => (
          <i key={s.to} style={{ left: `${(s.to / j.length) * 100}%` }}>{s.to === j.length ? '🏆' : j.milestones.includes(s.to) ? '✨' : '🏅'}</i>
        ))}
      </div>
      {j.comeback ? (
        <span className="small" style={{ color: 'var(--pink)', textAlign: 'left' }}>Out of hearts. Finish today’s comeback quest to win one back.</span>
      ) : next ? (
        <span className="muted small" style={{ textAlign: 'left' }}>
          {next.to === j.length ? '🏆 Finish line' : '🏅 Next milestone'} in {next.to - j.doneDays.length} {next.to - j.doneDays.length === 1 ? 'day' : 'days'}
        </span>
      ) : null}
    </button>
  );
}

// ---------------------------------------------------------------- screen

export function Journey() {
  const j = useStore((s) => s.game.journey);
  const [building, setBuilding] = useState(false);
  if (!j || building) return <Builder onDone={() => setBuilding(false)} />;
  if (j.finishedOn) return <Finished onNew={() => { useStore.getState().endJourney(); setBuilding(true); }} />;
  return <Active />;
}

function TopBar({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div className="journey-top">
      <button className="icon-btn" aria-label="Back to Today" onClick={goToday}><Icon name="back" /></button>
      <h1 className="grow" style={{ fontSize: 22, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</h1>
      {right}
    </div>
  );
}

// ---------------------------------------------------------------- active journey

function Active() {
  const g = useStore((s) => s.game);
  const j = g.journey!;
  const day = g.today?.day ?? j.startDay;
  const n = journeyDayNumber(j, day);
  const stage = stageOf(j, n);
  const next = nextMilestone(j);
  const doneToday = j.doneDays.includes(day);
  const doneKeys = new Set(g.today?.done.filter((d) => !d.slip).map((d) => d.key));
  const soon = upcomingHabits(j, n);

  return (
    <div className="screen" style={{ paddingTop: 0 }}>
      <TopBar title={j.name} right={<Hearts lives={j.lives} />} />

      <div className="card stack" style={{ border: `2px solid ${stage.color}`, gap: 6 }}>
        <div className="between">
          <span className="label-caps" style={{ color: stage.color }}>{stage.name}</span>
          <span className="muted small">{j.doneDays.length} / {j.length} steps</span>
        </div>
        <b style={{ fontFamily: 'var(--display)', fontSize: 30, lineHeight: 1.1 }}>Day {n} <span className="muted" style={{ fontSize: 18 }}>of {j.length}</span></b>
        {j.comeback ? (
          <span style={{ color: 'var(--pink)' }}>You’re out of hearts, but you never start over. Finish today’s comeback quest to win one back.</span>
        ) : doneToday ? (
          <span style={{ color: 'var(--green)' }}>Today’s step is done. See you tomorrow!</span>
        ) : (
          <span className="soft small">Finish today’s journey quests to take the next step.</span>
        )}
        {next && (
          <span className="muted small">
            {next.to === j.length ? '🏆' : '🏅'} {next.to - j.doneDays.length} {next.to - j.doneDays.length === 1 ? 'step' : 'steps'} to {next.to === j.length ? 'the finish' : `the ${next.name} milestone`}: +{next.xp} XP, +{next.coins} coins{next.to < j.length ? ', +1 heart' : ''}
          </span>
        )}
      </div>

      <JourneyMap g={g} />

      <div className="card stack">
        <h2 style={{ margin: 0 }}>Today’s journey quests</h2>
        {activeHabits(j, n).map((h) => {
          const tracker = linkedTracker(g, h);
          const done = tracker ? tracker.checkins[day] === 'clean' : doneKeys.has(questKeyFor(h));
          const slipped = tracker?.checkins[day] === 'slip';
          return (
            <div key={h.id} className={`list-item ${done ? 'done' : ''}`} style={{ background: done ? undefined : 'var(--bg)' }}>
              <Icon name={done ? 'check' : slipped ? 'close' : 'clock'} color={done ? 'var(--green)' : slipped ? 'var(--pink)' : 'var(--muted)'} stroke={3} size={20} />
              <div className="grow">
                <div style={{ fontSize: 15 }}>{taskFor(g, j, h, n)}</div>
                <div className="muted tiny">{h.title}{tracker ? ' · daily check-in' : ''}{slipped ? ' · slipped today' : ''}</div>
              </div>
            </div>
          );
        })}
        {(j.comeback || j.undo?.comeback) && (
          <div className={`list-item ${doneKeys.has(COMEBACK_KEY) ? 'done' : ''}`} style={{ background: doneKeys.has(COMEBACK_KEY) ? undefined : 'var(--bg)', border: '2px solid var(--pink)' }}>
            <Icon name="heart" color="var(--pink)" size={20} />
            <div className="grow">
              <div style={{ fontSize: 15 }}>Comeback quest</div>
              <div className="muted tiny">Find it in your Today quests. Finish it to win back a heart.</div>
            </div>
          </div>
        )}
        <button className="btn btn-green btn-sm" onClick={goToday}>Go to Today’s quests</button>
        {soon.length > 0 && (
          <span className="muted small">
            Coming up: {soon.map((h) => `${h.title} joins on Day ${h.joinsOn}`).join(', ')}.
          </span>
        )}
      </div>

      <div className="card stack">
        <h2 style={{ margin: 0 }}>How it works</h2>
        <span className="soft small">• Do all of today’s journey quests to move one step along the path.</span>
        <span className="soft small">• Habits join one at a time (Day 1, 8 and 22), and each one gets a little harder in every new zone.</span>
        <span className="soft small">• Miss a day and you lose a heart. A Rest day pass protects that day.</span>
        <span className="soft small">• Out of hearts? You never restart. A comeback quest appears, and finishing it wins a heart back.</span>
        <span className="soft small">• Every milestone gives XP, coins and a heart back (up to {MAX_LIVES}).</span>
        <span className="muted tiny">Why 66 days? A University College London study found new habits took 66 days on average to become automatic.</span>
      </div>

      <div className="stack" style={{ gap: 4 }}>
        <span className="muted small center">
          Started {new Date(`${j.startDay}T12:00`).toLocaleDateString([], { month: 'short', day: 'numeric' })} · {daysBetween(j.startDay, day) + 1} calendar days · {j.missedDays.length} missed
        </span>
        <button className="btn btn-text" onClick={() => confirm('Give up this journey? Your steps so far will be lost.') && useStore.getState().endJourney()}>
          Give up this journey
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- map

const W = 340;
const STEP = 70;
const GAP = 48; // extra room between zones for the zone name
const TOP = 170;
const BOTTOM = 110;
const xAt = (i: number) => W / 2 + 100 * Math.sin(i * 0.55);
const side = (i: number) => (Math.sin(i * 0.55) > 0 ? -1 : 1);

function JourneyMap({ g }: { g: GameState }) {
  const j = g.journey!;
  const day = g.today?.day ?? j.startDay;
  const n = journeyDayNumber(j, day);
  const done = j.doneDays.length;
  const stages = stagesFor(j.length);
  const H = TOP + BOTTOM + (j.length - 1) * STEP + (stages.length - 1) * GAP;
  const yAt = (i: number) => H - BOTTOM - i * STEP - stageIndex(j, i + 1) * GAP;
  const here = useRef<HTMLDivElement>(null);

  useEffect(() => {
    here.current?.scrollIntoView({ block: 'center' });
  }, []);

  const pts = Array.from({ length: j.length }, (_, i) => `${xAt(i)},${yAt(i)}`);
  const donePts = pts.slice(0, Math.max(1, done + (j.doneDays.includes(day) ? 0 : 1)));
  const joins = new Map(j.habits.filter((h) => h.joinsOn > 1).map((h) => [h.joinsOn, h.title]));
  const pct = (x: number) => `${(x / W) * 100}%`;

  return (
    <div className="journey-map" style={{ height: H }} role="img" aria-label={`Journey map: ${done} of ${j.length} steps done. You are on day ${n}.`}>
      {stages.map((s, si) => {
        const top = si === stages.length - 1 ? 0 : yAt(s.to - 1) - STEP / 2;
        const bottom = si === 0 ? H : yAt(s.from - 2) - STEP / 2;
        const reached = done >= s.from - 1;
        const count = Math.max(1, Math.floor((s.to - s.from + 1) / 4));
        return (
          <div key={s.name} className="journey-zone" style={{ top, height: bottom - top, background: `linear-gradient(180deg, color-mix(in srgb, ${s.color} 18%, transparent), color-mix(in srgb, ${s.color} 4%, transparent))` }}>
            <span className="journey-zone-label" style={{ color: s.color, opacity: reached ? 1 : 0.75, ...(xAt(s.from - 1) < W / 2 ? { right: 12 } : { left: 12 }) }}>
              {s.name} · Days {s.from}–{s.to}
            </span>
            {Array.from({ length: count }).map((_, k) => {
              const i = s.from - 1 + Math.min(s.to - s.from, 2 + k * 4);
              return (
                <span key={k} className="journey-scenery" style={{ left: pct(W / 2 + side(i) * 135 - 14), top: yAt(i) - top - 16 }}>
                  {SCENERY[si % SCENERY.length][k % 3]}
                </span>
              );
            })}
          </div>
        );
      })}

      <svg className="journey-path" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
        <polyline points={`${pts.join(' ')} ${W / 2},${TOP - 70}`} fill="none" stroke="var(--line-2)" strokeWidth="6" strokeDasharray="2 12" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <polyline points={donePts.join(' ')} fill="none" stroke="var(--gold)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>

      <div className="journey-finish" style={{ top: 18 }}>
        <span style={{ fontSize: 60, lineHeight: 1.1 }}>🏆</span>
        <b style={{ color: 'var(--gold)', fontSize: 18 }}>Habit formed</b>
      </div>

      {Array.from({ length: j.length }, (_, i) => {
        const d = i + 1;
        const stage = stages[stageIndex(j, d)];
        const isLast = d === j.length;
        const isMilestone = stages.some((s) => s.to === d);
        const isDone = d <= done;
        const isHere = d === n && !j.finishedOn;
        const size = isHere ? 58 : isMilestone ? 54 : 40;
        const join = joins.get(d);
        return (
          <div key={d}>
            <div
              ref={isHere ? here : undefined}
              className={`journey-node ${isDone ? 'done' : ''} ${isHere ? 'here' : ''} ${isMilestone ? 'chest' : ''}`}
              style={{
                left: pct(xAt(i)), top: yAt(i), width: size, height: size,
                background: isDone ? stage.color : isMilestone ? 'var(--card-2)' : 'var(--card)',
                borderColor: isHere ? 'var(--gold)' : isMilestone || isDone ? stage.color : 'var(--line-2)',
              }}
            >
              {isHere ? (
                <Avatar id={g.profile.avatar} name={g.profile.name} size={46} />
              ) : isMilestone ? (
                <span style={{ fontSize: 26 }}>{isLast ? '🏁' : j.milestones.includes(d) ? '✨' : '🏅'}</span>
              ) : isDone ? (
                <Icon name="check" color="var(--on-accent)" stroke={3.5} size={20} />
              ) : (
                <span className="muted" style={{ fontSize: 13 }}>{d}</span>
              )}
            </div>
            {isMilestone && (
              <span className="journey-tag" style={{ left: pct(xAt(i) + (side(i) < 0 ? -100 : 38)), top: yAt(i) - 11, color: stage.color }}>
                {j.milestones.includes(d) ? 'Claimed' : `Day ${d} · +${stage.xp} XP`}
              </span>
            )}
            {join && (
              <span className="journey-tag join" style={{ left: pct(xAt(i) + (side(i) < 0 ? -130 : 30)), top: yAt(i) + 14 }}>
                + {join} joins
              </span>
            )}
          </div>
        );
      })}

      <div className="journey-start" style={{ top: H - BOTTOM + 36 }}>🚩 Start</div>
    </div>
  );
}

// ---------------------------------------------------------------- finished

function Finished({ onNew }: { onNew: () => void }) {
  const g = useStore((s) => s.game);
  const j = g.journey!;
  const days = daysBetween(j.startDay, j.finishedOn!) + 1;
  return (
    <div className="screen" style={{ paddingTop: 0 }}>
      <TopBar title="Journey complete" />
      <div className="card stack center" style={{ border: '2px solid var(--gold)', alignItems: 'center' }}>
        <span style={{ fontSize: 72 }}>🏆</span>
        <h1 style={{ margin: 0 }}>Habit formed!</h1>
        <span className="soft">You finished <b>{j.name}</b>: {j.length} steps in {days} days.</span>
        <div className="stack" style={{ width: '100%', gap: 6 }}>
          {j.habits.map((h) => (
            <div key={h.id} className="list-item done" style={{ padding: '10px 12px' }}>
              <Icon name="check" color="var(--green)" stroke={3} size={18} />
              <span>{h.title}</span>
            </div>
          ))}
        </div>
        <span className="muted small">Keep these habits going on your own, or start a new journey with fresh ones.</span>
        <button className="btn btn-gold btn-block" onClick={onNew}>Start a new journey</button>
      </div>
      <Trophies g={g} />
    </div>
  );
}

function Trophies({ g }: { g: GameState }) {
  const list = g.journeysDone ?? [];
  if (!list.length) return null;
  return (
    <div className="stack">
      <h2>Trophy shelf</h2>
      {list.slice().reverse().map((x) => (
        <div key={x.finishedOn + x.name} className="list-item">
          <span style={{ fontSize: 26 }}>🏆</span>
          <div className="grow">
            <div>{x.name}</div>
            <div className="muted tiny">{x.length} days · finished {new Date(`${x.finishedOn}T12:00`).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- builder

const fromBundle = (b: JourneyBundle): JourneyPick[] => b.habits.map((h) => ({ title: h.title, steps: h.steps, area: h.area }));

function Builder({ onDone }: { onDone: () => void }) {
  const g = useStore((s) => s.game);
  const [picks, setPicks] = useState<JourneyPick[] | null>(null);
  const [bundleId, setBundleId] = useState('custom');
  const [name, setName] = useState('');
  const [length, setLength] = useState<number>(DEFAULT_LENGTH);
  const [adding, setAdding] = useState(false);

  const mine = new Set(g.profile.areas);
  const bundles = [...JOURNEY_BUNDLES].sort((a, b) => Number(mine.has(b.area)) - Number(mine.has(a.area)));

  if (!picks) {
    return (
      <div className="screen" style={{ paddingTop: 0 }}>
        <TopBar title="New journey" />
        <div className="card stack center" style={{ alignItems: 'center', background: 'linear-gradient(160deg, var(--gold-bg) 0%, var(--card-2) 100%)', border: '2px solid var(--gold)' }}>
          <span className="journey-big" style={{ fontSize: 64 }}>66</span>
          <b style={{ fontFamily: 'var(--display)', fontSize: 22 }}>days to a new you</b>
          <span className="soft small">
            A University College London study found new habits took 66 days on average to become automatic. Pick 2 or 3 habits.
            They join one at a time and grow a little harder in each zone of the map.
          </span>
        </div>

        <h2 style={{ marginBottom: -4 }}>Ready-made journeys</h2>
        {bundles.map((b) => {
          const area = AREA_BY_ID[b.area];
          return (
            <button key={b.id} className="card stack journey-bundle" style={{ borderColor: mine.has(b.area) ? area.color : 'transparent' }}
              onClick={() => { setPicks(fromBundle(b)); setBundleId(b.id); setName(b.name); }}>
              <div className="between" style={{ width: '100%' }}>
                <b style={{ fontFamily: 'var(--display)', fontSize: 19 }}>{b.name}</b>
                <span className="label-caps" style={{ color: area.color, fontSize: 11 }}>{mine.has(b.area) ? 'For you' : area.label}</span>
              </div>
              <span className="muted small" style={{ textAlign: 'left' }}>{b.tagline}</span>
              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                {b.habits.map((h, i) => (
                  <span key={h.id} className="journey-chip" style={{ borderColor: area.color }}>{h.title} <span className="muted">· Day {JOIN_DAYS[i]}</span></span>
                ))}
              </div>
            </button>
          );
        })}
        <button className="btn btn-dashed" onClick={() => { setPicks([]); setBundleId('custom'); setName('My journey'); }}>+ Build your own</button>
      </div>
    );
  }

  const move = (i: number) => setPicks((p) => {
    const next = [...p!];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    return next;
  });
  const canStart = picks.length >= 2 && name.trim().length > 0;

  return (
    <div className="screen" style={{ paddingTop: 0 }}>
      <div className="journey-top">
        <button className="icon-btn" aria-label="Back" onClick={() => setPicks(null)}><Icon name="back" /></button>
        <h1 className="grow" style={{ fontSize: 22, margin: 0 }}>Your journey</h1>
      </div>

      <label className="field">Name
        <input type="text" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
      </label>

      <div className="stack">
        <h2 style={{ margin: 0 }}>Habits ({picks.length}/3)</h2>
        <span className="muted small">The first starts on Day 1. The next ones join on Day 8 and Day 22, so the change is gradual.</span>
        {picks.map((p, i) => (
          <div key={p.title + i} className="list-item" style={{ alignItems: 'flex-start' }}>
            <span className="journey-step">Day {JOIN_DAYS[i]}</span>
            <div className="grow">
              <div style={{ fontSize: 15 }}>{p.title}</div>
              <div className="muted tiny">
                {p.steps[0]}{p.steps.length > 1 ? ` → … → ${p.steps[p.steps.length - 1]}` : ''}
              </div>
            </div>
            {i > 0 && <button className="icon-btn" style={{ width: 36, height: 36, background: 'none' }} aria-label={`Move ${p.title} earlier`} onClick={() => move(i)}><Icon name="back" size={18} style={{ transform: 'rotate(90deg)' }} /></button>}
            <button className="icon-btn" style={{ width: 36, height: 36, background: 'none' }} aria-label={`Remove ${p.title}`} onClick={() => setPicks(picks.filter((_, k) => k !== i))}><Icon name="close" size={18} color="var(--muted)" /></button>
          </div>
        ))}
        {picks.length < 3 && <button className="btn btn-dashed" onClick={() => setAdding(true)}>+ Add a habit</button>}
        {picks.length < 2 && <span className="small" style={{ color: 'var(--pink)' }}>Pick at least 2 habits.</span>}
      </div>

      <div className="stack">
        <h2 style={{ margin: 0 }}>Length</h2>
        <div className="options">
          {[{ v: 66, label: '66 days', sub: 'Recommended' }, { v: 90, label: '90 days', sub: 'Hard mode, for tough habits' }].map((o) => (
            <button key={o.v} className={`option ${length === o.v ? 'on' : ''}`} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2, borderColor: length === o.v ? 'var(--gold)' : undefined }} onClick={() => setLength(o.v)}>
              <b>{o.label}</b>
              <span className="muted tiny">{o.sub}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card stack" style={{ gap: 6 }}>
        <span className="soft small">❤️ You get {MAX_LIVES} hearts. Miss a day and you lose one. Run out, and a comeback quest helps you win one back. You never start over.</span>
      </div>

      <button className="btn btn-gold" disabled={!canStart}
        onClick={() => { useStore.getState().startJourney({ bundleId, name: name.trim(), length, picks }); onDone(); }}>
        Start my journey
      </button>

      {adding && <AddHabitSheet g={g} taken={picks} onPick={(p) => { setPicks([...picks, p]); setAdding(false); }} onClose={() => setAdding(false)} />}
    </div>
  );
}

function AddHabitSheet({ g, taken, onPick, onClose }: { g: GameState; taken: JourneyPick[]; onPick: (p: JourneyPick) => void; onClose: () => void }) {
  const [own, setOwn] = useState('');
  const titles = new Set(taken.map((p) => p.title));
  const trackedIds = new Set(taken.map((p) => p.habitId).filter(Boolean));
  const trackedPresets = new Set(g.habits.map((h) => h.presetId));
  const trackers = g.habits.filter((h) => !trackedIds.has(h.id));
  const presets = HABIT_PRESETS.filter((p) => !trackedPresets.has(p.id) && !titles.has(`Break free: ${p.name}`));

  return (
    <Modal bare label="Add a habit" onClose={onClose}><div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: 0 }}>Add a habit</h2>

        <label className="field">Write your own
          <div className="row">
            <input type="text" placeholder="e.g. Practise guitar for 10 minutes" value={own} maxLength={80} onChange={(e) => setOwn(e.target.value)} />
            <button className="btn btn-gold btn-sm" disabled={!own.trim()} onClick={() => onPick({ title: own.trim(), steps: [own.trim()] })}>Add</button>
          </div>
        </label>

        <span className="label-caps muted">Habit library</span>
        <div className="stack" style={{ gap: 6 }}>
          {ALL_JOURNEY_HABITS.filter((h) => !titles.has(h.title)).map((h) => (
            <button key={h.id} className="option" onClick={() => onPick({ title: h.title, steps: h.steps, area: h.area })}>
              <span className="swatch" style={{ background: AREA_BY_ID[h.area].color }}>{AREA_BY_ID[h.area].short}</span>
              <span className="grow stack" style={{ gap: 0 }}>
                <span>{h.title}</span>
                <span className="muted tiny">{h.steps[0]}</span>
              </span>
            </button>
          ))}
        </div>
        <span className="label-caps muted">Break a bad habit</span>
        <div className="stack" style={{ gap: 6 }}>
          {trackers.map((h) => (
            <button key={h.id} className="option" onClick={() => onPick({ title: `Break free: ${h.name}`, steps: [checkinTitle(h)], habitId: h.id })}>
              <span className="swatch" style={{ background: 'var(--pink)' }}><Icon name="quit" size={18} color="var(--on-accent)" stroke={2.6} /></span>
              <span className="grow">{h.name} <span className="muted tiny">· already tracking</span></span>
            </button>
          ))}
          {presets.map((p) => (
            <button key={p.id} className="option" onClick={() => onPick({
              title: `Break free: ${p.name}`, steps: [`Stayed clear of ${p.name.toLowerCase()} today?`],
              newHabit: { presetId: p.id, name: p.name, mode: p.defaultMode, limit: p.limit, unit: p.unit },
            })}>
              <span className="swatch" style={{ background: 'var(--pink)' }}><Icon name="quit" size={18} color="var(--on-accent)" stroke={2.6} /></span>
              <span className="grow">{p.name}</span>
            </button>
          ))}
        </div>

        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      </div>
    </div></Modal>
  );
}
