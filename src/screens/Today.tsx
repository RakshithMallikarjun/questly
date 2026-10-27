import { useState } from 'react';
import { AREA_BY_ID } from '../game/content/areas';
import { CHALLENGE_BY_ID } from '../game/content/challenges';
import { swapsLeft } from '../game/engine';
import { dueFor, dueKey, timeLabel as clock } from '../game/reminders';
import { streakMultiplier } from '../game/xp';
import type { QuestInstance } from '../game/types';
import { HeroHeader } from '../components/HeroHeader';
import { Icon, Star } from '../components/Icon';
import { SlipSheet } from '../components/SlipSheet';
import { fmt, strings } from '../i18n';
import { useStore } from '../store';
import { buzz, chime } from '../fx';
import { enableNotifications, useNotify } from '../notify';
import { HEALTH_SYNC_URL, healthStale } from '../components/HealthSetup';

const colorFor = (q: QuestInstance) =>
  q.kind === 'main' ? '#FFC23D' : q.kind === 'checkin' ? '#4FC3FF' : q.kind === 'bonus' ? '#FF4FA3' : q.area ? AREA_BY_ID[q.area].color : '#C3E44F';

const timeLabel = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export function Today() {
  const g = useStore((s) => s.game);
  const { complete, skip, swap, undo, challengeDay } = useStore.getState();
  const [showDone, setShowDone] = useState(false);
  const [slipFor, setSlipFor] = useState<string | null>(null);
  const [editDue, setEditDue] = useState(false);
  const permission = useNotify((s) => s.permission);
  const t = strings();
  const today = g.today;
  if (!today) return null;

  const q = today.queue[0];
  const all = [...today.doneQuests, ...today.queue];
  const doneKeys = new Set(today.done.map((d) => d.key));
  const onlyBonusLeft = today.queue.length > 0 && today.queue.every((x) => x.kind === 'bonus');
  const mult = streakMultiplier(g.streak.current);

  const finish = () => {
    if (!q) return;
    buzz(g.profile.sound, 25);
    chime(g.profile.sound);
    complete(q.key);
  };

  const challenge = g.challenge ? CHALLENGE_BY_ID[g.challenge.id] : null;

  return (
    <div className="screen">
      <HeroHeader />

      {today.rest && (
        <div className="card" style={{ border: '2px solid var(--blue)' }}>
          <div className="row"><Icon name="moon" color="var(--blue)" /><b>{t.today.rest}</b></div>
          <p className="soft small" style={{ marginTop: 6 }}>{t.today.restBody}</p>
        </div>
      )}

      <div className="between">
        <h1 style={{ fontSize: 24 }}>{t.today.title}</h1>
        <div className="dots" aria-label={`${today.done.length} of ${all.length} quests done`}>
          {all.map((x) => <span key={x.key} className={doneKeys.has(x.key) ? 'on' : x.key === q?.key ? 'now' : ''} />)}
        </div>
      </div>

      {q ? (
        <div key={q.key} className="quest-card" style={{ borderColor: colorFor(q) }}>
          {today.cleared && onlyBonusLeft && (
            <div className="center" style={{ color: 'var(--gold)', fontFamily: 'var(--display)', fontSize: 22 }}>{t.today.cleared}</div>
          )}
          <div className="between">
            <span className="label-caps" style={{ color: colorFor(q) }}>
              {t.today.kinds[q.kind]}{q.area ? ` · ${AREA_BY_ID[q.area].label}` : ''}
            </span>
            <span className="xp-pill">+{Math.round(q.xp * mult)} XP</span>
          </div>
          <div className="quest-emblem" style={{ background: colorFor(q), boxShadow: `0 10px 40px ${colorFor(q)}55` }}>
            <Star size={60} />
          </div>
          <div className="quest-title">{q.title}</div>
          <p className="soft center">{q.why}{q.kind === 'main' ? ` (${t.today.double})` : ''}</p>
          {dueFor(q, g.profile) && dueKey(q) && (
            <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'center', fontSize: 13 }} onClick={() => setEditDue(true)} aria-label={t.today.finishByEdit}>
              <Icon name="clock" size={16} /> {fmt(t.today.finishBy, { time: clock(dueFor(q, g.profile)!) })}
            </button>
          )}
          <div className="grow" />
          {q.kind === 'checkin' ? (
            <>
              <button className="btn btn-green" onClick={finish}>{t.today.checkinYes}</button>
              <button className="btn btn-ghost" onClick={() => setSlipFor(q.habitId!)}>{t.today.checkinSlip}</button>
            </>
          ) : (
            <button className="btn btn-green" onClick={finish}>{t.common.done}</button>
          )}
          <div className="row" style={{ justifyContent: 'center' }}>
            {today.queue.length > 1 && <button className="btn btn-text" onClick={() => skip(q.key)}>{t.today.notNow}</button>}
            {q.area && q.kind !== 'checkin' && swapsLeft(g) > 0 && (
              <button className="btn btn-text" onClick={() => swap(q.key)} aria-label={t.today.swap}>
                <Icon name="swap" size={18} /> {fmt(t.today.swapsLeft, { n: swapsLeft(g) })}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="quest-card center" style={{ minHeight: 240, borderColor: 'var(--gold)', background: 'linear-gradient(160deg, #3A2A12 0%, var(--nav) 100%)', justifyContent: 'center', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--display)', fontSize: 34, color: 'var(--gold)' }}>{t.today.cleared}</span>
          <p className="soft">{today.cleared ? fmt(t.today.clearedBody, { n: `${g.streak.current} ${g.streak.current === 1 ? 'day' : 'days'}` }) : t.today.allDone}</p>
        </div>
      )}

      {today.done.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <button className="between" style={{ width: '100%', height: 52, background: 'none', border: 'none', padding: '0 16px', fontSize: 15 }} onClick={() => setShowDone((v) => !v)} aria-expanded={showDone}>
            <span>{fmt(t.today.doneToday, { n: today.done.length })}</span>
            <span style={{ color: 'var(--green)', fontSize: 13 }}>{showDone ? t.today.hide : t.today.view}</span>
          </button>
          {showDone && (
            <div className="stack" style={{ padding: '0 10px 10px', gap: 6 }}>
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
                    {!d.slip && <button className="btn btn-ghost btn-sm" onClick={() => undo(d.key)}>{t.today.undo}</button>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {healthStale(g.profile.healthKey, g.health, today.day) && (
        <div className="card stack" style={{ border: '2px solid var(--green)' }}>
          <b>No Health data for 2 days</b>
          <span className="soft small">Tap to send today's steps and sleep. To make it automatic, see Profile → Apple Health, step 3.</span>
          <a className="btn btn-ghost btn-sm" href={HEALTH_SYNC_URL} style={{ textDecoration: 'none' }}>Sync now</a>
        </div>
      )}

      {permission === 'default' && (
        <div className="card stack" style={{ border: '2px solid var(--purple)' }}>
          <div className="row"><Icon name="clock" color="var(--purple)" /><b>{t.remind.section}</b></div>
          <span className="soft small">{t.remind.enableBody}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => void enableNotifications()}>{t.remind.enable}</button>
        </div>
      )}

      {challenge && g.challenge && (
        <div className="card stack" style={{ border: '2px solid #FF9F6B' }}>
          <div className="between">
            <span className="label-caps" style={{ color: '#FF9F6B' }}>{t.today.weekly}</span>
            <span className="xp-pill">+200 XP</span>
          </div>
          <b>{challenge.title}</b>
          <div className="row" style={{ gap: 6 }}>
            {Array.from({ length: challenge.days }).map((_, i) => (
              <span key={i} style={{ flex: 1, height: 10, borderRadius: 5, background: i < g.challenge!.daysDone.length ? '#FF9F6B' : 'var(--line)' }} />
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

      {editDue && q && <DueSheet q={q} onClose={() => setEditDue(false)} />}
      {slipFor && <SlipSheet habitId={slipFor} onClose={() => setSlipFor(null)} />}
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
    <div className="overlay" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={t.today.finishByEdit} onClick={(e) => e.stopPropagation()}>
        <h2>{t.today.finishByEdit}</h2>
        <b>{q.title}</b>
        <input type="time" value={due} aria-label={t.today.finishByEdit} onChange={(e) => e.target.value && setDue(e.target.value)} />
        <span className="muted small">{t.today.finishByHelp}</span>
        {profile.dueTimes?.[key] && <button className="btn btn-text" onClick={() => setDue(null)}>{t.today.finishByReset}</button>}
        <button className="btn btn-gold" onClick={onClose}>{t.common.save}</button>
      </div>
    </div>
  );
}
