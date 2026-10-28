import { useState } from 'react';
import { HABIT_PRESETS } from '../game/content/habits';
import { cleanDays, periodTotal } from '../game/engine';
import type { Habit, LimitPeriod } from '../game/types';
import { LimitFields, periodWord } from '../components/LimitFields';
import { Icon } from '../components/Icon';
import { SlipSheet } from '../components/SlipSheet';
import { UrgeBreaker } from '../components/UrgeBreaker';
import { fmt, strings } from '../i18n';
import { useStore } from '../store';
import { chime } from '../fx';
import { Avatar } from '../components/HeroHeader';
import { TabTip } from '../components/Tour';

function HabitCard({ h, day, onTempted, onSlip, onEdit }: { h: Habit; day: string; onTempted: () => void; onSlip: () => void; onEdit: () => void }) {
  const t = strings();
  const logAmount = useStore((s) => s.logAmount);
  const complete = useStore((s) => s.complete);
  const sound = useStore((s) => s.game.profile.sound);
  const checkin = useStore((s) => s.game.today?.queue.find((q) => q.kind === 'checkin' && q.habitId === h.id));
  const clean = cleanDays(h, day);
  const nextMilestone = [1, 7, 30, 90, 365].find((m) => m > clean);
  const answered = h.checkins[day];
  const amount = periodTotal(h, day);
  const limit = h.limit ?? 1;
  const pct = Math.min(100, Math.round((amount / limit) * 100));
  const over = amount > limit;

  // Last 7 days, oldest first.
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return h.checkins[key];
  });

  const counts: Record<string, number> = {};
  h.slips.slice(-7).forEach((s) => s.trigger && (counts[s.trigger] = (counts[s.trigger] ?? 0) + 1));
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="card stack" style={{ borderRadius: 22, padding: 18, gap: 12, border: clean > 0 ? '2px solid var(--green)' : '2px solid transparent', background: clean > 0 ? 'linear-gradient(135deg, var(--card-2), var(--green-bg))' : 'var(--card)' }}>
      <div className="between">
        <span style={{ fontSize: 17 }}>{h.name}</span>
        <span className="tiny" style={{ color: 'var(--bg)', background: h.mode === 'quit' ? 'var(--green)' : 'var(--blue)', borderRadius: 8, padding: '3px 8px' }}>
          {h.mode === 'quit' ? t.quit.quitMode : t.quit.limitMode}
        </span>
      </div>
      <div className="row" style={{ alignItems: 'flex-end' }}>
        <span style={{ fontFamily: 'var(--display)', fontSize: 64, lineHeight: 0.9, color: 'var(--green)' }}>{clean}</span>
        <div className="stack" style={{ gap: 0, paddingBottom: 4 }}>
          <span>{clean === 1 ? t.quit.dayClean : t.quit.daysClean}</span>
          <span className="muted small">{fmt(t.quit.best, { n: `${Math.max(h.best, clean)} ${Math.max(h.best, clean) === 1 ? 'day' : 'days'}` })}{nextMilestone ? ` · next badge at ${nextMilestone}` : ''}</span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6 }} aria-label="Last 7 days">
        {week.map((c, i) => <span key={i} style={{ height: 10, borderRadius: 5, background: c === 'clean' ? 'var(--green)' : c === 'slip' ? 'var(--pink)' : 'var(--line-2)' }} />)}
      </div>

      {h.mode === 'limit' && (
        <>
          <span style={{ fontFamily: 'var(--display)', fontSize: 26 }}>
            {amount}<span className="muted" style={{ fontSize: 15 }}> / {limit} {h.unit} {periodWord(h.period)}</span>
          </span>
          <div className="bar" style={{ height: 14, background: 'var(--bg)' }}>
            <span style={{ width: `${pct}%`, background: over ? 'var(--pink)' : pct > 75 ? 'var(--gold)' : 'var(--blue)' }} />
          </div>
          <div className="row">
            {(h.unit === 'min' ? [5, 15] : [1]).map((n) => (
              <button key={n} className="btn btn-ghost btn-sm grow" onClick={() => logAmount(h.id, n)}>+{n} {h.unit}</button>
            ))}
            {(h.amounts[day] ?? 0) > 0 && <button className="btn btn-ghost btn-sm" onClick={() => logAmount(h.id, h.unit === 'min' ? -5 : -1)} aria-label="Remove some">−</button>}
          </div>
        </>
      )}

      {answered === 'clean' ? (
        <div className="row well-done" role="status">
          <Avatar size={40} mood="proud" still />
          <span className="small grow">Clean today. Well done. Every clean day counts toward your streak and your chest.</span>
        </div>
      ) : checkin && (
        <button className="btn btn-ghost" onClick={() => { chime(sound, [659, 784, 988]); complete(checkin.key); }}>🌱 I stayed clean today</button>
      )}

      <button className="btn btn-pink" onClick={onTempted}>{t.quit.tempted}</button>
      <button className="btn btn-text" style={{ height: 36 }} onClick={onEdit}>{h.mode === 'limit' ? 'Change limit' : 'Switch to cutting down'}</button>
      {answered !== 'slip' && <button className="btn btn-text" onClick={onSlip}>{t.quit.slip}</button>}

      {top && (
        <div className="row" style={{ background: 'var(--bg)', borderRadius: 14, padding: 12 }}>
          <Icon name="bulb" color="var(--gold)" />
          <div>
            <div className="small">{fmt(t.quit.topTrigger, { t: top[0].toLowerCase() })}</div>
            <div className="muted tiny">{fmt(t.quit.topTriggerBody, { n: top[1], total: Math.min(7, h.slips.length) })}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export function AddHabitSheet({ onClose }: { onClose: () => void }) {
  const addHabit = useStore((s) => s.addHabit);
  const existing = useStore((s) => s.game.habits.map((h) => h.presetId));
  const [name, setName] = useState('');
  const [mode, setMode] = useState<'quit' | 'limit'>('quit');
  const [limit, setLimit] = useState(3);
  const [period, setPeriod] = useState<LimitPeriod>('day');
  const presets = HABIT_PRESETS.filter((p) => !existing.includes(p.id));
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Add a habit" onClick={(e) => e.stopPropagation()}>
        <h2>Add a habit to break</h2>
        <div className="options">
          {presets.map((p) => (
            <button key={p.id} className="option" onClick={() => { addHabit({ presetId: p.id, name: p.name, mode: p.defaultMode, limit: p.limit, unit: p.unit }); onClose(); }}>{p.name}</button>
          ))}
        </div>
        <label className="field">Or type your own
          <input type="text" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="e.g. Nail biting" />
        </label>
        <div className="row">
          <button className={`btn btn-sm grow ${mode === 'quit' ? 'btn-gold' : 'btn-ghost'}`} style={{ fontSize: 15 }} onClick={() => setMode('quit')}>Quit</button>
          <button className={`btn btn-sm grow ${mode === 'limit' ? 'btn-gold' : 'btn-ghost'}`} style={{ fontSize: 15 }} onClick={() => setMode('limit')}>Cut down</button>
        </div>
        {mode === 'limit' && <LimitFields limit={limit} unit="times" period={period} onChange={(v) => { setLimit(v.limit); setPeriod(v.period); }} />}
        <button className="btn btn-gold" disabled={!name.trim()} onClick={() => { addHabit({ presetId: 'custom', name: name.trim(), mode, limit: mode === 'limit' ? limit : undefined, unit: mode === 'limit' ? 'times' : undefined, period: mode === 'limit' ? period : undefined }); onClose(); }}>Add</button>
        <button className="btn btn-text" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

function EditHabitSheet({ h, onClose }: { h: Habit; onClose: () => void }) {
  const updateHabit = useStore((s) => s.updateHabit);
  const [mode, setMode] = useState(h.mode);
  const [limit, setLimit] = useState(h.limit ?? 1);
  const [period, setPeriod] = useState<LimitPeriod>(h.period ?? 'day');
  const save = () => {
    updateHabit(h.id, mode === 'limit' ? { mode, limit, period, unit: h.unit ?? 'times' } : { mode });
    onClose();
  };
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={`Edit ${h.name}`} onClick={(e) => e.stopPropagation()}>
        <h2>{h.name}</h2>
        <div className="row">
          <button className={`btn btn-sm grow ${mode === 'quit' ? 'btn-gold' : 'btn-ghost'}`} style={{ fontSize: 15 }} onClick={() => setMode('quit')}>Quit</button>
          <button className={`btn btn-sm grow ${mode === 'limit' ? 'btn-gold' : 'btn-ghost'}`} style={{ fontSize: 15 }} onClick={() => setMode('limit')}>Cut down</button>
        </div>
        {mode === 'limit' && <LimitFields limit={limit} unit={h.unit} period={period} onChange={(v) => { setLimit(v.limit); setPeriod(v.period); }} />}
        <span className="muted small">Your clean-day streak and history stay as they are.</span>
        <button className="btn btn-gold" onClick={save}>Save</button>
        <button className="btn btn-text" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

export function Quit() {
  const g = useStore((s) => s.game);
  const t = strings();
  const [urge, setUrge] = useState<Habit | null>(null);
  const [slip, setSlip] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);
  const day = g.today?.day ?? '';
  return (
    <div className="screen">
      <TabTip tab="quit" />
      <div className="stack" style={{ gap: 4 }}>
        <h1>{t.quit.title}</h1>
        <p className="muted">{t.quit.subtitle}</p>
      </div>
      {g.habits.length === 0 && <p className="soft">{t.quit.none}</p>}
      {g.habits.map((h) => (
        <HabitCard key={h.id} h={h} day={day} onTempted={() => setUrge(h)} onSlip={() => setSlip(h.id)} onEdit={() => setEditing(h)} />
      ))}
      <button className="btn btn-dashed" onClick={() => setAdding(true)}>{t.quit.add}</button>
      {urge && <UrgeBreaker habit={urge} onClose={() => setUrge(null)} />}
      {slip && <SlipSheet habitId={slip} onClose={() => setSlip(null)} />}
      {adding && <AddHabitSheet onClose={() => setAdding(false)} />}
      {editing && <EditHabitSheet h={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
