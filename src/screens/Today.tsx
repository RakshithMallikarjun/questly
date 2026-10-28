import { Modal } from '../components/Modal';
import { useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { AREA_BY_ID } from '../game/content/areas';
import { CHALLENGE_BY_ID } from '../game/content/challenges';
import { completeQuest, swapsLeft, undoCostsStreak } from '../game/engine';
import { currentQuest, isRequired } from '../game/generator';
import { cheerLine } from '../game/content/buddy';
import { dueFor, dueKey, timeLabel as clock } from '../game/reminders';
import { CLEAR_BONUS_XP, streakMultiplier } from '../game/xp';
import type { QuestInstance } from '../game/types';
import { Avatar, HeroHeader } from '../components/HeroHeader';
import { AreaIcon, Icon } from '../components/Icon';
import { ChestCard } from '../components/Chest';
import { SlipSheet } from '../components/SlipSheet';
import { fmt, strings } from '../i18n';
import { useStore } from '../store';
import { buzz, chime, flyCoins, floatText, focusQuest, isCalm, useFx } from '../fx';
import { enableNotifications, useNotify } from '../notify';
import { HEALTH_SYNC_URL, healthStale } from '../components/HealthSetup';
import { JourneyCard } from './Journey';

const colorFor = (q: QuestInstance) =>
  q.area && q.kind !== 'checkin' ? AREA_BY_ID[q.area].color : q.kind === 'journey' ? 'var(--teal)' : q.kind === 'checkin' ? 'var(--blue)' : q.kind === 'bonus' ? 'var(--pink)' : 'var(--gold)';

export const iconFor = (q: QuestInstance) => (q.kind === 'journey' ? 'journey' : q.kind === 'checkin' ? 'checkin' : q.area ?? 'bonus');

const timeLabel = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export function Today() {
  const g = useStore((s) => s.game);
  const { complete, skip, swap, undo, challengeDay, focus } = useStore.getState();
  const cheer = useFx((s) => s.cheer);
  const [leaving, setLeaving] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [showBonus, setShowBonus] = useState(false);
  const [recent, setRecent] = useState<{ key: string; xp: number; at: number } | null>(null);
  const [slipFor, setSlipFor] = useState<string | null>(null);
  const [editDue, setEditDue] = useState(false);
  const cheers = useRef(0);
  const doneList = useRef<HTMLDivElement>(null);
  const permission = useNotify((s) => s.permission);
  const t = strings();
  const today = g.today;
  if (!today) return null;

  const required = today.queue.filter(isRequired);
  const bonus = today.queue.filter((x) => !isRequired(x));
  // Once nothing required is left, the day is "done": bonus quests are optional.
  const dayDone = required.length === 0;
  const q = currentQuest(today.queue, showBonus);
  const all = [...today.doneQuests, ...today.queue];
  const doneKeys = new Set(today.done.map((d) => d.key));
  const mult = streakMultiplier(g.streak.current);
  const streakDays = `${g.streak.current} ${g.streak.current === 1 ? 'day' : 'days'}`;

  const finish = (e: MouseEvent<HTMLButtonElement>) => {
    if (!q || leaving) return;
    const xp = Math.round(q.xp * mult);
    buzz(g.profile.vibrate, 25);
    chime(g.profile.sound);
    // The companion cheers, unless this quest clears the day (that has its own message).
    const clearsDay = !today.cleared && completeQuest(g, q.key, new Date()).state.today?.cleared;
    cheer(clearsDay ? undefined : cheerLine(cheers.current++));
    const r = e.currentTarget.getBoundingClientRect();
    floatText(r, `+${xp} XP`);
    flyCoins(r, 4);
    const key = q.key;
    const done = () => {
      complete(key);
      setRecent({ key, xp, at: Date.now() });
      setLeaving(null);
      if (useStore.getState().game.today?.queue.some(isRequired)) setShowBonus(false);
    };
    if (isCalm()) return done();
    setLeaving(key);
    setTimeout(done, 420);
  };

  const undoQuest = (key: string) => {
    if (undoCostsStreak(useStore.getState().game, key, new Date())
      && !confirm("Undo this quest? Today won't count as cleared any more, so today's streak day is taken back.")) return;
    undo(key);
    setRecent(null);
    focusQuest();
  };

  const openDone = () => {
    setShowDone(true);
    setTimeout(() => doneList.current?.focus(), 50);
  };

  const challenge = g.challenge ? CHALLENGE_BY_ID[g.challenge.id] : null;
  const healthCard = healthStale(g.profile.healthKey, g.health, today.day);

  return (
    <div className="screen">
      <HeroHeader />

      {today.rest && (
        <div className="card" style={{ border: '2px solid var(--blue)' }}>
          <div className="row"><Icon name="moon" color="var(--blue)" /><b>{t.today.rest}</b></div>
          <p className="soft small" style={{ marginTop: 6 }}>{t.today.restBody}</p>
        </div>
      )}

      <div className="stack" style={{ gap: 10 }}>
        <div className="between">
          <h1 style={{ fontSize: 22 }}>{dayDone ? 'Today' : t.today.title}</h1>
          {today.cleared && !dayDone ? (
            <span className="saved-pill">Streak saved · {required.length} left</span>
          ) : (
            <span className="muted small">{today.done.length} of {all.length} done</span>
          )}
        </div>
        <div className="quest-strip" role="group" aria-label="Today's quests" data-tour="strip">
          {all.map((x) => {
            const done = doneKeys.has(x.key);
            const now = x.key === q?.key;
            const c = colorFor(x);
            return (
              <button
                key={x.key}
                aria-current={now ? 'step' : undefined}
                aria-label={`${x.title}${done ? ', done' : now ? ', current quest' : ''}${!isRequired(x) ? ', optional bonus' : ''}`}
                className={`qs ${done ? 'done' : ''} ${now ? 'now' : ''}`}
                style={{ borderColor: c, background: done ? c : now ? `color-mix(in srgb, ${c} 28%, var(--card))` : 'var(--card)' }}
                onClick={() => {
                  if (done) return openDone();
                  if (now) return;
                  if (!isRequired(x)) setShowBonus(true);
                  focus(x.key);
                  buzz(g.profile.vibrate, 10);
                }}
              >
                <AreaIcon name={iconFor(x)} size={18} color={done ? 'var(--on-accent)' : c} stroke={2.4} />
                {done && <span className="qs-tick"><Icon name="check" size={10} color="#fff" stroke={4} /></span>}
              </button>
            );
          })}
        </div>
      </div>

      {q ? (
        <div key={q.key} className={`quest-card ${leaving === q.key ? 'leaving' : ''}`} style={{ borderColor: colorFor(q) }} data-tour="quest">
          <div className="between">
            <span className="label-caps" style={{ color: colorFor(q) }}>
              {t.today.kinds[q.kind]}{q.area ? ` · ${AREA_BY_ID[q.area].label}` : ''}
            </span>
            <span className="xp-pill">+{Math.round(q.xp * mult)} XP</span>
          </div>
          <div className="quest-main">
            <div className="quest-emblem" style={{ background: colorFor(q) }}>
              <AreaIcon name={iconFor(q)} size={34} color="var(--on-accent)" stroke={2.2} />
            </div>
            <div className="quest-title">{q.title}</div>
          </div>
          <p className="soft small">{q.why}{q.kind === 'main' ? ` (${t.today.double})` : ''}</p>
          {dueFor(q, g.profile) && dueKey(q) && (
            <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start', fontSize: 13, height: 34 }} onClick={() => setEditDue(true)} aria-label={t.today.finishByEdit}>
              <Icon name="clock" size={15} /> {fmt(t.today.finishBy, { time: clock(dueFor(q, g.profile)!) })}
            </button>
          )}
          <div className="quest-actions" data-tour="done">
            {q.kind === 'checkin' ? (
              <div className="row" style={{ gap: 8 }}>
                <button className="btn btn-green grow" onClick={finish}>{t.today.checkinYes}</button>
                <button className="btn btn-ghost" style={{ height: 60 }} onClick={() => setSlipFor(q.habitId!)}>{t.today.checkinSlip}</button>
              </div>
            ) : (
              <button className="btn btn-green" onClick={finish}>{t.common.done}</button>
            )}
            <div className="row" style={{ justifyContent: 'center', gap: 0 }}>
              {(dayDone ? bonus.length > 1 : required.length > 1) && <button className="btn btn-text" onClick={() => skip(q.key)}>{t.today.notNow}</button>}
              {dayDone && <button className="btn btn-text" onClick={() => setShowBonus(false)}>Hide bonus</button>}
              {q.area && q.kind !== 'checkin' && q.kind !== 'journey' && swapsLeft(g) > 0 && (
                <button className="btn btn-text" onClick={() => swap(q.key)} aria-label={t.today.swap}>
                  <Icon name="swap" size={18} /> {fmt(t.today.swapsLeft, { n: swapsLeft(g) })}
                </button>
              )}
            </div>
          </div>
          {leaving === q.key && <div className="done-tick" aria-hidden="true"><Icon name="check" size={56} color="#fff" stroke={4} /></div>}
        </div>
      ) : (
        <div className="quest-card cleared-card" data-tour="quest">
          <Avatar size={96} />
          <span style={{ fontFamily: 'var(--display)', fontSize: 28, color: 'var(--gold)' }}>
            {today.cleared ? 'Day cleared' : 'All done'}
          </span>
          <p className="soft">
            {today.cleared ? `Streak: ${streakDays}. +${CLEAR_BONUS_XP} bonus XP. Rest well, or keep going.` : t.today.allDone}
          </p>
          {today.cleared && <ChestCard hero />}
          {today.chest && (
            <span className="xp-pill" style={{ fontSize: 14 }}>
              Chest: {today.chest.reward === 'coins' ? `+${today.chest.amount} coins` : today.chest.reward === 'shield' ? 'streak shield' : `+${today.chest.amount} XP`}
            </span>
          )}
          {bonus.length > 0 && (
            <button className="btn btn-text btn-sm" onClick={() => setShowBonus(true)}>Want a bonus quest? (optional)</button>
          )}
        </div>
      )}

      {today.cleared && q && <ChestCard />}

      <section className="more-today" aria-label="More today">
        <h2 className="more-head">More today</h2>

        {today.done.length > 0 && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <button className="between" style={{ width: '100%', height: 52, background: 'none', border: 'none', padding: '0 16px', fontSize: 15 }} onClick={() => setShowDone((v) => !v)} aria-expanded={showDone}>
              <span>{fmt(t.today.doneToday, { n: today.done.length })}</span>
              <span style={{ color: 'var(--green)', fontSize: 13 }}>{showDone ? t.today.hide : t.today.view}</span>
            </button>
            {showDone && (
              <div className="stack" style={{ padding: '0 10px 10px', gap: 6 }} ref={doneList} tabIndex={-1} aria-label="Quests done today">
                {today.done.slice().reverse().map((d) => {
                  const dq = today.doneQuests.find((x) => x.key === d.key);
                  if (!dq) return null;
                  return (
                    <div key={d.key} className="list-item done" style={{ padding: '10px 12px' }}>
                      <Icon name={d.slip ? 'close' : 'check'} color={d.slip ? 'var(--pink)' : 'var(--green)'} stroke={3} size={18} />
                      <div className="grow">
                        <div style={{ fontSize: 14 }}>{dq.title}</div>
                        <div className="muted tiny">
                          {d.slip ? t.today.slipped : `+${d.xp} XP`} · {timeLabel(d.at)}{d.auto ? ` · ${t.today.auto}` : ''}
                        </div>
                      </div>
                      {!d.slip && <button className="btn btn-ghost btn-sm" onClick={() => undoQuest(d.key)}>{t.today.undo}</button>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <JourneyCard />

        {challenge && g.challenge && (
          <div className="card stack">
            <div className="between">
              <span className="label-caps" style={{ color: 'var(--orange)' }}>{t.today.weekly}</span>
              <span className="xp-pill">+200 XP</span>
            </div>
            <b>{challenge.title}</b>
            <div className="row" style={{ gap: 6 }}>
              {Array.from({ length: challenge.days }).map((_, i) => (
                <span key={i} style={{ flex: 1, height: 10, borderRadius: 5, background: i < g.challenge!.daysDone.length ? 'var(--orange)' : 'var(--line)' }} />
              ))}
            </div>
            {g.challenge.completed ? (
              <span style={{ color: 'var(--green)' }}>{t.today.weeklyComplete}</span>
            ) : g.challenge.daysDone.includes(today.day) ? (
              <span className="muted small">{t.today.weeklyDone}</span>
            ) : (
              <button className="btn btn-ghost btn-sm" onClick={() => { chime(g.profile.sound, [520, 780]); challengeDay(); }}>{t.today.weeklyDid}</button>
            )}
          </div>
        )}

        {healthCard && (
          <div className="card stack">
            <b>No Health data for 2 days</b>
            <span className="soft small">Tap to send today's steps and sleep. To make it automatic, see Profile → Apple Health, step 3.</span>
            <a className="btn btn-ghost btn-sm" href={HEALTH_SYNC_URL} style={{ textDecoration: 'none' }}>Sync now</a>
          </div>
        )}

        {permission === 'default' && (
          <div className="card stack">
            <div className="row"><Icon name="clock" color="var(--purple)" /><b>{t.remind.section}</b></div>
            <span className="soft small">{t.remind.enableBody}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => void enableNotifications()}>{t.remind.enable}</button>
          </div>
        )}
      </section>

      {recent && today.done.some((d) => d.key === recent.key) && (
        <UndoToast key={recent.at} xp={recent.xp} onUndo={() => undoQuest(recent.key)} onDone={() => setRecent(null)} />
      )}
      {editDue && q && <DueSheet q={q} onClose={() => setEditDue(false)} />}
      {slipFor && <SlipSheet habitId={slipFor} onClose={() => setSlipFor(null)} />}
    </div>
  );
}

/** "Done · +20 XP — Undo". Stays 10 seconds, and waits while you're on it. */
function UndoToast({ xp, onUndo, onDone }: { xp: number; onUndo: () => void; onDone: () => void }) {
  const [hold, setHold] = useState(false);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });
  useEffect(() => {
    useFx.setState({ undoOpen: true });
    return () => useFx.setState({ undoOpen: false });
  }, []);
  useEffect(() => {
    if (hold) return;
    const id = setTimeout(() => done.current(), 10_000);
    return () => clearTimeout(id);
  }, [hold]);
  return (
    <div
      className="undo-toast"
      role="status"
      onMouseEnter={() => setHold(true)}
      onMouseLeave={() => setHold(false)}
      onFocus={() => setHold(true)}
      onBlur={() => setHold(false)}
    >
      <Icon name="check" size={18} color="var(--green)" stroke={3} />
      <span className="grow">Done · +{xp} XP</span>
      <button className="btn btn-ghost btn-sm" style={{ height: 36 }} onClick={onUndo}>Undo</button>
    </div>
  );
}

function DueSheet({ q, onClose }: { q: QuestInstance; onClose: () => void }) {
  const profile = useStore((s) => s.game.profile);
  const updateProfile = useStore((s) => s.updateProfile);
  const t = strings();
  const key = dueKey(q)!;
  const due = dueFor(q, profile)!;
  const setDue = (v: string | null) => {
    const next = { ...profile.dueTimes };
    if (v) next[key] = v;
    else delete next[key];
    updateProfile({ dueTimes: next });
  };
  return (
    <Modal bare label={t.today.finishByEdit} onClose={onClose}><div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>{t.today.finishByEdit}</h2>
        <b>{q.title}</b>
        <input type="time" value={due} aria-label={t.today.finishByEdit} onChange={(e) => e.target.value && setDue(e.target.value)} />
        <span className="muted small">{t.today.finishByHelp}</span>
        {profile.dueTimes?.[key] && <button className="btn btn-text" onClick={() => setDue(null)}>{t.today.finishByReset}</button>}
        <button className="btn btn-gold" onClick={onClose}>{t.common.save}</button>
      </div>
    </div></Modal>
  );
}
